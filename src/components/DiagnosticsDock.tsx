import React, { useState } from 'react';
import { CameraStreamItem, LogEntry } from '../types';
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
} from 'lucide-react';

interface Props {
  selectedCamera: CameraStreamItem | null;
  logs: LogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => void;
  onApplyAuth: (ip: string, user: string, pass: string) => void;
  onTestPing: (ip: string) => void;
}

export const DiagnosticsDock: React.FC<Props> = ({
  selectedCamera,
  logs,
  onClearLogs,
  onExportLogs,
  onApplyAuth,
  onTestPing,
}) => {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [copied, setCopied] = useState(false);

  const activeRTSP = selectedCamera
    ? selectedCamera.active_stream === 'main'
      ? selectedCamera.rtsp_main
      : selectedCamera.rtsp_sub
    : 'rtsp://admin:12345@192.168.1.64:554/Streaming/Channels/101';

  const handleCopyRTSP = () => {
    navigator.clipboard.writeText(activeRTSP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWeb = () => {
    if (!selectedCamera) return;
    window.open(`http://${selectedCamera.ip}`, '_blank');
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
            <span className="eyebrow">// КАРТОЧКА ДИАГНОСТИКИ ПОТОКА</span>
          </div>

          {selectedCamera && (
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
              {selectedCamera.ip} · {selectedCamera.active_stream.toUpperCase()} STREAM
            </span>
          )}
        </div>

        {selectedCamera ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Parameters Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
              }}
            >
              {/* Codec */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Видеокодек</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCamera.codec}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--emerald)' }}>Smart HEVC Profile</div>
              </div>

              {/* Resolution & FPS */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Разрешение и FPS</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCamera.active_stream === 'main' ? selectedCamera.resolution.split(' ')[0] : '640x360 (D1)'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  {selectedCamera.active_stream === 'main' ? `${selectedCamera.fps} к/с` : '15 к/с'}
                </div>
              </div>

              {/* Ports */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Порты камеры</div>
                <div className="mono" style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  554 · 80 · 8000
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>RTSP · ONVIF · SDK</div>
              </div>

              {/* Latency & Quality */}
              <div style={{ background: 'var(--surface-card)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Сетевая задержка</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                  {selectedCamera.ping_ms} мс
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Потери 0.0% · Jitter 0.2 мс</div>
              </div>
            </div>

            {/* RTSP String field with copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                  Активная RTSP-ссылка потока:
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
                  {copied ? 'Скопировано!' : 'Копировать'}
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
                  onClick={() => onApplyAuth(selectedCamera.ip, login, password)}
                  title="Авторизовать поток по ISAPI / ONVIF"
                >
                  <KeyRound size={12} />
                  Авторизовать
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => onTestPing(selectedCamera.ip)}
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
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: '13px' }}>
            Выберите любую камеру в списке слева или в сетке для просмотра диагностики потока.
          </div>
        )}
      </div>

      {/* Right: Real-time Terminal Log */}
      <div className="panel-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--emerald)" />
            <span className="eyebrow">// СИСТЕМНЫЙ ТЕРМИНАЛ И ЛОГ ПОТОКОВ</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-pill"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onExportLogs}
              title="Экспорт лога в текстовый файл"
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
          {logs.map((log) => {
            let levelColor = '#10B981';
            if (log.level === 'WARN') levelColor = '#F59E0B';
            else if (log.level === 'RTSP') levelColor = '#60A5FA';
            else if (log.level === 'ONVIF') levelColor = '#A78BFA';
            else if (log.level === 'NET') levelColor = '#34D399';

            return (
              <div key={log.id} style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--muted-dark)', flexShrink: 0 }}>[{log.timestamp}]</span>
                <span style={{ color: levelColor, fontWeight: 700, flexShrink: 0 }}>[{log.level}]</span>
                <span style={{ color: '#E4E4E7', wordBreak: 'break-word' }}>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
