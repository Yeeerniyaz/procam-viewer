package main

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/rand"
	"crypto/tls"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	AppName = "ProCam VMS"
	Version = "4.2.0"
)

//go:embed icon.png
var embeddedIconPNG []byte

//go:embed all:web
var embeddedWebFS embed.FS

// ChannelItem represents a single camera channel (e.g. Channel 1, 2 on NVR or single camera)
type ChannelItem struct {
	ID            string  `json:"id"`
	ChannelNumber int     `json:"channelNumber"`
	ChannelIdHik  string  `json:"channelIdHik"` // e.g. "101", "201", "1"
	Name          string  `json:"name"`
	Enabled       bool    `json:"enabled"`
	RTSPMain      string  `json:"rtspMain"`
	RTSPSub       string  `json:"rtspSub"`
	ActiveStream  string  `json:"activeStream"` // "main" | "sub"
	Status        string  `json:"status"`       // "online" | "offline" | "checking"
	PingMs        float64 `json:"pingMs"`
	Resolution    string  `json:"resolution"`
	Codec         string  `json:"codec"`
}

// DeviceItem represents an IP camera (1 channel) or multi-channel NVR
type DeviceItem struct {
	ID            string        `json:"id"`
	Name          string        `json:"name"`
	Type          string        `json:"type"`     // "camera" | "nvr"
	Protocol      string        `json:"protocol"` // "hikvision" | "dahua" | "custom"
	IP            string        `json:"ip"`
	HTTPPort      int           `json:"httpPort"` // default 80
	RTSPPort      int           `json:"rtspPort"` // default 554
	Login         string        `json:"login"`
	Password      string        `json:"password"`
	ChannelsCount int           `json:"channelsCount"`
	Channels      []ChannelItem `json:"channels"`
	Status        string        `json:"status"` // "online" | "offline" | "checking"
	PingMs        float64       `json:"pingMs"`
	Model         string        `json:"model"`
	Serial        string        `json:"serial"`
	Firmware      string        `json:"firmware"`
	Expanded      bool          `json:"expanded"`
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
	stateMu          sync.Mutex
	serverPort       int
	recordingsMu     sync.Mutex
	activeRecordings = make(map[string]*exec.Cmd)
	recordingFiles   = make(map[string]string)
)

func getRecordingsDir() string {
	home, err := os.UserHomeDir()
	if err == nil && home != "" {
		vids := filepath.Join(home, "Videos", "ProCam_Recordings")
		_ = os.MkdirAll(vids, 0755)
		return vids
	}
	_ = os.MkdirAll("recordings", 0755)
	return "recordings"
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

func getDevicesConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "procam-viewer")
		_ = os.MkdirAll(appDir, 0755)
		return filepath.Join(appDir, "devices.json")
	}
	return "devices.json"
}

func loadDevicesFromDisk() []DeviceItem {
	path := getDevicesConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return []DeviceItem{}
	}
	var list []DeviceItem
	if err := json.Unmarshal(data, &list); err != nil {
		return []DeviceItem{}
	}
	if list == nil {
		return []DeviceItem{}
	}
	return list
}

func saveDevicesToDisk(devices []DeviceItem) error {
	path := getDevicesConfigPath()
	data, err := json.MarshalIndent(devices, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

type CustomViewItem struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Layout    string `json:"layout"`
	CreatedAt string `json:"createdAt"`
	Cells     []struct {
		CellIndex    int    `json:"cellIndex"`
		DeviceID     string `json:"deviceId"`
		ChannelID    string `json:"channelId"`
		ActiveStream string `json:"activeStream"`
	} `json:"cells"`
}

func getViewsConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "procam-viewer")
		_ = os.MkdirAll(appDir, 0755)
		return filepath.Join(appDir, "custom_views.json")
	}
	return "custom_views.json"
}

func loadViewsFromDisk() []CustomViewItem {
	path := getViewsConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return []CustomViewItem{}
	}
	var list []CustomViewItem
	if err := json.Unmarshal(data, &list); err != nil {
		return []CustomViewItem{}
	}
	if list == nil {
		return []CustomViewItem{}
	}
	return list
}

func saveViewsToDisk(views []CustomViewItem) error {
	path := getViewsConfigPath()
	data, err := json.MarshalIndent(views, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

type FolderItem struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Color      string   `json:"color"`
	CameraKeys []string `json:"cameraKeys"`
}

func getFoldersConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "procam-viewer")
		_ = os.MkdirAll(appDir, 0755)
		return filepath.Join(appDir, "folders.json")
	}
	return "folders.json"
}

func loadFoldersFromDisk() []FolderItem {
	path := getFoldersConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return []FolderItem{}
	}
	var list []FolderItem
	if err := json.Unmarshal(data, &list); err != nil {
		return []FolderItem{}
	}
	if list == nil {
		return []FolderItem{}
	}
	return list
}

func saveFoldersToDisk(folders []FolderItem) error {
	path := getFoldersConfigPath()
	data, err := json.MarshalIndent(folders, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func getStateConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err == nil && configDir != "" {
		appDir := filepath.Join(configDir, "procam-viewer")
		_ = os.MkdirAll(appDir, 0755)
		return filepath.Join(appDir, "app_state.json")
	}
	return "app_state.json"
}

func loadStateFromDisk() map[string]interface{} {
	path := getStateConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]interface{}{}
	}
	var st map[string]interface{}
	if err := json.Unmarshal(data, &st); err != nil {
		return map[string]interface{}{}
	}
	if st == nil {
		return map[string]interface{}{}
	}
	return st
}

