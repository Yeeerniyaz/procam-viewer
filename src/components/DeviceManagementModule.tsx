import React, { useState } from 'react';
import { DeviceItem, DiscoveredCam, ChannelItem } from '../types';
import {
  Plus,
  RefreshCw,
  Server,
  Video,
  Download,
  Trash2,
  ExternalLink,
  Edit,
  Radio,
  Search,
  Check,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';

interface Props {
  devices: DeviceItem[];
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onDeleteDevice: (id: string) => void;
  onEditDevice: (dev: DeviceItem) => void;
  onAddDiscoveredDevices: (newDevs: DeviceItem[]) => void;
  onTestPing: (ip: string) => void;
}

export const DeviceManagementModule: React.FC<Props> = ({
  devices,
  onOpenAddModal,
  onOpenExportModal,
  onDeleteDevice,
  onEditDevice,
  onAddDiscoveredDevices,
  onTestPing,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredCam[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');

  // Start Network Radar Scan (ONVIF WS-Discovery + SADP + Dahua + ARP)
  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/scan');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDiscovered(data);
          const initialMap: Record<string, boolean> = {};
          data.forEach((d) => {
            // Pre-select if not already in added devices
            if (!devices.some((added) => added.ip === d.ip)) {
              initialMap[d.ip] = true;
            }
          });
          setSelectedDiscovered(initialMap);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle selection of discovered device
  const toggleSelectDiscovered = (ip: string) => {
    setSelectedDiscovered((prev) => ({ ...prev, [ip]: !prev[ip] }));
  };

  // Select all / Deselect all
  const toggleSelectAllDiscovered = () => {
    const allSelected = discovered.every((d) => selectedDiscovered[d.ip]);
    const nextMap: Record<string, boolean> = {};
    discovered.forEach((d) => {
      nextMap[d.ip] = !allSelected;
    });
    setSelectedDiscovered(nextMap);
  };

  // Add selected discovered devices to VMS in 1 click
  const handleAddSelectedToVms = () => {
    const toAdd = discovered.filter((d) => selectedDiscovered[d.ip]);
    if (toAdd.length === 0) return;

    const newDeviceItems: DeviceItem[] = toAdd.map((d, idx) => {
      const devId = `disc-${Date.now()}-${idx}`;
      return {
        id: devId,
        name: d.model ? `${d.vendor || 'Камера'} ${d.model}` : `${d.vendor || 'IP-Камера'} (${d.ip})`,
        type: d.type || 'camera',
        protocol: d.protocol || 'onvif',
        ip: d.ip,
        httpPort: d.httpPort || 80,
        rtspPort: d.rtspPort || 554,
        login: 'admin',
        password: '',
        channelsCount: 1,
        channels: [
          {
            id: `${devId}-ch1`,
            channelNumber: 1,
            channelIdHik: '101',
            name: 'Канал 1: Основной поток',
            enabled: true,
            rtspMain: `rtsp://admin:@${d.ip}:${d.rtspPort || 554}/live/main`,
            rtspSub: `rtsp://admin:@${d.ip}:${d.rtspPort || 554}/live/sub`,
            activeStream: 'main',
            status: 'online',
            pingMs: 1.5,
            resolution: '1920x1080',
            codec: 'H.264 / H.265',
          },
        ],
        status: 'online',
        pingMs: 1.5,
        model: d.model || 'ONVIF Device',
        serial: d.serial || '',
        firmware: d.firmware || '',
        expanded: true,
      };
    });

    onAddDiscoveredDevices(newDeviceItems);
    // Uncheck added devices
    setSelectedDiscovered({});
  };

  const filteredDevices = devices.filter((d) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.ip.includes(q) ||
      (d.model && d.model.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'calc(100vh - 44px)',
        background: '#07090e',
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Section: Added Devices Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 20px', overflowY: 'auto' }}>
        {/* Header and Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="eyebrow">// КОНФИГУРАЦИЯ ОБОРУДОВАНИЯ VMS</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              Управление IP-камерами и NVR-видеорегистраторами ({devices.length} устройств)
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '4px 10px',
              }}
            >
              <Search size={13} color="var(--muted)" />
              <input
                type="text"
                placeholder="Фильтр по имени, IP или модели..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  width: '210px',
                }}
              />
            </div>

            <button
              type="button"
              className="btn-pill"
              onClick={onOpenExportModal}
              title="Экспорт списка устройств и плейлиста M3U8"
            >
              <Download size={13} />
              Экспорт
            </button>

            <button
              type="button"
              className="btn-pill btn-pill-primary"
              onClick={onOpenAddModal}
            >
              <Plus size={14} />
              Добавить устройство (RTSP / ONVIF / ISAPI)
            </button>
          </div>
        </div>

        {/* Devices Table */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>Статус</th>
                <th style={{ padding: '10px 14px' }}>Имя устройства</th>
                <th style={{ padding: '10px 14px' }}>Тип</th>
                <th style={{ padding: '10px 14px' }}>IP-адрес</th>
                <th style={{ padding: '10px 14px' }}>Порты</th>
                <th style={{ padding: '10px 14px' }}>Протокол</th>
                <th style={{ padding: '10px 14px' }}>Модель</th>
                <th style={{ padding: '10px 14px' }}>Каналы</th>
                <th style={{ padding: '10px 14px' }}>Серийный номер</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                    Нет добавленных устройств видеонаблюдения. Используйте кнопку «Добавить устройство» или выполните авторадар сети ниже.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isNVR = dev.type === 'nvr';

                  return (
                    <tr
                      key={dev.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Status */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`status-dot ${dev.status === 'online' ? 'online' : 'offline'}`} />
                          <span className="mono" style={{ fontSize: '11px', color: dev.status === 'online' ? 'var(--emerald)' : '#EF4444' }}>
                            {dev.status === 'online' ? `${dev.pingMs || 1.6} мс` : 'Офлайн'}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#FFFFFF' }}>
                        {dev.name}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: isNVR ? 'rgba(59, 130, 246, 0.16)' : 'rgba(16, 185, 129, 0.16)',
                            color: isNVR ? '#60A5FA' : '#34D399',
                            border: isNVR ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          {isNVR ? 'NVR' : 'IPC'}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="mono" style={{ padding: '10px 14px', color: '#FFFFFF', fontWeight: 700 }}>
                        {dev.ip}
                      </td>

                      {/* Ports */}
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                        {dev.httpPort} / {dev.rtspPort}
                      </td>

                      {/* Protocol */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              dev.protocol === 'onvif'
                                ? 'rgba(168, 85, 247, 0.16)'
                                : dev.protocol === 'hikvision'
                                ? 'rgba(16, 185, 129, 0.16)'
                                : 'rgba(255, 255, 255, 0.06)',
                            color:
                              dev.protocol === 'onvif'
                                ? '#C084FC'
                                : dev.protocol === 'hikvision'
                                ? 'var(--emerald)'
                                : '#D4D4D8',
                          }}
                        >
                          {dev.protocol.toUpperCase()}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="mono" style={{ padding: '10px 14px', color: '#D4D4D8' }}>
                        {dev.model || '-'}
                      </td>

                      {/* Channels */}
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--emerald)', fontWeight: 700 }}>
                        {dev.channels.length} кан.
                      </td>

                      {/* Serial */}
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '11px' }}>
                        {dev.serial || '-'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-pill"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => onTestPing(dev.ip)}
                            title="Проверить отклик пинга"
                          >
                            <Radio size={12} color="var(--emerald)" />
                            Пинг
                          </button>

                          <button
                            type="button"
                            className="btn-pill"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => window.open(`http://${dev.ip}:${dev.httpPort}`, '_blank')}
                            title="Открыть Web-интерфейс устройства"
                          >
                            <ExternalLink size={12} />
                            Web
                          </button>

                          <button
                            type="button"
                            className="btn-pill"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => {
                              if (confirm(`Удалить устройство "${dev.name}"?`)) {
                                onDeleteDevice(dev.id);
                              }
                            }}
                            title="Удалить из VMS"
                          >
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Bottom Drawer: Network Radar Scan (Онлайн-устройства в сети) */}
      <div
        style={{
          height: '240px',
          background: '#0d1017',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Radar Header */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={16} color="var(--emerald)" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              ОНЛАЙН-УСТРОЙСТВА В СЕТИ (СЕТЕВОЙ АВТОРАДАР ONVIF / SADP / DAHUA)
            </span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
              ({discovered.length} обнаружено)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-pill btn-pill-emerald-outline"
              onClick={handleStartScan}
              disabled={isScanning}
            >
              <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
              {isScanning ? 'Сканирование эфира...' : 'Сканировать сеть'}
            </button>

            {discovered.length > 0 && (
              <button
                type="button"
                className="btn-pill btn-pill-primary"
                onClick={handleAddSelectedToVms}
              >
                <Plus size={13} />
                + Добавить выбранные в VMS
              </button>
            )}
          </div>
        </div>

        {/* Radar Results Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {discovered.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
              Нажмите кнопку «Сканировать сеть» для отправки широковещательных запросов ONVIF WS-Discovery (:3702), Hikvision SADP (:37020) и Dahua (:37810).
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ color: 'var(--muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <th style={{ padding: '6px 8px', width: '32px' }}>
                    <input
                      type="checkbox"
                      checked={discovered.length > 0 && discovered.every((d) => selectedDiscovered[d.ip])}
                      onChange={toggleSelectAllDiscovered}
                      style={{ accentColor: 'var(--emerald)' }}
                    />
                  </th>
                  <th style={{ padding: '6px 8px' }}>IP-адрес</th>
                  <th style={{ padding: '6px 8px' }}>MAC-адрес</th>
                  <th style={{ padding: '6px 8px' }}>Производитель / Вендор</th>
                  <th style={{ padding: '6px 8px' }}>Модель</th>
                  <th style={{ padding: '6px 8px' }}>Протокол</th>
                  <th style={{ padding: '6px 8px' }}>Тип</th>
                  <th style={{ padding: '6px 8px' }}>Статус в VMS</th>
                </tr>
              </thead>
              <tbody>
                {discovered.map((d) => {
                  const isAdded = devices.some((dev) => dev.ip === d.ip);
                  const isSelected = !!selectedDiscovered[d.ip];

                  return (
                    <tr
                      key={d.ip}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectDiscovered(d.ip)}
                          style={{ accentColor: 'var(--emerald)' }}
                        />
                      </td>
                      <td className="mono" style={{ padding: '6px 8px', fontWeight: 700, color: '#FFFFFF' }}>
                        {d.ip}
                      </td>
                      <td className="mono" style={{ padding: '6px 8px', color: 'var(--muted)' }}>
                        {d.mac || '-'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#D4D4D8' }}>
                        {d.vendor}
                      </td>
                      <td className="mono" style={{ padding: '6px 8px', color: '#FFFFFF' }}>
                        {d.model || '-'}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                          {d.protocol.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>
                        {d.type === 'nvr' ? 'NVR' : 'Камера'}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {isAdded ? (
                          <span style={{ color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} /> Добавлено в VMS
                          </span>
                        ) : (
                          <span style={{ color: '#F59E0B' }}>Не добавлено</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
