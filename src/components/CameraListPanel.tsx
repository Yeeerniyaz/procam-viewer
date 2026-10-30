import React, { useState } from 'react';
import { CameraStreamItem, FilterType } from '../types';
import { Search, Video, HardDrive, Wifi, Activity } from 'lucide-react';

interface Props {
  cameras: CameraStreamItem[];
  selectedCameraId: string;
  onSelectCamera: (cam: CameraStreamItem) => void;
  onAddToGrid: (cam: CameraStreamItem) => void;
  onTestPing: (ip: string) => void;
}

export const CameraListPanel: React.FC<Props> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  onAddToGrid,
  onTestPing,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  // Counts
  const countAll = cameras.length;
  const countCams = cameras.filter((c) => c.device_type === 'camera').length;
  const countNVR = cameras.filter((c) => c.device_type === 'nvr').length;
  const countOnline = cameras.filter((c) => c.status === 'online').length;
  const countOffline = cameras.filter((c) => c.status === 'offline').length;

  const filtered = cameras.filter((c) => {
    if (filter === 'camera' && c.device_type !== 'camera') return false;
    if (filter === 'nvr' && c.device_type !== 'nvr') return false;
    if (filter === 'online' && c.status !== 'online') return false;
    if (filter === 'offline' && c.status !== 'offline') return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const hay = `${c.name} ${c.ip} ${c.mac} ${c.vendor} ${c.model} ${c.zone}`.toLowerCase();
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
          <span
            className="mono"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'var(--surface-card)',
              color: 'var(--emerald)',
              border: '1px solid var(--border)',
            }}
          >
            Всего: {cameras.length}
          </span>
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
            placeholder="Поиск по имени, IP, MAC или модели..."
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

      {/* Devices List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 16px',
              color: 'var(--muted)',
              fontSize: '13px',
            }}
          >
            Устройства по выбранному фильтру не найдены.
          </div>
        ) : (
          filtered.map((cam) => {
            const isSelected = cam.id === selectedCameraId;
            const isNvr = cam.device_type === 'nvr';

            return (
              <div
                key={cam.id}
                onClick={() => onSelectCamera(cam)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: isSelected ? 'var(--surface-active)' : 'var(--surface-card)',
                  border: isSelected
                    ? '1px solid var(--emerald)'
                    : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Top row: Status, Role & Name */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={`status-dot ${cam.status === 'online' ? 'online' : 'offline'}`}
                      title={cam.status === 'online' ? `Онлайн · ${cam.ping_ms} мс` : 'Офлайн'}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : '#E4E4E7',
                      }}
                    >
                      {cam.name}
                    </span>
                  </div>

                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: isNvr ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.16)',
                      color: isNvr ? '#60A5FA' : '#34D399',
                      border: isNvr
                        ? '1px solid rgba(59, 130, 246, 0.35)'
                        : '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    {isNvr ? 'NVR' : 'КАМЕРА'}
                  </span>
                </div>

                {/* Sub details: Model & Vendor */}
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {cam.vendor} · {cam.model}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10.5px',
                      color: cam.status === 'online' ? 'var(--emerald)' : 'var(--muted-dark)',
                    }}
                  >
                    {cam.status === 'online' ? `${cam.ping_ms} мс` : 'Офлайн'}
                  </span>
                </div>

                {/* IP & MAC row */}
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '4px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{cam.ip}</span>
                  <span style={{ color: 'var(--muted-dark)' }}>{cam.mac}</span>
                </div>

                {/* Quick actions footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    paddingTop: '6px',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--muted)',
                    }}
                  >
                    {cam.codec} · {cam.resolution}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-pill"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTestPing(cam.ip);
                      }}
                      title="Проверить отклик пинга"
                    >
                      <Activity size={11} color="var(--emerald)" />
                      Пинг
                    </button>
                    <button
                      className="btn-pill btn-pill-emerald-outline"
                      style={{ padding: '3px 9px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToGrid(cam);
                      }}
                      title="Вывести в рабочую область сетки"
                    >
                      В сетку
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
