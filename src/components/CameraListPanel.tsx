import React, { useState } from 'react';
import { DeviceItem, ChannelItem, FilterType } from '../types';
import {
  Search,
  Server,
  Video,
  ChevronDown,
  ChevronRight,
  Plus,
  Activity,
  Trash2,
  Grid,
  Radio,
  Layers,
} from 'lucide-react';

interface Props {
  devices: DeviceItem[];
  selectedDeviceId: string;
  selectedChannelId: string;
  onSelectDevice: (device: DeviceItem) => void;
  onSelectChannel: (device: DeviceItem, channel: ChannelItem) => void;
  onAddChannelToGrid: (device: DeviceItem, channel: ChannelItem) => void;
  onFillGridWithNVR: (device: DeviceItem) => void;
  onDeleteDevice: (deviceId: string) => void;
  onTestPing: (ip: string) => void;
  onOpenAddModal: () => void;
}

export const CameraListPanel: React.FC<Props> = ({
  devices,
  selectedDeviceId,
  selectedChannelId,
  onSelectDevice,
  onSelectChannel,
  onAddChannelToGrid,
  onFillGridWithNVR,
  onDeleteDevice,
  onTestPing,
  onOpenAddModal,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  // Counts
  const countAll = devices.length;
  const countCams = devices.filter((d) => d.type === 'camera').length;
  const countNVR = devices.filter((d) => d.type === 'nvr').length;
  const countOnline = devices.filter((d) => d.status === 'online').length;
  const countOffline = devices.filter((d) => d.status === 'offline').length;

  const filtered = devices.filter((d) => {
    if (filter === 'camera' && d.type !== 'camera') return false;
    if (filter === 'nvr' && d.type !== 'nvr') return false;
    if (filter === 'online' && d.status !== 'online') return false;
    if (filter === 'offline' && d.status !== 'offline') return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const hay = `${d.name} ${d.ip} ${d.model || ''} ${d.channels.map((c) => c.name).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div
      className="panel-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="eyebrow">// ПАРК КАМЕР И СЕТЕВЫХ УСТРОЙСТВ</span>
          <button
            className="btn-pill btn-pill-emerald-outline"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={onOpenAddModal}
            title="Добавить камеру или видеорегистратор NVR"
          >
            <Plus size={12} />
            Добавить
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            color="var(--muted)"
            style={{ position: 'absolute', left: '12px', top: '10px' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, IP или каналу..."
            style={{
              width: '100%',
              padding: '8px 14px 8px 34px',
              borderRadius: '999px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border)',
              color: '#FFFFFF',
              fontSize: '12.5px',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--emerald)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Tabs Filter */}
        <div className="tabs-container" style={{ flexWrap: 'wrap' }}>
          <button
            className={`tab-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все ({countAll})
          </button>
          <button
            className={`tab-pill ${filter === 'camera' ? 'active' : ''}`}
            onClick={() => setFilter('camera')}
          >
            Камеры ({countCams})
          </button>
          <button
            className={`tab-pill ${filter === 'nvr' ? 'active' : ''}`}
            onClick={() => setFilter('nvr')}
          >
            NVR ({countNVR})
          </button>
          <button
            className={`tab-pill ${filter === 'online' ? 'active' : ''}`}
            onClick={() => setFilter('online')}
          >
            Онлайн ({countOnline})
          </button>
          <button
            className={`tab-pill ${filter === 'offline' ? 'active' : ''}`}
            onClick={() => setFilter('offline')}
          >
            Офлайн ({countOffline})
          </button>
        </div>
      </div>

      {/* Devices List or Empty State */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {devices.length === 0 ? (
          /* Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 18px',
              textAlign: 'center',
              gap: '12px',
              color: 'var(--muted)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Video size={26} color="#10B981" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
                Парк устройств пуст
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '240px', lineHeight: 1.5 }}>
                Добавьте первую IP-камеру или видеорегистратор (NVR) для мониторинга видеопотоков.
              </div>
            </div>
            <button
              className="btn-pill btn-pill-primary"
              style={{ marginTop: '8px' }}
              onClick={onOpenAddModal}
            >
              <Plus size={14} />
              + Добавить камеру или NVR
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: '13px' }}>
            Устройства по выбранному фильтру не найдены.
          </div>
        ) : (
          filtered.map((device) => {
            const isNVR = device.type === 'nvr';
            const isExpanded = expandedMap[device.id] ?? true;
            const isDeviceSelected = device.id === selectedDeviceId;

            return (
              <div
                key={device.id}
                style={{
                  borderRadius: '14px',
                  background: 'var(--surface-card)',
                  border: isDeviceSelected
                    ? '1px solid var(--emerald)'
                    : '1px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Device Card Header */}
                <div
                  onClick={() => onSelectDevice(device)}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                    background: isDeviceSelected ? 'var(--surface-active)' : 'transparent',
                  }}
                >
                  {/* Top line: Icon, Name, Type Badge, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isNVR ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(device.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      ) : null}

                      <span className={`status-dot ${device.status === 'online' ? 'online' : 'offline'}`} />

                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                        }}
                      >
                        {device.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: isNVR ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.16)',
                          color: isNVR ? '#60A5FA' : '#34D399',
                          border: isNVR
                            ? '1px solid rgba(59, 130, 246, 0.35)'
                            : '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        {isNVR ? `NVR · ${device.channels.length} кан.` : 'КАМЕРА'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Удалить устройство "${device.name}"?`)) {
                            onDeleteDevice(device.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-dark)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Удалить устройство"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Subline: IP, Model, Ping */}
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>
                        {device.ip}:{device.httpPort}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: device.protocol === 'onvif' ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                          color: device.protocol === 'onvif' ? '#C084FC' : 'var(--muted)',
                          border: device.protocol === 'onvif' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border)',
                        }}
                      >
                        {device.protocol.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ color: device.status === 'online' ? 'var(--emerald)' : 'var(--muted-dark)' }}>
                      {device.status === 'online' ? `${device.pingMs} мс` : 'Офлайн'}
                    </span>
                  </div>

                  {/* Quick NVR actions button */}
                  {isNVR && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn-pill btn-pill-emerald-outline"
                        style={{ padding: '3px 9px', fontSize: '11px', width: '100%', justifyContent: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFillGridWithNVR(device);
                        }}
                        title="Отобразить все каналы NVR в сетке видеонаблюдения"
                      >
                        <Grid size={12} />
                        Заполнить сетку каналами NVR
                      </button>
                    </div>
                  )}

                  {!isNVR && device.channels.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        type="button"
                        className="btn-pill btn-pill-emerald-outline"
                        style={{ padding: '3px 9px', fontSize: '11px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddChannelToGrid(device, device.channels[0]);
                        }}
                      >
                        В сетку
                      </button>
                    </div>
                  )}
                </div>

                {/* NVR Expandable Channels Sub-List */}
                {isNVR && isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {device.channels.map((ch) => {
                      const isChannelSelected = ch.id === selectedChannelId;

                      return (
                        <div
                          key={ch.id}
                          onClick={() => onSelectChannel(device, ch)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isChannelSelected ? 'var(--surface-active)' : 'transparent',
                            border: isChannelSelected ? '1px solid var(--emerald)' : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="mono" style={{ fontSize: '10.5px', color: 'var(--emerald)', fontWeight: 700 }}>
                              CH-{ch.channelNumber}
                            </span>
                            <span style={{ fontSize: '12px', color: '#E4E4E7', fontWeight: 600 }}>
                              {ch.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="mono" style={{ fontSize: '9.5px', color: 'var(--muted)' }}>
                              {ch.activeStream.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              className="btn-pill"
                              style={{ padding: '2px 7px', fontSize: '10.5px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddChannelToGrid(device, ch);
                              }}
                              title="Вывести этот канал в рабочую область сетки"
                            >
                              В сетку
                            </button>
                          </div>
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
  );
};
