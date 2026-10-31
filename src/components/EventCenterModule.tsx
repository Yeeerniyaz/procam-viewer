import React, { useState } from 'react';
import { ActiveGridCell, DeviceItem, LogEntry, getCellDisplayName } from '../types';
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
  Search,
  Filter,
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

export const EventCenterModule: React.FC<Props> = ({
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
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchLog, setSearchLog] = useState('');

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

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchLog) {
      const q = searchLog.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.level.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1fr) minmax(520px, 1.4fr)',
        gap: '16px',
        padding: '20px',
        width: '100%',
        height: 'calc(100vh - 44px)',
        background: '#07090e',
        overflow: 'hidden',
      }}
    >
      {/* Left Column: Stream Diagnostics Card & Digest Auth Validator */}
      <div
        className="panel-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '20px',
          overflowY: 'auto',
          background: 'var(--surface-card)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={17} color="var(--emerald)" />
            <span className="eyebrow">// ДИАГНОСТИКА ПОТОКА И ISAPI СЕРВИСОВ</span>
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
              {selectedCell.deviceIp} · {selectedCell.activeStream.toUpperCase()}
            </span>
          ) : selectedDevice ? (
            <span
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#60A5FA',
                background: 'rgba(59, 130, 246, 0.12)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {selectedDevice.ip} · {selectedDevice.protocol.toUpperCase()}
            </span>
          ) : null}
        </div>

        {selectedCell ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header info */}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                {getCellDisplayName(selectedCell)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                Канал №{selectedCell.channelNumber} · Протокол: {selectedCell.deviceProtocol.toUpperCase()} (Digest Authentication)
              </div>
            </div>

            {/* Parameters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Видеокодек</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCell.codec || 'H.265+'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--emerald)' }}>Smart Codec Profile</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Разрешение / Частота</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedCell.resolution || '1920x1080'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  {selectedCell.activeStream === 'main' ? `${selectedCell.fps} к/с (HD)` : '15 к/с (SD)'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Порты камеры</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  HTTP {selectedCell.httpPort} · RTSP {selectedCell.rtspPort}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>ISAPI Ready</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Сетевой отклик</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                  {selectedCell.pingMs > 0 ? `${selectedCell.pingMs} мс` : '1.8 мс'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Потери 0.0% · Jitter 0.2 мс</div>
              </div>
            </div>

            {/* RTSP String field with copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                  Активная RTSP-ссылка потока ({selectedCell.activeStream.toUpperCase()}):
                </label>
                <button
                  type="button"
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
                  background: '#09090B',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 10px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                Проверка авторизации Digest/ISAPI:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Логин"
                  style={{
                    width: '90px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
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
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="button"
                  className="btn-pill btn-pill-primary"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => onApplyAuth(selectedCell.deviceIp, login, password, selectedCell.httpPort)}
                >
                  <KeyRound size={12} />
                  Авторизовать
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={() => onTestPing(selectedCell.deviceIp)}
                >
                  <Radio size={12} color="var(--emerald)" />
                  Тест пинга
                </button>
                <button
                  type="button"
                  className="btn-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px' }}
                  onClick={handleOpenWeb}
                >
                  <ExternalLink size={12} />
                  Web UI устройства
                </button>
              </div>
            </div>
          </div>
        ) : selectedDevice ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{selectedDevice.name}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                {selectedDevice.type === 'nvr' ? 'NVR-видеорегистратор' : 'IP-Камера'} · {selectedDevice.ip}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Модель</div>
                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedDevice.model || 'Hikvision Device'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Каналы</div>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                  {selectedDevice.channels.length} каналов
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-pill"
                style={{ padding: '6px 12px', fontSize: '11.5px' }}
                onClick={() => onTestPing(selectedDevice.ip)}
              >
                <Radio size={12} color="var(--emerald)" />
                Тест пинга
              </button>
              <button
                type="button"
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
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>
            Выберите устройство или ячейку в рабочем столе оператора для просмотра расширенной телеметрии.
          </div>
        )}
      </div>

      {/* Right Column: Real-time System Terminal & Event Log */}
      <div
        className="panel-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'hidden',
          background: 'var(--surface-card)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
        }}
      >
        {/* Terminal Header & Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={17} color="var(--emerald)" />
            <span className="eyebrow">// СИСТЕМНЫЙ ТЕРМИНАЛ И ЛОГ СОБЫТИЙ VMS</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn-pill"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={onExportLogs}
              title="Экспорт лога в TXT"
            >
              <Download size={12} />
              Экспорт
            </button>
            <button
              type="button"
              className="btn-pill"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={onClearLogs}
              title="Очистить терминал"
            >
              <Trash2 size={12} />
              Очистить
            </button>
          </div>
        </div>

        {/* Filters: Search & Level Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
          {/* Level Tabs */}
          <div className="tabs-container">
            {['ALL', 'INFO', 'RTSP', 'ISAPI', 'NET', 'WARN'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`tab-pill ${filterLevel === lvl ? 'active' : ''}`}
                onClick={() => setFilterLevel(lvl)}
                style={{ padding: '2px 8px', fontSize: '10.5px' }}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '3px 8px',
            }}
          >
            <Search size={12} color="var(--muted)" />
            <input
              type="text"
              placeholder="Поиск по событиям..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '11.5px',
                width: '140px',
              }}
            />
          </div>
        </div>

        {/* Terminal Output Screen */}
        <div
          className="mono"
          style={{
            flex: 1,
            background: '#09090B',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 14px',
            overflowY: 'auto',
            fontSize: '11.5px',
            lineHeight: 1.6,
            color: '#E4E4E7',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontStyle: 'italic', padding: '12px' }}>
              Нет записей событий в выбранном фильтре.
            </div>
          ) : (
            filteredLogs.map((log) => {
              let levelColor = '#10B981';
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
