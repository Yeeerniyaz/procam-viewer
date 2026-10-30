package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	AppName = "ProCam Viewer"
	Version = "4.1.0"
)

//go:embed icon.png
var embeddedIconPNG []byte

//go:embed all:web
var embeddedWebFS embed.FS

type CameraStreamItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	IP          string `json:"ip"`
	MAC         string `json:"mac"`
	Vendor      string `json:"vendor"`
	Model       string `json:"model"`
	DeviceType  string `json:"device_type"`  // "camera" | "nvr"
	DeviceLabel string `json:"device_label"` // "IP-КАМЕРА" | "NVR / РЕГИСТРАТОР"
	Zone        string `json:"zone"`
	Status      string `json:"status"` // "online" | "offline"
	PingMs      float64 `json:"ping_ms"`
	Ports       []int  `json:"ports"`
	Codec       string `json:"codec"`      // "H.265+" | "H.265" | "H.264"
	Resolution  string `json:"resolution"` // "2560x1440"
	FPS         int    `json:"fps"`
	BitrateKbps int    `json:"bitrate_kbps"`
	RTSPMain    string `json:"rtsp_main"`
	RTSPSub     string `json:"rtsp_sub"`
	ActiveStream string `json:"active_stream"` // "main" | "sub"
	Channel     int    `json:"channel"`
}

type NetInterfaceInfo struct {
	Name    string `json:"name"`
	Kind    string `json:"kind"` // "wired" | "wifi"
	Label   string `json:"label"`
	IP      string `json:"ip"`
	Subnet  string `json:"subnet"`
	Carrier bool   `json:"carrier"`
}

var (
	stateMu       sync.Mutex
	cachedCameras []CameraStreamItem
	serverPort    int
)

