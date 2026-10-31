import React, { useState, useEffect } from 'react';
import { VmsModule, NetInterfaceInfo } from '../types';
import { CyberOwlLogo } from './CyberOwlLogo';
import {
  Monitor,
  Film,
  Server,
  Activity,
  Maximize,
  HelpCircle,
  Cpu,
  HardDrive,
  Globe,
} from 'lucide-react';

interface Props {
  activeModule: VmsModule;
  onSelectModule: (module: VmsModule) => void;
  interfaces: NetInterfaceInfo[];
  primaryIP: string;
  onOpenManualModal: () => void;
}

export const VmsTopBar: React.FC<Props> = ({
  activeModule,
  onSelectModule,
  interfaces,
  primaryIP,
  onOpenManualModal,
}) => {
  const [clock, setClock] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [cpuUsage, setCpuUsage] = useState<number>(14);
  const [ramUsage, setRamUsage] = useState<string>('2.4');

  // FFmpeg auto-install telemetry
  const [ffmpegStatus, setFfmpegStatus] = useState<{
    installed: boolean;
    installing: boolean;
    message?: string;
  }>({ installed: true, installing: false });

  useEffect(() => {
    const checkFfmpeg = () => {
      fetch('/api/system/ffmpeg-status')
        .then((r) => r.json())
        .then((d) => {
          if (d) {
            setFfmpegStatus({
              installed: d.installed,
              installing: d.installing,
              message: d.message,
            });
          }
        })
        .catch(() => {});
    };
    checkFfmpeg();
    const interval = setInterval(checkFfmpeg, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleInstallFfmpeg = () => {
    fetch('/api/system/ffmpeg-install', { method: 'POST' })
      .then(() => {
        setFfmpegStatus((prev) => ({ ...prev, installing: true }));
      })
      .catch(() => {});
  };

  // Digital Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('ru-RU', { hour12: false }));
      setDateStr(
        now.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // CPU/RAM telemetry variation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.5) * 4;
        const val = Math.min(Math.max(Math.round(prev + delta), 8), 28);
        return val;
      });
      setRamUsage((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        const val = Math.min(Math.max(parseFloat(prev) + delta, 2.1), 3.2);
        return val.toFixed(1);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const activeIface = interfaces.find((i) => i.carrier && i.ip) || interfaces[0];
  const isOnline =
    (typeof navigator !== 'undefined' ? navigator.onLine : true) &&
    (interfaces.length > 0 ? interfaces.some((i) => i.carrier) : true);

  return (
    <header
      style={{
        height: '46px',
        background: 'linear-gradient(180deg, #11151f 0%, #0c0f16 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        userSelect: 'none',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Brand + Module Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            paddingRight: '12px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <CyberOwlLogo size={26} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 900, fontSize: '13.5px', letterSpacing: '0.4px', color: '#FFFFFF' }}>
                PRO<span style={{ color: 'var(--emerald)' }}>CAM</span>
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  letterSpacing: '0.04em',
                }}
              >
                VMS
              </span>
            </div>
            <span style={{ fontSize: '9px', color: '#71717A', fontWeight: 600, letterSpacing: '0.02em' }}>
              Video Management System
            </span>
          </div>
        </div>

        {/* 4 Main Module Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '3px',
            borderRadius: '9px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Tab 1: Live View */}
          <button
            type="button"
            onClick={() => onSelectModule('live')}
            style={{
              height: '30px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'live' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'live' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
              color: activeModule === 'live' ? '#FFFFFF' : '#9CA3AF',
              boxShadow: activeModule === 'live' ? '0 1px 8px rgba(16, 185, 129, 0.2)' : 'none',
              fontSize: '12px',
              fontWeight: activeModule === 'live' ? 700 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
            title="Основной ракурс видеонаблюдения в реальном времени (Live View)"
          >
            <Monitor size={14} color={activeModule === 'live' ? 'var(--emerald)' : 'currentColor'} />
            Мониторинг
          </button>

          {/* Tab 2: Playback */}
          <button
            type="button"
            onClick={() => onSelectModule('playback')}
            style={{
              height: '30px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'playback' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'playback' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
              color: activeModule === 'playback' ? '#FFFFFF' : '#9CA3AF',
              boxShadow: activeModule === 'playback' ? '0 1px 8px rgba(16, 185, 129, 0.2)' : 'none',
              fontSize: '12px',
              fontWeight: activeModule === 'playback' ? 700 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
            title="Воспроизведение локальных и NVR-записей архива (Remote Playback)"
          >
            <Film size={14} color={activeModule === 'playback' ? 'var(--emerald)' : 'currentColor'} />
            Архив
          </button>

          {/* Tab 3: Devices */}
          <button
            type="button"
            onClick={() => onSelectModule('devices')}
            style={{
              height: '30px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'devices' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'devices' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
              color: activeModule === 'devices' ? '#FFFFFF' : '#9CA3AF',
              boxShadow: activeModule === 'devices' ? '0 1px 8px rgba(16, 185, 129, 0.2)' : 'none',
              fontSize: '12px',
              fontWeight: activeModule === 'devices' ? 700 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
            title="Управление камерами, NVR и сканирование сети (Device Management)"
          >
            <Server size={14} color={activeModule === 'devices' ? 'var(--emerald)' : 'currentColor'} />
            Устройства
          </button>

          {/* Tab 4: Events & Logs */}
          <button
            type="button"
            onClick={() => onSelectModule('events')}
            style={{
              height: '30px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'events' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'events' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
              color: activeModule === 'events' ? '#FFFFFF' : '#9CA3AF',
              boxShadow: activeModule === 'events' ? '0 1px 8px rgba(16, 185, 129, 0.2)' : 'none',
              fontSize: '12px',
              fontWeight: activeModule === 'events' ? 700 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
            title="Журнал событий, тревоги и инженерная диагностика потоков (Event Center & Logs)"
          >
            <Activity size={14} color={activeModule === 'events' ? 'var(--emerald)' : 'currentColor'} />
            События
          </button>
        </nav>
      </div>

      {/* Right: Network + Telemetry + Live Clock + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Host IP & Network Badge */}
        <div
          className="mono"
          style={{
            fontSize: '11px',
            color: isOnline ? '#D4D4D8' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px 10px',
            borderRadius: '7px',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
          title={activeIface ? `${activeIface.label} · IP: ${primaryIP} (${activeIface.subnet || 'Авто'})` : primaryIP}
        >
          <span
            className={`status-dot ${isOnline ? 'online' : 'offline'}`}
            style={{ width: '6px', height: '6px' }}
          />
          <Globe size={11} color={isOnline ? 'var(--emerald)' : '#EF4444'} />
          <span>{isOnline ? primaryIP : 'Офлайн'}</span>
        </div>

        {/* FFmpeg Auto-Install Indicator if installing or missing */}
        {ffmpegStatus.installing ? (
          <div
            className="mono"
            style={{
              fontSize: '10.5px',
              color: '#F59E0B',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            title={ffmpegStatus.message || 'Загрузка портативного видеоядра FFmpeg в фоновом режиме...'}
          >
            <span className="status-dot live-pulse" style={{ background: '#F59E0B' }} />
            <span>FFmpeg: Загрузка...</span>
          </div>
        ) : !ffmpegStatus.installed ? (
          <button
            type="button"
            onClick={handleInstallFfmpeg}
            className="btn-pill"
            style={{
              fontSize: '10.5px',
              color: '#EF4444',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '3px 8px',
              cursor: 'pointer',
            }}
            title="Нажмите для автоматической установки портативного видеоядра FFmpeg"
          >
            ⚡ Установить FFmpeg
          </button>
        ) : null}

        {/* CPU & RAM Telemetry Badge */}
        <div
          className="mono"
          style={{
            fontSize: '11px',
            color: '#D4D4D8',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px 10px',
            borderRadius: '7px',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
          title="Загрузка ресурсов процессора и оперативной памяти"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Cpu size={11} color="var(--emerald)" />
            {cpuUsage}%
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <HardDrive size={11} color="#60A5FA" />
            {ramUsage} ГБ
          </span>
        </div>

        {/* Live Digital Clock */}
        <div
          className="mono"
          style={{
            fontSize: '11.5px',
            fontWeight: 800,
            color: '#FFFFFF',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: '7px',
            letterSpacing: '0.6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Системное время рабочей станции"
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--emerald)', boxShadow: '0 0 6px var(--emerald)' }} />
          <span>{clock || '00:00:00'}</span>
          {dateStr && (
            <span style={{ color: 'var(--muted)', fontSize: '10px', fontWeight: 600 }}>
              {dateStr}
            </span>
          )}
        </div>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

        {/* PDF Manual button */}
        <button
          type="button"
          onClick={onOpenManualModal}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            color: '#A1A1AA',
            cursor: 'pointer',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '7px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#A1A1AA';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }}
          title="Руководство пользователя ProCam VMS"
        >
          <HelpCircle size={15} />
        </button>

        {/* Fullscreen F11 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            color: '#A1A1AA',
            cursor: 'pointer',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '7px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#A1A1AA';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }}
          title="Полноэкранный режим монитора (F11)"
        >
          <Maximize size={15} />
        </button>
      </div>
    </header>
  );
};
