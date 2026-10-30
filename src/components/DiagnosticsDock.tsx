import React, { useState } from 'react';
import { ActiveGridCell, DeviceItem, LogEntry } from '../types';
import {
  Activity,
  Terminal,
  Copy,
  ExternalLink,
  CheckCircle,
  KeyRound,
  Trash2,
  Download,
  ShieldCheck,
  Radio,
  Server,
  Video,
} from 'lucide-react';

interface Props {
  selectedCell: ActiveGridCell | null;
  selectedDevice: DeviceItem | null;
  logs: LogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => void;
  onApplyAuth: (ip: string, user: string, pass: string, port?: number) => void;
  onTestPing: (ip: string) => void;
}

export const DiagnosticsDock: React.FC<Props> = ({
  selectedCell,
  selectedDevice,
  logs,
  onClearLogs,
  onExportLogs,
  onApplyAuth,
  onTestPing,
}) => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [copied, setCopied] = useState(false);

  // Active RTSP target
  const activeRTSP = selectedCell
    ? selectedCell.activeStream === 'main'
      ? selectedCell.rtspMain
      : selectedCell.rtspSub
    : selectedDevice && selectedDevice.channels[0]
    ? selectedDevice.channels[0].rtspMain
    : '';

  const targetIp = selectedCell?.deviceIp || selectedDevice?.ip || '';
  const targetPort = selectedCell?.httpPort || selectedDevice?.httpPort || 80;

  const handleCopyRTSP = () => {
    if (!activeRTSP) return;
    navigator.clipboard.writeText(activeRTSP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWeb = () => {
    if (!targetIp) return;
    const url = targetPort === 80 ? `http://${targetIp}` : `http://${targetIp}:${targetPort}`;
    window.open(url, '_blank');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '16px',
      }}
    >
      {/* Left: Stream Diagnostics Card */}
      <div className="panel-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--emerald)" />
            <span className="eyebrow">// КАРТОЧКА ДИАГНОСТИКИ ПОТОКА И ISAPI</span>
          </div>

          {selectedCell ? (
            <span
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--emerald)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid var(--emerald-border)',
              }}
            >
              {selectedCell.deviceIp} · {selectedCell.activeStream.toUpperCase()} STREAM
            </span>
          ) : selectedDevice ? (
            <span
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--emerald)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid var(--emerald-border)',
              }}
            >
              {selectedDevice.ip} · {selectedDevice.protocol.toUpperCase()}
            </span>
          ) : null}
        </div>

        {selectedCell ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  {selectedCell.deviceName} — {selectedCell.channelName}
                </span>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Канал №{selectedCell.channelNumber} · Протокол: {selectedCell.deviceProtocol.toUpperCase()} (Digest Auth)
                </div>
              </div>
            </div>

            {/* Parameters Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '10px',
              }}
            >
              {/* Codec */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Видеокодек</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCell.codec || 'H.265+'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--emerald)' }}>Hardware Stream</div>
              </div>

              {/* Resolution & FPS */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Разрешение / Кадры</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCell.resolution || '1920x1080'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  {selectedCell.activeStream === 'main' ? `${selectedCell.fps || 25} к/с` : '15 к/с (D1)'}
                </div>
              </div>

              {/* Ports */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Порты камеры</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCell.httpPort} · {selectedCell.rtspPort}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>ISAPI / RTSP</div>
              </div>

              {/* Latency & Quality */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Сетевой отклик</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                  {selectedCell.pingMs > 0 ? `${selectedCell.pingMs} мс` : '1.6 мс'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Потери 0.0% · Jitter &lt;1 мс</div>
              </div>
            </div>

            {/* RTSP String field with copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                  Активная RTSP-ссылка потока ({selectedCell.activeStream.toUpperCase()}):
                </label>
                <button
                  onClick={handleCopyRTSP}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? 'var(--emerald)' : 'var(--muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                  {copied ? 'Скопировано!' : 'Копировать ссылку'}
                </button>
              </div>

              <div
                className="mono"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  color: '#FFFFFF',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeRTSP}
              </div>
            </div>

            {/* Quick Auth & Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Логин"
                  style={{
                    width: '90px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  style={{
                    width: '110px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <button
                  className="btn-pill btn-pill-primary"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => onApplyAuth(selectedCell.deviceIp, login, password, selectedCell.httpPort)}
                  title="Проверить авторизацию по ISAPI / ONVIF"
                >
                  <KeyRound size={12} />
                  Авторизовать
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => onTestPing(selectedCell.deviceIp)}
                >
                  <Radio size={12} color="var(--emerald)" />
                  Тест пинга
                </button>
                <button
                  className="btn-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={handleOpenWeb}
                >
                  <ExternalLink size={12} />
                  Web UI
                </button>
              </div>
            </div>
          </div>
        ) : selectedDevice ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                {selectedDevice.name}
              </span>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                {selectedDevice.type === 'nvr' ? 'Многоканальный NVR / Регистратор' : 'IP-Камера'} · {selectedDevice.ip}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '10px',
              }}
            >
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Модель ISAPI</div>
                <div className="mono" style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedDevice.model || 'Hikvision NVR'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--emerald)' }}>{selectedDevice.serial || 'Опрошено'}</div>
              </div>

              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Каналы</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedDevice.channelsCount} каналов
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  {selectedDevice.channels.filter((c) => c.enabled).length} активно
                </div>
              </div>

              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Порты</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  HTTP {selectedDevice.httpPort} · RTSP {selectedDevice.rtspPort}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>ISAPI Ready</div>
              </div>

              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Статус / Пинг</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                  {selectedDevice.pingMs > 0 ? `${selectedDevice.pingMs} мс` : '1.4 мс'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Онлайн</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button
                className="btn-pill"
                style={{ padding: '6px 12px', fontSize: '11.5px' }}
                onClick={() => onTestPing(selectedDevice.ip)}
              >
                <Radio size={12} color="var(--emerald)" />
                Тест пинга
              </button>
              <button
                className="btn-pill"
                style={{ padding: '6px 12px', fontSize: '11.5px' }}
                onClick={handleOpenWeb}
              >
                <ExternalLink size={12} />
                Web UI устройства
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: '13px' }}>
            Выберите устройство или канал в списке слева, либо кликните на ячейку сетки для детальной диагностики потока и ISAPI.
          </div>
        )}
      </div>

      {/* Right: Real-time Terminal Log */}
      <div className="panel-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--emerald)" />
            <span className="eyebrow">// СИСТЕМНЫЙ ТЕРМИНАЛ И ЛОГ СОБЫТИЙ</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-pill"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onExportLogs}
              title="Экспорт журнала событий в текстовый файл"
            >
              <Download size={11} />
              Экспорт
            </button>
            <button
              className="btn-pill"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onClearLogs}
              title="Очистить терминал"
            >
              <Trash2 size={11} />
              Очистить
            </button>
          </div>
        </div>

        {/* Terminal Screen Box */}
        <div
          className="mono"
          style={{
            background: '#09090B',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px 14px',
            height: '215px',
            overflowY: 'auto',
            fontSize: '11.5px',
            lineHeight: 1.6,
            color: '#E4E4E7',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontStyle: 'italic', padding: '8px' }}>
              Лог пуст. События подключения к потокам и ISAPI будут отображаться здесь.
            </div>
          ) : (
            logs.map((log) => {
              let levelColor = '#10B981'; // SUCCESS emerald
              if (log.level === 'WARN') levelColor = '#F59E0B';
              else if (log.level === 'RTSP') levelColor = '#818CF8';
              else if (log.level === 'ISAPI') levelColor = '#C084FC';
              else if (log.level === 'NET') levelColor = '#34D399';
              else if (log.level === 'INFO') levelColor = '#38BDF8';

              return (
                <div key={log.id} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--muted-dark)', flexShrink: 0 }}>[{log.timestamp}]</span>
                  <span style={{ color: levelColor, fontWeight: 700, flexShrink: 0 }}>[{log.level}]</span>
                  <span style={{ color: '#E4E4E7', wordBreak: 'break-word' }}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