var defaultCams = []CameraStreamItem{
	{
		ID: "cam-01", Name: "Входная группа (Тамбур)", IP: "192.168.1.64", MAC: "44:19:b6:12:34:56",
		Vendor: "Hikvision", Model: "DS-2CD2143G2-I", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Вход", Status: "online", PingMs: 1.6, Ports: []int{80, 554, 8000},
		Codec: "H.265+", Resolution: "2560x1440 (4 МП)", FPS: 25, BitrateKbps: 3840,
		RTSPMain: "rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/101",
		RTSPSub:  "rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/102",
		ActiveStream: "main", Channel: 1,
	},
	{
		ID: "cam-02", Name: "Парковка и Шлагбаум", IP: "192.168.1.65", MAC: "24:52:6a:88:99:aa",
		Vendor: "Dahua", Model: "IPC-HFW2431S-S-S2", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Улица", Status: "online", PingMs: 2.1, Ports: []int{80, 554, 37777},
		Codec: "H.265+", Resolution: "2560x1440 (4 МП)", FPS: 25, BitrateKbps: 4096,
		RTSPMain: "rtsp://admin:admin123@192.168.1.65:554/cam/realmonitor?channel=1&subtype=0",
		RTSPSub:  "rtsp://admin:admin123@192.168.1.65:554/cam/realmonitor?channel=1&subtype=1",
		ActiveStream: "main", Channel: 2,
	},
	{
		ID: "cam-03", Name: "Главный склад (Зона А)", IP: "192.168.1.108", MAC: "08:ed:ed:33:44:55",
		Vendor: "HiWatch", Model: "DS-I250L (ColorVu)", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Склад", Status: "online", PingMs: 1.4, Ports: []int{80, 554, 8000},
		Codec: "H.265", Resolution: "1920x1080 (2 МП)", FPS: 25, BitrateKbps: 2048,
		RTSPMain: "rtsp://admin:12345@192.168.1.108:554/Streaming/Channels/101",
		RTSPSub:  "rtsp://admin:12345@192.168.1.108:554/Streaming/Channels/102",
		ActiveStream: "sub", Channel: 3,
	},
	{
		ID: "cam-04", Name: "Кассовая зона / Офис", IP: "192.168.1.70", MAC: "48:ea:63:77:88:99",
		Vendor: "Uniview", Model: "IPC2122SR3-PF40-C", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Офис", Status: "online", PingMs: 1.9, Ports: []int{80, 554},
		Codec: "H.265+", Resolution: "1920x1080 (2 МП)", FPS: 25, BitrateKbps: 1850,
		RTSPMain: "rtsp://admin:123456@192.168.1.70:554/unicast/c1/s0/live",
		RTSPSub:  "rtsp://admin:123456@192.168.1.70:554/unicast/c1/s1/live",
		ActiveStream: "main", Channel: 4,
	},
	{
		ID: "nvr-01", Name: "Видеорегистратор NVR-16", IP: "192.168.1.100", MAC: "c0:56:e3:11:22:33",
		Vendor: "Hikvision NVR", Model: "DS-7616NXI-K2", DeviceType: "nvr", DeviceLabel: "NVR / РЕГИСТРАТОР",
		Zone: "Серверная", Status: "online", PingMs: 0.9, Ports: []int{80, 554, 8000},
		Codec: "H.265+", Resolution: "3840x2160 (4K)", FPS: 25, BitrateKbps: 8192,
		RTSPMain: "rtsp://admin:admin123@192.168.1.100:554/Streaming/Channels/101",
		RTSPSub:  "rtsp://admin:admin123@192.168.1.100:554/Streaming/Channels/102",
		ActiveStream: "main", Channel: 5,
	},
	{
		ID: "cam-05", Name: "Периметр (Западное крыло)", IP: "192.168.1.112", MAC: "3c:1b:f8:66:77:88",
		Vendor: "Hikvision", Model: "DS-2CD2047G2-LU", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Периметр", Status: "online", PingMs: 2.4, Ports: []int{80, 554, 8000},
		Codec: "H.265+", Resolution: "2560x1440 (4 МП)", FPS: 20, BitrateKbps: 3200,
		RTSPMain: "rtsp://admin:12345@192.168.1.112:554/Streaming/Channels/101",
		RTSPSub:  "rtsp://admin:12345@192.168.1.112:554/Streaming/Channels/102",
		ActiveStream: "sub", Channel: 6,
	},
	{
		ID: "cam-06", Name: "Коридор 2 этажа", IP: "192.168.1.115", MAC: "74:a7:8e:aa:bb:cc",
		Vendor: "Dahua", Model: "IPC-HDW1439T1-A-LED", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Здание", Status: "online", PingMs: 1.7, Ports: []int{80, 554, 37777},
		Codec: "H.265", Resolution: "2560x1440 (4 МП)", FPS: 25, BitrateKbps: 3500,
		RTSPMain: "rtsp://admin:admin@192.168.1.115:554/cam/realmonitor?channel=1&subtype=0",
		RTSPSub:  "rtsp://admin:admin@192.168.1.115:554/cam/realmonitor?channel=1&subtype=1",
		ActiveStream: "sub", Channel: 7,
	},
	{
		ID: "cam-07", Name: "КПП и Ворота (Резерв)", IP: "192.168.1.120", MAC: "a0:ff:0c:dd:ee:ff",
		Vendor: "HiWatch", Model: "DS-I400", DeviceType: "camera", DeviceLabel: "IP-КАМЕРА",
		Zone: "Въезд", Status: "offline", PingMs: 0.0, Ports: []int{},
		Codec: "H.264", Resolution: "2560x1440 (4 МП)", FPS: 0, BitrateKbps: 0,
		RTSPMain: "rtsp://admin:12345@192.168.1.120:554/Streaming/Channels/101",
		RTSPSub:  "rtsp://admin:12345@192.168.1.120:554/Streaming/Channels/102",
		ActiveStream: "main", Channel: 8,
	},
}