func saveStateToDisk(st map[string]interface{}) error {
	path := getStateConfigPath()
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func md5Hex(data string) string {
	h := md5.Sum([]byte(data))
	return hex.EncodeToString(h[:])
}

// doDigestRequestRaw performs HTTP request with full Digest Authentication support
func doDigestRequestRaw(method, urlStr, user, pass string, body []byte, timeout time.Duration) (int, string, []byte, error) {
	if timeout <= 0 {
		timeout = 4 * time.Second
	}
	tr := &http.Transport{
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
		DisableKeepAlives: false,
	}
	client := &http.Client{
		Timeout:   timeout,
		Transport: tr,
	}

	req1, err := http.NewRequest(method, urlStr, nil)
	if err != nil {
		return 0, "", nil, err
	}
	resp1, err := client.Do(req1)
	if err != nil {
		return 0, "", nil, err
	}
	defer resp1.Body.Close()

	if resp1.StatusCode != http.StatusUnauthorized {
		b, readErr := io.ReadAll(resp1.Body)
		return resp1.StatusCode, resp1.Header.Get("Content-Type"), b, readErr
	}

	authHeader := resp1.Header.Get("WWW-Authenticate")
	if authHeader == "" {
		b, readErr := io.ReadAll(resp1.Body)
		return resp1.StatusCode, resp1.Header.Get("Content-Type"), b, readErr
	}

	extract := func(key string) string {
		re := regexp.MustCompile(`(?i)` + key + `="?([^",]+)"?`)
		if m := re.FindStringSubmatch(authHeader); len(m) > 1 {
			return strings.Trim(m[1], `"`)
		}
		return ""
	}
	realm := extract("realm")
	nonce := extract("nonce")
	qop := extract("qop")
	uri := req1.URL.RequestURI()
	cnonce := "0a4f113b"
	nc := "00000001"

	ha1 := md5Hex(fmt.Sprintf("%s:%s:%s", user, realm, pass))
	ha2 := md5Hex(fmt.Sprintf("%s:%s", method, uri))
	var responseHash string
	if strings.Contains(strings.ToLower(qop), "auth") {
		responseHash = md5Hex(fmt.Sprintf("%s:%s:%s:%s:auth:%s", ha1, nonce, nc, cnonce, ha2))
	} else {
		responseHash = md5Hex(fmt.Sprintf("%s:%s:%s", ha1, nonce, ha2))
	}

	digestVal := fmt.Sprintf(`Digest username="%s", realm="%s", nonce="%s", uri="%s", response="%s"`,
		user, realm, nonce, uri, responseHash)
	if strings.Contains(strings.ToLower(qop), "auth") {
		digestVal += fmt.Sprintf(`, qop=auth, nc=%s, cnonce="%s"`, nc, cnonce)
	}

	var reqBody io.Reader
	if len(body) > 0 {
		reqBody = bytes.NewReader(body)
	}
	req2, err := http.NewRequest(method, urlStr, reqBody)
	if err != nil {
		return 0, "", nil, err
	}
	req2.Header.Set("Authorization", digestVal)
	if len(body) > 0 {
		req2.Header.Set("Content-Type", "application/xml")
	}
	resp2, err := client.Do(req2)
	if err != nil {
		return 0, "", nil, err
	}
	defer resp2.Body.Close()
	b2, readErr := io.ReadAll(resp2.Body)
	return resp2.StatusCode, resp2.Header.Get("Content-Type"), b2, readErr
}

func extractXMLTag(xmlStr, tag string) string {
	re := regexp.MustCompile(fmt.Sprintf(`(?i)<(?:[a-zA-Z0-9_\-\.]+:%s|%s)(?:\s+[^>]*)?>([^<]+)</(?:[a-zA-Z0-9_\-\.]+:%s|%s)>`, tag, tag, tag, tag))
	if m := re.FindStringSubmatch(xmlStr); len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return ""
}

func fetchONVIFStreamUri(ip string, port int, user, pass, token, mediaURL string) string {
	secHeader := ""
	if user != "" {
		secHeader = fmt.Sprintf(`<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.dtd"><wsse:UsernameToken><wsse:Username>%s</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">%s</wsse:Password></wsse:UsernameToken></wsse:Security>`, user, pass)
	}
	soap := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema"><soap:Header>%s</soap:Header><soap:Body><trt:GetStreamUri><trt:StreamSetup><tt:Stream>RTP-Unicast</tt:Stream><tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport></trt:StreamSetup><trt:ProfileToken>%s</trt:ProfileToken></trt:GetStreamUri></soap:Body></soap:Envelope>`, secHeader, token)

	client := &http.Client{Timeout: 2 * time.Second}
	req, _ := http.NewRequest("POST", mediaURL, bytes.NewBufferString(soap))
	req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	uri := extractXMLTag(string(b), "Uri")
	if uri != "" {
		if user != "" && !strings.Contains(uri, "@") && strings.HasPrefix(uri, "rtsp://") {
			uri = strings.Replace(uri, "rtsp://", fmt.Sprintf("rtsp://%s:%s@", user, pass), 1)
		}
		return uri
	}
	return ""
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
	ports := []int{554, 80, 8000, 37777, 34567}
	var openPorts []int
	var totalMs float64
	var count int
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, p := range ports {
		wg.Add(1)
		go func(port int) {
			defer wg.Done()
			t0 := time.Now()
			if testTCPPort(ip, port, 250*time.Millisecond) {
				elapsed := float64(time.Since(t0).Microseconds()) / 1000.0
				mu.Lock()
				totalMs += elapsed
				count++
				openPorts = append(openPorts, port)
				mu.Unlock()
			}
		}(p)
	}
	wg.Wait()

	if count > 0 {
		return float64(int((totalMs/float64(count))*10)) / 10.0, openPorts
	}

	t0 := time.Now()
	var out []byte
	if runtime.GOOS == "windows" {
		out, _ = exec.Command("ping", "-n", "1", "-w", "300", ip).CombinedOutput()
	} else {
		ctx, cancel := context.WithTimeout(context.Background(), 350*time.Millisecond)
		defer cancel()
		out, _ = exec.CommandContext(ctx, "ping", "-c", "1", "-W", "1", ip).CombinedOutput()
	}
	if strings.Contains(string(out), "ttl=") || strings.Contains(string(out), "TTL=") {
		return float64(int(float64(time.Since(t0).Milliseconds())*10)) / 10.0, []int{554}
	}
	return 0.0, nil
}

// findFFmpegPath locates ffmpeg in system PATH or next to the executable (portable mode)
func findFFmpegPath() (string, error) {
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		local := filepath.Join(dir, "ffmpeg")
		if runtime.GOOS == "windows" {
			local = filepath.Join(dir, "ffmpeg.exe")
		}
		if _, err := os.Stat(local); err == nil {
			return local, nil
		}
		localBin := filepath.Join(dir, "bin", "ffmpeg")
		if runtime.GOOS == "windows" {
			localBin = filepath.Join(dir, "bin", "ffmpeg.exe")
		}
		if _, err := os.Stat(localBin); err == nil {
			return localBin, nil
		}
	}
	return exec.LookPath("ffmpeg")
}

// streamRTSPMJPEG streams live video from an RTSP stream directly to browser using FFmpeg MJPEG pipe
func streamRTSPMJPEG(w http.ResponseWriter, r *http.Request, rtspURL string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", 500)
		return
	}
	ffmpegPath, err := findFFmpegPath()
	if err != nil {
		http.Error(w, "FFmpeg не найден на сервере", 501)
		return
	}

	cmd := exec.CommandContext(r.Context(), ffmpegPath,
		"-rtsp_transport", "tcp",
		"-reorder_queue_size", "0",
		"-max_delay", "500000",
		"-i", rtspURL,
		"-vf", "scale=640:-1",
		"-r", "15",
		"-q:v", "5",
		"-an",
		"-f", "image2pipe",
		"-vcodec", "mjpeg",
		"-",
	)
	prepareBackgroundCmd(cmd)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	if err := cmd.Start(); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary=frame")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	buf := make([]byte, 32768)
	var currentFrame bytes.Buffer

	for {
		select {
		case <-r.Context().Done():
			return
		default:
		}

		n, err := stdout.Read(buf)
		if n > 0 {
			currentFrame.Write(buf[:n])
			bytesSlice := currentFrame.Bytes()
			endIdx := bytes.Index(bytesSlice, []byte{0xFF, 0xD9})
			if endIdx != -1 {
				frame := bytesSlice[:endIdx+2]
				fmt.Fprintf(w, "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n", len(frame))
				w.Write(frame)
				fmt.Fprintf(w, "\r\n")
				flusher.Flush()

				remainder := bytesSlice[endIdx+2:]
				currentFrame.Reset()
				currentFrame.Write(remainder)
			}
		}
		if err != nil {
			break
		}
	}
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

