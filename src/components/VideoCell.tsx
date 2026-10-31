import React, { useState, useEffect } from 'react';
import { ActiveGridCell, getCellDisplayName } from '../types';
import { Camera, RefreshCw, Maximize2, ShieldAlert, Radio } from 'lucide-react';

interface Props {
  cell: ActiveGridCell;
  cellIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStream: (cellId: string, newStream: 'main' | 'sub') => void;
  onRestartStream: (cell: ActiveGridCell) => void;
  onTakeScreenshot: (cell: ActiveGridCell) => void;
  onExpand1x1: (cell: ActiveGridCell) => void;
}

export const VideoCell: React.FC<Props> = ({
  cell,
  cellIndex,
  isSelected,
  onSelect,
  onToggleStream,
  onRestartStream,
  onTakeScreenshot,
  onExpand1x1,
}) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [streamNonce, setStreamNonce] = useState(Date.now());
  const isSub = cell.activeStream === 'sub';

  const activeRTSP = isSub ? cell.rtspSub : cell.rtspMain;
  const hikChannel = isSub ? `${cell.channelNumber}02` : `${cell.channelNumber}01`;

  // Live stream URL: primary via local FFmpeg MJPEG proxy
  const mjpegURL = `/api/stream/mjpeg?rtsp=${encodeURIComponent(activeRTSP)}&_t=${streamNonce}`;
  // Fallback ISAPI snapshot URL
  const isapiPicURL = `/api/isapi/picture?ip=${encodeURIComponent(cell.deviceIp)}&port=${cell.httpPort}&user=${encodeURIComponent(cell.login)}&pass=${encodeURIComponent(cell.password)}&channel=${hikChannel}&_t=${streamNonce}`;

  const handleRestart = () => {
    setIsRestarting(true);
    setHasError(false);
    setStreamNonce(Date.now());
    onRestartStream(cell);
    setTimeout(() => {
      setIsRestarting(false);
    }, 1000);
  };

  const handleToggle = (newStream: 'main' | 'sub') => {
    setStreamNonce(Date.now());
    setHasError(false);
    onToggleStream(cell.cellId, newStream);
  };

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        background: '#09090B',
        borderRadius: '14px',
        overflow: 'hidden',
        border: isSelected ? '2px solid var(--emerald)' : '1px solid var(--border)',
        boxShadow: isSelected
          ? '0 0 20px rgba(16, 185, 129, 0.25)'
          : '0 6px 18px rgba(0, 0, 0, 0.45)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        aspectRatio: '16 / 9',
        minHeight: '210px',
      }}
    >
      {/* Video Content: Live stream image */}
      {!hasError ? (
        <img
          key={`${cell.cellId}-${cell.activeStream}-${streamNonce}`}
          src={mjpegURL}
          alt={cell.channelName}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: isRestarting ? 'blur(4px) brightness(0.5)' : 'none',
            transition: 'filter 0.2s ease',
          }}
        />
      ) : (
        /* Stream Offline / Error State */
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0c0f17',
            gap: '8px',
            color: 'var(--muted)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert size={28} color="#EF4444" />
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
            Поток временно недоступен
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--muted-dark)', maxWidth: '280px' }}>
            {activeRTSP}
          </div>
          <button
            type="button"
            className="btn-pill"
            style={{ padding: '4px 10px', fontSize: '11px', marginTop: '4px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleRestart();
            }}
          >
            <RefreshCw size={12} />
            Повторить подключение
          </button>
        </div>
      )}

      {/* Top Overlay Badge Bar */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Live Indicator */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '10px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.04em',
            }}
          >
            <span className={`status-dot ${!hasError ? 'live-pulse' : 'offline'}`} />
            {!hasError ? 'LIVE' : 'OFFLINE'}
          </span>

          <span
            className="mono"
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--emerald)',
            }}
          >
            CH-{cell.channelNumber}
          </span>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(9, 9, 11, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            {getCellDisplayName(cell)}
          </span>
        </div>

        <span
          className="mono"
          style={{
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(9, 9, 11, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '10px',
            fontWeight: 700,
            color: '#E4E4E7',
          }}
        >
          {cell.codec} · {isSub ? 'Sub (D1)' : 'Main (4K/HD)'}
        </span>
      </div>

      {/* Bottom Overlay Controls Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          padding: '6px 10px',
          borderRadius: '10px',
          background: 'rgba(9, 9, 11, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
          zIndex: 5,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Device & Channel IP info */}
        <div className="mono" style={{ fontSize: '11px', display: 'flex', gap: '8px' }}>
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{cell.deviceIp}</span>
          <span style={{ color: 'var(--emerald)' }}>
            {isSub ? '15 FPS · 720 kbps' : `${cell.fps} FPS · ${cell.bitrateKbps} kbps`}
          </span>
        </div>

        {/* Right: Main/Sub toggle, Screenshot, Restart, Maximize */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Main / Sub switcher pill */}
          <div
            style={{
              display: 'inline-flex',
              background: '#181d2a',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => handleToggle('main')}
              style={{
                border: 'none',
                background: !isSub ? 'var(--emerald)' : 'transparent',
                color: !isSub ? '#09090B' : 'var(--muted)',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Основной поток (${N}01)"
            >
              Main
            </button>
            <button
              onClick={() => handleToggle('sub')}
              style={{
                border: 'none',
                background: isSub ? '#F59E0B' : 'transparent',
                color: isSub ? '#09090B' : 'var(--muted)',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Субпоток (${N}02)"
            >
              Sub
            </button>
          </div>

          {/* Screenshot button */}
          <button
            onClick={() => onTakeScreenshot(cell)}
            className="btn-pill"
            style={{ padding: '4px 7px', fontSize: '11px' }}
            title="Сделать моментальный снимок с канала"
          >
            <Camera size={12} color="#10B981" />
          </button>

          {/* Restart stream button */}
          <button
            onClick={handleRestart}
            className="btn-pill"
            style={{ padding: '4px 7px', fontSize: '11px' }}
            title="Перезапустить RTSP-сессию"
          >
            <RefreshCw size={12} />
          </button>

          {/* Expand to 1x1 button */}
          <button
            onClick={() => onExpand1x1(cell)}
            className="btn-pill"
            style={{ padding: '4px 7px', fontSize: '11px' }}
            title="Развернуть на весь экран (1х1 с переключением на Main Stream)"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