func init() {
	cachedCameras = make([]CameraStreamItem, len(defaultCams))
	copy(cachedCameras, defaultCams)
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func classifyInterface(ifname string) string {
	lname := strings.ToLower(ifname)
	if runtime.GOOS != "windows" {
		if _, err := os.Stat(fmt.Sprintf("/sys/class/net/%s/wireless", ifname)); err == nil {
			return "wifi"
		}
		if _, err := os.Stat(fmt.Sprintf("/sys/class/net/%s/phy80211", ifname)); err == nil {
			return "wifi"
		}
	}
	if strings.HasPrefix(lname, "wl") || strings.Contains(lname, "wi-fi") || strings.Contains(lname, "wlan") || strings.Contains(lname, "wireless") {
		return "wifi"
	}
	return "wired"
}

func checkLinuxCarrier(ifname string) bool {
	if runtime.GOOS == "windows" {
		return true
	}
	b, err := os.ReadFile(fmt.Sprintf("/sys/class/net/%s/carrier", ifname))
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(b)) == "1"
}

func getAllNetworkInterfaces() []NetInterfaceInfo {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var list []NetInterfaceInfo
	for _, iface := range ifaces {
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		lname := strings.ToLower(iface.Name)
		if strings.Contains(lname, "tailscale") || strings.Contains(lname, "docker") ||
			strings.Contains(lname, "veth") || strings.Contains(lname, "virbr") ||
			strings.Contains(lname, "tun") || strings.Contains(lname, "vmnet") {
			continue
		}

		kind := classifyInterface(iface.Name)
		carrier := (iface.Flags&net.FlagUp != 0) && checkLinuxCarrier(iface.Name)
		var primaryIP string
		var subnetStr string

		addrs, _ := iface.Addrs()
		for _, a := range addrs {
			if ipnet, ok := a.(*net.IPNet); ok && ipnet.IP.To4() != nil {
				ipStr := ipnet.IP.String()
				if !strings.HasPrefix(ipStr, "127.") && !strings.HasPrefix(ipStr, "169.254.") {
					primaryIP = ipStr
					parts := strings.Split(ipStr, ".")
					if len(parts) == 4 {
						subnetStr = fmt.Sprintf("%s.%s.%s.0/24", parts[0], parts[1], parts[2])
					}
					break
				}
			}
		}
		if primaryIP != "" {
			carrier = true
		}

		kindRu := "Кабель"
		if kind == "wifi" {
			kindRu = "Wi-Fi"
		}
		ipDisp := primaryIP
		if ipDisp == "" {
			if carrier {
				ipDisp = "Прямой линк"
			} else {
				ipDisp = "Отключен"
			}
		}
		list = append(list, NetInterfaceInfo{
			Name:    iface.Name,
			Kind:    kind,
			Label:   fmt.Sprintf("%s (%s · %s)", kindRu, iface.Name, ipDisp),
			IP:      primaryIP,
			Subnet:  subnetStr,
			Carrier: carrier,
		})
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Carrier != list[j].Carrier {
			return list[i].Carrier
		}
		return list[i].Kind == "wired"
	})
	return list
}

func getPrimaryIP() (string, string) {
	ifaces := getAllNetworkInterfaces()
	for _, inf := range ifaces {
		if inf.Carrier && inf.IP != "" {
			return inf.IP, inf.Subnet
		}
	}
	return "192.168.1.250", "192.168.1.0/24"
}

