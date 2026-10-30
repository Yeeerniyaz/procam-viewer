import React from 'react';
import { CyberOwlLogo } from './CyberOwlLogo';
import { NetInterfaceInfo } from '../types';
import { Search, PlusCircle, Download, HelpCircle, RefreshCw } from 'lucide-react';

interface Props {
  interfaces: NetInterfaceInfo[];
  primaryIP: string;
  isScanning: boolean;
  onScan: () => void;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenManualModal: () => void;
}

export const Header: React.FC<Props> = ({
  interfaces,
  primaryIP,
  isScanning,
  onScan,
  onOpenAddModal,
  onOpenExportModal,
  onOpenManualModal,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(17, 21, 31, 0.94)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
      }}
    >
      {/* Brand & Network Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CyberOwlLogo size={42} />
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                color: '#FFFFFF',
              }}
            >
              PRO<span style={{ fontWeight: 400, color: 'var(--muted)' }}>CAM</span>
              <span
                className="mono"
                style={{
                  display: 'inline-block',
                  marginLeft: '7px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '999px',
                  background: '#09090B',
                  color: 'var(--emerald)',
                  border: '1px solid var(--border-subtle)',
                  verticalAlign: 'middle',
                }}
              >
                VIEWER v4.1
              </span>
            </div>
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted-dark)',
                marginTop: '3px',
              }}
            >
              СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ · ИНЖЕНЕРНЫЙ КОМПЛЕКС
            </div>
          </div>
        </div>

        {/* Network Interfaces */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {interfaces && interfaces.length > 0 ? (
            interfaces.map((inf) => (
              <span
                key={inf.name}
                className={`net-pill ${inf.carrier ? 'active' : ''}`}
                title={`Подсеть: ${inf.subnet || 'Авто'}`}
              >
                <span className={`status-dot ${inf.carrier ? 'online' : 'offline'}`} />
                {inf.label}
              </span>
            ))
          ) : (
            <span className="net-pill active">
              <span className="status-dot online" />
              Кабель (eno1 · {primaryIP || '192.168.1.250'})
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="btn-pill btn-pill-primary"
          onClick={onScan}
          disabled={isScanning}
          title="Сканирование сети по ONVIF, Hikvision SADP и Dahua"
        >
          {isScanning ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {isScanning ? 'Сканирование сети...' : 'Найти камеры'}
        </button>

        <button
          className="btn-pill"
          onClick={onOpenAddModal}
          title="Добавить камеру или видеорегистратор по RTSP/ONVIF"
        >
          <PlusCircle size={14} color="#10B981" />
          Добавить по RTSP/ONVIF
        </button>

        <button
          className="btn-pill"
          onClick={onOpenExportModal}
          title="Экспорт конфигурации камер, профилей и плейлистов"
        >
          <Download size={14} />
          Экспорт конфигурации
        </button>

        <a
          className="btn-pill btn-pill-emerald-outline"
          href="/download/windows"
          download="ProCamViewer_Windows_x64.exe"
          title="Скачать портативный исполняемый файл для Windows 10/11 x64"
          style={{ textDecoration: 'none' }}
        >
          <Download size={14} color="#10B981" />
          Скачать .EXE (Windows)
        </a>

        <button
          className="btn-pill"
          onClick={onOpenManualModal}
          title="Инженерная документация и PDF руководство"
        >
          <HelpCircle size={14} />
          Инструкция
        </button>
      </div>
    </header>
  );
};
