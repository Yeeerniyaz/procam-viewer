import React, { useState } from 'react';
import { DeviceItem, ChannelItem, DeviceProtocol, DeviceType } from '../types';
import { X, Plus, Activity, RefreshCw, Check, Server, Video, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveDevice: (device: DeviceItem) => void;
}

export const AddDeviceModal: React.FC<Props> = ({ isOpen, onClose, onSaveDevice }) => {
  if (!isOpen) return null;

  const [type, setType] = useState<DeviceType>('camera');
  const [protocol, setProtocol] = useState<DeviceProtocol>('hikvision');
  const [name, setName] = useState('Входная группа');
  const [ip, setIp] = useState('192.168.1.64');
  const [httpPort, setHttpPort] = useState('80');
  const [rtspPort, setRtspPort] = useState('554');
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [showPassword, setShowPassword] = useState(false);
  const [channelsCount, setChannelsCount] = useState<number>(4);

  // Channels state
  const [channels, setChannels] = useState<ChannelItem[]>([
    {
      id: 'ch-1',
      channelNumber: 1,
      channelIdHik: '101',
      name: 'Канал 1: Входная группа',
      enabled: true,
      rtspMain: 'rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/101',
      rtspSub: 'rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/102',
      activeStream: 'main',
      status: 'checking',
      pingMs: 0,
      resolution: '2560x1440',
      codec: 'H.265+',
    },
  ]);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Auto-poll state
  const [isPolling, setIsPolling] = useState(false);

  // Helper: regenerate channels based on count, protocol, ip, login, pass, rtspPort
  const generateChannels = (count: number) => {
    const list: ChannelItem[] = [];
    const port = parseInt(rtspPort, 10) || 554;
    for (let i = 1; i <= count; i++) {
      let mainURL = `rtsp://${login}:${password}@${ip}:${port}/Streaming/Channels/${i}01`;
      let subURL = `rtsp://${login}:${password}@${ip}:${port}/Streaming/Channels/${i}02`;

      if (protocol === 'dahua') {
        mainURL = `rtsp://${login}:${password}@${ip}:${port}/cam/realmonitor?channel=${i}&subtype=0`;
        subURL = `rtsp://${login}:${password}@${ip}:${port}/cam/realmonitor?channel=${i}&subtype=1`;
      } else if (protocol === 'custom') {
        mainURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}`;
        subURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}_sub`;
      }

      list.push({
        id: `ch-${i}-${Date.now()}`,
        channelNumber: i,
        channelIdHik: `${i}01`,
        name: `Канал ${i}`,
        enabled: true,
        rtspMain: mainURL,
        rtspSub: subURL,
        activeStream: 'main',
        status: 'checking',
        pingMs: 0,
        resolution: '2560x1440',
        codec: 'H.265+',
      });
    }
    return list;
  };

  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    if (newType === 'camera') {
      setName('IP-Камера (Склад)');
      setChannelsCount(1);
      setChannels(generateChannels(1));
    } else {
      setName('Видеорегистратор NVR-8');
      setChannelsCount(8);
      setChannels(generateChannels(8));
    }
  };

  const handleCountChange = (count: number) => {
    setChannelsCount(count);
    setChannels(generateChannels(count));
  };

  // Test connection via ISAPI
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/isapi/deviceInfo?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(httpPort)}&user=${encodeURIComponent(login)}&pass=${encodeURIComponent(password)}`
      );
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `✔ Устройство доступно: ${data.name || 'Hikvision'} (${data.model || 'ISAPI Device'}), Серийный №: ${data.serial || '-'}`,
          details: data,
        });
        if (data.name && name === 'Входная группа') {
          setName(data.name);
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Ошибка подключения к устройству',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Ошибка связи с локальным сервером: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Auto-discover channels via ISAPI
  const handleAutoPollChannels = async () => {
    setIsPolling(true);
    try {
      const res = await fetch(
        `/api/isapi/channels?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(httpPort)}&user=${encodeURIComponent(login)}&pass=${encodeURIComponent(password)}&rtspPort=${encodeURIComponent(rtspPort)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.channels) && data.channels.length > 0) {
        const polledList: ChannelItem[] = data.channels.map((ch: any) => ({
          id: `polled-${ch.channelNumber}-${Date.now()}`,
          channelNumber: ch.channelNumber,
          channelIdHik: ch.channelIdHik || `${ch.channelNumber}01`,
          name: ch.name || `Канал ${ch.channelNumber}`,
          enabled: ch.enabled !== false,
          rtspMain: ch.rtspMain,
          rtspSub: ch.rtspSub,
          activeStream: 'main',
          status: 'checking',
          pingMs: 0,
          resolution: ch.resolution || '2560x1440',
          codec: ch.codec || 'H.265+',
        }));
        setChannels(polledList);
        setChannelsCount(polledList.length);
        setTestResult({
          success: true,
          message: `✔ Автоопрос ISAPI завершен: обнаружено ${polledList.length} каналов с NVR.`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'NVR не вернул список каналов. Проверьте логин и порт ISAPI.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Ошибка опроса каналов: ${e.message}`,
      });
    } finally {
      setIsPolling(false);
    }
  };

  const handleChannelToggle = (idx: number) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleChannelNameChange = (idx: number, newName: string) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, name: newName } : c))
    );
  };

  const handleSave = () => {
    if (!ip.trim()) return;

    const deviceId = `dev-${Date.now()}`;
    const newDevice: DeviceItem = {
      id: deviceId,
      name: name.trim() || (type === 'nvr' ? 'Видеорегистратор NVR' : 'IP-Камера'),
      type,
      protocol,
      ip: ip.trim(),
      httpPort: parseInt(httpPort, 10) || 80,
      rtspPort: parseInt(rtspPort, 10) || 554,
      login: login.trim() || 'admin',
      password,
      channelsCount: type === 'camera' ? 1 : channels.length,
      channels: channels.map((ch) => ({
        ...ch,
        id: `${deviceId}-ch-${ch.channelNumber}`,
      })),
      status: 'online',
      pingMs: 1.5,
      model: testResult?.details?.model || (protocol === 'hikvision' ? 'Hikvision ISAPI' : 'RTSP Device'),
      serial: testResult?.details?.serial || '',
      firmware: testResult?.details?.firmware || '',
      expanded: true,
    };

    onSaveDevice(newDevice);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">// ДОБАВЛЕНИЕ УСТРОЙСТВА ВИДЕОНАБЛЮДЕНИЯ</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
              Подключение IP-камеры или многоканального NVR (Hikvision ISAPI / RTSP)
            </h3>
          </div>
          <button className="btn-pill" style={{ padding: '6px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Device Type Selection Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => handleTypeChange('camera')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '14px',
              border: type === 'camera' ? '2px solid var(--emerald)' : '1px solid var(--border)',
              background: type === 'camera' ? 'var(--surface-active)' : 'var(--surface-card)',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
          >
            <Video size={22} color={type === 'camera' ? '#10B981' : '#A1A1AA'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px' }}>IP-Камера (1 канал)</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Автономная камера видеонаблюдения</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('nvr')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '14px',
              border: type === 'nvr' ? '2px solid var(--emerald)' : '1px solid var(--border)',
              background: type === 'nvr' ? 'var(--surface-active)' : 'var(--surface-card)',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
          >
            <Server size={22} color={type === 'nvr' ? '#10B981' : '#A1A1AA'} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px' }}>NVR / Регистратор (Мультиканал)</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Сетевой видеорегистратор 4 / 8 / 16 / 32 каналов</div>
            </div>
          </button>
        </div>

        {/* Protocol selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Протокол интеграции:
          </label>
          <div className="tabs-container">
            <button
              className={`tab-pill ${protocol === 'hikvision' ? 'active' : ''}`}
              onClick={() => setProtocol('hikvision')}
            >
              Hikvision (ISAPI / RTSP)
            </button>
            <button
              className={`tab-pill ${protocol === 'dahua' ? 'active' : ''}`}
              onClick={() => setProtocol('dahua')}
            >
              Dahua (RTSP / CGI)
            </button>
            <button
              className={`tab-pill ${protocol === 'custom' ? 'active' : ''}`}
              onClick={() => setProtocol('custom')}
            >
              Пользовательский RTSP
            </button>
          </div>
        </div>

        {/* Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Название устройства:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Офис Hikvision NVR-16"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              IP-адрес в сети:
            </label>
            <input
              type="text"
              className="mono"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.64"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              HTTP / ISAPI порт:
            </label>
            <input
              type="number"
              className="mono"
              value={httpPort}
              onChange={(e) => setHttpPort(e.target.value)}
              placeholder="80"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              RTSP порт видеопотока:
            </label>
            <input
              type="number"
              className="mono"
              value={rtspPort}
              onChange={(e) => setRtspPort(e.target.value)}
              placeholder="554"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Логин:
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="admin"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Пароль:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="12345"
                style={{
                  width: '100%',
                  padding: '8px 34px 8px 12px',
                  borderRadius: '10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Test Connection Button & Status Banner */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-pill btn-pill-emerald-outline"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Activity size={13} />}
            {isTesting ? 'Проверка связи...' : 'Проверить подключение (ISAPI тест)'}
          </button>

          {type === 'nvr' && (
            <button
              type="button"
              className="btn-pill"
              onClick={handleAutoPollChannels}
              disabled={isPolling}
              title="Автоматически обнаружить все камеры и имена каналов на NVR через ISAPI"
            >
              {isPolling ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} color="#10B981" />}
              {isPolling ? 'Опрос каналов NVR...' : 'Автоопрос каналов (ISAPI)'}
            </button>
          )}
        </div>

        {testResult && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '12px',
              lineHeight: 1.5,
              background: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: testResult.success ? '1px solid var(--emerald)' : '1px solid #EF4444',
              color: testResult.success ? '#34D399' : '#FCA5A5',
            }}
          >
            {testResult.message}
          </div>
        )}

        {/* NVR Channels Configuration Section */}
        {type === 'nvr' && (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#FFFFFF' }}>
                Каналы NVR-видеорегистратора (выберите количество и включите нужные):
              </div>

              {/* Channel count buttons */}
              <div className="tabs-container">
                {[4, 8, 16, 32].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    className={`tab-pill mono ${channelsCount === cnt ? 'active' : ''}`}
                    onClick={() => handleCountChange(cnt)}
                  >
                    {cnt} каналов
                  </button>
                ))}
              </div>
            </div>

            {/* Channels interactive list */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {channels.map((ch, idx) => (
                <div
                  key={ch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: ch.enabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={() => handleChannelToggle(idx)}
                    style={{ cursor: 'pointer', accentColor: 'var(--emerald)', width: '16px', height: '16px' }}
                  />

                  <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 700, width: '45px' }}>
                    CH-{ch.channelNumber}
                  </span>

                  <input
                    type="text"
                    value={ch.name}
                    onChange={(e) => handleChannelNameChange(idx, e.target.value)}
                    placeholder={`Канал ${ch.channelNumber}`}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border)',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                    }}
                  />

                  <span className="mono" style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    Streaming/Channels/{ch.channelNumber}01
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RTSP Stream Generation preview */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '2px' }}>
            Автоматически генерируемый основной поток RTSP (Main Stream):
          </div>
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--emerald)', wordBreak: 'break-all' }}>
            {type === 'camera'
              ? `rtsp://${login}:${password}@${ip}:${rtspPort}/Streaming/Channels/101`
              : `rtsp://${login}:${password}@${ip}:${rtspPort}/Streaming/Channels/\${N}01 (Каналы 1..${channels.length})`}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-pill" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-pill btn-pill-primary" onClick={handleSave}>
            <Plus size={14} />
            Сохранить устройство
          </button>
        </div>
      </div>
    </div>
  );
};
