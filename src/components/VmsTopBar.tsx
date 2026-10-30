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
  Wifi,
  HardDrive,
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
  const [cpuUsage, setCpuUsage] = useState<number>(14);
  const [ramUsage, setRamUsage] = useState<string>('2.4');

  // Digital Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('ru-RU', { hour12: false }));
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

  return (
    <header
      style={{
        height: '44px',
        background: '#0d1017',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', height: '100%' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <CyberOwlLogo size={24} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.4px', color: '#FFFFFF' }}>
              PROCAM <span style={{ color: 'var(--emerald)' }}>VMS</span>
            </span>
            <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 600 }}>
              iVMS-4200
            </span>
          </div>
        </div>

        {/* 4 Main Module Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
          <button
            type="button"
            onClick={() => onSelectModule('live')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'live' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'live' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
              color: activeModule === 'live' ? '#FFFFFF' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
          >
            <Monitor size={14} color={activeModule === 'live' ? 'var(--emerald)' : 'currentColor'} />
            Основной ракурс (Live View)
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('playback')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'playback' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'playback' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
              color: activeModule === 'playback' ? '#FFFFFF' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
          >
            <Film size={14} color={activeModule === 'playback' ? 'var(--emerald)' : 'currentColor'} />
            Удаленное воспроизведение (Playback)
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('devices')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'devices' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'devices' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
              color: activeModule === 'devices' ? '#FFFFFF' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
          >
            <Server size={14} color={activeModule === 'devices' ? 'var(--emerald)' : 'currentColor'} />
            Управление устройствами (Device Management)
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('events')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '7px',
              border: activeModule === 'events' ? '1px solid var(--emerald-border)' : '1px solid transparent',
              background: activeModule === 'events' ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
              color: activeModule === 'events' ? '#FFFFFF' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
          >
            <Activity size={14} color={activeModule === 'events' ? 'var(--emerald)' : 'currentColor'} />
            События и консоль (Event Center & Logs)
          </button>
        </nav>
      </div>

      {/* Right: Telemetry + Network + Live Clock + Fullscreen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Host IP & Network Badge */}
        <div
          className="mono"
          style={{
            fontSize: '10.5px',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px 9px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          title={activeIface ? activeIface.label : primaryIP}
        >
          <span className="status-dot online" style={{ width: '6px', height: '6px' }} />
          <span>{primaryIP}</span>
        </div>

        {/* CPU & RAM Telemetry Badge */}
        <div
          className="mono"
          style={{
            fontSize: '10.5px',
            color: '#D4D4D8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px 9px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Cpu size={11} color="var(--emerald)" />
            {cpuUsage}%
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <HardDrive size={11} color="#60A5FA" />
            {ramUsage} ГБ
          </span>
        </div>

        {/* Live Digital Clock */}
        <div
          className="mono"
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#FFFFFF',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--emerald-border)',
            padding: '3px 9px',
            borderRadius: '6px',
            letterSpacing: '0.8px',
          }}
        >
          {clock || '00:00:00'}
        </div>

        {/* PDF Manual button */}
        <button
          type="button"
          onClick={onOpenManualModal}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px',
          }}
          title="Инструкция оператора iVMS (PDF)"
        >
          <HelpCircle size={15} />
        </button>

        {/* Fullscreen F11 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px',
          }}
          title="Полноэкранный режим (F11)"
        >
          <Maximize size={15} />
        </button>
      </div>
    </header>
  );
};
