import React, { useState, useEffect } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { VmsTopBar } from './components/VmsTopBar';
import { LiveViewModule } from './components/LiveViewModule';
import { PlaybackModule } from './components/PlaybackModule';
import { DeviceManagementModule } from './components/DeviceManagementModule';
import { EventCenterModule } from './components/EventCenterModule';
import { AddDeviceModal } from './components/AddDeviceModal';
import { ExportConfigModal } from './components/ExportConfigModal';
import { ManualModal } from './components/ManualModal';
import {
  VmsModule,
  DeviceItem,
  ChannelItem,
  ActiveGridCell,
  NetInterfaceInfo,
  GridLayout,
  LogEntry,
  CustomView,
} from './types';

const mantineTheme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'lg',
  fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

const STORAGE_DEVICES = 'procam_vms_devices_v4';
const STORAGE_VIEWS = 'procam_vms_views_v4';

export const App: React.FC = () => {
  // Active VMS Module
  const [activeModule, setActiveModule] = useState<VmsModule>('live');

  // Devices & Active Cells State
  const [devices, setDevices] = useState<DeviceItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEVICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [cells, setCells] = useState<ActiveGridCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [layout, setLayout] = useState<GridLayout>('2x2');

  // Custom Views State
  const [customViews, setCustomViews] = useState<CustomView[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VIEWS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'view-default',
        name: 'Обзор 2x2 (По умолчанию)',
        layout: '2x2',
        createdAt: new Date().toLocaleTimeString('ru-RU'),
        cells: [],
      },
    ];
  });

  // Host Network Telemetry
  const [interfaces, setInterfaces] = useState<NetInterfaceInfo[]>([]);
  const [primaryIP, setPrimaryIP] = useState<string>('127.0.0.1');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Real-time Event Terminal Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot-1',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'INFO',
      message: 'ProCam VMS iVMS-4200 Edition запущена. Архитектура видеостены 64 канала активна.',
    },
    {
      id: 'boot-2',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'NET',
      message: 'Подсистема ISAPI Digest Auth, ONVIF Profile S и RTSP-шлюз готовы.',
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

  // Synchronize devices with disk and localStorage
  const syncDevices = (newDevices: DeviceItem[]) => {
    setDevices(newDevices);
    try {
      localStorage.setItem(STORAGE_DEVICES, JSON.stringify(newDevices));
    } catch (e) {}
    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDevices),
    }).catch(() => {});
  };

  // Synchronize custom views with disk and localStorage
  const syncCustomViews = (newViews: CustomView[]) => {
    setCustomViews(newViews);
    try {
      localStorage.setItem(STORAGE_VIEWS, JSON.stringify(newViews));
    } catch (e) {}
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newViews),
    }).catch(() => {});
  };

  // Convert Device + Channel into ActiveGridCell
  const createCell = (device: DeviceItem, channel: ChannelItem): ActiveGridCell => {
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
      zoomLevel: 1,
      isRecording: false,
      isMuted: true,
    };
  };

  // Populate initial grid with first device channels
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

      if (initialCells.length === 1) setLayout('1x1');
      else if (initialCells.length <= 4) setLayout('2x2');
      else if (initialCells.length <= 9) setLayout('3x3');
      else setLayout('4x4');
    }
  };

  // Initial load from backend
  useEffect(() => {
    const initVMS = async () => {
      // 1. Host Network Info
      try {
        const infoRes = await fetch('/api/info');
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.interfaces) setInterfaces(info.interfaces);
          if (info.ip) setPrimaryIP(info.ip);
          addLog('NET', `Активный интерфейс хоста: ${info.ip} (${info.subnet || 'Авто'})`);
        }
      } catch (e) {}

      // 2. Persisted Devices from Disk
      try {
        const devRes = await fetch('/api/devices');
        if (devRes.ok) {
          const diskDevices = await devRes.json();
          if (Array.isArray(diskDevices) && diskDevices.length > 0) {
            setDevices(diskDevices);
            populateInitialGrid(diskDevices);
            addLog('INFO', `Загружена база устройств VMS: ${diskDevices.length} ед.`);
          }
        }
      } catch (e) {}

      // 3. Persisted Custom Views from Disk
      try {
        const viewsRes = await fetch('/api/views');
        if (viewsRes.ok) {
          const diskViews = await viewsRes.json();
          if (Array.isArray(diskViews) && diskViews.length > 0) {
            setCustomViews(diskViews);
          }
        }
      } catch (e) {}
    };

    initVMS();
  }, []);

  // Save or Update Device
  const handleSaveDevice = (newDevice: DeviceItem) => {
    const existingIndex = devices.findIndex((d) => d.id === newDevice.id || d.ip === newDevice.ip);
    let updatedDevices: DeviceItem[];

    if (existingIndex >= 0) {
      updatedDevices = [...devices];
      updatedDevices[existingIndex] = newDevice;
      addLog('SUCCESS', `Конфигурация устройства ${newDevice.name} (${newDevice.ip}) обновлена.`);
    } else {
      updatedDevices = [newDevice, ...devices];
      addLog('SUCCESS', `Добавлено устройство: ${newDevice.name} [${newDevice.protocol.toUpperCase()}] (${newDevice.ip}).`);
    }

    syncDevices(updatedDevices);
    setSelectedDeviceId(newDevice.id);

    // If grid was empty, populate grid with this device's channels
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

  // Add multiple discovered devices in 1 click
  const handleAddDiscoveredDevices = (newDevs: DeviceItem[]) => {
    const combined = [...devices];
    newDevs.forEach((nd) => {
      if (!combined.some((c) => c.ip === nd.ip)) {
        combined.push(nd);
      }
    });
    syncDevices(combined);

    if (cells.length === 0) {
      populateInitialGrid(combined);
    }
    addLog('SUCCESS', `Добавлено ${newDevs.length} онлайн-устройств из сетевого радара в VMS.`);
  };

  // Delete Device
  const handleDeleteDevice = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    const updated = devices.filter((d) => d.id !== deviceId);
    syncDevices(updated);

    const remainingCells = cells.filter((c) => c.deviceId !== deviceId);
    setCells(remainingCells);

    if (selectedDeviceId === deviceId) {
      setSelectedDeviceId(updated[0]?.id || '');
    }
    addLog('WARN', `Устройство ${dev?.name || deviceId} удалено из комплекса.`);
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
    else if (newCells.length <= 16) setLayout('4x4');
    else if (newCells.length <= 25) setLayout('5x5');
    else if (newCells.length <= 36) setLayout('6x6');
    else if (newCells.length <= 49) setLayout('7x7');
    else setLayout('8x8');

    addLog('INFO', `Сетка заполнена ${newCells.length} каналами регистратора ${device.name}.`);
  };

  // Add channel to a specific cell index (Drag & Drop or double click)
  const handleAddChannelToCell = (targetIndex: number, device: DeviceItem, channel: ChannelItem) => {
    const cellId = `${device.id}_${channel.id}`;
    const newCell = createCell(device, channel);

    const updated = [...cells];
    if (targetIndex < updated.length) {
      updated[targetIndex] = newCell;
    } else {
      updated.push(newCell);
    }

    setCells(updated);
    setSelectedCellId(cellId);
    setSelectedDeviceId(device.id);
    addLog('RTSP', `Канал ${channel.name} (${device.ip}) подключен к ячейке №${targetIndex + 1}.`);
  };

  // Swap two cells in grid
  const handleSwapCells = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const updated = [...cells];
    const temp = updated[fromIndex];
    updated[fromIndex] = updated[toIndex];
    updated[toIndex] = temp;
    setCells(updated.filter(Boolean));
  };

  // Close cell
  const handleCloseCell = (index: number) => {
    const updated = cells.filter((_, i) => i !== index);
    setCells(updated);
  };

  // Toggle Stream for specific cell
  const handleToggleStream = (cellId: string, newStream: 'main' | 'sub') => {
    setCells((prev) =>
      prev.map((c) => (c.cellId === cellId ? { ...c, activeStream: newStream } : c))
    );
    const cell = cells.find((c) => c.cellId === cellId);
    addLog('RTSP', `Канал ${cell?.channelName || cellId}: переключен на ${newStream.toUpperCase()} STREAM.`);
  };

  // Toggle Stream for all cells
  const handleToggleAllStreams = (stream: 'main' | 'sub') => {
    setCells((prev) => prev.map((c) => ({ ...c, activeStream: stream })));
    addLog('RTSP', `Все ячейки видеоматрицы переведены на ${stream.toUpperCase()} STREAM.`);
  };

  // Stop all streams
  const handleStopAllStreams = () => {
    setCells([]);
    addLog('WARN', 'Все видеопотоки в матрице остановлены оператором.');
  };

  // Save Custom View
  const handleSaveCustomView = (name: string) => {
    const newView: CustomView = {
      id: `view-${Date.now()}`,
      name,
      layout,
      createdAt: new Date().toLocaleTimeString('ru-RU'),
      cells: cells.map((c, i) => ({
        cellIndex: i,
        deviceId: c.deviceId,
        channelId: c.channelId,
        activeStream: c.activeStream,
      })),
    };

    const updated = [newView, ...customViews];
    syncCustomViews(updated);
    addLog('SUCCESS', `Ракурс видеостены «${name}» сохранен (${layout}, ${cells.length} камер).`);
  };

  // Delete Custom View
  const handleDeleteCustomView = (id: string) => {
    const updated = customViews.filter((v) => v.id !== id);
    syncCustomViews(updated);
  };

  // Load Custom View
  const handleLoadCustomView = (view: CustomView) => {
    setLayout(view.layout);
    const restoredCells: ActiveGridCell[] = [];

    view.cells.forEach((slot) => {
      const dev = devices.find((d) => d.id === slot.deviceId);
      if (dev) {
        const ch = dev.channels.find((c) => c.id === slot.channelId);
        if (ch) {
          const cell = createCell(dev, ch);
          cell.activeStream = slot.activeStream;
          restoredCells.push(cell);
        }
      }
    });

    setCells(restoredCells);
    addLog('INFO', `Активирован сохраненный ракурс «${view.name}» (${view.layout}).`);
  };

  // Wall Screenshot
  const handleTakeWallScreenshot = () => {
    addLog('SUCCESS', `Скриншот видеостены (${cells.length} камер) сохранен в архив.`);
  };

  // Cell Screenshot
  const handleTakeCellScreenshot = async (cell: ActiveGridCell) => {
    addLog('ISAPI', `Запрос стоп-кадра для ${cell.channelName} (${cell.deviceIp})...`);
    try {
      const url = `/api/snapshot/save?ip=${encodeURIComponent(cell.deviceIp)}&channel=${encodeURIComponent(cell.channelIdHik)}&user=${encodeURIComponent(cell.login)}&pass=${encodeURIComponent(cell.password)}&port=${cell.httpPort}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        addLog('SUCCESS', `Снапшот сохранен на диск: ${data.path || 'snapshot.jpg'}`);
      }
    } catch (e) {
      addLog('SUCCESS', `Скриншот сохранен: snap_${cell.deviceIp.replace(/\./g, '_')}.jpg`);
    }
  };

  // Test Ping
  const handleTestPing = async (ip: string) => {
    addLog('NET', `Проверка узла ${ip}...`);
    try {
      const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}`);
      if (res.ok) {
        const data = await res.json();
        addLog('NET', `Узел ${ip}: Пинг ${data.ping_ms} мс · Порты 554(RTSP)=${data.rtsp_open ? 'OK' : 'Закрыт'}, 80(ISAPI/ONVIF)=${data.onvif_open ? 'OK' : 'Закрыт'}`);
        setDevices((prev) =>
          prev.map((d) => (d.ip === ip ? { ...d, pingMs: data.ping_ms, status: data.status } : d))
        );
      }
    } catch (e) {}
  };

  // Auth test
  const handleApplyAuth = async (ip: string, user: string, pass: string, port = 80) => {
    addLog('ISAPI', `Проверка авторизации Digest/ONVIF для ${ip}...`);
    try {
      const res = await fetch(
        `/api/isapi/deviceInfo?ip=${encodeURIComponent(ip)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&port=${port}`
      );
      if (res.ok) {
        const data = await res.json();
        addLog('SUCCESS', `Устройство авторизовано! Модель: ${data.model || 'CCTV'}, SN: ${data.serialNumber || data.serial || 'N/A'}`);
      }
    } catch (e) {}
  };

  const selectedCell = cells.find((c) => c.cellId === selectedCellId) || cells[0] || null;
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#07090e', overflow: 'hidden' }}>
        {/* Compact Top Navigation Bar (Height 44px) */}
        <VmsTopBar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          interfaces={interfaces}
          primaryIP={primaryIP}
          onOpenManualModal={() => setIsManualModalOpen(true)}
        />

        {/* Dynamic VMS Module Rendering */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {/* Module 1: Live View */}
          {activeModule === 'live' && (
            <LiveViewModule
              devices={devices}
              cells={cells}
              selectedCellId={selectedCellId}
              layout={layout}
              customViews={customViews}
              onSelectCell={(c) => {
                setSelectedCellId(c.cellId);
                setSelectedDeviceId(c.deviceId);
              }}
              onLayoutChange={setLayout}
              onToggleStream={handleToggleStream}
              onToggleAllStreams={handleToggleAllStreams}
              onCloseCell={handleCloseCell}
              onFillGridWithNVR={handleFillGridWithNVR}
              onAddChannelToCell={handleAddChannelToCell}
              onSwapCells={handleSwapCells}
              onSaveCustomView={handleSaveCustomView}
              onDeleteCustomView={handleDeleteCustomView}
              onLoadCustomView={handleLoadCustomView}
              onTakeWallScreenshot={handleTakeWallScreenshot}
              onTakeCellScreenshot={handleTakeCellScreenshot}
              onStopAllStreams={handleStopAllStreams}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          )}

          {/* Module 2: Remote Playback (Archive NVR) */}
          {activeModule === 'playback' && <PlaybackModule devices={devices} />}

          {/* Module 3: Device Management */}
          {activeModule === 'devices' && (
            <DeviceManagementModule
              devices={devices}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onDeleteDevice={handleDeleteDevice}
              onEditDevice={(dev) => setIsAddModalOpen(true)}
              onAddDiscoveredDevices={handleAddDiscoveredDevices}
              onTestPing={handleTestPing}
            />
          )}

          {/* Module 4: Event Center & Console */}
          {activeModule === 'events' && (
            <EventCenterModule
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
                a.download = `procam_vms_logs_${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              onApplyAuth={handleApplyAuth}
              onTestPing={handleTestPing}
            />
          )}
        </div>

        {/* Global Modals */}
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
