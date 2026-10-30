import React, { useState } from 'react';
import { CameraStreamItem } from '../types';
import { X, Plus, ShieldAlert, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddCamera: (newCam: CameraStreamItem) => void;
}

export const AddCameraModal: React.FC<Props> = ({ isOpen, onClose, onAddCamera }) => {
  if (!isOpen) return null;

  const [vendor, setVendor] = useState<'Hikvision' | 'Dahua' | 'Uniview' | 'ONVIF'>('Hikvision');
  const [name, setName] = useState('Новая камера');
  const [ip, setIp] = useState('192.168.1.75');
  const [zone, setZone] = useState('Вход');
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [rtspPort, setRtspPort] = useState('554');
  const [onvifPort, setOnvifPort] = useState('80');
  const [deviceType, setDeviceType] = useState<'camera' | 'nvr'>('camera');

  // Compute RTSP Main and Sub based on vendor
  let computedMain = `rtsp://${login}:${password}@${ip}:${rtspPort}/Streaming/Channels/101`;
  let computedSub = `rtsp://${login}:${password}@${ip}:${rtspPort}/Streaming/Channels/102`;

  if (vendor === 'Dahua') {
    computedMain = `rtsp://${login}:${password}@${ip}:${rtspPort}/cam/realmonitor?channel=1&subtype=0`;
    computedSub = `rtsp://${login}:${password}@${ip}:${rtspPort}/cam/realmonitor?channel=1&subtype=1`;
  } else if (vendor === 'Uniview') {
    computedMain = `rtsp://${login}:${password}@${ip}:${rtspPort}/unicast/c1/s0/live`;
    computedSub = `rtsp://${login}:${password}@${ip}:${rtspPort}/unicast/c1/s1/live`;
  } else if (vendor === 'ONVIF') {
    computedMain = `rtsp://${login}:${password}@${ip}:${rtspPort}/live/ch0`;
    computedSub = `rtsp://${login}:${password}@${ip}:${rtspPort}/live/ch1`;
  }

  const handleSave = () => {
    if (!ip.trim()) return;

    const newCam: CameraStreamItem = {
      ID: `cam-${Date.now()}`,
      id: `cam-${Date.now()}`,
      name: name.trim() || 'IP-Камера',
      ip: ip.trim(),
      mac: '58:03:fb:' + Math.random().toString(16).substr(2, 6).match(/.{1,2}/g)?.join(':'),
      vendor: vendor,
      model: vendor === 'Hikvision' ? 'DS-2CD2143G2' : vendor === 'Dahua' ? 'IPC-HFW2431S' : 'ONVIF Profile S',
      device_type: deviceType,
      device_label: deviceType === 'nvr' ? 'NVR / РЕГИСТРАТОР' : 'IP-КАМЕРА',
      zone: zone.trim() || 'Объект',
      status: 'online',
      ping_ms: 1.8,
      ports: [parseInt(onvifPort, 10) || 80, parseInt(rtspPort, 10) || 554],
      codec: 'H.265+',
      resolution: '2560x1440 (4 МП)',
      fps: 25,
      bitrate_kbps: 3840,
      rtsp_main: computedMain,
      rtsp_sub: computedSub,
      active_stream: 'main',
      channel: Math.floor(Math.random() * 8) + 1,
    } as any;

    onAddCamera(newCam);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">// ДОБАВЛЕНИЕ УСТРОЙСТВА</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              Подключение камеры или NVR по RTSP / ONVIF
            </h3>
          </div>
          <button className="btn-pill" style={{ padding: '6px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Vendor Preset Pills */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Шаблон производителя (автогенерация RTSP URL):
          </label>
          <div className="tabs-container">
            {(['Hikvision', 'Dahua', 'Uniview', 'ONVIF'] as const).map((v) => (
              <button
                key={v}
                className={`tab-pill ${vendor === v ? 'active' : ''}`}
                onClick={() => setVendor(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Имя камеры / Расположение:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Напр., Входная группа"
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
              Логин RTSP / ONVIF:
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="12345"
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
              Порт RTSP:
            </label>
            <input
              type="text"
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
              Тип устройства:
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontSize: '12.5px',
              }}
            >
              <option value="camera">IP-Камера (1 канал)</option>
              <option value="nvr">Видеорегистратор NVR (Многоканальный)</option>
            </select>
          </div>
        </div>

        {/* Computed RTSP preview */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>
            Автоматически сформированный RTSP-поток:
          </div>
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--emerald)', wordBreak: 'break-all' }}>
            {computedMain}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-pill" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-pill btn-pill-primary" onClick={handleSave}>
            <Plus size={14} />
            Добавить камеру в сетку
          </button>
        </div>
      </div>
    </div>
  );
};
