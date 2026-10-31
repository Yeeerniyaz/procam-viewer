import React, { useState, useRef, useEffect } from 'react';
import { ActiveGridCell, getCellDisplayName } from '../types';
import {
  Camera,
  Maximize2,
  Minimize2,
  Expand,
  Minimize,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  Compass,
  Circle,
  X,
  ZoomIn,
  RotateCcw,
  WifiOff,
  Plus,
} from 'lucide-react';

interface Props {
  cell: ActiveGridCell | null;
  cellIndex: number;
  isSelected: boolean;
  isMaximized: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onClose: () => void;
  onToggleStream: (newStream: 'main' | 'sub') => void;
  onTakeScreenshot: () => void;
  onToggleRecord?: () => void;
  onToggleAudio?: () => void;
  onOpenPTZ?: () => void;
  onDropChannel?: (targetIndex: number, data: { deviceId: string; channelId: string; sourceIndex?: number }) => void;
}

export const VmsVideoCell: React.FC<Props> = ({
  cell,
  cellIndex,
  isSelected,
  isMaximized,
  onSelect,
  onDoubleClick,
  onClose,
  onToggleStream,
  onTakeScreenshot,
  onToggleRecord,
  onToggleAudio,
  onOpenPTZ,
  onDropChannel,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === cellRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (document.fullscreenElement === cellRef.current) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      if (cellRef.current?.requestFullscreen) {
        cellRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleCellDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullscreen) {
      handleToggleFullscreen();
    } else {
      onDoubleClick();
    }
  };

  // Digital zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoomLevel((prev) => {
      let next = prev + (e.deltaY < 0 ? 0.3 : -0.3);
      next = Math.max(1, Math.min(next, 4));
      if (next === 1) setPan({ x: 0, y: 0 });
      return parseFloat(next.toFixed(1));
    });
  };

  // Pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1 && e.button === 0) {
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPan && zoomLevel > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPan(false);
  };

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw && onDropChannel) {
        const parsed = JSON.parse(raw);
        onDropChannel(cellIndex, parsed);
      }
    } catch (err) {
      // ignore
    }
  };

  // Empty Cell State
  if (!cell) {
    return (
      <div
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: '100%',
          height: '100%',
          background: isDragOver ? 'rgba(16, 185, 129, 0.08)' : '#07090e',
          border: isDragOver
            ? '1.5px dashed var(--emerald)'
            : isSelected
            ? '1px solid var(--emerald)'
            : '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
          position: 'relative',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          <Camera size={18} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center', padding: '0 12px' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700 }}>
            ЯЧЕЙКА #{cellIndex + 1}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.25)' }}>
            Перетащите камеру из списка или нажмите дважды
          </span>
        </div>
      </div>
    );
  }

  // Active RTSP URL
  const activeRTSP = cell.activeStream === 'main' ? cell.rtspMain : cell.rtspSub;
  const streamSrc = `/api/stream/mjpeg?rtsp=${encodeURIComponent(activeRTSP)}`;
  const snapshotSrc = `/api/isapi/picture?ip=${encodeURIComponent(cell.deviceIp)}&port=${cell.httpPort}&user=${encodeURIComponent(cell.login)}&pass=${encodeURIComponent(cell.password)}&channel=${encodeURIComponent(cell.channelIdHik)}&t=${cell.status}`;
  const displayName = getCellDisplayName(cell);

  return (
    <div
      ref={cellRef}
      onClick={onSelect}
      onDoubleClick={handleCellDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDraggingPan(false);
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#040507',
        border: isFullscreen
          ? 'none'
          : isDragOver
          ? '2px dashed var(--emerald)'
          : isSelected
          ? '1px solid var(--emerald)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        cursor: zoomLevel > 1 ? (isDraggingPan ? 'grabbing' : 'grab') : 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Video / Snapshot Surface */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
          transformOrigin: 'center center',
          transition: isDraggingPan ? 'none' : 'transform 0.1s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cell.status === 'offline' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#71717A',
              padding: '10px',
              paddingTop: '36px',
              textAlign: 'center',
              userSelect: 'none',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <WifiOff size={17} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', maxWidth: '100%', minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                НЕТ СВЯЗИ
              </span>
              <span className="mono" style={{ fontSize: '10.5px', color: '#A1A1AA', whiteSpace: 'nowrap' }}>
                {cell.deviceIp}
              </span>
            </div>
          </div>
        ) : !imgError ? (
          <img
            src={streamSrc}
            alt={cell.channelName}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <img
            src={snapshotSrc}
            alt={cell.channelName}
            onError={() => {}}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Top Overlay Header: Camera Title Bar & OSD */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '6px 8px',
          background: 'linear-gradient(180deg, rgba(7, 10, 16, 0.94) 0%, rgba(7, 10, 16, 0.72) 75%, rgba(7, 10, 16, 0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          opacity: isHovered || isSelected ? 1 : 0.88,
          transition: 'opacity 0.15s ease',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Left: Channel Number Tag, Status Dot, Full Resolved Camera Name, Status Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Channel number pill badge */}
          <span
            className="mono"
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: '#FFFFFF',
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '1.5px 5px',
              borderRadius: '4px',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
            title={`Канал №${cell.channelNumber}`}
          >
            CH {String(cell.channelNumber || 1).padStart(2, '0')}
          </span>

          {/* Status Dot */}
          <span
            className={`status-dot ${cell.status === 'online' ? 'online' : 'offline'}`}
            style={{ width: '6.5px', height: '6.5px', flexShrink: 0 }}
          />

          {/* Resolved Human-readable Camera Name */}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '12px',
              fontWeight: 700,
              color: '#FFFFFF',
              textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}
            title={displayName}
          >
            {displayName}
          </span>

          {/* REC recording indicator */}
          {cell.isRecording && (
            <span
              className="mono"
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#EF4444',
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                padding: '1px 5px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0,
              }}
            >
              <Circle size={6} fill="#EF4444" className="status-dot live-pulse" />
              REC
            </span>
          )}
        </div>

        {/* Right: Zoom Badge, Stream HD/SD Button, Fullscreen & Close Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {/* Zoom badge if zoomed */}
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="mono"
              style={{
                fontSize: '9.5px',
                color: 'var(--emerald)',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid var(--emerald-border)',
                padding: '1.5px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Сбросить цифровой зум (1x)"
            >
              <RotateCcw size={9} />
              {zoomLevel}x
            </button>
          )}

          {/* Stream quality toggle badge: HD or SD */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStream(cell.activeStream === 'main' ? 'sub' : 'main');
            }}
            className="mono"
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              padding: '1.5px 6px',
              borderRadius: '4px',
              background: cell.activeStream === 'main' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: cell.activeStream === 'main' ? '#34D399' : '#A1A1AA',
              border: cell.activeStream === 'main' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            title={cell.activeStream === 'main' ? 'Основной поток (HD). Нажмите для переключения на SD' : 'Субпоток (SD). Нажмите для переключения на HD'}
          >
            {cell.activeStream === 'main' ? 'HD' : 'SD'}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            style={{
              background: isFullscreen ? 'rgba(239, 68, 68, 0.85)' : 'rgba(0, 0, 0, 0.55)',
              border: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderRadius: '4px',
              padding: isFullscreen ? '2px 7px' : '3px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background 0.15s ease',
            }}
            title={isFullscreen ? 'Выйти из полноэкранного режима (Esc)' : 'На весь экран'}
          >
            {isFullscreen ? (
              <>
                <Minimize size={11} />
                <span>Esc</span>
              </>
            ) : (
              <Maximize2 size={11} />
            )}
          </button>

          {/* Close Cell (X) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#D4D4D8',
              borderRadius: '4px',
              padding: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#EF4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#D4D4D8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.55)';
            }}
            title="Очистить ячейку"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Bottom Hover Toolbar: Snapshot, REC, PTZ, Audio, Stream HD/SD, Maximize */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '5px 8px',
            background: 'linear-gradient(to top, rgba(7, 9, 14, 0.95) 0%, rgba(7, 9, 14, 0) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          {/* Telemetry snippet */}
          <div className="mono" style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', gap: '6px' }}>
            <span>{cell.activeStream === 'main' ? '25 к/с' : '15 к/с'}</span>
            <span>·</span>
            <span>{cell.activeStream === 'main' ? `${cell.bitrateKbps} kbps` : '720 kbps'}</span>
            <span>·</span>
            <span>{cell.codec}</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Snapshot */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTakeScreenshot();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Сделать снимок (Snapshot)"
            >
              <Camera size={12} />
            </button>

            {/* Local Clip Record */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleRecord) onToggleRecord();
              }}
              style={{
                background: cell.isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                border: cell.isRecording ? '1px solid #EF4444' : 'none',
                color: cell.isRecording ? '#EF4444' : '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title={cell.isRecording ? 'Остановить запись отрезка' : 'Начать запись отрезка'}
            >
              <Circle size={12} fill={cell.isRecording ? '#EF4444' : 'none'} />
            </button>

            {/* PTZ Joystick opener */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenPTZ) onOpenPTZ();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="PTZ Управление"
            >
              <Compass size={12} />
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleAudio) onToggleAudio();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title={cell.isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {cell.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>

            {/* HD/SD Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStream(cell.activeStream === 'main' ? 'sub' : 'main');
              }}
              className="mono"
              style={{
                background: cell.activeStream === 'main' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: cell.activeStream === 'main' ? '1px solid var(--emerald-border)' : 'none',
                color: cell.activeStream === 'main' ? '#34D399' : '#FFFFFF',
                borderRadius: '4px',
                padding: '2px 5px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title={cell.activeStream === 'main' ? 'Переключить на Sub (SD)' : 'Переключить на Main (HD)'}
            >
              {cell.activeStream === 'main' ? 'HD' : 'SD'}
            </button>

            {/* На весь экран (Fullscreen монитора) */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              style={{
                background: isFullscreen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)',
                border: isFullscreen ? '1px solid var(--emerald)' : 'none',
                color: isFullscreen ? '#34D399' : '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isFullscreen ? 'Выйти из полноэкранного режима (Esc)' : 'На весь экран (Монитор)'}
            >
              {isFullscreen ? <Minimize size={12} /> : <Expand size={12} />}
            </button>

            {/* Maximize 1x1 в сетке */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDoubleClick();
              }}
              style={{
                background: isMaximized ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: isMaximized ? '1px solid var(--emerald-border)' : 'none',
                color: isMaximized ? '#34D399' : '#FFFFFF',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isMaximized ? 'Восстановить сетку' : 'Развернуть 1x1 в сетке'}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
