import React, { useState, useEffect, useRef } from 'react';
import {
  DeviceItem,
  ChannelItem,
  ActiveGridCell,
  GridLayout,
  CustomView,
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
} from 'lucide-react';

interface Props {
  devices: DeviceItem[];
  cells: ActiveGridCell[];
  selectedCellId: string;
  layout: GridLayout;
  customViews: CustomView[];
  onSelectCell: (cell: ActiveGridCell) => void;
  onLayoutChange: (layout: GridLayout) => void;
  onToggleStream: (cellId: string, newStream: 'main' | 'sub') => void;
  onToggleAllStreams: (stream: 'main' | 'sub') => void;
  onCloseCell: (cellIndex: number) => void;
  onFillGridWithNVR: (device: DeviceItem) => void;
  onAddChannelToCell: (targetIndex: number, device: DeviceItem, channel: ChannelItem) => void;
  onSwapCells: (fromIndex: number, toIndex: number) => void;
  onSaveCustomView: (name: string) => void;
  onDeleteCustomView: (id: string) => void;
  onLoadCustomView: (view: CustomView) => void;
  onTakeWallScreenshot: () => void;
  onTakeCellScreenshot: (cell: ActiveGridCell) => void;
  onStopAllStreams: () => void;
  onOpenAddModal: () => void;
}

export const LiveViewModule: React.FC<Props> = ({
  devices,
  cells,
  selectedCellId,
  layout,
  customViews,
  onSelectCell,
  onLayoutChange,
  onToggleStream,
  onToggleAllStreams,
  onCloseCell,
  onFillGridWithNVR,
  onAddChannelToCell,
  onSwapCells,
  onSaveCustomView,
  onDeleteCustomView,
  onLoadCustomView,
  onTakeWallScreenshot,
  onTakeCellScreenshot,
  onStopAllStreams,
  onOpenAddModal,
}) => {
  // Left Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'devices' | 'views'>('devices');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDevs, setExpandedDevs] = useState<Record<string, boolean>>({});
  const [isPtzOpen, setIsPtzOpen] = useState(false);
  const [ptzSpeed, setPtzSpeed] = useState<number>(50);
  const [ptzPreset, setPtzPreset] = useState<number>(1);

  // Pagination & Patrol State
  const [page, setPage] = useState<number>(0);
  const [isPatrolActive, setIsPatrolActive] = useState<boolean>(false);
  const [patrolInterval, setPatrolInterval] = useState<number>(10); // seconds
  const [newViewName, setNewViewName] = useState<string>('');
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Layout history for 1x1 maximize toggle
  const [previousLayout, setPreviousLayout] = useState<GridLayout>('2x2');

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

    if (layout === '1x1') {
      // Restore previous layout and switch to Sub Stream
      onLayoutChange(previousLayout || '2x2');
      onToggleStream(targetCell.cellId, 'sub');
    } else {
      // Maximize to 1x1 and switch to Main Stream
      setPreviousLayout(layout);
      onLayoutChange('1x1');
      onToggleStream(targetCell.cellId, 'main');
    }
  };

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

  // Double click channel in tree -> open in selected or first empty cell
  const handleChannelDoubleClick = (device: DeviceItem, channel: ChannelItem) => {
    let targetIndex = gridSlots.findIndex((c) => c && c.cellId === selectedCellId);
    if (targetIndex < 0) {
      targetIndex = gridSlots.findIndex((c) => c === null);
    }
    if (targetIndex < 0) {
      targetIndex = 0;
    }
    onAddChannelToCell(pageStartIndex + targetIndex, device, channel);
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
      {/* 1. Left Collapsible Sidebar (iVMS Tree & Custom Views & PTZ) */}
      <aside
        style={{
          width: isSidebarOpen ? '280px' : '0px',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: '#0d1017',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          zIndex: 20,
        }}
      >
        {/* Sidebar Header & Tab Switches */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setSidebarTab('devices')}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: sidebarTab === 'devices' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: sidebarTab === 'devices' ? 'var(--emerald)' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Камеры и NVR
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('views')}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: sidebarTab === 'views' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: sidebarTab === 'views' ? 'var(--emerald)' : 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ракурсы ({customViews.length})
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

        {/* Tab 1: Devices & Channels Tree */}
        {sidebarTab === 'devices' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Search Input */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
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
                  const isExpanded = expandedDevs[dev.id] ?? true;
                  const isNVR = dev.type === 'nvr';

                  return (
                    <div key={dev.id} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      {/* Device Row */}
                      <div
                        onDoubleClick={() => onFillGridWithNVR(dev)}
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
                        title="Двойной клик — заполнить сетку всеми каналами устройства"
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

                        {isNVR ? <Server size={14} color="#60A5FA" /> : <Video size={14} color="var(--emerald)" />}

                        <span className={`status-dot ${dev.status === 'online' ? 'online' : 'offline'}`} style={{ width: '5px', height: '5px' }} />

                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dev.name}
                        </span>

                        <span className="mono" style={{ fontSize: '9px', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 4px', borderRadius: '4px' }}>
                          {dev.channels.length}
                        </span>
                      </div>

                      {/* Channels Subtree */}
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '18px', borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: '10px' }}>
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
                                <span className={`status-dot ${isPlaying ? 'online' : dev.status === 'online' ? 'online' : 'offline'}`} style={{ width: '5px', height: '5px' }} />

                                <span className="mono" style={{ fontSize: '10px', color: isPlaying ? 'var(--emerald)' : 'var(--muted)' }}>
                                  #{ch.channelNumber}
                                </span>

                                <span style={{ fontSize: '11px', color: isPlaying ? '#FFFFFF' : '#D4D4D8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {ch.name}
                                </span>

                                {isPlaying && (
                                  <span className="mono" style={{ fontSize: '8.5px', color: 'var(--emerald)', background: 'rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: '3px' }}>
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
          {gridSlots.map((cell, idx) => (
            <div key={idx} style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, ...getSlotSpanStyle(idx) }}>
              <VmsVideoCell
                cell={cell}
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
                onDropChannel={handleDropOnCell}
                onOpenPTZ={() => {
                  setIsSidebarOpen(true);
                  setIsPtzOpen(true);
                }}
              />
            </div>
          ))}
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
                onClick={() => onLayoutChange(l)}
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
                onClick={() => onLayoutChange(l)}
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