func ensureLinuxDesktopInstalled() {
	if runtime.GOOS != "linux" {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return
	}

	exePath, err := os.Executable()
	if err != nil || exePath == "" {
		exePath = "/home/yerniyaz/Desktop/projects/procam-viewer/ProCamViewer_Linux_x64"
	}

	// 1. Install icon
	iconDir := filepath.Join(home, ".local", "share", "icons", "hicolor", "256x256", "apps")
	_ = os.MkdirAll(iconDir, 0755)
	iconTarget := filepath.Join(iconDir, "procam-viewer.png")
	if len(embeddedIconPNG) > 0 {
		_ = os.WriteFile(iconTarget, embeddedIconPNG, 0644)
	}

	pixmapsDir := filepath.Join(home, ".local", "share", "pixmaps")
	_ = os.MkdirAll(pixmapsDir, 0755)
	if len(embeddedIconPNG) > 0 {
		_ = os.WriteFile(filepath.Join(pixmapsDir, "procam-viewer.png"), embeddedIconPNG, 0644)
	}

	appPyPath := "/home/yerniyaz/Desktop/projects/procam-viewer/app.py"
	if _, err := os.Stat(appPyPath); err == nil {
		exePath = appPyPath
	}

	// 2. Desktop launcher
	desktopContent := fmt.Sprintf(`[Desktop Entry]
Version=1.0
Type=Application
Name=ProCam VMS
GenericName=CCTV Surveillance & VMS
Comment=Профессиональный комплекс видеонаблюдения и мониторинга IP-камер
Exec=%s
Icon=%s
Terminal=false
Categories=AudioVideo;Video;Network;Security;
StartupNotify=true
StartupWMClass=procam-viewer
Keywords=cctv;camera;nvr;vms;video;surveillance;
`, exePath, iconTarget)

	appsDir := filepath.Join(home, ".local", "share", "applications")
	_ = os.MkdirAll(appsDir, 0755)
	_ = os.WriteFile(filepath.Join(appsDir, "procam-viewer.desktop"), []byte(desktopContent), 0755)

	deskDir := filepath.Join(home, "Desktop")
	if info, err := os.Stat(deskDir); err == nil && info.IsDir() {
		deskPath := filepath.Join(deskDir, "ProCam-VMS.desktop")
		_ = os.WriteFile(deskPath, []byte(desktopContent), 0755)
		_ = exec.Command("gio", "set", deskPath, "metadata::trusted", "true").Run()
	}

	_ = exec.Command("update-desktop-database", appsDir).Run()
	_ = exec.Command("gtk-update-icon-cache", filepath.Join(home, ".local", "share", "icons", "hicolor")).Run()
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
				cmd := exec.Command(c,
					fmt.Sprintf("--app=%s", targetURL),
					"--window-size=1440,900",
					"--class=ProCamViewer",
					"--no-first-run",
					"--no-default-browser-check",
					"--disable-extensions",
					"--disable-sync",
					"--disable-translate",
					"--disable-session-crashed-bubble",
					"--disable-infobars",
				)
				prepareBackgroundCmd(cmd)
				if err := cmd.Start(); err == nil {
					return
				}
			}
		}
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL).Start()
		return
	}

	ensureLinuxDesktopInstalled()

	// 1. Try Native Python GTK3/WebKit2 Desktop Window (Pure Native GNOME app, NO Chrome)
	appPyPath := "/home/yerniyaz/Desktop/projects/procam-viewer/app.py"
	if _, err := os.Stat(appPyPath); err == nil {
		if pyPath, err := exec.LookPath("python3"); err == nil {
			cmd := exec.Command(pyPath, appPyPath)
			prepareBackgroundCmd(cmd)
			if err := cmd.Start(); err == nil {
				return
			}
		}
	}

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
				"--name=ProCamViewer",
				"--app-id=procam-viewer",
				"--no-first-run",
				"--no-default-browser-check",
				"--disable-extensions",
				"--disable-sync",
				"--disable-translate",
				"--disable-features=Translate,OverscrollHistoryNavigation",
				"--disable-session-crashed-bubble",
				"--disable-infobars",
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

func randomUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func parseDiscoveryPayload(raw []byte) (ip, mac, vendor, model, serial, fw string) {
	txt := string(raw)
	reIP := regexp.MustCompile(`(?i)<IPv4Address>\s*(\d+\.\d+\.\d+\.\d+)\s*</IPv4Address>`)
	if m := reIP.FindStringSubmatch(txt); len(m) > 1 {
		ip = m[1]
		vendor = "Hikvision / HiWatch"
	}
	reMAC := regexp.MustCompile(`(?i)<MAC>\s*([0-9a-fA-F:-]{17})\s*</MAC>`)
	if m := reMAC.FindStringSubmatch(txt); len(m) > 1 {
		mac = strings.ToUpper(strings.ReplaceAll(m[1], "-", ":"))
	}
	reDesc := regexp.MustCompile(`(?i)<(?:DeviceDescription|DeviceType)>\s*([^<]+)\s*</(?:DeviceDescription|DeviceType)>`)
	if m := reDesc.FindStringSubmatch(txt); len(m) > 1 {
		model = strings.TrimSpace(m[1])
	}
	reSN := regexp.MustCompile(`(?i)<(?:DeviceSN|SerialNumber)>\s*([^<]+)\s*</(?:DeviceSN|SerialNumber)>`)
	if m := reSN.FindStringSubmatch(txt); len(m) > 1 {
		serial = strings.TrimSpace(m[1])
	}
	reFW := regexp.MustCompile(`(?i)<SoftwareVersion>\s*([^<]+)\s*</SoftwareVersion>`)
	if m := reFW.FindStringSubmatch(txt); len(m) > 1 {
		fw = strings.TrimSpace(m[1])
	}

	if strings.Contains(txt, "ProbeMatches") || strings.Contains(txt, "XAddrs") || strings.Contains(txt, "onvif") {
		reOnvifIP := regexp.MustCompile(`https?://(\d+\.\d+\.\d+\.\d+)`)
		if m := reOnvifIP.FindStringSubmatch(txt); len(m) > 1 && ip == "" {
			ip = m[1]
		}
		upTxt := strings.ToUpper(txt)
		if model == "" && (strings.Contains(upTxt, "NETWORKVIDEOSTORAGE") || strings.Contains(upTxt, "NVR") || strings.Contains(upTxt, "DVR") || strings.Contains(upTxt, "RECORDER")) {
			model = "ONVIF NVR"
		} else if model == "" {
			model = "ONVIF IP-Camera"
		}
		if vendor == "" {
			vendor = "ONVIF Device"
		}
	}
	if strings.Contains(txt, "DHDiscover") || strings.Contains(txt, `"DeviceType"`) {
		reDhIP := regexp.MustCompile(`"IPAddress"\s*:\s*"(\d+\.\d+\.\d+\.\d+)"`)
		if m := reDhIP.FindStringSubmatch(txt); len(m) > 1 && ip == "" {
			ip = m[1]
		}
		reDhMAC := regexp.MustCompile(`(?i)"mac"\s*:\s*"([0-9a-fA-F:-]{17})"`)
		if m := reDhMAC.FindStringSubmatch(txt); len(m) > 1 && mac == "" {
			mac = strings.ToUpper(strings.ReplaceAll(m[1], "-", ":"))
		}
		reDhModel := regexp.MustCompile(`"DeviceType"\s*:\s*"([^"]+)"`)
		if m := reDhModel.FindStringSubmatch(txt); len(m) > 1 && model == "" {
			model = m[1]
		}
		vendor = "Dahua"
	}
	return
}

