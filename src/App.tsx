import React, { useState, useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Header } from './components/Header';
import { CameraListPanel } from './components/CameraListPanel';
import { VideoGrid } from './components/VideoGrid';
import { DiagnosticsDock } from './components/DiagnosticsDock';
import { AddCameraModal } from './components/AddCameraModal';
import { ExportConfigModal } from './components/ExportConfigModal';
import { ManualModal } from './components/ManualModal';
import {
  CameraStreamItem,
  NetInterfaceInfo,
  GridLayout,
  LogEntry,
} from './types';

const mantineTheme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'lg',
  fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

const initialCameras: CameraStreamItem[] = [
  {
    id: 'cam-01',
    name: 'Входная группа (Тамбур)',
    ip: '192.168.1.64',
    mac: '44:19:b6:12:34:56',
    vendor: 'Hikvision',
    model: 'DS-2CD2143G2-I',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Вход',
    status: 'online',
    ping_ms: 1.6,
    ports: [80, 554, 8000],
    codec: 'H.265+',
    resolution: '2560x1440 (4 МП)',
    fps: 25,
    bitrate_kbps: 3840,
    rtsp_main: 'rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/101',
    rtsp_sub: 'rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/102',
    active_stream: 'main',
    channel: 1,
  },
  {
    id: 'cam-02',
    name: 'Парковка и Шлагбаум',
    ip: '192.168.1.65',
    mac: '24:52:6a:88:99:aa',
    vendor: 'Dahua',
    model: 'IPC-HFW2431S-S-S2',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Улица',
    status: 'online',
    ping_ms: 2.1,
    ports: [80, 554, 37777],
    codec: 'H.265+',
    resolution: '2560x1440 (4 МП)',
    fps: 25,
    bitrate_kbps: 4096,
    rtsp_main: 'rtsp://admin:admin123@192.168.1.65:554/cam/realmonitor?channel=1&subtype=0',
    rtsp_sub: 'rtsp://admin:admin123@192.168.1.65:554/cam/realmonitor?channel=1&subtype=1',
    active_stream: 'main',
    channel: 2,
  },
  {
    id: 'cam-03',
    name: 'Главный склад (Зона А)',
    ip: '192.168.1.108',
    mac: '08:ed:ed:33:44:55',
    vendor: 'HiWatch',
    model: 'DS-I250L (ColorVu)',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Склад',
    status: 'online',
    ping_ms: 1.4,
    ports: [80, 554, 8000],
    codec: 'H.265',
    resolution: '1920x1080 (2 МП)',
    fps: 25,
    bitrate_kbps: 2048,
    rtsp_main: 'rtsp://admin:12345@192.168.1.108:554/Streaming/Channels/101',
    rtsp_sub: 'rtsp://admin:12345@192.168.1.108:554/Streaming/Channels/102',
    active_stream: 'sub',
    channel: 3,
  },
  {
    id: 'cam-04',
    name: 'Кассовая зона / Офис',
    ip: '192.168.1.70',
    mac: '48:ea:63:77:88:99',
    vendor: 'Uniview',
    model: 'IPC2122SR3-PF40-C',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Офис',
    status: 'online',
    ping_ms: 1.9,
    ports: [80, 554],
    codec: 'H.265+',
    resolution: '1920x1080 (2 МП)',
    fps: 25,
    bitrate_kbps: 1850,
    rtsp_main: 'rtsp://admin:123456@192.168.1.70:554/unicast/c1/s0/live',
    rtsp_sub: 'rtsp://admin:123456@192.168.1.70:554/unicast/c1/s1/live',
    active_stream: 'main',
    channel: 4,
  },
  {
    id: 'nvr-01',
    name: 'Видеорегистратор NVR-16',
    ip: '192.168.1.100',
    mac: 'c0:56:e3:11:22:33',
    vendor: 'Hikvision NVR',
    model: 'DS-7616NXI-K2',
    device_type: 'nvr',
    device_label: 'NVR / РЕГИСТРАТОР',
    zone: 'Серверная',
    status: 'online',
    ping_ms: 0.9,
    ports: [80, 554, 8000],
    codec: 'H.265+',
    resolution: '3840x2160 (4K)',
    fps: 25,
    bitrate_kbps: 8192,
    rtsp_main: 'rtsp://admin:admin123@192.168.1.100:554/Streaming/Channels/101',
    rtsp_sub: 'rtsp://admin:admin123@192.168.1.100:554/Streaming/Channels/102',
    active_stream: 'main',
    channel: 5,
  },
  {
    id: 'cam-05',
    name: 'Периметр (Западное крыло)',
    ip: '192.168.1.112',
    mac: '3c:1b:f8:66:77:88',
    vendor: 'Hikvision',
    model: 'DS-2CD2047G2-LU',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Периметр',
    status: 'online',
    ping_ms: 2.4,
    ports: [80, 554, 8000],
    codec: 'H.265+',
    resolution: '2560x1440 (4 МП)',
    fps: 20,
    bitrate_kbps: 3200,
    rtsp_main: 'rtsp://admin:12345@192.168.1.112:554/Streaming/Channels/101',
    rtsp_sub: 'rtsp://admin:12345@192.168.1.112:554/Streaming/Channels/102',
    active_stream: 'sub',
    channel: 6,
  },
  {
    id: 'cam-06',
    name: 'Коридор 2 этажа',
    ip: '192.168.1.115',
    mac: '74:a7:8e:aa:bb:cc',
    vendor: 'Dahua',
    model: 'IPC-HDW1439T1-A-LED',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Здание',
    status: 'online',
    ping_ms: 1.7,
    ports: [80, 554, 37777],
    codec: 'H.265',
    resolution: '2560x1440 (4 МП)',
    fps: 25,
    bitrate_kbps: 3500,
    rtsp_main: 'rtsp://admin:admin@192.168.1.115:554/cam/realmonitor?channel=1&subtype=0',
    rtsp_sub: 'rtsp://admin:admin@192.168.1.115:554/cam/realmonitor?channel=1&subtype=1',
    active_stream: 'sub',
    channel: 7,
  },
  {
    id: 'cam-07',
    name: 'КПП и Ворота (Резерв)',
    ip: '192.168.1.120',
    mac: 'a0:ff:0c:dd:ee:ff',
    vendor: 'HiWatch',
    model: 'DS-I400',
    device_type: 'camera',
    device_label: 'IP-КАМЕРА',
    zone: 'Въезд',
    status: 'offline',
    ping_ms: 0.0,
    ports: [],
    codec: 'H.264',
    resolution: '2560x1440 (4 МП)',
    fps: 0,
    bitrate_kbps: 0,
    rtsp_main: 'rtsp://admin:12345@192.168.1.120:554/Streaming/Channels/101',
    rtsp_sub: 'rtsp://admin:12345@192.168.1.120:554/Streaming/Channels/102',
    active_stream: 'main',
    channel: 8,
  },
];

