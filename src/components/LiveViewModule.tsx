import React, { useState, useEffect, useRef } from 'react';
import {
  DeviceItem,
  ChannelItem,
  ActiveGridCell,
  GridLayout,
  CustomView,
  CameraFolder,
  cleanDeviceName,
  getCellDisplayName,
} from '../types';
import { VmsVideoCell } from './VmsVideoCell';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Server,
  Video,
  Grid,
  Plus,
  Trash2,
  Bookmark,
  Compass,
  Play,
  Square,
  Volume2,
  Camera,
  Maximize,
  Radio,
  Sliders,
  Layers,
  Repeat,
  MonitorPlay,
  Folder,
  FolderPlus,
  Pencil,
  Check,
  X,
  Tag,
} from 'lucide-react';

interface Props {
  devices: DeviceItem[];
  cells: ActiveGridCell[];
  selectedCellId: string;
  layout: GridLayout;
  customViews: CustomView[];
  folders?: CameraFolder[];
  onCreateFolder?: (name: string, color?: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onAssignCameraToFolder?: (cameraKey: string, folderId: string | null) => void;
  onRenameCamera?: (deviceId: string, channelId: string, newName: string) => void;
  onFillGridWithFolder?: (folder: CameraFolder) => void;
  onSelectCell: (cell: ActiveGridCell) => void;
  onLayoutChange: (layout: GridLayout) => void;
  onToggleStream: (cellId: string, newStream: 'main' | 'sub') => void;
  onToggleAllStreams: (stream: 'main' | 'sub') => void;
  onCloseCell: (cellIndex: number) => void;
  onFillGridWithNVR: (device: DeviceItem) => void;
  onFillGridWithAll?: () => void;
  onAddChannelToCell: (targetIndex: number, device: DeviceItem, channel: ChannelItem) => void;
  onSwapCells: (fromIndex: number, toIndex: number) => void;
  onSaveCustomView: (name: string) => void;
  onDeleteCustomView: (id: string) => void;
  onLoadCustomView: (view: CustomView) => void;
  onTakeWallScreenshot: () => void;
  onTakeCellScreenshot: (cell: ActiveGridCell) => void;
  onToggleRecord?: (cell: ActiveGridCell) => void;
  onStopAllStreams: () => void;
  onOpenAddModal: () => void;
}

export const LiveViewModule: React.FC<Props> = ({
  devices,
  cells,
  selectedCellId,
  layout,
  customViews,
  folders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onAssignCameraToFolder,
  onRenameCamera,
  onFillGridWithFolder,
  onSelectCell,
  onLayoutChange,
  onToggleStream,
  onToggleAllStreams,
  onCloseCell,
  onFillGridWithNVR,
  onFillGridWithAll,
  onAddChannelToCell,
  onSwapCells,
  onSaveCustomView,
  onDeleteCustomView,
  onLoadCustomView,
  onTakeWallScreenshot,
  onTakeCellScreenshot,
  onToggleRecord,
  onStopAllStreams,
  onOpenAddModal,
}) => {
  // Left Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'folders' | 'devices' | 'views'>('folders');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDevs, setExpandedDevs] = useState<Record<string, boolean>>({});
  const [isPtzOpen, setIsPtzOpen] = useState(false);
  const [ptzSpeed, setPtzSpeed] = useState<number>(50);
  const [ptzPreset, setPtzPreset] = useState<number>(1);

  // Folder & Zone Management States
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-street': true,
    'folder-hall': true,
    'folder-rest': true,
    'unassigned': true,
  });
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Editing state for camera or folder name
  const [editingCameraKey, setEditingCameraKey] = useState<string | null>(null);
  const [editingCameraName, setEditingCameraName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Dropdown for moving camera
  const [activeMoveMenuKey, setActiveMoveMenuKey] = useState<string | null>(null);

  // Resizable Sidebar State (persisted)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('procam_sidebar_width_v1');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 260 && val <= 560) return val;
      }
    } catch (e) {}
    return 330;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(260, Math.min(e.clientX, 560));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      try {
        localStorage.setItem('procam_sidebar_width_v1', String(sidebarWidth));
      } catch (e) {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, sidebarWidth]);

  // Flat list of all cameras across all devices (independent of NVR structure)
  const allCameras = React.useMemo(() => {
    const list: {
      key: string;
      deviceId: string;
      channelId: string;
      displayName: string;
      ip: string;
      dev: DeviceItem;
      ch: ChannelItem;
      isPlaying: boolean;
      status: 'online' | 'offline' | 'checking';
    }[] = [];

    devices.forEach((dev) => {
      const cleanDev = cleanDeviceName(dev.name, dev.ip);
      dev.channels.forEach((ch) => {
        const key = `${dev.id}_${ch.id}`;
        const isPlaying = cells.some((c) => c.deviceId === dev.id && c.channelId === ch.id);
        const isGeneric = !ch.name || /^(канал\s*\d+:\s*)?(основной поток|субпоток|profile|stream)/i.test(ch.name.trim());
        const displayName = dev.channels.length === 1
          ? cleanDev
          : isGeneric
          ? `${cleanDev} · CH ${ch.channelNumber}`
          : `${cleanDev} · ${ch.name.replace(/^(канал|ch)\s*\d+:\s*/i, '')}`;
        list.push({
          key,
          deviceId: dev.id,
          channelId: ch.id,
          displayName,
          ip: dev.ip,
          dev,
          ch,
          isPlaying,
          status: dev.status,
        });
      });
    });

    return list;
  }, [devices, cells]);

  const toggleFolderExpand = (fId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [fId]: !(prev[fId] ?? true) }));
  };

  // Pagination & Patrol State
  const [page, setPage] = useState<number>(0);
  const [isPatrolActive, setIsPatrolActive] = useState<boolean>(false);
  const [patrolInterval, setPatrolInterval] = useState<number>(10); // seconds
  const [newViewName, setNewViewName] = useState<string>('');
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Layout history for 1x1 maximize toggle
  const [previousLayout, setPreviousLayout] = useState<GridLayout>('2x2');
  const [previousPage, setPreviousPage] = useState<number>(0);

  // Resolve grid capacity
  const getCapacity = (l: GridLayout): number => {
    switch (l) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      case '5x5': return 25;
      case '6x6': return 36;
      case '7x7': return 49;
      case '8x8': return 64;
      case '1+5': return 6;
      case '1+7': return 8;
      case '1+12': return 13;
      case '2+8': return 10;
      case '1+1+12': return 14;
      default: return 4;
    }
  };

  const capacity = getCapacity(layout);
  const totalPages = Math.max(1, Math.ceil(cells.length / capacity));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStartIndex = currentPage * capacity;
  const visibleCells = cells.slice(pageStartIndex, pageStartIndex + capacity);

  // Fill up array to capacity for grid slots
  const gridSlots: (ActiveGridCell | null)[] = [];
  for (let i = 0; i < capacity; i++) {
    gridSlots.push(visibleCells[i] || null);
  }

  // Patrol Auto-Tour Timer
  useEffect(() => {
    if (!isPatrolActive) return;
    const interval = setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, patrolInterval * 1000);
    return () => clearInterval(interval);
  }, [isPatrolActive, patrolInterval, totalPages]);

  // Toggle Device Expand
  const toggleDeviceExpand = (id: string) => {
    setExpandedDevs((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  // Double click cell: maximize to 1x1 or restore
  const handleCellDoubleClick = (slotIndex: number) => {
    const targetCell = gridSlots[slotIndex];
    if (!targetCell) return;

    const cellGlobalIdx = cells.findIndex((c) => c && c.cellId === targetCell.cellId);

    if (layout === '1x1') {
      // Restore previous layout and switch to Sub Stream
      const restoreLayout = previousLayout || '2x2';
      const restoreCap = getCapacity(restoreLayout);
      const restorePage = cellGlobalIdx >= 0 ? Math.floor(cellGlobalIdx / restoreCap) : (previousPage || 0);
      setPage(restorePage);
      onToggleStream(targetCell.cellId, 'sub');
      onLayoutChange(restoreLayout);
    } else {
      // Maximize to 1x1 and switch to Main Stream
      setPreviousLayout(layout);
      setPreviousPage(currentPage);
      onSelectCell(targetCell);
      if (cellGlobalIdx >= 0) {
        setPage(cellGlobalIdx);
      }
      onToggleStream(targetCell.cellId, 'main');
      onLayoutChange('1x1');
    }
  };

  // Switch layout via bottom toolbar buttons
  const handleSelectLayout = (newL: GridLayout) => {
    if (newL === layout) return;

    const selIdx = cells.findIndex((c) => c && c.cellId === selectedCellId);
    const targetIdx = selIdx >= 0 ? selIdx : pageStartIndex;

    if (newL === '1x1') {
      setPreviousLayout(layout);
      setPreviousPage(currentPage);
      if (targetIdx >= 0 && targetIdx < cells.length) {
        setPage(targetIdx);
        onToggleStream(cells[targetIdx].cellId, 'main');
      }
    } else if (layout === '1x1') {
      const newCap = getCapacity(newL);
      if (targetIdx >= 0) {
        setPage(Math.floor(targetIdx / newCap));
        if (selIdx >= 0) {
          onToggleStream(cells[selIdx].cellId, 'sub');
        }
      }
    } else {
      const newCap = getCapacity(newL);
      if (targetIdx >= 0) {
        setPage(Math.floor(targetIdx / newCap));
      }
    }

    onLayoutChange(newL);
  };

  // Keep selectedCellId synchronized when in 1x1 mode
  useEffect(() => {
    if (layout === '1x1' && visibleCells[0] && visibleCells[0].cellId !== selectedCellId) {
      onSelectCell(visibleCells[0]);
    }
  }, [layout, currentPage, visibleCells[0]?.cellId, selectedCellId]);

  // Drag start from tree
  const handleTreeDragStart = (e: React.DragEvent, deviceId: string, channelId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ deviceId, channelId }));
  };

  // Drop on cell
  const handleDropOnCell = (targetIndex: number, data: { deviceId: string; channelId: string; sourceIndex?: number }) => {
    if (data.sourceIndex !== undefined) {
      onSwapCells(data.sourceIndex, pageStartIndex + targetIndex);
      return;
    }

    const dev = devices.find((d) => d.id === data.deviceId);
    if (!dev) return;
    const ch = dev.channels.find((c) => c.id === data.channelId);
    if (!ch) return;

    onAddChannelToCell(pageStartIndex + targetIndex, dev, ch);
  };

  // Double click camera/channel in tree -> open in selected or first empty cell
  const handleChannelDoubleClick = (device: DeviceItem, channel: ChannelItem) => {
    // If this channel is already in the grid, select and focus it
    const existingIndex = cells.findIndex((c) => c.deviceId === device.id && c.channelId === channel.id);
    if (existingIndex >= 0) {
      onSelectCell(cells[existingIndex]);
      if (layout === '1x1') {
        setPage(existingIndex);
      }
      return;
    }

    // Find first empty slot on current visible grid
    let targetSlot = gridSlots.findIndex((c) => c === null);
    if (targetSlot >= 0) {
      onAddChannelToCell(pageStartIndex + targetSlot, device, channel);
      return;
    }

    // If a cell is currently selected, replace that cell
    let selectedSlot = gridSlots.findIndex((c) => c && c.cellId === selectedCellId);
    if (selectedSlot >= 0) {
      onAddChannelToCell(pageStartIndex + selectedSlot, device, channel);
      return;
    }

    // Otherwise append to the end of cells
    onAddChannelToCell(cells.length, device, channel);
  };

  // Send PTZ command to active selected cell
  const handlePtzAction = (action: string) => {
    const activeCell = cells.find((c) => c.cellId === selectedCellId) || cells[0];
    if (!activeCell) return;

    fetch(
      `/api/isapi/ptz?ip=${encodeURIComponent(activeCell.deviceIp)}&port=${activeCell.httpPort}&user=${encodeURIComponent(activeCell.login)}&pass=${encodeURIComponent(activeCell.password)}&channel=${encodeURIComponent(activeCell.channelNumber)}&action=${action}&preset=${ptzPreset}&speed=${ptzSpeed}`,
      { method: 'POST' }
    ).catch(() => {});
  };

  const isAnyRecording = cells.some((c) => c.isRecording);
  const handleToggleRecordAll = () => {
    if (!onToggleRecord) return;
    if (isAnyRecording) {
      cells.filter((c) => c.isRecording).forEach((c) => onToggleRecord(c));
    } else {
      cells.forEach((c) => onToggleRecord(c));
    }
  };

  // CSS Grid Template Style Generator
  const getGridStyle = (): React.CSSProperties => {
    switch (layout) {
      case '1x1':
        return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
      case '2x2':
        return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' };
      case '3x3':
        return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' };
      case '4x4':
        return { gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' };
      case '5x5':
        return { gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' };
      case '6x6':
        return { gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' };
      case '7x7':
        return { gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(7, 1fr)' };
      case '8x8':
        return { gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' };

      // Combined 1+5: 1 large 2x2 cell on top-left + 5 surrounding 1x1 cells
      case '1+5':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        };

      // Combined 1+7: 1 large 3x3 cell on top-left + 7 surrounding cells
      case '1+7':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
        };

      // Combined 1+12: 1 large cell (2x2) + 12 perimeter cells in a 4x4 matrix
      case '1+12':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
        };

      // Combined 2+8: 2 prominent cells (2x2 each) + 8 surrounding cells
      case '2+8':
        return {
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
        };

      // Combined 1+1+12: 2 accent cells + 12 surrounding cells
      case '1+1+12':
        return {
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
        };

      default:
        return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' };
    }
  };

  // Helper for prominent cell spanning in combined grids
  const getSlotSpanStyle = (index: number): React.CSSProperties => {
    if (layout === '1+5' && index === 0) {
      return { gridColumn: 'span 2', gridRow: 'span 2' };
    }
    if (layout === '1+7' && index === 0) {
      return { gridColumn: 'span 3', gridRow: 'span 3' };
    }
    if (layout === '1+12' && index === 0) {
      return { gridColumn: 'span 2', gridRow: 'span 2' };
    }
    if (layout === '2+8' && (index === 0 || index === 1)) {
      return { gridColumn: 'span 2', gridRow: 'span 2' };
    }
    if (layout === '1+1+12' && (index === 0 || index === 1)) {
      return { gridColumn: 'span 2', gridRow: 'span 2' };
    }
    return {};
  };

  // Filter devices in tree
  const filteredDevices = devices.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.ip.includes(term) ||
      d.channels.some((c) => c.name.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 44px)', background: '#07090e', overflow: 'hidden' }}>
      {/* 1. Left Collapsible Sidebar (ProCam Tree & Custom Views & PTZ) */}
      <aside
        style={{
          width: isSidebarOpen ? `${sidebarWidth}px` : '0px',
          transition: isResizingSidebar ? 'none' : 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: '#0d1017',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          zIndex: 20,
          position: 'relative',
        }}
      >
        {/* Sidebar Header & Tab Switches */}
        <div style={{ padding: '8px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSidebarTab('folders')}
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                background: sidebarTab === 'folders' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: sidebarTab === 'folders' ? '#34D399' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Folder size={12} />
              Папки / Зоны
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('devices')}
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                background: sidebarTab === 'devices' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: sidebarTab === 'devices' ? '#34D399' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Устройства
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('views')}
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                border: 'none',
                background: sidebarTab === 'views' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: sidebarTab === 'views' ? '#34D399' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ракурсы
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Свернуть боковую панель"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Tab 0: Folders / Zones (Улица, Зал, Зона отдыха...) - Flat Cameras, No NVR! */}
        {sidebarTab === 'folders' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Search & Actions Bar */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <Search size={13} color="var(--muted)" />
                <input
                  type="text"
                  placeholder="Поиск по папкам и камерам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    width: '100%',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-pill btn-pill-emerald-outline"
                  onClick={() => setIsNewFolderOpen(true)}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '10.5px', justifyContent: 'center' }}
                  title="Создать новую папку зон"
                >
                  <FolderPlus size={12} />
                  + Папка
                </button>

                {onFillGridWithAll && (
                  <button
                    type="button"
                    className="btn-pill"
                    onClick={onFillGridWithAll}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '10.5px',
                      justifyContent: 'center',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60A5FA',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    title="Вывести все камеры на видеостену"
                  >
                    <MonitorPlay size={12} />
                    Все на экран
                  </button>
                )}
              </div>

              {/* Inline Create Folder Input */}
              {isNewFolderOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--emerald-border)', borderRadius: '6px', padding: '4px 6px', marginTop: '2px' }}>
                  <input
                    type="text"
                    placeholder="Название (напр. Склад, Парковка)..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (onCreateFolder && newFolderName.trim()) {
                          onCreateFolder(newFolderName.trim());
                          setNewFolderName('');
                          setIsNewFolderOpen(false);
                        }
                      } else if (e.key === 'Escape') {
                        setIsNewFolderOpen(false);
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#FFFFFF',
                      fontSize: '11px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateFolder && newFolderName.trim()) {
                        onCreateFolder(newFolderName.trim());
                        setNewFolderName('');
                        setIsNewFolderOpen(false);
                      }
                    }}
                    style={{ background: 'var(--emerald)', border: 'none', color: '#000000', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewFolderOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Folder List Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Render configured folders */}
              {folders.map((f) => {
                const isExpanded = expandedFolders[f.id] ?? true;
                const folderCams = allCameras.filter((c) => f.cameraKeys.includes(c.key));
                const filteredCams = folderCams.filter((c) =>
                  !searchTerm || c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || c.ip.includes(searchTerm)
                );

                return (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '2px 4px 4px' }}>
                    {/* Folder Header */}
                    <div
                      className="tree-folder-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 6px',
                        userSelect: 'none',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFolderExpand(f.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      <Folder size={14} color={f.color || '#10B981'} style={{ flexShrink: 0 }} />

                      {editingFolderId === f.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (onRenameFolder) onRenameFolder(f.id, editingFolderName);
                                setEditingFolderId(null);
                              } else if (e.key === 'Escape') {
                                setEditingFolderId(null);
                              }
                            }}
                            autoFocus
                            style={{
                              flex: 1,
                              minWidth: 0,
                              background: 'rgba(0,0,0,0.5)',
                              border: '1px solid var(--emerald)',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (onRenameFolder) onRenameFolder(f.id, editingFolderName);
                              setEditingFolderId(null);
                            }}
                            style={{ background: 'var(--emerald)', border: 'none', color: '#000', borderRadius: '3px', padding: '2px 4px', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <Check size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFolderId(null)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', padding: '2px 4px', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                          <span
                            onClick={() => toggleFolderExpand(f.id)}
                            style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                            title={f.name}
                          >
                            {f.name}
                          </span>
                        </div>
                      )}

                      <span className="mono" style={{ fontSize: '9px', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        {folderCams.length}
                      </span>

                      {/* Play Folder Cameras on Grid */}
                      {onFillGridWithFolder && folderCams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onFillGridWithFolder(f)}
                          className="mono"
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#10B981',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid var(--emerald-border)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            flexShrink: 0,
                          }}
                          title="Вывести все камеры этой папки на видеостену"
                        >
                          <Play size={8} fill="#10B981" />
                          <span>Сетка</span>
                        </button>
                      )}

                      {/* Folder Hover Actions: Rename & Delete */}
                      <div className="folder-actions" style={{ alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolderId(f.id);
                            setEditingFolderName(f.name);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '1px', opacity: 0.8 }}
                          title="Переименовать папку"
                        >
                          <Pencil size={11} />
                        </button>
                        {onDeleteFolder && (
                          <button
                            type="button"
                            onClick={() => onDeleteFolder(f.id)}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '1px' }}
                            title="Удалить папку"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cameras List inside Folder */}
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '14px', borderLeft: `1px solid ${f.color || 'var(--emerald)'}40`, marginLeft: '8px', marginBottom: '2px' }}>
                        {filteredCams.length === 0 ? (
                          <div style={{ padding: '4px 6px', fontSize: '10.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                            В папке нет камер. Добавьте камеры ниже.
                          </div>
                        ) : (
                          filteredCams.map((cam) => {
                            const isEditingThisCam = editingCameraKey === cam.key;

                            return (
                              <div
                                key={cam.key}
                                draggable={true}
                                onDragStart={(e) => handleTreeDragStart(e, cam.deviceId, cam.channelId)}
                                onDoubleClick={() => handleChannelDoubleClick(cam.dev, cam.ch)}
                                className="tree-cam-row"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  background: cam.isPlaying ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                                  border: cam.isPlaying ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                }}
                                title={`${cam.displayName} · Двойной клик — показать. Перетащите в сетку мышкой.`}
                              >
                                <Video size={13} color={cam.status === 'online' ? "var(--emerald)" : "#71717A"} style={{ flexShrink: 0 }} />
                                <span
                                  className={`status-dot ${cam.status === 'online' ? 'online' : 'offline'}`}
                                  style={{ width: '5.5px', height: '5.5px', flexShrink: 0 }}
                                  title={cam.status === 'online' ? 'Камера в сети (Онлайн)' : 'Камера недоступна (Офлайн)'}
                                />

                                {isEditingThisCam ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, minWidth: 0 }}>
                                    <input
                                      type="text"
                                      value={editingCameraName}
                                      onChange={(e) => setEditingCameraName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          if (onRenameCamera) onRenameCamera(cam.deviceId, cam.channelId, editingCameraName);
                                          setEditingCameraKey(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCameraKey(null);
                                        }
                                      }}
                                      autoFocus
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        background: 'rgba(0,0,0,0.6)',
                                        border: '1px solid var(--emerald)',
                                        color: '#FFFFFF',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        fontSize: '11px',
                                        outline: 'none',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onRenameCamera) onRenameCamera(cam.deviceId, cam.channelId, editingCameraName);
                                        setEditingCameraKey(null);
                                      }}
                                      style={{ background: 'var(--emerald)', border: 'none', color: '#000', borderRadius: '3px', padding: '1px 4px', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                      <Check size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCameraKey(null)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--muted)', padding: '1px 3px', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: cam.isPlaying ? '#FFFFFF' : '#D4D4D8',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                    title={cam.displayName}
                                  >
                                    {cam.displayName}
                                  </span>
                                )}

                                {/* Compact LIVE badge if playing */}
                                {cam.isPlaying && (
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: '7.5px',
                                      color: 'var(--emerald)',
                                      background: 'rgba(16, 185, 129, 0.2)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                    title="Воспроизводится на видеостене"
                                  >
                                    LIVE
                                  </span>
                                )}

                                {/* Hover Actions: Rename + Tag Move */}
                                {!isEditingThisCam && (
                                  <div
                                    className={`tree-actions ${activeMoveMenuKey === cam.key ? 'active' : ''}`}
                                    style={{
                                      alignItems: 'center',
                                      gap: '2px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCameraKey(cam.key);
                                        setEditingCameraName(cam.displayName);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--muted)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                      title="Переименовать камеру"
                                    >
                                      <Pencil size={11} />
                                    </button>

                                    {/* Folder Dropdown Menu */}
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMoveMenuKey(activeMoveMenuKey === cam.key ? null : cam.key);
                                        }}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid rgba(255, 255, 255, 0.12)',
                                          color: 'var(--muted)',
                                          borderRadius: '3px',
                                          padding: '2px 4px',
                                          fontSize: '9px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                        title="Переместить в другую папку"
                                      >
                                        <Tag size={9} />
                                        ▾
                                      </button>

                                  {activeMoveMenuKey === cam.key && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        marginTop: '4px',
                                        background: '#0f131c',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '6px',
                                        padding: '4px',
                                        minWidth: '130px',
                                        zIndex: 50,
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                      }}
                                    >
                                      <span style={{ fontSize: '9px', color: 'var(--muted)', padding: '2px 4px', fontWeight: 700 }}>
                                        Переместить в:
                                      </span>
                                      {folders.map((targetF) => (
                                        <button
                                          key={targetF.id}
                                          type="button"
                                          onClick={() => {
                                            if (onAssignCameraToFolder) onAssignCameraToFolder(cam.key, targetF.id);
                                            setActiveMoveMenuKey(null);
                                          }}
                                          style={{
                                            background: targetF.id === f.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                            border: 'none',
                                            color: targetF.id === f.id ? 'var(--emerald)' : '#FFFFFF',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10.5px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <Folder size={11} color={targetF.color || '#10B981'} />
                                          {targetF.name}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onAssignCameraToFolder) onAssignCameraToFolder(cam.key, null);
                                          setActiveMoveMenuKey(null);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          borderTop: '1px solid rgba(255,255,255,0.06)',
                                          color: '#EF4444',
                                          padding: '4px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10px',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          marginTop: '2px',
                                        }}
                                      >
                                        Убрать из папки
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned / General Cameras Section */}
              {(() => {
                const assignedKeys = new Set(folders.flatMap((f) => f.cameraKeys));
                const unassigned = allCameras.filter((cam) => !assignedKeys.has(cam.key));
                const filteredUnassigned = unassigned.filter((c) =>
                  !searchTerm || c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || c.ip.includes(searchTerm)
                );
                const isUnassignedExpanded = expandedFolders['unassigned'] ?? true;

                if (unassigned.length === 0) return null;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.08)', padding: '2px 4px 4px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 4px', userSelect: 'none' }}>
                      <button
                        type="button"
                        onClick={() => toggleFolderExpand('unassigned')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {isUnassignedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      <Folder size={14} color="#71717A" />

                      <span
                        onClick={() => toggleFolderExpand('unassigned')}
                        style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--muted)', flex: 1, cursor: 'pointer' }}
                      >
                        Не распределены в папки
                      </span>

                      <span className="mono" style={{ fontSize: '9px', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: '4px' }}>
                        {unassigned.length}
                      </span>
                    </div>

                    {isUnassignedExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '14px', borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: '8px', marginBottom: '2px' }}>
                        {filteredUnassigned.map((cam) => {
                          const isEditingThisCam = editingCameraKey === cam.key;

                          return (
                            <div
                              key={cam.key}
                              draggable={true}
                              onDragStart={(e) => handleTreeDragStart(e, cam.deviceId, cam.channelId)}
                              onDoubleClick={() => handleChannelDoubleClick(cam.dev, cam.ch)}
                              className="tree-cam-row"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 6px',
                                borderRadius: '5px',
                                background: cam.isPlaying ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                                border: cam.isPlaying ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                cursor: 'grab',
                                userSelect: 'none',
                              }}
                              title={`${cam.displayName} · Двойной клик — показать. Перетащите в сетку мышкой.`}
                            >
                              <Video size={13} color={cam.status === 'online' ? "var(--emerald)" : "#71717A"} style={{ flexShrink: 0 }} />
                              <span
                                className={`status-dot ${cam.status === 'online' ? 'online' : 'offline'}`}
                                style={{ width: '5.5px', height: '5.5px', flexShrink: 0 }}
                                title={cam.status === 'online' ? 'Камера в сети (Онлайн)' : 'Камера недоступна (Офлайн)'}
                              />

                              {isEditingThisCam ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, minWidth: 0 }}>
                                  <input
                                    type="text"
                                    value={editingCameraName}
                                    onChange={(e) => setEditingCameraName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (onRenameCamera) onRenameCamera(cam.deviceId, cam.channelId, editingCameraName);
                                        setEditingCameraKey(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingCameraKey(null);
                                      }
                                    }}
                                    autoFocus
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      background: 'rgba(0,0,0,0.6)',
                                      border: '1px solid var(--emerald)',
                                      color: '#FFFFFF',
                                      borderRadius: '3px',
                                      padding: '1px 5px',
                                      fontSize: '11px',
                                      outline: 'none',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onRenameCamera) onRenameCamera(cam.deviceId, cam.channelId, editingCameraName);
                                      setEditingCameraKey(null);
                                    }}
                                    style={{ background: 'var(--emerald)', border: 'none', color: '#000', borderRadius: '3px', padding: '1px 4px', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    <Check size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCameraKey(null)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', padding: '1px 3px', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: cam.isPlaying ? '#FFFFFF' : '#D4D4D8',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                  title={cam.displayName}
                                >
                                  {cam.displayName}
                                </span>
                              )}

                              {/* Compact LIVE badge if playing */}
                              {cam.isPlaying && (
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: '7.5px',
                                    color: 'var(--emerald)',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                  }}
                                  title="Воспроизводится на видеостене"
                                >
                                  LIVE
                                </span>
                              )}

                              {/* Hover Actions: Rename + Assign to Folder */}
                              {!isEditingThisCam && (
                                <div
                                  className={`tree-actions ${activeMoveMenuKey === cam.key ? 'active' : ''}`}
                                  style={{
                                    alignItems: 'center',
                                    gap: '2px',
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCameraKey(cam.key);
                                      setEditingCameraName(cam.displayName);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--muted)',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Переименовать камеру"
                                  >
                                    <Pencil size={11} />
                                  </button>

                                  {/* Assign to folder menu */}
                                  <div style={{ position: 'relative' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMoveMenuKey(activeMoveMenuKey === cam.key ? null : cam.key);
                                      }}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid var(--emerald-border)',
                                        color: '#34D399',
                                        borderRadius: '3px',
                                        padding: '2px 5px',
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                      }}
                                      title="Назначить в папку (Улица, Зал, Зона отдыха...)"
                                    >
                                      + В папку ▾
                                    </button>

                                {activeMoveMenuKey === cam.key && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '100%',
                                      marginTop: '4px',
                                      background: '#0f131c',
                                      border: '1px solid rgba(255, 255, 255, 0.15)',
                                      borderRadius: '6px',
                                      padding: '4px',
                                      minWidth: '130px',
                                      zIndex: 50,
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                  >
                                    <span style={{ fontSize: '9px', color: 'var(--muted)', padding: '2px 4px', fontWeight: 700 }}>
                                      Переместить в:
                                    </span>
                                    {folders.map((targetF) => (
                                      <button
                                        key={targetF.id}
                                        type="button"
                                        onClick={() => {
                                          if (onAssignCameraToFolder) onAssignCameraToFolder(cam.key, targetF.id);
                                          setActiveMoveMenuKey(null);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#FFFFFF',
                                          padding: '4px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <Folder size={11} color={targetF.color || '#10B981'} />
                                        {targetF.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 1: Devices & Channels Tree */}
        {sidebarTab === 'devices' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Search & Quick Actions */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <Search size={13} color="var(--muted)" />
                <input
                  type="text"
                  placeholder="Поиск по имени или IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    width: '100%',
                  }}
                />
              </div>

              {/* Quick Actions: Add Device & Fill Wall */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-pill btn-pill-emerald-outline"
                  onClick={onOpenAddModal}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '10.5px', justifyContent: 'center' }}
                  title="Добавить IP-камеру или регистратор вручную"
                >
                  <Plus size={12} />
                  + Камера
                </button>

                {onFillGridWithAll && (
                  <button
                    type="button"
                    className="btn-pill"
                    onClick={onFillGridWithAll}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '10.5px',
                      justifyContent: 'center',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60A5FA',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    title="Вывести все камеры из списка на видеостену в 1 клик"
                  >
                    <MonitorPlay size={12} />
                    Все на экран
                  </button>
                )}
              </div>
            </div>

            {/* Tree Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredDevices.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '11.5px' }}>
                  <div>Нет подключенных устройств</div>
                  <button
                    type="button"
                    className="btn-pill btn-pill-emerald-outline"
                    onClick={onOpenAddModal}
                    style={{ marginTop: '10px', padding: '4px 10px', fontSize: '11px' }}
                  >
                    + Добавить устройство
                  </button>
                </div>
              ) : (
                filteredDevices.map((dev) => {
                  const isSingle = dev.channels.length === 1;
                  const isExpanded = expandedDevs[dev.id] ?? true;

                  // 1. ОДИНОЧНАЯ КАМЕРА (1 канал): выводим сразу как плоский элемент без лишних подпапок
                  if (isSingle) {
                    const ch = dev.channels[0];
                    const isPlaying = cells.some((c) => c.deviceId === dev.id && c.channelId === ch.id);
                    const isSelected = selectedCellId.startsWith(dev.id);

                    return (
                      <div
                        key={dev.id}
                        draggable={true}
                        onDragStart={(e) => handleTreeDragStart(e, dev.id, ch.id)}
                        onClick={() => {
                          const cell = cells.find((c) => c.deviceId === dev.id && c.channelId === ch.id);
                          if (cell) onSelectCell(cell);
                        }}
                        onDoubleClick={() => handleChannelDoubleClick(dev, ch)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isPlaying
                            ? 'rgba(16, 185, 129, 0.14)'
                            : isSelected
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: isPlaying ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                          cursor: 'grab',
                          userSelect: 'none',
                          transition: 'all 0.12s ease',
                        }}
                        title="Двойной клик — показать на экране. Перетащите в сетку мышкой."
                      >
                        <Video size={14} color={dev.status === 'online' ? "var(--emerald)" : "#71717A"} style={{ flexShrink: 0 }} />
                        <span
                          className={`status-dot ${dev.status === 'online' ? 'online' : 'offline'}`}
                          style={{ width: '5.5px', height: '5.5px', flexShrink: 0 }}
                          title={dev.status === 'online' ? 'Камера в сети (Онлайн)' : 'Камера недоступна (Офлайн)'}
                        />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#FFFFFF', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dev.name}>
                          {dev.name}
                        </span>
                        {isPlaying && (
                          <span className="mono" style={{ fontSize: '7.5px', color: 'var(--emerald)', background: 'rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: '3px', fontWeight: 800, flexShrink: 0 }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    );
                  }

                  // 2. МНОГОКАНАЛЬНЫЙ NVR (несколько каналов)
                  return (
                    <div key={dev.id} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      {/* NVR Device Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 7px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDeviceExpand(dev.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        <Server size={14} color="#60A5FA" />
                        <span className={`status-dot ${dev.status === 'online' ? 'online' : 'offline'}`} style={{ width: '5px', height: '5px' }} />

                        <span
                          onClick={() => toggleDeviceExpand(dev.id)}
                          style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {dev.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => onFillGridWithNVR(dev)}
                          className="mono"
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#60A5FA',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          title="Вывести все каналы этого регистратора на видеостену"
                        >
                          + Все ({dev.channels.length})
                        </button>
                      </div>

                      {/* Channels Subtree */}
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '16px', borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: '10px' }}>
                          {dev.channels.map((ch) => {
                            const isPlaying = cells.some((c) => c.deviceId === dev.id && c.channelId === ch.id);

                            return (
                              <div
                                key={ch.id}
                                draggable={true}
                                onDragStart={(e) => handleTreeDragStart(e, dev.id, ch.id)}
                                onDoubleClick={() => handleChannelDoubleClick(dev, ch)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  background: isPlaying ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                  cursor: 'grab',
                                  userSelect: 'none',
                                }}
                                title="Перетащите в сетку или дважды кликните для показа"
                              >
                                <span
                                  className={`status-dot ${dev.status === 'online' ? 'online' : 'offline'}`}
                                  style={{ width: '5.5px', height: '5.5px', flexShrink: 0 }}
                                  title={dev.status === 'online' ? 'Канал в сети (Онлайн)' : 'Канал недоступен (Офлайн)'}
                                />
                                {dev.channels.length > 1 && (
                                  <span className="mono" style={{ fontSize: '10px', color: isPlaying ? 'var(--emerald)' : 'var(--muted)', flexShrink: 0 }}>
                                    #{ch.channelNumber}
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', color: isPlaying ? '#FFFFFF' : '#D4D4D8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {dev.channels.length === 1
                                    ? dev.name
                                    : /^(основной поток|субпоток|profile|stream)/i.test(ch.name)
                                    ? `Канал ${ch.channelNumber}`
                                    : ch.name.replace(/^Канал \d+:\s*/, '')}
                                </span>
                                {isPlaying && (
                                  <span className="mono" style={{ fontSize: '7.5px', color: 'var(--emerald)', background: 'rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: '3px', fontWeight: 800, flexShrink: 0 }}>
                                    LIVE
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Views (Ракурсы) */}
        {sidebarTab === 'views' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="eyebrow">// СОХРАНЕННЫЕ РАКУРСЫ</span>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(true)}
                className="btn-pill btn-pill-emerald-outline"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                title="Сохранить текущую раскладку и камеры"
              >
                <Plus size={12} />
                Сохранить
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {customViews.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11.5px', padding: '24px 8px' }}>
                  Нет сохраненных ракурсов. Настройте сетку камер и нажмите «Сохранить».
                </div>
              ) : (
                customViews.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => onLoadCustomView(v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{v.name}</div>
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                        Раскладка: {v.layout} · {v.cells.length} камер
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomView(v.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-dark)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Удалить ракурс"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PTZ Joystick Collapsible Drawer */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#090c12' }}>
          <div
            onClick={() => setIsPtzOpen(!isPtzOpen)}
            style={{
              padding: '7px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={14} color="var(--emerald)" />
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF' }}>
                PTZ-УПРАВЛЕНИЕ
              </span>
            </div>
            {isPtzOpen ? <ChevronDown size={14} color="var(--muted)" /> : <ChevronRight size={14} color="var(--muted)" />}
          </div>

          {isPtzOpen && (
            <div style={{ padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 8-way directional pad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 34px)', gridGap: '4px', margin: '0 auto' }}>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('upleft')} onMouseUp={() => handlePtzAction('stop')}>↖</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('up')} onMouseUp={() => handlePtzAction('stop')}>▲</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('upright')} onMouseUp={() => handlePtzAction('stop')}>↗</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('left')} onMouseUp={() => handlePtzAction('stop')}>◀</button>
                <button type="button" className="btn-pill btn-pill-emerald-outline" style={{ padding: 0, justifyContent: 'center' }} onClick={() => handlePtzAction('stop')}>●</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('right')} onMouseUp={() => handlePtzAction('stop')}>▶</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('downleft')} onMouseUp={() => handlePtzAction('stop')}>↙</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('down')} onMouseUp={() => handlePtzAction('stop')}>▼</button>
                <button type="button" className="btn-pill" style={{ padding: 0, justifyContent: 'center' }} onMouseDown={() => handlePtzAction('downright')} onMouseUp={() => handlePtzAction('stop')}>↘</button>
              </div>

              {/* Zoom & Focus controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button type="button" className="btn-pill" style={{ flex: 1, padding: '4px', fontSize: '10.5px', justifyContent: 'center' }} onMouseDown={() => handlePtzAction('zoom_in')} onMouseUp={() => handlePtzAction('stop')}>Зум +</button>
                  <button type="button" className="btn-pill" style={{ flex: 1, padding: '4px', fontSize: '10.5px', justifyContent: 'center' }} onMouseDown={() => handlePtzAction('zoom_out')} onMouseUp={() => handlePtzAction('stop')}>Зум -</button>
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button type="button" className="btn-pill" style={{ flex: 1, padding: '4px', fontSize: '10.5px', justifyContent: 'center' }} onMouseDown={() => handlePtzAction('focus_in')} onMouseUp={() => handlePtzAction('stop')}>Фокус +</button>
                  <button type="button" className="btn-pill" style={{ flex: 1, padding: '4px', fontSize: '10.5px', justifyContent: 'center' }} onMouseDown={() => handlePtzAction('focus_out')} onMouseUp={() => handlePtzAction('stop')}>Фокус -</button>
                </div>
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={ptzPreset}
                  onChange={(e) => setPtzPreset(parseInt(e.target.value, 10))}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>Пресет {num}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-pill btn-pill-primary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => handlePtzAction('goto_preset')}
                >
                  Вызов
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle on Right Border */}
        {isSidebarOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingSidebar(true);
            }}
            onDoubleClick={() => setSidebarWidth(330)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '5px',
              height: '100%',
              cursor: 'col-resize',
              zIndex: 35,
              background: isResizingSidebar ? 'var(--emerald)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isResizingSidebar) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              if (!isResizingSidebar) e.currentTarget.style.background = 'transparent';
            }}
            title="Потяните для изменения ширины панели (двойной клик — сброс 330px)"
          />
        )}
      </aside>

      {/* Floating Toggle button to reopen sidebar when collapsed */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute',
            left: 0,
            top: '52px',
            background: '#0d1017',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '8px 4px',
            zIndex: 30,
          }}
          title="Развернуть дерево камер"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* 2. Main Work Area: Center Video Wall + Bottom Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
        {/* The Video Wall Matrix (Occupies 85-90% of screen) */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gap: '1px',
            background: '#000000',
            padding: '1px',
            minHeight: 0,
            ...getGridStyle(),
          }}
        >
          {gridSlots.map((cell, idx) => {
            const enrichedCell = cell
              ? {
                  ...cell,
                  deviceName: cell.deviceName || devices.find((d) => d.id === cell.deviceId)?.name || '',
                }
              : null;
            return (
              <div key={idx} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, ...getSlotSpanStyle(idx) }}>
                <VmsVideoCell
                  cell={enrichedCell}
                  cellIndex={pageStartIndex + idx}
                  isSelected={cell ? cell.cellId === selectedCellId : false}
                  isMaximized={layout === '1x1'}
                  onSelect={() => {
                    if (cell) onSelectCell(cell);
                  }}
                  onDoubleClick={() => handleCellDoubleClick(idx)}
                  onClose={() => onCloseCell(pageStartIndex + idx)}
                  onToggleStream={(newStream) => {
                    if (cell) onToggleStream(cell.cellId, newStream);
                  }}
                  onTakeScreenshot={() => {
                    if (cell) onTakeCellScreenshot(cell);
                  }}
                  onToggleRecord={() => {
                    if (cell && onToggleRecord) onToggleRecord(cell);
                  }}
                  onDropChannel={handleDropOnCell}
                  onOpenPTZ={() => {
                    setIsSidebarOpen(true);
                    setIsPtzOpen(true);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 3. Bottom Video Wall Toolbar (height 36px) */}
        <div
          style={{
            height: '36px',
            background: '#0d1017',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {/* Left: Standard & Combined Grid Layout Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, marginRight: '4px' }}>
              Сетка:
            </span>

            {/* Standard Grid Buttons */}
            {(['1x1', '2x2', '3x3', '4x4', '5x5', '6x6', '7x7', '8x8'] as GridLayout[]).map((l) => (
              <button
                key={l}
                type="button"
                className={`tab-pill mono ${layout === l ? 'active' : ''}`}
                onClick={() => handleSelectLayout(l)}
                style={{ padding: '2px 7px', fontSize: '11px', height: '24px' }}
                title={`Сетка ${l} (${getCapacity(l)} камер)`}
              >
                {l}
              </button>
            ))}

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

            {/* Combined Grids (Prominent/Corridor) */}
            {(['1+5', '1+7', '1+12', '2+8', '1+1+12'] as GridLayout[]).map((l) => (
              <button
                key={l}
                type="button"
                className={`tab-pill mono ${layout === l ? 'active' : ''}`}
                onClick={() => handleSelectLayout(l)}
                style={{ padding: '2px 6px', fontSize: '10.5px', height: '24px' }}
                title={`Комбинированная раскладка ${l} (${getCapacity(l)} камер)`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Right: Pagination + Patrol + Global Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: currentPage === 0 ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF',
                  borderRadius: '4px',
                  padding: '2px 5px',
                  cursor: currentPage === 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={13} />
              </button>

              <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {currentPage + 1} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: currentPage >= totalPages - 1 ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF',
                  borderRadius: '4px',
                  padding: '2px 5px',
                  cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Patrol (Автотур) Switch & Interval */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsPatrolActive(!isPatrolActive)}
                className={`tab-pill ${isPatrolActive ? 'active' : ''}`}
                style={{ padding: '2px 7px', fontSize: '11px', height: '24px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Автотур (Patrol): автоматическое перелистывание страниц сетки"
              >
                <Repeat size={11} className={isPatrolActive ? 'animate-spin' : ''} />
                Автотур
              </button>

              <select
                value={patrolInterval}
                onChange={(e) => setPatrolInterval(parseInt(e.target.value, 10))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '10.5px',
                  height: '24px',
                }}
              >
                <option value={5}>5с</option>
                <option value={10}>10с</option>
                <option value={30}>30с</option>
                <option value={60}>60с</option>
              </select>
            </div>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Quick Actions */}
            <button
              type="button"
              onClick={() => onToggleAllStreams('sub')}
              className="btn-pill"
              style={{ padding: '2px 7px', fontSize: '11px', height: '24px' }}
              title="Переключить все активные ячейки на субпоток (снижение нагрузки)"
            >
              Все SD
            </button>

            <button
              type="button"
              onClick={() => onToggleAllStreams('main')}
              className="btn-pill"
              style={{ padding: '2px 7px', fontSize: '11px', height: '24px' }}
              title="Переключить все активные ячейки на основной поток HD"
            >
              Все HD
            </button>

            <button
              type="button"
              onClick={onStopAllStreams}
              className="btn-pill"
              style={{ padding: '2px 7px', fontSize: '11px', height: '24px' }}
              title="Остановить все видеопотоки"
            >
              <Square size={10} color="#EF4444" fill="#EF4444" />
              Стоп
            </button>

            <button
              type="button"
              onClick={onTakeWallScreenshot}
              className="btn-pill"
              style={{ padding: '2px 7px', fontSize: '11px', height: '24px' }}
              title="Скриншот всей видеостены"
            >
              <Camera size={11} />
              Стена
            </button>

            <button
              type="button"
              onClick={handleToggleRecordAll}
              className="btn-pill"
              style={{
                padding: '2px 9px',
                fontSize: '11px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: isAnyRecording ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: isAnyRecording ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isAnyRecording ? '#EF4444' : '#E4E4E7',
                fontWeight: isAnyRecording ? 700 : 500,
              }}
              title={isAnyRecording ? 'Остановить запись всех активных камер' : 'Начать параллельную запись всех камер на диск ПК'}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#EF4444',
                  display: 'inline-block',
                }}
              />
              <span>{isAnyRecording ? 'Стоп REC' : 'REC Все'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Custom View Modal */}
      {isViewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal-window" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF', marginBottom: '8px' }}>
              Сохранить текущий ракурс видеостены
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
              Текущая сетка ({layout}) и распределение {cells.length} камер будут сохранены в профиль для мгновенного вызова.
            </p>

            <input
              type="text"
              placeholder="Например: Периметр 16 камер"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-pill" onClick={() => setIsViewModalOpen(false)}>Отмена</button>
              <button
                className="btn-pill btn-pill-primary"
                onClick={() => {
                  if (newViewName.trim()) {
                    onSaveCustomView(newViewName.trim());
                    setNewViewName('');
                    setIsViewModalOpen(false);
                  }
                }}
              >
                Сохранить ракурс
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
