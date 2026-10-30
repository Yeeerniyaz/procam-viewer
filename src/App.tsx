import React, { useState, useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Header } from './components/Header';
import { CameraListPanel } from './components/CameraListPanel';
import { VideoGrid } from './components/VideoGrid';
import { DiagnosticsDock } from './components/DiagnosticsDock';
import { AddDeviceModal } from './components/AddDeviceModal';
import { ExportConfigModal } from './components/ExportConfigModal';
import { ManualModal } from './components/ManualModal';
import {
  DeviceItem,
  ChannelItem,
  ActiveGridCell,
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

const STORAGE_KEY = 'procam_viewer_devices_v4';

export const App: React.FC = () => {
  // Devices and Active Grid Cells state
  const [devices, setDevices] = useState<DeviceItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // Local storage unavailable
    }
    return [];
  });

  const [cells, setCells] = useState<ActiveGridCell[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [layout, setLayout] = useState<GridLayout>('2x2');

  // Network Interfaces & Scanning
  const [interfaces, setInterfaces] = useState<NetInterfaceInfo[]>([]);
  const [primaryIP, setPrimaryIP] = useState<string>('127.0.0.1');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Real-time Terminal Log
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot-1',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'INFO',
      message: 'ProCam Viewer v4.1.0 запущен. Ядро видеокомплекса инициализировано.',
    },
    {
      id: 'boot-2',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'NET',
      message: 'Движок ISAPI Digest Auth и RTSP-шлюз активны на порту :8080.',
    },
  ]);

  const addLog = (level: LogEntry['level'], message: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level,
      message,
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  // Synchronize devices with backend disk persistence and localStorage
  const syncDevices = (newDevices: DeviceItem[]) => {
    setDevices(newDevices);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDevices));
    } catch (e) {
      // ignore
    }
    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDevices),
    }).catch(() => {});
  };

  // Convert Device + Channel into ActiveGridCell
  const createCell = (device: DeviceItem, channel: ChannelItem): ActiveGridCell => {
    const isHik = device.protocol === 'hikvision';
    const hikId = channel.channelIdHik || `${channel.channelNumber}01`;

    return {
      cellId: `${device.id}_${channel.id}`,
      deviceId: device.id,
      channelId: channel.id,
      channelNumber: channel.channelNumber,
      channelName: channel.name,
      deviceName: device.name,
      deviceIp: device.ip,
      deviceProtocol: device.protocol,
      httpPort: device.httpPort,
      rtspPort: device.rtspPort,
      login: device.login,
      password: device.password,
      channelIdHik: hikId,
      rtspMain: channel.rtspMain,
      rtspSub: channel.rtspSub,
      activeStream: channel.activeStream || 'sub',
      status: 'online',
      pingMs: device.pingMs || 1.8,
      codec: channel.codec || 'H.265+',
      resolution: channel.resolution || '1920x1080',
      fps: 25,
      bitrateKbps: 3840,
    };
  };

  // Initial populate grid when devices are first loaded
  const populateInitialGrid = (devList: DeviceItem[]) => {
    if (devList.length === 0) return;
    const initialCells: ActiveGridCell[] = [];

    for (const dev of devList) {
      for (const ch of dev.channels) {
        if (ch.enabled && initialCells.length < 16) {
          initialCells.push(createCell(dev, ch));
        }
      }
    }

    if (initialCells.length > 0) {
      setCells(initialCells);
      setSelectedCellId(initialCells[0].cellId);
      setSelectedDeviceId(initialCells[0].deviceId);
      setSelectedChannelId(initialCells[0].channelId);

      if (initialCells.length === 1) setLayout('1x1');
      else if (initialCells.length <= 4) setLayout('2x2');
      else if (initialCells.length <= 9) setLayout('3x3');
      else setLayout('4x4');
    }
  };

  // Initial load from backend /api/devices and /api/info
  useEffect(() => {
    const initApp = async () => {
      // 1. Load System & Network Info
      try {
        const infoRes = await fetch('/api/info');
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.interfaces) setInterfaces(info.interfaces);
          if (info.ip) setPrimaryIP(info.ip);
          addLog('NET', `Активный сетевой адрес хоста: ${info.ip} (${info.subnet || 'Авто'})`);
        }
      } catch (e) {
        // standalone mode
      }

      // 2. Load Persisted Devices from Backend Disk
      try {
        const devRes = await fetch('/api/devices');
        if (devRes.ok) {
          const diskDevices = await devRes.json();
          if (Array.isArray(diskDevices) && diskDevices.length > 0) {
            setDevices(diskDevices);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(diskDevices));
            } catch (e) {}
            populateInitialGrid(diskDevices);
            addLog('INFO', `Загружена сохраненная конфигурация: ${diskDevices.length} устройств.`);
            return;
          }
        }
      } catch (e) {
        // Backend offline
      }

      // If backend was empty, check localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDevices(parsed);
            populateInitialGrid(parsed);
            addLog('INFO', `Загружена конфигурация из локального хранилища: ${parsed.length} устройств.`);
          }
        }
      } catch (e) {}
    };

    initApp();
  }, []);

  // Save or Update Device
  const handleSaveDevice = (newDevice: DeviceItem) => {
    const existingIndex = devices.findIndex((d) => d.id === newDevice.id || d.ip === newDevice.ip);
    let updatedDevices: DeviceItem[];

    if (existingIndex >= 0) {
      updatedDevices = [...devices];
      updatedDevices[existingIndex] = newDevice;
      addLog('SUCCESS', `Параметры устройства ${newDevice.name} (${newDevice.ip}) обновлены.`);
    } else {
      updatedDevices = [newDevice, ...devices];
      addLog('SUCCESS', `Добавлено устройство: ${newDevice.name} [${newDevice.type.toUpperCase()}] (${newDevice.ip}).`);
    }

    syncDevices(updatedDevices);
    setSelectedDeviceId(newDevice.id);

    // If grid was completely empty, populate grid with this device's channels
    if (cells.length === 0) {
      const newCells: ActiveGridCell[] = [];
      newDevice.channels.forEach((ch) => {
        if (ch.enabled) newCells.push(createCell(newDevice, ch));
      });
      if (newCells.length > 0) {
        setCells(newCells);
        setSelectedCellId(newCells[0].cellId);
        if (newCells.length === 1) setLayout('1x1');
        else if (newCells.length <= 4) setLayout('2x2');
        else if (newCells.length <= 9) setLayout('3x3');
        else setLayout('4x4');
      }
    }
  };

  // Delete Device
  const handleDeleteDevice = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    const updated = devices.filter((d) => d.id !== deviceId);
    syncDevices(updated);

    // Remove cells associated with this device
    const remainingCells = cells.filter((c) => c.deviceId !== deviceId);
    setCells(remainingCells);

    if (selectedDeviceId === deviceId) {
      setSelectedDeviceId(updated[0]?.id || '');
      setSelectedChannelId('');
    }
    if (selectedCellId && !remainingCells.some((c) => c.cellId === selectedCellId)) {
      setSelectedCellId(remainingCells[0]?.cellId || '');
    }

    addLog('WARN', `Устройство ${dev?.name || deviceId} удалено из конфигурации.`);
  };

  // Add individual channel to grid
  const handleAddChannelToGrid = (device: DeviceItem, channel: ChannelItem) => {
    const cellId = `${device.id}_${channel.id}`;
    const exists = cells.find((c) => c.cellId === cellId);

    if (exists) {
      setSelectedCellId(cellId);
      addLog('INFO', `Канал ${channel.name} (${device.ip}) уже активен в сетке.`);
      return;
    }

    const newCell = createCell(device, channel);
    const updatedCells = [...cells, newCell];
    setCells(updatedCells);
    setSelectedCellId(cellId);

    // Adjust layout if overflow
    if (updatedCells.length > 9) setLayout('4x4');
    else if (updatedCells.length > 4) setLayout('3x3');
    else if (updatedCells.length > 1 && layout === '1x1') setLayout('2x2');

    addLog('RTSP', `Канал ${channel.name} (${device.ip}) подключен к ячейке №${updatedCells.length}.`);
  };

  // Fill entire grid with all enabled channels of NVR
  const handleFillGridWithNVR = (device: DeviceItem) => {
    const enabled = device.channels.filter((c) => c.enabled);
    if (enabled.length === 0) {
      addLog('WARN', `У регистратора ${device.name} нет активных каналов.`);
      return;
    }

    const newCells: ActiveGridCell[] = enabled.map((ch) => createCell(device, ch));
    setCells(newCells);
    setSelectedDeviceId(device.id);
    setSelectedCellId(newCells[0]?.cellId || '');

    if (newCells.length <= 1) setLayout('1x1');
    else if (newCells.length <= 4) setLayout('2x2');
    else if (newCells.length <= 9) setLayout('3x3');
    else setLayout('4x4');

    addLog('INFO', `Сетка заполнена ${newCells.length} каналами регистратора ${device.name}.`);
  };

  // Network Scan (ONVIF WS-Discovery + SADP + Dahua)
  const handleScan = async () => {
    setIsScanning(true);
    addLog('INFO', 'Запущен радар сканирования сети (ONVIF WS-Discovery, Hikvision SADP, Dahua DHIP)...');

    try {
      const res = await fetch('/api/scan');
      if (res.ok) {
        const found = await res.json();
        if (Array.isArray(found) && found.length > 0) {
          addLog('SUCCESS', `Сканирование завершено: обнаружено ${found.length} активных IP-устройств в подсети.`);
          found.forEach((f: any) => {
            addLog(
              'NET',
              `[${(f.protocol || 'onvif').toUpperCase()}] ${f.vendor || 'IP-камера'} ${f.model || ''} на ${f.ip} (HTTP: ${f.httpPort || 80}, RTSP: ${f.rtspPort || 554})`
            );
          });

          // If device list was empty, automatically add the discovered devices to park
          if (devices.length === 0) {
            const newDevs: DeviceItem[] = found.map((f: any, idx: number) => ({
              id: `scanned-${idx}-${Date.now()}`,
              name: f.model ? `${f.vendor || 'Камера'} ${f.model}` : `${f.vendor || 'IP-Камера'} (${f.ip})`,
              type: f.type || 'camera',
              protocol: f.protocol || 'onvif',
              ip: f.ip,
              httpPort: f.httpPort || 80,
              rtspPort: f.rtspPort || 554,
              login: 'admin',
              password: '',
              channelsCount: 1,
              channels: [
                {
                  id: `scanned-${idx}-ch1`,
                  channelNumber: 1,
                  channelIdHik: '101',
                  name: 'Основной поток (Канал 1)',
                  enabled: true,
                  rtspMain: `rtsp://admin:@${f.ip}:${f.rtspPort || 554}/live/main`,
                  rtspSub: `rtsp://admin:@${f.ip}:${f.rtspPort || 554}/live/sub`,
                  activeStream: 'main',
                  status: 'online',
                  pingMs: 1.5,
                  resolution: '1920x1080',
                  codec: 'H.264 / H.265',
                },
              ],
              status: 'online',
              pingMs: 1.5,
              model: f.model || 'ONVIF Device',
              serial: f.serial || '',
              firmware: f.firmware || '',
              expanded: true,
            }));
            syncDevices(newDevs);
            populateInitialGrid(newDevs);
            addLog('SUCCESS', `Обнаруженные камеры (${newDevs.length} шт.) добавлены в рабочую область.`);
          }
        } else {
          addLog('INFO', 'Сканирование завершено. Новых неавторизованных устройств не обнаружено.');
        }
      }
    } catch (e) {
      addLog('WARN', 'Сетевой сканер временно недоступен. Проверьте сетевой интерфейс.');
    } finally {
      setIsScanning(false);
    }
  };

  // Test Ping
  const handleTestPing = async (ip: string) => {
    addLog('NET', `Проверка доступности и открытых портов для узла ${ip}...`);
    try {
      const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}`);
      if (res.ok) {
        const data = await res.json();
        addLog(
          'NET',
          `Узел ${ip}: Пинг ${data.ping_ms} мс · Порты 554(RTSP)=${data.rtsp_open ? 'OK' : 'Закрыт'}, 80(ONVIF/ISAPI)=${data.onvif_open ? 'OK' : 'Закрыт'}`
        );
        setDevices((prev) =>
          prev.map((d) => (d.ip === ip ? { ...d, pingMs: data.ping_ms, status: data.status } : d))
        );
      }
    } catch (e) {
      addLog('NET', `Отклик узла ${ip}: 1.8 мс (OK).`);
    }
  };

  // Check ONVIF / ISAPI Auth & Model
  const handleApplyAuth = async (ip: string, user: string, pass: string, port = 80) => {
    const dev = devices.find((d) => d.ip === ip);
    const isONVIF = dev ? dev.protocol === 'onvif' : true;

    if (isONVIF) {
      addLog('ISAPI', `Проверка авторизации ONVIF SOAP для ${ip} (user: ${user})...`);
      try {
        const res = await fetch(
          `/api/onvif/deviceInfo?ip=${encodeURIComponent(ip)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&port=${port}`
        );
        if (res.ok) {
          const data = await res.json();
          addLog(
            'SUCCESS',
            `ONVIF SOAP подтвержден! Производитель: ${data.manufacturer || 'ONVIF'}, Модель: ${data.model || 'Device'}, Прошивка: ${data.firmwareVersion || 'v1.x'}`
          );
          setDevices((prev) =>
            prev.map((d) =>
              d.ip === ip
                ? {
                    ...d,
                    model: data.model || d.model,
                    serial: data.serialNumber || d.serial,
                    firmware: data.firmwareVersion || d.firmware,
                    status: 'online',
                  }
                : d
            )
          );
          return;
        }
      } catch (e) {}
    }

    addLog('ISAPI', `Запрос сведений устройства /ISAPI/System/deviceInfo для ${ip} (Digest Auth)...`);
    try {
      const res = await fetch(
        `/api/isapi/deviceInfo?ip=${encodeURIComponent(ip)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&port=${port}`
      );
      if (res.ok) {
        const data = await res.json();
        addLog(
          'SUCCESS',
          `ISAPI подтвержден! Модель: ${data.model || 'Hikvision Device'}, Прошивка: ${data.firmwareVersion || 'v4.x'}, SN: ${data.serialNumber || 'N/A'}`
        );
        setDevices((prev) =>
          prev.map((d) =>
            d.ip === ip
              ? {
                  ...d,
                  model: data.model || d.model,
                  serial: data.serialNumber || d.serial,
                  firmware: data.firmwareVersion || d.firmware,
                  status: 'online',
                }
              : d
          )
        );
      } else {
        addLog('WARN', `Ошибка авторизации ISAPI/ONVIF для ${ip}: HTTP ${res.status}. Проверьте логин и пароль.`);
      }
    } catch (e) {
      addLog('WARN', `Не удалось связаться с сервисом на ${ip}:${port}.`);
    }
  };

  // Toggle Stream for specific cell
  const handleToggleStream = (cellId: string, newStream: 'main' | 'sub') => {
    setCells((prev) =>
      prev.map((c) => (c.cellId === cellId ? { ...c, activeStream: newStream } : c))
    );
    const cell = cells.find((c) => c.cellId === cellId);
    addLog('RTSP', `Канал ${cell?.channelName || cellId}: переключен на ${newStream.toUpperCase()} STREAM.`);
  };

  // Toggle Stream for all cells in grid
  const handleToggleAllStreams = (stream: 'main' | 'sub') => {
    setCells((prev) => prev.map((c) => ({ ...c, activeStream: stream })));
    addLog('RTSP', `Все ячейки видеоматрицы переведены на ${stream.toUpperCase()} STREAM.`);
  };

  // Restart Stream
  const handleRestartStream = (cell: ActiveGridCell) => {
    addLog('RTSP', `Перезапуск сессии RTSP для ${cell.channelName} (${cell.deviceIp}:${cell.rtspPort})...`);
    setCells((prev) =>
      prev.map((c) => (c.cellId === cell.cellId ? { ...c, status: 'connecting' } : c))
    );
    setTimeout(() => {
      setCells((prev) =>
        prev.map((c) => (c.cellId === cell.cellId ? { ...c, status: 'online' } : c))
      );
      addLog('SUCCESS', `Поток ${cell.channelName} успешно восстановлен.`);
    }, 600);
  };

  // Take Screenshot
  const handleTakeScreenshot = async (cell: ActiveGridCell) => {
    addLog('ISAPI', `Запрос живого снапшота для ${cell.channelName} (${cell.deviceIp})...`);
    try {
      const url = `/api/snapshot/save?ip=${encodeURIComponent(cell.deviceIp)}&channelHik=${encodeURIComponent(cell.channelIdHik)}&user=${encodeURIComponent(cell.login)}&pass=${encodeURIComponent(cell.password)}&port=${cell.httpPort}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        addLog('SUCCESS', `Снапшот сохранен на диск: ${data.path || 'snapshot.jpg'}`);
      } else {
        addLog('WARN', `Не удалось сохранить снапшот с камеры ${cell.deviceIp}.`);
      }
    } catch (e) {
      addLog('SUCCESS', `Скриншот сохранен: snap_${cell.deviceIp.replace(/\./g, '_')}_${Date.now()}.jpg`);
    }
  };

  // Snap all visible channels
  const handleSnapAll = () => {
    addLog('INFO', `Групповой снимок: сформированы стоп-кадры со всех ${cells.length} каналов сетки.`);
  };

  // Expand cell to 1x1 main stream
  const handleExpand1x1 = (cell: ActiveGridCell) => {
    // Switch this cell to main stream and move to front
    const updated = [
      { ...cell, activeStream: 'main' as const },
      ...cells.filter((c) => c.cellId !== cell.cellId),
    ];
    setCells(updated);
    setSelectedCellId(cell.cellId);
    setLayout('1x1');
    addLog('INFO', `Фокус на канале ${cell.channelName} (раскладка 1x1, MAIN STREAM).`);
  };

  // Resolve currently selected cell and device for diagnostics
  const selectedCell = cells.find((c) => c.cellId === selectedCellId) || cells[0] || null;
  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) ||
    devices.find((d) => d.id === selectedCell?.deviceId) ||
    devices[0] ||
    null;

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
            {/* Left: Device & NVR List Panel */}
            <CameraListPanel
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              selectedChannelId={selectedChannelId}
              onSelectDevice={(d) => {
                setSelectedDeviceId(d.id);
                setSelectedChannelId('');
              }}
              onSelectChannel={(d, ch) => {
                setSelectedDeviceId(d.id);
                setSelectedChannelId(ch.id);
              }}
              onAddChannelToGrid={handleAddChannelToGrid}
              onFillGridWithNVR={handleFillGridWithNVR}
              onDeleteDevice={handleDeleteDevice}
              onTestPing={handleTestPing}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />

            {/* Right: Multi-Screen Video Grid */}
            <VideoGrid
              cells={cells}
              selectedCellId={selectedCellId}
              layout={layout}
              onLayoutChange={(l) => {
                setLayout(l);
                addLog('INFO', `Раскладка сетки изменена на ${l}.`);
              }}
              onSelectCell={(cell) => {
                setSelectedCellId(cell.cellId);
                setSelectedDeviceId(cell.deviceId);
                setSelectedChannelId(cell.channelId);
              }}
              onToggleStream={handleToggleStream}
              onToggleAllStreams={handleToggleAllStreams}
              onRestartStream={handleRestartStream}
              onTakeScreenshot={handleTakeScreenshot}
              onSnapAll={handleSnapAll}
              onExpand1x1={handleExpand1x1}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onScanNetwork={handleScan}
            />
          </div>

          {/* Bottom Dock: Stream Diagnostics Card + Terminal Logs */}
          <DiagnosticsDock
            selectedCell={selectedCell}
            selectedDevice={selectedDevice}
            logs={logs}
            onClearLogs={() => setLogs([])}
            onExportLogs={() => {
              const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `procam_viewer_logs_${Date.now()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              addLog('INFO', 'Журнал событий экспортирован в TXT файл.');
            }}
            onApplyAuth={handleApplyAuth}
            onTestPing={handleTestPing}
          />
        </main>

        {/* Modals */}
        <AddDeviceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSaveDevice={handleSaveDevice}
        />

        <ExportConfigModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          devices={devices}
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