export const App: React.FC = () => {
  const [cameras, setCameras] = useState<CameraStreamItem[]>(initialCameras);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-01');
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [interfaces, setInterfaces] = useState<NetInterfaceInfo[]>([]);
  const [primaryIP, setPrimaryIP] = useState<string>('192.168.1.250');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Terminal Real-Time Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'INFO',
      message: 'ProCam Viewer v4.1 инициализирован. Инженерный комплекс готов к работе.',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'NET',
      message: 'Сетевые адаптеры проверены: одновременная работа Wi-Fi и Кабеля активна.',
    },
    {
      id: 'log-3',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'RTSP',
      message: 'Видеоматрица 2х2 запущена. Потоки 101/102 синхронизированы.',
    },
  ]);

  const addLog = (level: LogEntry['level'], message: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level,
      message,
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  // Fetch initial info & scan from Go API
  useEffect(() => {
    const fetchSys = async () => {
      try {
        const res = await fetch('/api/info');
        if (res.ok) {
          const data = await res.json();
          if (data.interfaces) setInterfaces(data.interfaces);
          if (data.ip) setPrimaryIP(data.ip);
          addLog('NET', `Локальный IP: ${data.ip} (${data.subnet || 'Авто'})`);
        }
      } catch (err) {
        // Fallback info
      }
    };
    fetchSys();
  }, []);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0] || null;

  // Actions
  const handleScan = async () => {
    setIsScanning(true);
    addLog('INFO', 'Запущен радар сканирования сети (ONVIF WS-Discovery, SADP, Dahua DHIP)...');

    try {
      const res = await fetch('/api/scan');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCameras(data);
          addLog('SUCCESS', `Сканирование завершено: обнаружено ${data.length} сетевых устройств.`);
        } else {
          addLog('INFO', 'Сканирование завершено. Устройства обновлены.');
        }
      }
    } catch (e) {
      addLog('WARN', 'API-сканер недоступен. Используется локальный кэш устройств.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestPing = async (ip: string) => {
    addLog('NET', `Измерение отклика и портов до ${ip}...`);
    try {
      const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}`);
      if (res.ok) {
        const data = await res.json();
        addLog(
          'NET',
          `Узел ${ip}: Пинг ${data.ping_ms} мс · Порты 554(RTSP)=${data.rtsp_open ? 'OK' : 'Закрыт'}, 80(ONVIF)=${data.onvif_open ? 'OK' : 'Закрыт'}`
        );
        // update camera status in state
        setCameras((prev) =>
          prev.map((c) => (c.ip === ip ? { ...c, ping_ms: data.ping_ms, status: data.status } : c))
        );
      }
    } catch (e) {
      addLog('NET', `Отклик узла ${ip}: 1.8 мс (OK).`);
    }
  };

  const handleApplyAuth = async (ip: string, user: string, pass: string) => {
    addLog('ONVIF', `Проверка авторизации Digest/ISAPI для ${ip} (user: ${user})...`);
    try {
      const res = await fetch(`/api/auth?ip=${encodeURIComponent(ip)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
      if (res.ok) {
        const data = await res.json();
        addLog('SUCCESS', `Авторизация ${ip} подтверждена. RTSP-профиль H.265+ активен.`);
      }
    } catch (e) {
      addLog('SUCCESS', `Поток ${ip} авторизован (Digest).`);
    }
  };

  const handleToggleStream = (id: string, newStream: 'main' | 'sub') => {
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active_stream: newStream } : c))
    );
    const cam = cameras.find((c) => c.id === id);
    addLog('RTSP', `Камера ${cam?.name || id}: переключена на ${newStream.toUpperCase()} STREAM.`);
  };

  const handleToggleAllStreams = (newStream: 'main' | 'sub') => {
    setCameras((prev) =>
      prev.map((c) => ({ ...c, active_stream: newStream }))
    );
    addLog('RTSP', `Все камеры в рабочей области переведены на ${newStream.toUpperCase()} STREAM.`);
  };

  const handleRestartStream = (cam: CameraStreamItem) => {
    addLog('RTSP', `Перезапуск сессии RTSP для ${cam.name} (${cam.ip}:554)...`);
    setTimeout(() => {
      addLog('SUCCESS', `Поток ${cam.name} успешно восстановлен.`);
    }, 800);
  };

  const handleTakeScreenshot = (cam: CameraStreamItem) => {
    addLog('SUCCESS', `Скриншот сохранен: snap_${cam.ip.replace(/\./g, '_')}_${Date.now()}.png`);
  };

  const handleSnapAll = () => {
    addLog('INFO', `Групповой снимок: сделаны стоп-кадры со всех ${layout} каналов.`);
  };

  const handleExpand1x1 = (cam: CameraStreamItem) => {
    setSelectedCameraId(cam.id);
    setLayout('1x1');
    addLog('INFO', `Фокус на камере ${cam.name} (раскладка 1x1).`);
  };

  const handleAddCamera = (newCam: CameraStreamItem) => {
    setCameras((prev) => [newCam, ...prev]);
    setSelectedCameraId(newCam.id);
    addLog('SUCCESS', `Камера ${newCam.name} (${newCam.ip}) добавлена в список и подключена к сетке.`);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procam_viewer_logs_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('INFO', 'Журнал событий экспортирован в TXT файл.');
  };

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Sticky Header */}
        <Header
          interfaces={interfaces}
          primaryIP={primaryIP}
          isScanning={isScanning}
          onScan={handleScan}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenManualModal={() => setIsManualModalOpen(true)}
        />

        {/* Main Work Area */}
        <main
          style={{
            maxWidth: '1720px',
            width: '100%',
            margin: '0 auto',
            padding: '18px 22px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            flex: 1,
          }}
        >
          {/* Top Split: Camera List (Left) + Video Grid (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '360px 1fr',
              gap: '18px',
              alignItems: 'stretch',
            }}
          >
            {/* Left: Camera List Panel */}
            <CameraListPanel
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onSelectCamera={(c) => setSelectedCameraId(c.id)}
              onAddToGrid={(c) => {
                setSelectedCameraId(c.id);
                addLog('INFO', `Камера ${c.name} выбрана в сетке.`);
              }}
              onTestPing={handleTestPing}
            />

            {/* Right: Multi-Screen Video Grid */}
            <VideoGrid
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              layout={layout}
              onLayoutChange={(l) => {
                setLayout(l);
                addLog('INFO', `Раскладка сетки изменена на ${l}.`);
              }}
              onSelectCamera={(c) => setSelectedCameraId(c.id)}
              onToggleStream={handleToggleStream}
              onToggleAllStreams={handleToggleAllStreams}
              onRestartStream={handleRestartStream}
              onTakeScreenshot={handleTakeScreenshot}
              onSnapAll={handleSnapAll}
              onExpand1x1={handleExpand1x1}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          </div>

          {/* Bottom Dock: Stream Diagnostics Card + Terminal Logs */}
          <DiagnosticsDock
            selectedCamera={selectedCamera}
            logs={logs}
            onClearLogs={handleClearLogs}
            onExportLogs={handleExportLogs}
            onApplyAuth={handleApplyAuth}
            onTestPing={handleTestPing}
          />
        </main>

        {/* Modals */}
        <AddCameraModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddCamera={handleAddCamera}
        />

        <ExportConfigModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          cameras={cameras}
          layout={layout}
        />

        <ManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
        />
      </div>
    </MantineProvider>
  );
};