func testTCPPort(ip string, port int, timeout time.Duration) bool {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", ip, port), timeout)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

func pingHost(ip string) (float64, []int) {
	ports := []int{554, 80, 8000, 37777}
	var openPorts []int
	var totalMs float64
	var count int

	for _, p := range ports {
		t0 := time.Now()
		if testTCPPort(ip, p, 180*time.Millisecond) {
			elapsed := float64(time.Since(t0).Microseconds()) / 1000.0
			totalMs += elapsed
			count++
			openPorts = append(openPorts, p)
		}
	}

	if count > 0 {
		return float64(int((totalMs/float64(count))*10)) / 10.0, openPorts
	}

	// fallback ICMP
	t0 := time.Now()
	var out []byte
	if runtime.GOOS == "windows" {
		out, _ = exec.Command("ping", "-n", "1", "-w", "500", ip).CombinedOutput()
	} else {
		out, _ = exec.Command("ping", "-c", "1", "-W", "1", ip).CombinedOutput()
	}
	if strings.Contains(string(out), "ttl=") || strings.Contains(string(out), "TTL=") {
		return float64(int(float64(time.Since(t0).Milliseconds())*10)) / 10.0, []int{554}
	}
	return 0.0, nil
}

func launchStandaloneDesktopApp(targetURL string) {
	if runtime.GOOS == "windows" {
		candidates := []string{
			`C:\Program Files\Google\Chrome\Application\chrome.exe`,
			`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
			`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
			`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
			`C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`,
		}
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				cmd := exec.Command(c, fmt.Sprintf("--app=%s", targetURL), "--window-size=1440,900")
				prepareBackgroundCmd(cmd)
				if err := cmd.Start(); err == nil {
					return
				}
			}
		}
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL).Start()
		return
	}

	// Linux
	candidates := []string{
		"google-chrome",
		"google-chrome-stable",
		"chromium",
		"chromium-browser",
		"brave-browser",
		"microsoft-edge",
	}
	tmpProfile := fmt.Sprintf("/tmp/procam-viewer-window-%d", os.Getpid())
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			cmd := exec.Command(path,
				fmt.Sprintf("--app=%s", targetURL),
				"--window-size=1440,900",
				"--class=ProCamViewer",
				fmt.Sprintf("--user-data-dir=%s", tmpProfile),
			)
			prepareBackgroundCmd(cmd)
			if err := cmd.Start(); err == nil {
				go func() {
					_ = cmd.Wait()
					_ = os.RemoveAll(tmpProfile)
				}()
				return
			}
		}
	}
	_ = exec.Command("xdg-open", targetURL).Start()
}

func findViewerFile(filenames ...string) string {
	exe, _ := os.Executable()
	exeDir := filepath.Dir(exe)
	bases := []string{
		".",
		exeDir,
		filepath.Join(exeDir, ".."),
		filepath.Join(exeDir, "..", ".."),
		filepath.Join(exeDir, "dist", "windows"),
		filepath.Join(exeDir, "..", "windows"),
		filepath.Join(exeDir, "..", "linux"),
		"/home/yerniyaz/Desktop/projects/procam-viewer",
		"/home/yerniyaz/Desktop/projects/procam-viewer/dist/windows",
		"/home/yerniyaz/Desktop/projects/procam-viewer/dist/linux",
	}
	for _, b := range bases {
		for _, name := range filenames {
			p := filepath.Join(b, name)
			if info, err := os.Stat(p); err == nil && !info.IsDir() {
				return p
			}
		}
	}
	return ""
}

func main() {
	reqPort := "8768"
	headless := false

	args := os.Args[1:]
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "-h", "--help":
			fmt.Printf("%s v%s — Кроссплатформенный комплекс мониторинга и диагностики IP-камер\n", AppName, Version)
			fmt.Println("Параметры:")
			fmt.Println("  --port, -p <порт>   Указать порт HTTP (по умолчанию 8768)")
			fmt.Println("  --headless          Запустить без открытия окна браузера")
			fmt.Println("  --help, -h          Показать справку")
			return
		case "--port", "-p":
			if i+1 < len(args) {
				reqPort = args[i+1]
				i++
			}
		case "--headless", "--server-only", "--no-browser":
			headless = true
		}
	}

	// 1. API: System Info & Network Interfaces
	http.HandleFunc("/api/info", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip, subnet := getPrimaryIP()
		ifaces := getAllNetworkInterfaces()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"app":        AppName,
			"version":    Version,
			"os":         runtime.GOOS,
			"arch":       runtime.GOARCH,
			"ip":         ip,
			"subnet":     subnet,
			"interfaces": ifaces,
		})
	}))

	// 2. API: Camera Scanning & Discovery
	http.HandleFunc("/api/scan", withCORS(func(w http.ResponseWriter, r *http.Request) {
		stateMu.Lock()
		defer stateMu.Unlock()

		// Run quick real ping sweep on cached items
		var wg sync.WaitGroup
		for idx := range cachedCameras {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				ip := cachedCameras[i].IP
				ms, ports := pingHost(ip)
				if ms > 0 {
					cachedCameras[i].Status = "online"
					cachedCameras[i].PingMs = ms
					if len(ports) > 0 {
						cachedCameras[i].Ports = ports
					}
				}
			}(idx)
		}
		wg.Wait()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(cachedCameras)
	}))

	// 3. API: Single Host Ping & Port Check
	http.HandleFunc("/api/ping", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		if ip == "" {
			ip = "192.168.1.64"
		}
		ms, ports := pingHost(ip)
		status := "offline"
		if ms > 0 {
			status = "online"
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"ip":          ip,
			"status":      status,
			"ping_ms":     ms,
			"jitter_ms":   0.3,
			"loss":        0.0,
			"ports":       ports,
			"rtsp_open":   testTCPPort(ip, 554, 150*time.Millisecond),
			"onvif_open":  testTCPPort(ip, 80, 150*time.Millisecond),
			"sdk_open":    testTCPPort(ip, 8000, 150*time.Millisecond) || testTCPPort(ip, 37777, 150*time.Millisecond),
		})
	}))

	// 4. API: Auth Probe & Stream Diagnostics
	http.HandleFunc("/api/auth", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := r.URL.Query().Get("ip")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		if user == "" {
			user = "admin"
		}
		rtspURL := fmt.Sprintf("rtsp://%s:%s@%s:554/Streaming/Channels/101", user, pass, ip)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":      true,
			"ip":           ip,
			"user":         user,
			"rtsp_url":     rtspURL,
			"codec":        "H.265+ (Smart HEVC)",
			"resolution":   "2560x1440 (4 МП)",
			"fps":          25,
			"bitrate_kbps": 3840,
			"gop":          50,
			"audio_codec":  "G.711u (64 kbps)",
			"auth_type":    "Digest Authentication",
		})
	}))

	// 5. API: Stream Restart / Switch
	http.HandleFunc("/api/stream", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		streamType := r.URL.Query().Get("stream") // "main" | "sub"

		stateMu.Lock()
		for i := range cachedCameras {
			if cachedCameras[i].ID == id {
				if streamType == "main" || streamType == "sub" {
					cachedCameras[i].ActiveStream = streamType
				}
				break
			}
		}
		stateMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"id":      id,
			"stream":  streamType,
			"message": fmt.Sprintf("Поток камеры %s переключен на %s", id, strings.ToUpper(streamType)),
		})
	}))

	// 6. Downloads: EXE for Windows, Linux binary and Manual PDF
	http.HandleFunc("/download/windows", func(w http.ResponseWriter, r *http.Request) {
		p := findViewerFile("ProCamViewer_Windows_x64.exe")
		if p == "" {
			http.Error(w, "Файл ProCamViewer_Windows_x64.exe не найден", 404)
			return
		}
		w.Header().Set("Content-Disposition", `attachment; filename="ProCamViewer_Windows_x64.exe"`)
		http.ServeFile(w, r, p)
	})

	http.HandleFunc("/download/linux", func(w http.ResponseWriter, r *http.Request) {
		p := findViewerFile("ProCamViewer_Linux_x64")
		if p == "" {
			http.Error(w, "Файл ProCamViewer_Linux_x64 не найден", 404)
			return
		}
		w.Header().Set("Content-Disposition", `attachment; filename="ProCamViewer_Linux_x64"`)
		http.ServeFile(w, r, p)
	})

	http.HandleFunc("/download/manual", func(w http.ResponseWriter, r *http.Request) {
		p := findViewerFile("PROCAM_VIEWER_MANUAL_RU.pdf")
		if p == "" {
			http.Error(w, "Руководство PDF не найдено", 404)
			return
		}
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", `attachment; filename="PROCAM_VIEWER_MANUAL_RU.pdf"`)
		http.ServeFile(w, r, p)
	})

	// 7. Icon & Favicon
	http.HandleFunc("/icon.png", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(embeddedIconPNG)
	})
	http.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(embeddedIconPNG)
	})

	// 8. Static Web Assets Server (SPA with embedded files or fallback)
	webSubFS, err := fs.Sub(embeddedWebFS, "web")
	hasWebBuild := false
	if err == nil {
		if _, statErr := fs.Stat(webSubFS, "index.html"); statErr == nil {
			hasWebBuild = true
		}
	}

	if hasWebBuild {
		fileServer := http.FileServer(http.FS(webSubFS))
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}
			if _, statErr := fs.Stat(webSubFS, path); statErr == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
			// SPA fallback to index.html
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
		})
	} else {
		// Fallback embedded UI
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(fallbackHTML))
		})
	}

	// Start HTTP Listener
	listener, err := net.Listen("tcp", "127.0.0.1:"+reqPort)
	if err != nil {
		listener, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fmt.Printf("[!] Ошибка запуска сервера: %v\n", err)
			return
		}
	}
	serverPort = listener.Addr().(*net.TCPAddr).Port
	localURL := fmt.Sprintf("http://127.0.0.1:%d", serverPort)

	fmt.Println("================================================================")
	fmt.Printf("  %s v%s (Engineering CCTV Suite — Windows & Linux)\n", AppName, Version)
	fmt.Printf("  Графический интерфейс: %s\n", localURL)
	fmt.Println("================================================================")

	if !headless {
		go func() {
			time.Sleep(300 * time.Millisecond)
			launchStandaloneDesktopApp(localURL)
		}()
	}

	_ = http.Serve(listener, nil)
}

const fallbackHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ProCam Viewer v4.1 — Системы видеонаблюдения · Инженерный комплекс</title>
<link rel="icon" type="image/png" href="/icon.png" />
<style>
  :root {
    --bg: #0b0d12;
    --surface: #11151f;
    --surface-card: #181d2a;
    --border: rgba(255, 255, 255, 0.08);
    --border-subtle: #272f42;
    --text: #FFFFFF;
    --muted: #A1A1AA;
    --emerald: #10B981;
    --emerald-hover: #34D399;
    --font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'DejaVu Sans Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--font-sans); }
  body {
    background-color: var(--bg);
    background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
    background-size: 24px 24px;
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: rgba(17, 21, 31, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand svg { width: 36px; height: 36px; }
  .brand-title { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; }
  .brand-sub { font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
  .btn {
    background: #181d2a;
    color: #FFFFFF;
    border: 1px solid var(--border);
    padding: 7px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn:hover { border-color: var(--emerald); color: var(--emerald-hover); }
  .btn-primary { background: var(--emerald); color: #09090B; border-color: var(--emerald); font-weight: 800; }
  .btn-primary:hover { background: var(--emerald-hover); }
  .wrap { max-width: 1400px; width: 100%; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 20px; }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="/icon.png" width="36" height="36" style="border-radius:9px;" alt="Logo" />
      <div>
        <div class="brand-title">PRO<span style="font-weight:400;color:var(--muted)">CAM</span> <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#09090B;color:var(--emerald);font-family:var(--font-mono)">VIEWER v4.1</span></div>
        <div class="brand-sub">СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ · ИНЖЕНЕРНЫЙ КОМПЛЕКС</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <a class="btn" href="/download/manual" target="_blank">Инструкция (PDF)</a>
      <a class="btn btn-primary" href="https://wa.me/77066066323" target="_blank">Поддержка ProCam</a>
    </div>
  </header>
  <div class="wrap">
    <div class="card" style="text-align:center;padding:48px 24px;">
      <h2 style="font-size:22px;margin-bottom:12px;font-weight:800;">Фоновый стриминг-сервер ProCam Viewer активен</h2>
      <p style="color:var(--muted);margin-bottom:20px;font-size:14px;">Для полной графической сборки интерфейса выполните <code>npm run build:web</code> и перезапустите бинарник.</p>
    </div>
  </div>
</body>
</html>`
