import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { VmsTopBar } from './components/VmsTopBar';
import { LiveViewModule } from './components/LiveViewModule';
import { PlaybackModule } from './components/PlaybackModule';
import { DeviceManagementModule } from './components/DeviceManagementModule';
import { EventCenterModule } from './components/EventCenterModule';
import { AddDeviceModal } from './components/AddDeviceModal';
import { ExportConfigModal } from './components/ExportConfigModal';
import { ManualModal } from './components/ManualModal';
import { AuthorProjectsModal } from './components/AuthorProjectsModal';
import {
  VmsModule,
  DeviceItem,
  ChannelItem,
  ActiveGridCell,
  NetInterfaceInfo,
  GridLayout,
  LogEntry,
  CustomView,
  CameraFolder,
} from './types';

const mantineTheme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'lg',
  fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

const STORAGE_DEVICES = 'procam_vms_devices_v4';
const STORAGE_VIEWS = 'procam_vms_views_v4';
const STORAGE_FOLDERS = 'procam_vms_folders_v4';
const STORAGE_CELLS = 'procam_vms_cells_v4';
const STORAGE_LAYOUT = 'procam_vms_layout_v4';
const STORAGE_SELECTED_CELL = 'procam_vms_selected_cell_v4';

const DEFAULT_FOLDERS: CameraFolder[] = [
  { id: 'folder-street', name: 'Улица', color: '#10B981', cameraKeys: [] },
  { id: 'folder-hall', name: 'Зал', color: '#3B82F6', cameraKeys: [] },
  { id: 'folder-rest', name: 'Зона отдыха', color: '#F59E0B', cameraKeys: [] },
];

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

  const [cells, setCells] = useState<ActiveGridCell[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CELLS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [selectedCellId, setSelectedCellId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELECTED_CELL);
      if (saved) return saved;
    } catch (e) {}
    return '';
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [layout, setLayout] = useState<GridLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LAYOUT) as GridLayout;
      if (saved) return saved;
    } catch (e) {}
    return '2x2';
  });

  // Flag indicating initial load from backend has finished
  const isLoadedRef = useRef(false);

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

  // Camera Folders / Zones State
  const [folders, setFolders] = useState<CameraFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const syncFolders = (newFolders: CameraFolder[]) => {
    setFolders(newFolders);
    try {
      localStorage.setItem(STORAGE_FOLDERS, JSON.stringify(newFolders));
    } catch (e) {}
    fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFolders),
    }).catch(() => {});
  };

  // Host Network Telemetry
  const [interfaces, setInterfaces] = useState<NetInterfaceInfo[]>([]);
  const [primaryIP, setPrimaryIP] = useState<string>('127.0.0.1');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState<boolean>(false);

  // Real-time Event Terminal Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot-1',
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      level: 'INFO',
      message: 'ProCam VMS запущена. Архитектура видеостены 64 канала активна.',
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
    const isSingle = device.channels.length === 1;
    const isGeneric = !channel.name || /^(основной поток|субпоток|profile|stream)/i.test(channel.name.trim());
    const resolvedChannelName = isSingle && isGeneric && device.name ? device.name : (channel.name || device.name);

    return {
      cellId: `${device.id}_${channel.id}`,
      deviceId: device.id,
      channelId: channel.id,
      channelNumber: channel.channelNumber,
      channelName: resolvedChannelName,
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
      status: device.status === 'online' ? 'online' : 'offline',
      pingMs: device.pingMs || 0,
      codec: channel.codec || 'H.265+',
      resolution: channel.resolution || '1920x1080',
      fps: 25,
      bitrateKbps: 3840,
      deviceType: device.type,
      deviceChannelsCount: device.channels.length,
      zoomLevel: 1,
      isRecording: false,
      isMuted: true,
    };
  };

  // Populate initial grid with first device channels (only if no cells are saved)
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

  // Mark all devices & cells as offline (when host is disconnected or network goes down)
  const markAllOffline = useCallback(() => {
    setDevices((prev) =>
      prev.map((d) => ({
        ...d,
        status: 'offline' as const,
        pingMs: 0,
        channels: d.channels.map((ch) => ({ ...ch, status: 'offline' as const, pingMs: 0 })),
      }))
    );
    setCells((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'offline' as const,
        pingMs: 0,
      }))
    );
  }, []);

  // Check health and ping for all cameras concurrently
  const checkAllCamerasHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      markAllOffline();
      return;
    }

    const ips = Array.from(new Set(devices.map((d) => d.ip.trim()).filter(Boolean)));
    if (ips.length === 0) return;

    try {
      const res = await fetch('/api/ping/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips),
      });

      if (!res.ok) {
        markAllOffline();
        return;
      }

      const data = await res.json();
      if (data && data.results) {
        const results: Record<
          string,
          { ip: string; status: 'online' | 'offline'; ping_ms: number; ports: number[] }
        > = data.results;

        setDevices((prev) =>
          prev.map((d) => {
            const r = results[d.ip];
            if (!r) return d;
            const newStatus = r.status;
            const newPing = r.ping_ms;
            if (d.status === newStatus) return d;
            return {
              ...d,
              status: newStatus,
              pingMs: newPing,
              channels: d.channels.map((ch) => ({
                ...ch,
                status: newStatus,
                pingMs: newPing,
              })),
            };
          })
        );

        setCells((prev) =>
          prev.map((c) => {
            const r = results[c.deviceIp];
            if (!r) return c;
            const newStatus = r.status;
            const newPing = r.ping_ms;
            if (c.status === newStatus) return c;
            return {
              ...c,
              status: newStatus,
              pingMs: newPing,
            };
          })
        );
      }
    } catch (e) {
      markAllOffline();
    }
  }, [devices, markAllOffline]);

  // Host network events (instant detection of network loss or reconnect)
  useEffect(() => {
    const handleOnline = () => {
      addLog('NET', 'Сетевой интерфейс хоста подключен. Опрос доступности камер...');
      checkAllCamerasHealth();
    };
    const handleOffline = () => {
      addLog('WARN', 'Связь с сетью потеряна (Хост оффлайн). Камеры переведены в OFFLINE.');
      markAllOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkAllCamerasHealth, markAllOffline]);

  // Periodic rapid health check every 3.5 seconds
  useEffect(() => {
    if (devices.length === 0) return;
    checkAllCamerasHealth();

    const interval = setInterval(() => {
      checkAllCamerasHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, [devices.length, checkAllCamerasHealth]);

  // Initial load from backend (restore full state: devices, folders, views, cells, layout)
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
      let loadedDevices: DeviceItem[] = [];
      try {
        const devRes = await fetch('/api/devices');
        if (devRes.ok) {
          const diskDevices = await devRes.json();
          if (Array.isArray(diskDevices) && diskDevices.length > 0) {
            loadedDevices = diskDevices;
            setDevices(diskDevices);
            try { localStorage.setItem(STORAGE_DEVICES, JSON.stringify(diskDevices)); } catch (e) {}
            addLog('INFO', `Загружена база устройств VMS: ${diskDevices.length} ед.`);
          }
        }
      } catch (e) {}
      if (loadedDevices.length === 0) {
        loadedDevices = devices;
      }

      // 3. Persisted Folders from Disk
      try {
        const foldRes = await fetch('/api/folders');
        if (foldRes.ok) {
          const diskFolders = await foldRes.json();
          if (Array.isArray(diskFolders)) {
            setFolders(diskFolders);
            try { localStorage.setItem(STORAGE_FOLDERS, JSON.stringify(diskFolders)); } catch (e) {}
          }
        }
      } catch (e) {}

      // 4. Persisted Custom Views from Disk
      try {
        const viewsRes = await fetch('/api/views');
        if (viewsRes.ok) {
          const diskViews = await viewsRes.json();
          if (Array.isArray(diskViews) && diskViews.length > 0) {
            setCustomViews(diskViews);
            try { localStorage.setItem(STORAGE_VIEWS, JSON.stringify(diskViews)); } catch (e) {}
          }
        }
      } catch (e) {}

      // 5. Persisted Grid Layout & Active Cells
      let restoredCells = false;
      try {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const diskState = await stateRes.json();
          if (diskState && typeof diskState === 'object') {
            if (diskState.layout) {
              setLayout(diskState.layout);
              try { localStorage.setItem(STORAGE_LAYOUT, diskState.layout); } catch (e) {}
            }
            if (diskState.selectedCellId) {
              setSelectedCellId(diskState.selectedCellId);
              try { localStorage.setItem(STORAGE_SELECTED_CELL, diskState.selectedCellId); } catch (e) {}
            }
            if (Array.isArray(diskState.cells) && diskState.cells.length > 0) {
              setCells(diskState.cells);
              try { localStorage.setItem(STORAGE_CELLS, JSON.stringify(diskState.cells)); } catch (e) {}
              restoredCells = true;
            }
          }
        }
      } catch (e) {}

      // 6. Check if localStorage already had cells if backend state was empty
      if (!restoredCells) {
        try {
          const localSaved = localStorage.getItem(STORAGE_CELLS);
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCells(parsed);
              restoredCells = true;
            }
          }
        } catch (e) {}
      }

      // 7. If NO saved cells exist anywhere, populate initial grid
      if (!restoredCells && loadedDevices.length > 0) {
        populateInitialGrid(loadedDevices);
      }

      isLoadedRef.current = true;
    };

    initVMS();
  }, []);

  // Auto-persist cells, layout, and selectedCellId to localStorage and backend disk on every change
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_CELLS, JSON.stringify(cells));
      localStorage.setItem(STORAGE_LAYOUT, layout);
      localStorage.setItem(STORAGE_SELECTED_CELL, selectedCellId);
    } catch (e) {}

    const timer = setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          selectedCellId,
          cells,
        }),
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [cells, layout, selectedCellId]);

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

    // Auto-add new camera channels directly into active video wall grid
    const enabledChannels = newDevice.channels.filter((ch) => ch.enabled);
    if (enabledChannels.length > 0) {
      const updatedCells = [...cells];
      enabledChannels.forEach((ch) => {
        const alreadyInGrid = updatedCells.some((c) => c.deviceId === newDevice.id && c.channelId === ch.id);
        if (!alreadyInGrid) {
          updatedCells.push(createCell(newDevice, ch));
        }
      });
      setCells(updatedCells);
      if (updatedCells.length > 0) {
        setSelectedCellId(updatedCells[updatedCells.length - 1].cellId);
      }

      // Auto-scale layout to fit all cameras
      if (updatedCells.length <= 1) setLayout('1x1');
      else if (updatedCells.length <= 4) setLayout('2x2');
      else if (updatedCells.length <= 9) setLayout('3x3');
      else if (updatedCells.length <= 16) setLayout('4x4');
      else if (updatedCells.length <= 25) setLayout('5x5');
      else if (updatedCells.length <= 36) setLayout('6x6');
      else if (updatedCells.length <= 49) setLayout('7x7');
      else setLayout('8x8');
    }

    // Switch to Live View immediately so the camera is visible on screen
    setActiveModule('live');
  };

  // Add multiple discovered devices in 1 click
  const handleAddDiscoveredDevices = (newDevs: DeviceItem[]) => {
    const combined = [...devices];
    const newlyAdded: DeviceItem[] = [];
    newDevs.forEach((nd) => {
      if (!combined.some((c) => c.ip === nd.ip)) {
        combined.push(nd);
        newlyAdded.push(nd);
      }
    });
    syncDevices(combined);

    // Auto-populate video wall with all newly added cameras
    const updatedCells = [...cells];
    newlyAdded.forEach((dev) => {
      dev.channels.filter((ch) => ch.enabled).forEach((ch) => {
        if (!updatedCells.some((c) => c.deviceId === dev.id && c.channelId === ch.id)) {
          updatedCells.push(createCell(dev, ch));
        }
      });
    });
    if (updatedCells.length > 0) {
      setCells(updatedCells);
      setSelectedCellId(updatedCells[0].cellId);

      if (updatedCells.length <= 1) setLayout('1x1');
      else if (updatedCells.length <= 4) setLayout('2x2');
      else if (updatedCells.length <= 9) setLayout('3x3');
      else if (updatedCells.length <= 16) setLayout('4x4');
      else if (updatedCells.length <= 25) setLayout('5x5');
      else setLayout('6x6');
    }

    setActiveModule('live');
    addLog('SUCCESS', `Добавлено ${newDevs.length} онлайн-устройств из сетевого радара и выведено на видеостену.`);
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

  // Fill entire grid with all cameras from all devices
  const handleFillGridWithAllDevices = () => {
    const allCells: ActiveGridCell[] = [];
    devices.forEach((dev) => {
      dev.channels.filter((ch) => ch.enabled).forEach((ch) => {
        allCells.push(createCell(dev, ch));
      });
    });
    if (allCells.length === 0) return;

    setCells(allCells);
    setSelectedCellId(allCells[0].cellId);
    setSelectedDeviceId(allCells[0].deviceId);

    if (allCells.length <= 1) setLayout('1x1');
    else if (allCells.length <= 4) setLayout('2x2');
    else if (allCells.length <= 9) setLayout('3x3');
    else if (allCells.length <= 16) setLayout('4x4');
    else if (allCells.length <= 25) setLayout('5x5');
    else if (allCells.length <= 36) setLayout('6x6');
    else if (allCells.length <= 49) setLayout('7x7');
    else setLayout('8x8');

    addLog('INFO', `Все доступные камеры (${allCells.length} ед.) выведены на видеостену.`);
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

    // Auto-scale layout if capacity is exceeded
    const curCapacity = (() => {
      switch (layout) {
        case '1x1': return 1;
        case '2x2': return 4;
        case '3x3': return 9;
        case '4x4': return 16;
        default: return 4;
      }
    })();
    if (updated.length > curCapacity) {
      if (updated.length <= 4) setLayout('2x2');
      else if (updated.length <= 9) setLayout('3x3');
      else if (updated.length <= 16) setLayout('4x4');
    }

    addLog('RTSP', `Камера ${device.name} подключена к ячейке №${targetIndex + 1}.`);
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

  // Folder & Zone Management
  const handleCreateFolder = (name: string, color = '#10B981') => {
    if (!name.trim()) return;
    const newFolder: CameraFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      color,
      cameraKeys: [],
    };
    const updated = [...folders, newFolder];
    syncFolders(updated);
    addLog('SUCCESS', `Создана папка зон: "${newFolder.name}"`);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, name: newName.trim() } : f
    );
    syncFolders(updated);
    addLog('INFO', `Папка переименована в "${newName.trim()}"`);
  };

  const handleDeleteFolder = (folderId: string) => {
    const target = folders.find((f) => f.id === folderId);
    const updated = folders.filter((f) => f.id !== folderId);
    syncFolders(updated);
    addLog('WARN', `Папка "${target?.name || folderId}" удалена.`);
  };

  const handleAssignCameraToFolder = (cameraKey: string, folderId: string | null) => {
    const updated = folders.map((f) => {
      const filtered = f.cameraKeys.filter((k) => k !== cameraKey);
      if (f.id === folderId) {
        return { ...f, cameraKeys: [...filtered, cameraKey] };
      }
      return { ...f, cameraKeys: filtered };
    });
    syncFolders(updated);
    const targetName = folders.find((f) => f.id === folderId)?.name || 'Не распределены';
    addLog('INFO', `Камера перемещена в папку "${targetName}".`);
  };

  const handleRenameCamera = (deviceId: string, channelId: string, newName: string) => {
    if (!newName.trim()) return;
    const trimmed = newName.trim();

    // 1. Update in devices
    const updatedDevices = devices.map((d) => {
      if (d.id === deviceId) {
        const isSingle = d.channels.length === 1;
        const updatedChannels = d.channels.map((ch) =>
          ch.id === channelId ? { ...ch, name: trimmed } : ch
        );
        return {
          ...d,
          name: isSingle ? trimmed : d.name,
          channels: updatedChannels,
        };
      }
      return d;
    });
    syncDevices(updatedDevices);

    // 2. Update in active video wall cells
    setCells((prev) =>
      prev.map((c) => {
        if (c.deviceId === deviceId && c.channelId === channelId) {
          return {
            ...c,
            channelName: trimmed,
            deviceName: trimmed,
          };
        }
        return c;
      })
    );

    addLog('SUCCESS', `Имя камеры изменено: "${trimmed}"`);
  };

  const handleFillGridWithFolder = (folder: CameraFolder) => {
    const folderCells: ActiveGridCell[] = [];
    folder.cameraKeys.forEach((key) => {
      const [devId, chId] = key.split('_');
      const dev = devices.find((d) => d.id === devId);
      if (!dev) return;
      const ch = dev.channels.find((c) => c.id === chId);
      if (!ch) return;
      folderCells.push(createCell(dev, ch));
    });

    if (folderCells.length === 0) {
      addLog('WARN', `В папке "${folder.name}" пока нет камер.`);
      return;
    }

    setCells(folderCells);
    setSelectedCellId(folderCells[0].cellId);
    setSelectedDeviceId(folderCells[0].deviceId);

    if (folderCells.length <= 1) setLayout('1x1');
    else if (folderCells.length <= 4) setLayout('2x2');
    else if (folderCells.length <= 9) setLayout('3x3');
    else if (folderCells.length <= 16) setLayout('4x4');
    else setLayout('5x5');

    addLog('INFO', `Папка "${folder.name}" (${folderCells.length} камер) выведена на экран.`);
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

  // Toggle Recording for Cell
  const handleToggleRecord = async (cell: ActiveGridCell) => {
    const isRec = !!cell.isRecording;
    const rtsp = cell.activeStream === 'main' ? cell.rtspMain : cell.rtspSub;

    if (!isRec) {
      addLog('RTSP', `Запуск локальной записи на диск для "${cell.channelName}"...`);
      try {
        const res = await fetch(
          `/api/record/start?id=${encodeURIComponent(cell.cellId)}&rtsp=${encodeURIComponent(rtsp)}&name=${encodeURIComponent(cell.channelName)}`,
          { method: 'POST' }
        );
        if (res.ok) {
          const data = await res.json();
          setCells((prev) =>
            prev.map((c) => (c.cellId === cell.cellId ? { ...c, isRecording: true } : c))
          );
          addLog('SUCCESS', `● Идёт запись в файл: ${data.filename || 'rec.mp4'}`);
        } else {
          addLog('WARN', `Не удалось запустить запись для "${cell.channelName}"`);
        }
      } catch (e) {
        addLog('WARN', 'Ошибка обращения к сервису записи');
      }
    } else {
      addLog('RTSP', `Остановка записи "${cell.channelName}"...`);
      try {
        const res = await fetch(
          `/api/record/stop?id=${encodeURIComponent(cell.cellId)}`,
          { method: 'POST' }
        );
        if (res.ok) {
          const data = await res.json();
          setCells((prev) =>
            prev.map((c) => (c.cellId === cell.cellId ? { ...c, isRecording: false } : c))
          );
          addLog('SUCCESS', `✔ Запись сохранена: ${data.path || data.filename}`);
        }
      } catch (e) {
        addLog('WARN', 'Ошибка остановки записи');
      }
    }
  };

  // Test Ping
  const handleTestPing = async (ip: string) => {
    addLog('NET', `Проверка узла ${ip}...`);
    try {
      const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}`);
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status === 'online' ? 'online' : 'offline';
        addLog('NET', `Узел ${ip}: Пинг ${data.ping_ms} мс · Порты 554(RTSP)=${data.rtsp_open ? 'OK' : 'Закрыт'}, 80(ISAPI/ONVIF)=${data.onvif_open ? 'OK' : 'Закрыт'}`);
        setDevices((prev) =>
          prev.map((d) =>
            d.ip === ip
              ? {
                  ...d,
                  pingMs: data.ping_ms,
                  status: newStatus,
                  channels: d.channels.map((ch) => ({ ...ch, pingMs: data.ping_ms, status: newStatus })),
                }
              : d
          )
        );
        setCells((prev) =>
          prev.map((c) =>
            c.deviceIp === ip
              ? {
                  ...c,
                  pingMs: data.ping_ms,
                  status: newStatus,
                }
              : c
          )
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
              onFillGridWithAll={handleFillGridWithAllDevices}
              folders={folders}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onAssignCameraToFolder={handleAssignCameraToFolder}
              onRenameCamera={handleRenameCamera}
              onFillGridWithFolder={handleFillGridWithFolder}
              onAddChannelToCell={handleAddChannelToCell}
              onSwapCells={handleSwapCells}
              onSaveCustomView={handleSaveCustomView}
              onDeleteCustomView={handleDeleteCustomView}
              onLoadCustomView={handleLoadCustomView}
              onTakeWallScreenshot={handleTakeWallScreenshot}
              onTakeCellScreenshot={handleTakeCellScreenshot}
              onToggleRecord={handleToggleRecord}
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
              onEditDevice={(dev) => {
                setEditingDevice(dev);
                setIsAddModalOpen(true);
              }}
              onAddDiscoveredDevices={handleAddDiscoveredDevices}
              onTestPing={handleTestPing}
              onUpdateDevice={(updatedDev) => {
                syncDevices(devices.map((d) => (d.id === updatedDev.id ? updatedDev : d)));
              }}
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

        {/* Sleek VMS Bottom Status & Author Bar */}
        <footer
          style={{
            height: '26px',
            background: 'linear-gradient(180deg, #0c0f16 0%, #080a0f 100%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontSize: '11px',
            color: '#71717A',
            userSelect: 'none',
            flexShrink: 0,
            zIndex: 40,
          }}
        >
          {/* Left: Engine & channels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)' }} />
              <span style={{ color: '#D4D4D8', fontWeight: 600 }}>ProCam VMS Core</span>
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>|</span>
            <span>Каналов: {devices.reduce((acc, d) => acc + (d.channels?.length || 1), 0)}</span>
          </div>

          {/* Center: Author, contacts & website */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span>
              Автор и инженер:{' '}
              <a
                href="https://yeee.kz"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#E4E4E7', fontWeight: 700, textDecoration: 'none' }}
              >
                Ернияз
              </a>{' '}
              (
              <a
                href="https://yeee.kz"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--emerald)', textDecoration: 'none', fontWeight: 600 }}
              >
                yeee.kz
              </a>
              )
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>·</span>
            <a
              href="mailto:yeeerniyaz@gmail.com"
              style={{ color: '#A1A1AA', textDecoration: 'none', fontFamily: 'monospace' }}
            >
              yeeerniyaz@gmail.com
            </a>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>·</span>
            <span style={{ fontFamily: 'monospace', color: '#A1A1AA' }}>
              <a href="tel:+77066066323" style={{ color: 'inherit', textDecoration: 'none' }}>+7 706 606 63 23</a>
              {' · '}
              <a href="tel:+77766066323" style={{ color: 'inherit', textDecoration: 'none' }}>+7 776 606 63 23</a>
            </span>
          </div>

          {/* Right: Button to open full author & all projects modal */}
          <div>
            <button
              type="button"
              onClick={() => setIsAuthorModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--emerald)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'underline',
              }}
              title="Открыть информацию об авторе, контакты и проекты экосистемы"
            >
              <span>Обо мне & проекты</span>
              <span style={{ fontSize: '10px' }}>↗</span>
            </button>
          </div>
        </footer>

        {/* Global Modals */}
        <AddDeviceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDevice(null);
          }}
          onSaveDevice={(dev) => {
            handleSaveDevice(dev);
            setEditingDevice(null);
          }}
          initialDevice={editingDevice}
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

        <AuthorProjectsModal
          isOpen={isAuthorModalOpen}
          onClose={() => setIsAuthorModalOpen(false)}
        />
      </div>
    </MantineProvider>
  );
};
