import React, { useState } from 'react';
import { DeviceItem, ChannelItem, DeviceProtocol, DeviceType } from '../types';
import { X, Plus, Activity, RefreshCw, Check, Server, Video, ShieldCheck, Eye, EyeOff, Radio } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveDevice: (device: DeviceItem) => void;
}

export const AddDeviceModal: React.FC<Props> = ({ isOpen, onClose, onSaveDevice }) => {
  if (!isOpen) return null;

  const [type, setType] = useState<DeviceType>('camera');
  const [protocol, setProtocol] = useState<DeviceProtocol>('onvif');
  const [name, setName] = useState('IP-Камера (ONVIF)');
  const [ip, setIp] = useState('192.168.1.64');
  const [httpPort, setHttpPort] = useState('80');
  const [rtspPort, setRtspPort] = useState('554');
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [showPassword, setShowPassword] = useState(false);
  const [channelsCount, setChannelsCount] = useState<number>(1);

  // Channels state
  const [channels, setChannels] = useState<ChannelItem[]>([
    {
      id: 'ch-1',
      channelNumber: 1,
      channelIdHik: '101',
      name: 'Камера 1',
      enabled: true,
      rtspMain: 'rtsp://admin:12345@192.168.1.64:554/live/main',
      rtspSub: 'rtsp://admin:12345@192.168.1.64:554/live/sub',
      activeStream: 'main',
      status: 'checking',
      pingMs: 0,
      resolution: '1920x1080',
      codec: 'H.264 / H.265',
    },
  ]);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Auto-poll state
  const [isPolling, setIsPolling] = useState(false);

  // Helper: regenerate channels based on count, protocol, ip, login, pass, rtspPort
  const generateChannels = (count: number, currentProto: DeviceProtocol = protocol) => {
    const list: ChannelItem[] = [];
    const port = parseInt(rtspPort, 10) || 554;
    for (let i = 1; i <= count; i++) {
      let mainURL = `rtsp://${login}:${password}@${ip}:${port}/Streaming/Channels/${i}01`;
      let subURL = `rtsp://${login}:${password}@${ip}:${port}/Streaming/Channels/${i}02`;

      if (currentProto === 'onvif') {
        if (count === 1) {
          mainURL = `rtsp://${login}:${password}@${ip}:${port}/stream1`;
          subURL = `rtsp://${login}:${password}@${ip}:${port}/stream2`;
        } else {
          mainURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}`;
          subURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}_sub`;
        }
      } else if (currentProto === 'dahua') {
        mainURL = `rtsp://${login}:${password}@${ip}:${port}/cam/realmonitor?channel=${i}&subtype=0`;
        subURL = `rtsp://${login}:${password}@${ip}:${port}/cam/realmonitor?channel=${i}&subtype=1`;
      } else if (currentProto === 'custom') {
        mainURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}`;
        subURL = `rtsp://${login}:${password}@${ip}:${port}/live/ch${i}_sub`;
      }

      list.push({
        id: `ch-${i}-${Date.now()}`,
        channelNumber: i,
        channelIdHik: `${i}01`,
        name: count === 1 ? (name.trim() || 'Камера 1') : `Канал ${i}`,
        enabled: true,
        rtspMain: mainURL,
        rtspSub: subURL,
        activeStream: 'main',
        status: 'checking',
        pingMs: 0,
        resolution: '1920x1080',
        codec: 'H.265+',
      });
    }
    return list;
  };

  const handleProtocolChange = (newProto: DeviceProtocol) => {
    setProtocol(newProto);
    if (newProto === 'onvif') {
      setName(type === 'nvr' ? 'Видеорегистратор ONVIF NVR' : 'IP-Камера (ONVIF)');
    } else if (newProto === 'hikvision') {
      setName(type === 'nvr' ? 'Hikvision NVR' : 'Hikvision IP-Камера');
    } else if (newProto === 'dahua') {
      setName(type === 'nvr' ? 'Dahua NVR' : 'Dahua IP-Камера');
    }
    setChannels(generateChannels(channelsCount, newProto));
  };

  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    if (newType === 'camera') {
      setName(protocol === 'onvif' ? 'IP-Камера (ONVIF)' : 'IP-Камера (Вход)');
      setChannelsCount(1);
      setChannels(generateChannels(1, protocol));
    } else {
      setName(protocol === 'onvif' ? 'Видеорегистратор ONVIF NVR' : 'Видеорегистратор NVR-8');
      setChannelsCount(8);
      setChannels(generateChannels(8, protocol));
    }
  };

  const handleCountChange = (count: number) => {
    setChannelsCount(count);
    setChannels(generateChannels(count, protocol));
  };

  // Test connection (supports ONVIF SOAP and Hikvision ISAPI)
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const endpoint = protocol === 'onvif' ? '/api/onvif/deviceInfo' : '/api/isapi/deviceInfo';

    try {
      const res = await fetch(
        `${endpoint}?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(httpPort)}&user=${encodeURIComponent(login)}&pass=${encodeURIComponent(password)}`
      );
      const data = await res.json();
      if (data.success) {
        const title = data.manufacturer || data.model || (protocol === 'onvif' ? 'ONVIF Device' : 'Hikvision Device');
        setTestResult({
          success: true,
          message: `✔ Устройство найдено: ${title} (${data.model || 'CCTV'}), SN: ${data.serialNumber || data.serial || 'N/A'}, Прошивка: ${data.firmwareVersion || 'v4.x'}`,
          details: data,
        });
        if (data.model) {
          setName(`${title} ${data.model}`);
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Ошибка подключения к устройству. Проверьте IP, порт и логин/пароль.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Ошибка связи с локальным шлюзом: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Auto-discover channels / profiles (ONVIF SOAP or Hikvision ISAPI)
  const handleAutoPollChannels = async () => {
    setIsPolling(true);
    setTestResult(null);

    if (protocol === 'onvif') {
      // Poll ONVIF GetProfiles
      try {
        const res = await fetch(
          `/api/onvif/profiles?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(httpPort)}&user=${encodeURIComponent(login)}&pass=${encodeURIComponent(password)}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
          const polledList: ChannelItem[] = data.profiles.map((p: any, idx: number) => ({
            id: `onvif-prof-${idx + 1}-${Date.now()}`,
            channelNumber: idx + 1,
            channelIdHik: `${idx + 1}01`,
            name: p.name || `Профиль ${idx + 1}`,
            enabled: true,
            rtspMain: p.rtspMain,
            rtspSub: p.rtspSub,
            activeStream: 'main',
            status: 'online',
            pingMs: 1.5,
            resolution: p.resolution || '1920x1080',
            codec: 'H.264 / H.265 (ONVIF)',
          }));
          setChannels(polledList);
          setChannelsCount(polledList.length);
          setTestResult({
            success: true,
            message: `✔ ONVIF SOAP: Успешно получено ${polledList.length} профилей видеопотоков (Profile S / G).`,
          });
        } else {
          setTestResult({
            success: false,
            message: 'Камера не ответила на ONVIF GetProfiles. Проверьте авторизацию WS-Security.',
          });
        }
      } catch (e: any) {
        setTestResult({
          success: false,
          message: `Ошибка ONVIF GetProfiles: ${e.message}`,
        });
      } finally {
        setIsPolling(false);
      }
      return;
    }

    // Otherwise Hikvision ISAPI channels
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
        name:
          type === 'camera' && (!ch.name || /^(основной поток|субпоток|profile|stream)/i.test(ch.name))
            ? (name.trim() || 'Камера 1')
            : ch.name,
      })),
      status: 'online',
      pingMs: 1.5,
      model: testResult?.details?.model || (protocol === 'onvif' ? 'ONVIF Profile S' : protocol === 'hikvision' ? 'Hikvision ISAPI' : 'RTSP Device'),
      serial: testResult?.details?.serialNumber || testResult?.details?.serial || '',
      firmware: testResult?.details?.firmwareVersion || testResult?.details?.firmware || '',
      expanded: true,
    };

    onSaveDevice(newDevice);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">// ДОБАВЛЕНИЕ УСТРОЙСТВА ВИДЕОНАБЛЮДЕНИЯ</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
              Подключение IP-камеры или многоканального NVR (ONVIF · ISAPI · RTSP)
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
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Автономная IP-камера (ONVIF Profile S / Hikvision)</div>
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
            Протокол интеграции устройства:
          </label>
          <div className="tabs-container" style={{ flexWrap: 'wrap' }}>
            <button
              className={`tab-pill ${protocol === 'onvif' ? 'active' : ''}`}
              onClick={() => handleProtocolChange('onvif')}
              style={{ fontWeight: 700 }}
            >
              ONVIF (Profile S / G / T)
            </button>
            <button
              className={`tab-pill ${protocol === 'hikvision' ? 'active' : ''}`}
              onClick={() => handleProtocolChange('hikvision')}
            >
              Hikvision (ISAPI / RTSP)
            </button>
            <button
              className={`tab-pill ${protocol === 'dahua' ? 'active' : ''}`}
              onClick={() => handleProtocolChange('dahua')}
            >
              Dahua (RTSP / CGI)
            </button>
            <button
              className={`tab-pill ${protocol === 'custom' ? 'active' : ''}`}
              onClick={() => handleProtocolChange('custom')}
            >
              Custom RTSP URL
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
              placeholder="ONVIF IP-Камера (Вход)"
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
              {protocol === 'onvif' ? 'ONVIF / HTTP порт (80/8000/8080/8899):' : 'HTTP / ISAPI порт:'}
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
              RTSP порт видеопотока (обычно 554):
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
              Логин (ONVIF / RTSP):
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
            {isTesting ? 'Проверка связи...' : protocol === 'onvif' ? 'Проверить ONVIF (SOAP)' : 'Проверить ISAPI тест'}
          </button>

          <button
            type="button"
            className="btn-pill"
            onClick={handleAutoPollChannels}
            disabled={isPolling}
            title={protocol === 'onvif' ? 'Получить список профилей потоков через ONVIF GetProfiles' : 'Автоматически обнаружить все каналы NVR через ISAPI'}
          >
            {isPolling ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} color="#10B981" />}
            {isPolling
              ? 'Опрос профилей...'
              : protocol === 'onvif'
              ? 'Автоопрос профилей ONVIF (GetProfiles)'
              : 'Автоопрос каналов (ISAPI)'}
          </button>
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

        {/* Channels Configuration Section */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#FFFFFF' }}>
              {type === 'nvr' ? 'Каналы NVR-видеорегистратора (выберите количество и включите нужные):' : 'Потоки и каналы устройства:'}
            </div>

            {/* Channel count buttons for NVR */}
            {type === 'nvr' && (
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
            )}
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
                  style={{ accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />

                <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)', width: '60px' }}>
                  #{ch.channelNumber}
                </span>

                <input
                  type="text"
                  value={ch.name}
                  onChange={(e) => handleChannelNameChange(idx, e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px dashed var(--border)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    padding: '2px 4px',
                  }}
                />

                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {protocol.toUpperCase()} · Main/Sub
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-pill" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-pill btn-pill-primary" onClick={handleSave}>
            <Check size={14} />
            {type === 'nvr' ? 'Добавить NVR в комплекс' : 'Добавить IP-камеру'}
          </button>
        </div>
      </div>
    </div>
  );
};