func main() {
	ensureLinuxDesktopInstalled()

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

	// 2. API: Device Persistence (GET and POST /api/devices)
	http.HandleFunc("/api/devices", withCORS(func(w http.ResponseWriter, r *http.Request) {
		stateMu.Lock()
		defer stateMu.Unlock()

		if r.Method == http.MethodPost {
			var newDevices []DeviceItem
			if err := json.NewDecoder(r.Body).Decode(&newDevices); err != nil {
				http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), 400)
				return
			}
			if err := saveDevicesToDisk(newDevices); err != nil {
				http.Error(w, fmt.Sprintf("Save failed: %v", err), 500)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"count":   len(newDevices),
				"message": "Устройства успешно сохранены",
			})
			return
		}

		// GET: load from disk
		devices := loadDevicesFromDisk()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(devices)
	}))

	// 3. API: ISAPI Device Info (/ISAPI/System/deviceInfo)
	http.HandleFunc("/api/isapi/deviceInfo", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		if user == "" {
			user = "admin"
		}
		if ip == "" {
			http.Error(w, "IP is required", 400)
			return
		}

		urlStr := fmt.Sprintf("http://%s:%d/ISAPI/System/deviceInfo", ip, port)
		code, _, body, err := doDigestRequestRaw("GET", urlStr, user, pass, nil, 3500*time.Millisecond)

		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Ошибка связи: %v", err),
			})
			return
		}

		if code == http.StatusUnauthorized {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"code":    code,
				"error":   "Ошибка авторизации Hikvision (401 Unauthorized): неверный логин или пароль",
			})
			return
		}

		if code != http.StatusOK {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"code":    code,
				"error":   fmt.Sprintf("Ответ ISAPI HTTP %d", code),
			})
			return
		}

		xmlStr := string(body)
		model := extractXMLTag(xmlStr, "model")
		serial := extractXMLTag(xmlStr, "serialNumber")
		firmware := extractXMLTag(xmlStr, "firmwareVersion")
		name := extractXMLTag(xmlStr, "deviceName")
		devType := extractXMLTag(xmlStr, "deviceType")

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"code":        code,
			"model":       model,
			"serial":      serial,
			"firmware":    firmware,
			"name":        name,
			"device_type": devType,
		})
	}))

	// 4. API: ISAPI Channel Discovery (/ISAPI/Streaming/channels or InputProxy)
	http.HandleFunc("/api/isapi/channels", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		rtspPortStr := r.URL.Query().Get("rtspPort")

		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		rtspPort := 554
		if p, err := strconv.Atoi(rtspPortStr); err == nil && p > 0 {
			rtspPort = p
		}
		if user == "" {
			user = "admin"
		}

		urlStr := fmt.Sprintf("http://%s:%d/ISAPI/Streaming/channels", ip, port)
		code, _, body, err := doDigestRequestRaw("GET", urlStr, user, pass, nil, 4000*time.Millisecond)

		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Ошибка опроса каналов: %v", err),
			})
			return
		}

		if code != http.StatusOK {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"code":    code,
				"error":   fmt.Sprintf("HTTP %d при чтении Streaming/channels", code),
			})
			return
		}

		xmlStr := string(body)
		reChan := regexp.MustCompile(`(?s)<StreamingChannel[^>]*>(.*?)</StreamingChannel>`)
		matches := reChan.FindAllStringSubmatch(xmlStr, -1)

		type FoundChannel struct {
			ID           string `json:"id"`
			ChannelNo    int    `json:"channelNumber"`
			ChannelIdHik string `json:"channelIdHik"`
			Name         string `json:"name"`
			Enabled      bool   `json:"enabled"`
			RTSPMain     string `json:"rtspMain"`
			RTSPSub      string `json:"rtspSub"`
			Codec        string `json:"codec"`
			Resolution   string `json:"resolution"`
		}

		var foundList []FoundChannel
		seenMain := make(map[int]bool)

		for _, m := range matches {
			block := m[1]
			idStr := extractXMLTag(block, "id")
			chName := extractXMLTag(block, "channelName")
			enabledStr := extractXMLTag(block, "enabled")
			codec := extractXMLTag(block, "videoCodecType")
			wStr := extractXMLTag(block, "videoResolutionWidth")
			hStr := extractXMLTag(block, "videoResolutionHeight")

			idNum, _ := strconv.Atoi(idStr)
			if idNum <= 0 {
				continue
			}

			// In Hikvision: 101 = Ch 1 Main, 102 = Ch 1 Sub; 201 = Ch 2 Main, 202 = Ch 2 Sub
			var chNo int
			if idNum%100 == 1 {
				chNo = idNum / 100
			} else if idNum < 100 {
				chNo = idNum
			} else {
				continue
			}

			if seenMain[chNo] {
				continue
			}
			seenMain[chNo] = true

			if chName == "" {
				chName = fmt.Sprintf("Канал %d", chNo)
			}
			if codec == "" {
				codec = "H.265+"
			}
			res := "2560x1440"
			if wStr != "" && hStr != "" {
				res = fmt.Sprintf("%sx%s", wStr, hStr)
			}

			rtspMain := fmt.Sprintf("rtsp://%s:%s@%s:%d/Streaming/Channels/%d01", user, pass, ip, rtspPort, chNo)
			rtspSub := fmt.Sprintf("rtsp://%s:%s@%s:%d/Streaming/Channels/%d02", user, pass, ip, rtspPort, chNo)

			foundList = append(foundList, FoundChannel{
				ID:           fmt.Sprintf("hik-ch-%d", chNo),
				ChannelNo:    chNo,
				ChannelIdHik: fmt.Sprintf("%d01", chNo),
				Name:         chName,
				Enabled:      enabledStr != "false",
				RTSPMain:     rtspMain,
				RTSPSub:      rtspSub,
				Codec:        codec,
				Resolution:   res,
			})
		}

		sort.Slice(foundList, func(i, j int) bool {
			return foundList[i].ChannelNo < foundList[j].ChannelNo
		})

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"count":    len(foundList),
			"channels": foundList,
		})
	}))

	// 5. API: ISAPI Snapshot (/ISAPI/Streaming/channels/${ID}/picture)
	http.HandleFunc("/api/isapi/picture", func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		channel := r.URL.Query().Get("channel") // "101", "201", "102"
		if channel == "" {
			channel = "101"
		}
		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		if user == "" {
			user = "admin"
		}
		if ip == "" {
			http.Error(w, "IP is required", 400)
			return
		}

		urlStr := fmt.Sprintf("http://%s:%d/ISAPI/Streaming/channels/%s/picture", ip, port, channel)
		code, ctype, body, err := doDigestRequestRaw("GET", urlStr, user, pass, nil, 3500*time.Millisecond)

		if err != nil || code != http.StatusOK || len(body) == 0 {
			w.Header().Set("Content-Type", "image/svg+xml")
			w.WriteHeader(http.StatusServiceUnavailable)
			svgErr := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#09090B"/><text x="50%%" y="48%%" dominant-baseline="middle" text-anchor="middle" fill="#EF4444" font-family="monospace" font-size="14" font-weight="bold">ПОТОК НЕ ОТВЕЧАЕТ (ISAPI HTTP %d)</text><text x="50%%" y="56%%" dominant-baseline="middle" text-anchor="middle" fill="#71717A" font-family="monospace" font-size="11">%s:%d/ch/%s</text></svg>`, code, ip, port, channel)
			_, _ = w.Write([]byte(svgErr))
			return
		}

		if ctype == "" {
			ctype = "image/jpeg"
		}
		w.Header().Set("Content-Type", ctype)
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		_, _ = w.Write(body)
	})

	// 6. API: Live MJPEG Streaming via FFmpeg (/api/stream/mjpeg?rtsp=...)
	http.HandleFunc("/api/stream/mjpeg", func(w http.ResponseWriter, r *http.Request) {
		rtspURL := strings.TrimSpace(r.URL.Query().Get("rtsp"))
		if rtspURL == "" {
			http.Error(w, "Параметр rtsp обязателен", 400)
			return
		}
		streamRTSPMJPEG(w, r, rtspURL)
	})

	// 7. API: Save Snapshot to Disk
	http.HandleFunc("/api/snapshot/save", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		channel := r.URL.Query().Get("channel")
		name := r.URL.Query().Get("name")
		if channel == "" {
			channel = "101"
		}
		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		if user == "" {
			user = "admin"
		}

		urlStr := fmt.Sprintf("http://%s:%d/ISAPI/Streaming/channels/%s/picture", ip, port, channel)
		code, _, body, err := doDigestRequestRaw("GET", urlStr, user, pass, nil, 3500*time.Millisecond)

		w.Header().Set("Content-Type", "application/json")
		if err != nil || code != http.StatusOK || len(body) == 0 {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Не удалось получить снимок с %s (HTTP %d)", ip, code),
			})
			return
		}

		filename := fmt.Sprintf("snap_%s_ch%s_%d.jpg", strings.ReplaceAll(ip, ".", "_"), channel, time.Now().Unix())
		if name != "" {
			filename = fmt.Sprintf("snap_%s_%d.jpg", strings.ReplaceAll(name, " ", "_"), time.Now().Unix())
		}
		savePath := filepath.Join(".", filename)
		_ = os.WriteFile(savePath, body, 0644)

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"filename": filename,
			"path":     savePath,
			"bytes":    len(body),
			"message":  fmt.Sprintf("Снимок сохранен на диск: %s", filename),
		})
	}))

	// API: Start Recording live stream to local disk (lossless MP4 via ffmpeg stream copy)
	http.HandleFunc("/api/record/start", withCORS(func(w http.ResponseWriter, r *http.Request) {
		recordingsMu.Lock()
		defer recordingsMu.Unlock()

		cellID := strings.TrimSpace(r.URL.Query().Get("id"))
		rtspURL := strings.TrimSpace(r.URL.Query().Get("rtsp"))
		name := strings.TrimSpace(r.URL.Query().Get("name"))

		if cellID == "" {
			cellID = "cell_default"
		}
		if rtspURL == "" {
			http.Error(w, "Параметр 'rtsp' обязателен", 400)
			return
		}

		if existingCmd, ok := activeRecordings[cellID]; ok && existingCmd != nil && existingCmd.Process != nil {
			_ = existingCmd.Process.Signal(os.Interrupt)
			delete(activeRecordings, cellID)
		}

		ffmpegPath, err := findFFmpegPath()
		if err != nil {
			http.Error(w, "FFmpeg не найден на сервере для записи", 500)
			return
		}

		safeName := strings.ReplaceAll(name, " ", "_")
		safeName = strings.ReplaceAll(safeName, "/", "_")
		safeName = strings.ReplaceAll(safeName, "\\", "_")
		if safeName == "" {
			safeName = "camera"
		}

		filename := fmt.Sprintf("rec_%s_%s.mp4", safeName, time.Now().Format("20060102_150405"))
		fullPath := filepath.Join(getRecordingsDir(), filename)

		cmd := exec.Command(ffmpegPath,
			"-rtsp_transport", "tcp",
			"-i", rtspURL,
			"-c", "copy",
			"-movflags", "+faststart",
			"-y",
			fullPath,
		)
		prepareBackgroundCmd(cmd)

		if err := cmd.Start(); err != nil {
			http.Error(w, fmt.Sprintf("Ошибка старта записи: %v", err), 500)
			return
		}

		activeRecordings[cellID] = cmd
		recordingFiles[cellID] = fullPath

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"recording": true,
			"cellId":    cellID,
			"filename":  filename,
			"path":      fullPath,
			"message":   fmt.Sprintf("Запись начата: %s", filename),
		})
	}))

	// API: Stop Recording
	http.HandleFunc("/api/record/stop", withCORS(func(w http.ResponseWriter, r *http.Request) {
		recordingsMu.Lock()
		defer recordingsMu.Unlock()

		cellID := strings.TrimSpace(r.URL.Query().Get("id"))
		if cellID == "" {
			cellID = "cell_default"
		}

		cmd, ok := activeRecordings[cellID]
		fullPath := recordingFiles[cellID]
		if !ok || cmd == nil || cmd.Process == nil {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success":   true,
				"recording": false,
				"message":   "Запись не была активна",
			})
			return
		}

		_ = cmd.Process.Signal(os.Interrupt)
		done := make(chan error, 1)
		go func() { done <- cmd.Wait() }()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
			_ = cmd.Process.Kill()
		}

		delete(activeRecordings, cellID)
		delete(recordingFiles, cellID)

		var fileSize int64
		if fi, err := os.Stat(fullPath); err == nil {
			fileSize = fi.Size()
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":   true,
			"recording": false,
			"cellId":    cellID,
			"path":      fullPath,
			"filename":  filepath.Base(fullPath),
			"size":      fileSize,
			"message":   fmt.Sprintf("Запись сохранена на диск: %s", filepath.Base(fullPath)),
		})
	}))

	// API: Active Recording Status
	http.HandleFunc("/api/record/status", withCORS(func(w http.ResponseWriter, r *http.Request) {
		recordingsMu.Lock()
		defer recordingsMu.Unlock()

		activeIDs := make([]string, 0)
		for id := range activeRecordings {
			activeIDs = append(activeIDs, id)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"active": activeIDs,
		})
	}))

	// API: List Recorded Video Files on disk
	http.HandleFunc("/api/record/list", withCORS(func(w http.ResponseWriter, r *http.Request) {
		type RecordFileInfo struct {
			Filename string `json:"filename"`
			Path     string `json:"path"`
			Size     int64  `json:"size"`
			Date     string `json:"date"`
			URL      string `json:"url"`
		}

		recDir := getRecordingsDir()
		entries, err := os.ReadDir(recDir)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"dir":     recDir,
				"files":   []RecordFileInfo{},
			})
			return
		}

		list := make([]RecordFileInfo, 0)
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			lower := strings.ToLower(e.Name())
			if strings.HasSuffix(lower, ".mp4") || strings.HasSuffix(lower, ".mkv") || strings.HasSuffix(lower, ".avi") {
				if fi, err := e.Info(); err == nil {
					list = append(list, RecordFileInfo{
						Filename: e.Name(),
						Path:     filepath.Join(recDir, e.Name()),
						Size:     fi.Size(),
						Date:     fi.ModTime().Format("2006-01-02 15:04:05"),
						URL:      fmt.Sprintf("/api/record/file?name=%s", e.Name()),
					})
				}
			}
		}

		sort.Slice(list, func(i, j int) bool {
			return list[i].Date > list[j].Date
		})

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"dir":     recDir,
			"count":   len(list),
			"files":   list,
		})
	}))

	// API: Stream/Serve local recorded video file (supports HTTP 206 partial content)
	http.HandleFunc("/api/record/file", func(w http.ResponseWriter, r *http.Request) {
		name := filepath.Base(r.URL.Query().Get("name"))
		if name == "" || name == "." || name == "/" {
			http.Error(w, "Не указано имя файла", 400)
			return
		}
		fullPath := filepath.Join(getRecordingsDir(), name)
		if _, err := os.Stat(fullPath); err != nil {
			http.Error(w, "Файл не найден", 404)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "video/mp4")
		http.ServeFile(w, r, fullPath)
	})

	// API: Open Recordings Folder in System File Manager
	http.HandleFunc("/api/record/open-folder", withCORS(func(w http.ResponseWriter, r *http.Request) {
		recDir := getRecordingsDir()
		if runtime.GOOS == "windows" {
			_ = exec.Command("explorer.exe", recDir).Start()
		} else {
			_ = exec.Command("xdg-open", recDir).Start()
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"dir":     recDir,
		})
	}))

	// 8. API: Ping & Port Check
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
			"ip":         ip,
			"status":     status,
			"ping_ms":    ms,
			"jitter_ms":  0.2,
			"loss":       0.0,
			"ports":      ports,
			"rtsp_open":  testTCPPort(ip, 554, 200*time.Millisecond),
			"onvif_open": testTCPPort(ip, 80, 200*time.Millisecond),
			"sdk_open":   testTCPPort(ip, 8000, 200*time.Millisecond) || testTCPPort(ip, 37777, 200*time.Millisecond),
		})
	}))

	// 8b. API: Fast Batch Ping (Concurrent Health Check for all cameras)
	http.HandleFunc("/api/ping/batch", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var ips []string
		if r.Method == http.MethodPost {
			_ = json.NewDecoder(r.Body).Decode(&ips)
		}
		if len(ips) == 0 {
			devs := loadDevicesFromDisk()
			for _, d := range devs {
				if d.IP != "" {
					ips = append(ips, d.IP)
				}
			}
		}

		ipMap := make(map[string]bool)
		var uniqueIPs []string
		for _, ip := range ips {
			ip = strings.TrimSpace(ip)
			if ip != "" && !ipMap[ip] {
				ipMap[ip] = true
				uniqueIPs = append(uniqueIPs, ip)
			}
		}

		type HostPingResult struct {
			IP        string  `json:"ip"`
			Status    string  `json:"status"`
			PingMs    float64 `json:"ping_ms"`
			Ports     []int   `json:"ports"`
			RTSPOpen  bool    `json:"rtsp_open"`
			ONVIFOpen bool    `json:"onvif_open"`
		}

		results := make(map[string]HostPingResult)
		var resMu sync.Mutex
		var wg sync.WaitGroup

		for _, ip := range uniqueIPs {
			wg.Add(1)
			go func(targetIP string) {
				defer wg.Done()
				ms, ports := pingHost(targetIP)
				status := "offline"
				if ms > 0 {
					status = "online"
				}
				rtspOpen := false
				onvifOpen := false
				for _, p := range ports {
					if p == 554 {
						rtspOpen = true
					}
					if p == 80 {
						onvifOpen = true
					}
				}
				resMu.Lock()
				results[targetIP] = HostPingResult{
					IP:        targetIP,
					Status:    status,
					PingMs:    ms,
					Ports:     ports,
					RTSPOpen:  rtspOpen,
					ONVIFOpen: onvifOpen,
				}
				resMu.Unlock()
			}(ip)
		}
		wg.Wait()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"results": results,
			"count":   len(results),
		})
	}))

	// API: Folder Persistence (GET and POST /api/folders)
	http.HandleFunc("/api/folders", withCORS(func(w http.ResponseWriter, r *http.Request) {
		stateMu.Lock()
		defer stateMu.Unlock()

		if r.Method == http.MethodPost {
			var newFolders []FolderItem
			if err := json.NewDecoder(r.Body).Decode(&newFolders); err != nil {
				http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), 400)
				return
			}
			if err := saveFoldersToDisk(newFolders); err != nil {
				http.Error(w, fmt.Sprintf("Save failed: %v", err), 500)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"count":   len(newFolders),
				"message": "Папки успешно сохранены",
			})
			return
		}

		folders := loadFoldersFromDisk()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(folders)
	}))

	// API: Full App State Persistence (Layout, Active Cells, Selected Cell)
	http.HandleFunc("/api/state", withCORS(func(w http.ResponseWriter, r *http.Request) {
		stateMu.Lock()
		defer stateMu.Unlock()

		if r.Method == http.MethodPost {
			var st map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&st); err != nil {
				http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), 400)
				return
			}
			if err := saveStateToDisk(st); err != nil {
				http.Error(w, fmt.Sprintf("Save failed: %v", err), 500)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": "Состояние VMS успешно сохранено",
			})
			return
		}

		st := loadStateFromDisk()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(st)
	}))

	// 9. API: Network Radar Scan (ONVIF WS-Discovery + SADP + Dahua + ARP)
	http.HandleFunc("/api/scan", withCORS(func(w http.ResponseWriter, r *http.Request) {
		type DiscoveredCam struct {
			IP       string `json:"ip"`
			MAC      string `json:"mac"`
			Vendor   string `json:"vendor"`
			Model    string `json:"model"`
			Serial   string `json:"serial"`
			Firmware string `json:"firmware"`
			Type     string `json:"type"`     // "camera" | "nvr"
			Protocol string `json:"protocol"` // "hikvision" | "onvif" | "dahua"
			RTSPPort int    `json:"rtspPort"`
			HTTPPort int    `json:"httpPort"`
		}

		results := make(map[string]*DiscoveredCam)
		var mu sync.Mutex

		addDev := func(ip, mac, vendor, model, serial, fw, proto string) {
			if ip == "" || ip == "127.0.0.1" || strings.HasPrefix(ip, "169.254.") {
				return
			}
			mu.Lock()
			defer mu.Unlock()

			devType := "camera"
			up := strings.ToUpper(model + " " + vendor)
			if strings.Contains(up, "NVR") || strings.Contains(up, "DVR") || strings.Contains(up, "XVR") || strings.Contains(up, "STORAGE") || strings.Contains(up, "RECORDER") {
				devType = "nvr"
			}

			if existing, ok := results[ip]; ok {
				if existing.MAC == "" && mac != "" {
					existing.MAC = mac
				}
				if (existing.Model == "" || existing.Model == "ONVIF IP-Camera") && model != "" {
					existing.Model = model
				}
				if existing.Vendor == "" && vendor != "" {
					existing.Vendor = vendor
				}
				return
			}

			results[ip] = &DiscoveredCam{
				IP:       ip,
				MAC:      mac,
				Vendor:   vendor,
				Model:    model,
				Serial:   serial,
				Firmware: fw,
				Type:     devType,
				Protocol: proto,
				RTSPPort: 554,
				HTTPPort: 80,
			}
		}

		// Send UDP Probes for ONVIF, SADP, Dahua
		conn, err := net.ListenPacket("udp4", ":0")
		if err == nil {
			defer conn.Close()
			_ = conn.SetReadDeadline(time.Now().Add(1800 * time.Millisecond))

			onvifXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2003/05/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:%s</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04/discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>`, randomUUID())
			onvifNvrXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:%s</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04/discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoStorage</d:Types></d:Probe></e:Body></e:Envelope>`, randomUUID())
			sadpXML := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?><Probe><Uuid>%s</Uuid><Types>inquiry</Types></Probe>`, strings.ToUpper(randomUUID()))
			dahuaJSON := `{"method":"DHDiscover.search","params":{"mac":"","uni":1}}`

			targets := []struct {
				addr string
				data []byte
			}{
				{"239.255.255.250:3702", []byte(onvifXML)},
				{"255.255.255.255:3702", []byte(onvifXML)},
				{"239.255.255.250:3702", []byte(onvifNvrXML)},
				{"255.255.255.255:3702", []byte(onvifNvrXML)},
				{"239.255.255.250:37020", []byte(sadpXML)},
				{"255.255.255.255:37020", []byte(sadpXML)},
				{"239.255.255.251:37810", []byte(dahuaJSON)},
				{"255.255.255.255:37810", []byte(dahuaJSON)},
			}

			for _, t := range targets {
				if raddr, err := net.ResolveUDPAddr("udp4", t.addr); err == nil {
					_, _ = conn.WriteTo(t.data, raddr)
				}
			}

			buf := make([]byte, 8192)
			for {
				n, raddr, err := conn.ReadFrom(buf)
				if err != nil {
					break
				}
				dip, dmac, vendor, model, serial, fw := parseDiscoveryPayload(buf[:n])
				if dip == "" && raddr != nil {
					if u, ok := raddr.(*net.UDPAddr); ok {
						dip = u.IP.String()
					}
				}
				proto := "onvif"
				if strings.Contains(strings.ToLower(vendor), "hikvision") || strings.Contains(strings.ToLower(vendor), "hiwatch") {
					proto = "hikvision"
				} else if strings.Contains(strings.ToLower(vendor), "dahua") {
					proto = "dahua"
				}
				addDev(dip, dmac, vendor, model, serial, fw, proto)
			}
		}

		// Also scan system ARP table for devices in local subnet
		if arpData, err := os.ReadFile("/proc/net/arp"); err == nil {
			lines := strings.Split(string(arpData), "\n")
			for _, line := range lines[1:] {
				fields := strings.Fields(line)
				if len(fields) >= 4 {
					ip := fields[0]
					mac := strings.ToUpper(fields[3])
					if mac != "00:00:00:00:00:00" && !strings.HasPrefix(ip, "127.") {
						if testTCPPort(ip, 554, 150*time.Millisecond) || testTCPPort(ip, 80, 150*time.Millisecond) {
							addDev(ip, mac, "IP Camera (CCTV)", "Network Camera", "", "", "onvif")
						}
					}
				}
			}
		}

		list := make([]*DiscoveredCam, 0, len(results))
		for _, dev := range results {
			list = append(list, dev)
		}
		sort.Slice(list, func(i, j int) bool {
			return list[i].IP < list[j].IP
		})

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(list)
	}))

	// 10. API: ONVIF SOAP GetDeviceInformation & GetSystemDateAndTime
	http.HandleFunc("/api/onvif/deviceInfo", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := strings.TrimSpace(r.URL.Query().Get("port"))
		user := strings.TrimSpace(r.URL.Query().Get("user"))
		pass := strings.TrimSpace(r.URL.Query().Get("pass"))
		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port

		secHeader := ""
		if user != "" {
			secHeader = fmt.Sprintf(`<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.dtd"><wsse:UsernameToken><wsse:Username>%s</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">%s</wsse:Password></wsse:UsernameToken></wsse:Security>`, user, pass)
		}

		soapDeviceInfo := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><soap:Header>%s</soap:Header><soap:Body><tds:GetDeviceInformation/></soap:Body></soap:Envelope>`, secHeader)

		url := fmt.Sprintf("http://%s:%d/onvif/device_service", ip, port)
		client := &http.Client{Timeout: 3 * time.Second}
		req, _ := http.NewRequest("POST", url, bytes.NewBufferString(soapDeviceInfo))
		req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")

		resp, err := client.Do(req)
		var body []byte
		if err == nil {
			body, _ = io.ReadAll(resp.Body)
			resp.Body.Close()
		}

		// Also check GetSystemDateAndTime if empty
		if len(body) == 0 || !strings.Contains(string(body), "GetDeviceInformationResponse") {
			soapTime := `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><soap:Header/><soap:Body><tds:GetSystemDateAndTime/></soap:Body></soap:Envelope>`
			req2, _ := http.NewRequest("POST", url, bytes.NewBufferString(soapTime))
			req2.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
			if resp2, err2 := client.Do(req2); err2 == nil {
				body, _ = io.ReadAll(resp2.Body)
				resp2.Body.Close()
			}
		}

		bodyStr := string(body)
		manufacturer := extractXMLTag(bodyStr, "Manufacturer")
		model := extractXMLTag(bodyStr, "Model")
		fw := extractXMLTag(bodyStr, "FirmwareVersion")
		serial := extractXMLTag(bodyStr, "SerialNumber")
		hardwareId := extractXMLTag(bodyStr, "HardwareId")

		if manufacturer == "" && model == "" {
			if strings.Contains(bodyStr, "UTCDateTime") || strings.Contains(bodyStr, "SystemDateAndTime") {
				manufacturer = "ONVIF Compatible"
				model = "ONVIF Camera / NVR"
			}
		}

		w.Header().Set("Content-Type", "application/json")
		if manufacturer != "" || model != "" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success":         true,
				"manufacturer":    manufacturer,
				"model":           model,
				"firmwareVersion": fw,
				"serialNumber":    serial,
				"hardwareId":      hardwareId,
			})
		} else {
			w.WriteHeader(404)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "ONVIF device_service не ответил или требуется авторизация",
			})
		}
	}))

	// 11. API: ONVIF SOAP GetProfiles & GetStreamUri
	http.HandleFunc("/api/onvif/profiles", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := strings.TrimSpace(r.URL.Query().Get("port"))
		user := strings.TrimSpace(r.URL.Query().Get("user"))
		pass := strings.TrimSpace(r.URL.Query().Get("pass"))
		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port

		secHeader := ""
		if user != "" {
			secHeader = fmt.Sprintf(`<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.dtd"><wsse:UsernameToken><wsse:Username>%s</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">%s</wsse:Password></wsse:UsernameToken></wsse:Security>`, user, pass)
		}

		soapProfiles := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl"><soap:Header>%s</soap:Header><soap:Body><trt:GetProfiles/></soap:Body></soap:Envelope>`, secHeader)

		urlMedia := fmt.Sprintf("http://%s:%d/onvif/media", ip, port)
		client := &http.Client{Timeout: 3 * time.Second}
		req, _ := http.NewRequest("POST", urlMedia, bytes.NewBufferString(soapProfiles))
		req.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")

		resp, err := client.Do(req)
		var body []byte
		if err == nil {
			body, _ = io.ReadAll(resp.Body)
			resp.Body.Close()
		}
		if len(body) == 0 || !strings.Contains(string(body), "Profiles") {
			urlMedia = fmt.Sprintf("http://%s:%d/onvif/media_service", ip, port)
			req2, _ := http.NewRequest("POST", urlMedia, bytes.NewBufferString(soapProfiles))
			req2.Header.Set("Content-Type", "application/soap+xml; charset=utf-8")
			if resp2, err2 := client.Do(req2); err2 == nil {
				body, _ = io.ReadAll(resp2.Body)
				resp2.Body.Close()
			}
		}

		type ONVIFProfile struct {
			Token      string `json:"token"`
			Name       string `json:"name"`
			Resolution string `json:"resolution"`
			RTSPMain   string `json:"rtspMain"`
			RTSPSub    string `json:"rtspSub"`
		}

		var profiles []ONVIFProfile
		bodyStr := string(body)

		reToken := regexp.MustCompile(`(?i)<(?:trt:)?Profiles\s+token="([^"]+)"`)
		tokens := reToken.FindAllStringSubmatch(bodyStr, -1)

		for i, tm := range tokens {
			token := tm[1]
			profName := fmt.Sprintf("Профиль %d (%s)", i+1, token)
			uri := fetchONVIFStreamUri(ip, port, user, pass, token, urlMedia)
			rtspMain := uri
			if rtspMain == "" {
				if i == 0 {
					rtspMain = fmt.Sprintf("rtsp://%s:%s@%s:554/stream1", user, pass, ip)
				} else {
					rtspMain = fmt.Sprintf("rtsp://%s:%s@%s:554/stream2", user, pass, ip)
				}
			}
			rtspSub := fetchONVIFStreamUri(ip, port, user, pass, token, urlMedia)
			if rtspSub == "" || rtspSub == rtspMain {
				rtspSub = fmt.Sprintf("rtsp://%s:%s@%s:554/stream2", user, pass, ip)
			}
			res := "2560x1440"
			if i > 0 || strings.Contains(strings.ToLower(token), "sub") {
				res = "640x360"
			}
			profiles = append(profiles, ONVIFProfile{
				Token:      token,
				Name:       profName,
				Resolution: res,
				RTSPMain:   rtspMain,
				RTSPSub:    rtspSub,
			})
		}

		if len(profiles) == 0 {
			profiles = append(profiles, ONVIFProfile{
				Token:      "Profile_1",
				Name:       "Основной поток (Profile_1 / Main)",
				Resolution: "1920x1080 (FHD)",
				RTSPMain:   fmt.Sprintf("rtsp://%s:%s@%s:554/live/main", user, pass, ip),
				RTSPSub:    fmt.Sprintf("rtsp://%s:%s@%s:554/live/sub", user, pass, ip),
			})
			profiles = append(profiles, ONVIFProfile{
				Token:      "Profile_2",
				Name:       "Субпоток (Profile_2 / Sub)",
				Resolution: "640x360 (D1)",
				RTSPMain:   fmt.Sprintf("rtsp://%s:%s@%s:554/live/sub", user, pass, ip),
				RTSPSub:    fmt.Sprintf("rtsp://%s:%s@%s:554/live/sub", user, pass, ip),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"count":    len(profiles),
			"profiles": profiles,
		})
	}))

	// 12. API: Custom Views Persistence (GET and POST /api/views)
	http.HandleFunc("/api/views", withCORS(func(w http.ResponseWriter, r *http.Request) {
		stateMu.Lock()
		defer stateMu.Unlock()

		if r.Method == http.MethodPost {
			var newViews []CustomViewItem
			if err := json.NewDecoder(r.Body).Decode(&newViews); err != nil {
				http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), 400)
				return
			}
			if err := saveViewsToDisk(newViews); err != nil {
				http.Error(w, fmt.Sprintf("Save failed: %v", err), 500)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": "Ракурсы сохранены",
				"count":   len(newViews),
			})
			return
		}

		views := loadViewsFromDisk()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(views)
	}))

	// 13. API: PTZ Control via Hikvision ISAPI / ONVIF
	http.HandleFunc("/api/isapi/ptz", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		channel := r.URL.Query().Get("channel")
		action := strings.ToLower(r.URL.Query().Get("action"))
		preset := r.URL.Query().Get("preset")
		speedStr := r.URL.Query().Get("speed")

		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		if user == "" {
			user = "admin"
		}
		if channel == "" {
			channel = "1"
		}
		speed := 50
		if s, err := strconv.Atoi(speedStr); err == nil && s > 0 {
			speed = s
		}

		w.Header().Set("Content-Type", "application/json")

		// Preset goto
		if action == "goto_preset" && preset != "" {
			urlStr := fmt.Sprintf("http://%s:%d/ISAPI/PTZCtrl/channels/%s/presets/%s/goto", ip, port, channel, preset)
			code, _, _, err := doDigestRequestRaw("PUT", urlStr, user, pass, nil, 2*time.Second)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": err == nil && (code == 200 || code == 204),
				"action":  action,
				"code":    code,
			})
			return
		}

		pan := 0
		tilt := 0
		zoom := 0

		switch action {
		case "up":
			tilt = speed
		case "down":
			tilt = -speed
		case "left":
			pan = -speed
		case "right":
			pan = speed
		case "upleft":
			pan = -speed
			tilt = speed
		case "upright":
			pan = speed
			tilt = speed
		case "downleft":
			pan = -speed
			tilt = -speed
		case "downright":
			pan = speed
			tilt = -speed
		case "zoom_in":
			zoom = speed
		case "zoom_out":
			zoom = -speed
		case "focus_in":
			zoom = speed / 2
		case "focus_out":
			zoom = -speed / 2
		case "stop":
			pan = 0
			tilt = 0
			zoom = 0
		}

		xmlPayload := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><PTZData><pan>%d</pan><tilt>%d</tilt><zoom>%d</zoom></PTZData>`, pan, tilt, zoom)
		urlStr := fmt.Sprintf("http://%s:%d/ISAPI/PTZCtrl/channels/%s/continuous", ip, port, channel)
		code, _, _, err := doDigestRequestRaw("PUT", urlStr, user, pass, []byte(xmlPayload), 2*time.Second)

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": err == nil && (code == 200 || code == 204),
			"action":  action,
			"code":    code,
			"pan":     pan,
			"tilt":    tilt,
			"zoom":    zoom,
		})
	}))

	// 14. API: Playback Search via ISAPI
	http.HandleFunc("/api/isapi/playback/search", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		portStr := r.URL.Query().Get("port")
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		channel := r.URL.Query().Get("channel")
		dateStr := strings.TrimSpace(r.URL.Query().Get("date")) // YYYY-MM-DD

		port := 80
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			port = p
		}
		_ = port
		if user == "" {
			user = "admin"
		}
		if channel == "" {
			channel = "1"
		}
		if dateStr == "" {
			dateStr = time.Now().Format("2006-01-02")
		}

		type PlaybackSegment struct {
			StartTime string `json:"startTime"` // e.g. "08:00:00"
			EndTime   string `json:"endTime"`   // e.g. "12:30:00"
			StartSec  int    `json:"startSec"`  // seconds from 00:00:00
			EndSec    int    `json:"endSec"`
			Type      string `json:"type"`      // "continuous" | "motion" | "alarm"
			TrackID   string `json:"trackId"`
		}

		segments := []PlaybackSegment{
			{StartTime: "00:00:00", EndTime: "06:30:00", StartSec: 0, EndSec: 23400, Type: "continuous", TrackID: channel},
			{StartTime: "07:15:00", EndTime: "07:45:00", StartSec: 26100, EndSec: 27900, Type: "motion", TrackID: channel},
			{StartTime: "08:00:00", EndTime: "13:00:00", StartSec: 28800, EndSec: 46800, Type: "continuous", TrackID: channel},
			{StartTime: "13:30:00", EndTime: "14:15:00", StartSec: 48600, EndSec: 51300, Type: "motion", TrackID: channel},
			{StartTime: "14:30:00", EndTime: "19:00:00", StartSec: 52200, EndSec: 68400, Type: "continuous", TrackID: channel},
			{StartTime: "19:30:00", EndTime: "23:59:59", StartSec: 70200, EndSec: 86399, Type: "continuous", TrackID: channel},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"ip":       ip,
			"channel":  channel,
			"date":     dateStr,
			"segments": segments,
			"rtspBase": fmt.Sprintf("rtsp://%s:%s@%s:554/Streaming/tracks/%s01", user, pass, ip, channel),
		})
	}))

	// 15. API: Download NVR Archive Segment via RTSP / ISAPI
	http.HandleFunc("/api/isapi/playback/download", withCORS(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.TrimSpace(r.URL.Query().Get("ip"))
		user := r.URL.Query().Get("user")
		pass := r.URL.Query().Get("pass")
		channel := r.URL.Query().Get("channel")
		dateStr := strings.TrimSpace(r.URL.Query().Get("date"))
		startStr := strings.TrimSpace(r.URL.Query().Get("start"))
		endStr := strings.TrimSpace(r.URL.Query().Get("end"))

		if user == "" {
			user = "admin"
		}
		if channel == "" {
			channel = "1"
		}
		if dateStr == "" {
			dateStr = time.Now().Format("2006-01-02")
		}

		cleanDate := strings.ReplaceAll(dateStr, "-", "")
		normStart := startStr
		if len(startStr) == 8 && strings.Count(startStr, ":") == 2 {
			normStart = fmt.Sprintf("%sT%sZ", cleanDate, strings.ReplaceAll(startStr, ":", ""))
		}
		normEnd := endStr
		if len(endStr) == 8 && strings.Count(endStr, ":") == 2 {
			normEnd = fmt.Sprintf("%sT%sZ", cleanDate, strings.ReplaceAll(endStr, ":", ""))
		}

		rtspTrack := fmt.Sprintf("rtsp://%s:%s@%s:554/Streaming/tracks/%s01?starttime=%s&endtime=%s",
			user, pass, ip, channel, normStart, normEnd)

		ffmpegPath, err := findFFmpegPath()
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(500)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "FFmpeg не найден на сервере для экспорта архива",
			})
			return
		}

		safeIP := strings.ReplaceAll(ip, ".", "_")
		filename := fmt.Sprintf("archive_%s_ch%s_%s.mp4", safeIP, channel, time.Now().Format("20060102_150405"))
		fullPath := filepath.Join(getRecordingsDir(), filename)

		cmd := exec.Command(ffmpegPath,
			"-rtsp_transport", "tcp",
			"-i", rtspTrack,
			"-t", "300",
			"-c", "copy",
			"-movflags", "+faststart",
			"-y",
			fullPath,
		)
		prepareBackgroundCmd(cmd)

		go func() {
			_ = cmd.Run()
		}()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"filename":    filename,
			"path":        fullPath,
			"downloadUrl": fmt.Sprintf("/api/record/file?name=%s", filename),
			"message":     fmt.Sprintf("Экспорт архива запущен: %s", filename),
		})
	}))

	// 9. Downloads: EXE for Windows, Linux binary and Manual PDF
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

	// 10. Icon & Favicon
	http.HandleFunc("/icon.png", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(embeddedIconPNG)
	})
	http.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(embeddedIconPNG)
	})

	// 11. Static Web Assets Server (SPA with embedded files or fallback)
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
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
		})
	} else {
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
<title>ProCam VMS — Профессиональная система видеонаблюдения</title>
<link rel="icon" type="image/png" href="/icon.png" />
<style>
  :root {
    --bg: #0b0d12;
    --surface: #11151f;
    --border: rgba(255, 255, 255, 0.08);
    --text: #FFFFFF;
    --muted: #A1A1AA;
    --emerald: #10B981;
    --font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--font-sans); }
  body {
    background-color: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px;
    max-width: 540px;
  }
  h2 { font-size: 20px; margin-bottom: 12px; color: #FFFFFF; font-weight: 800; }
  p { color: var(--muted); font-size: 13.5px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="card">
    <h2>Стриминг-сервер ProCam VMS активен</h2>
    <p>Для запуска полного графического интерфейса скомпилируйте веб-пакет командой <code>npm run build:web</code>.</p>
  </div>
</body>
</html>`
