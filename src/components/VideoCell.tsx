import React, { useRef, useEffect, useState } from 'react';
import { CameraStreamItem } from '../types';
import { Camera, RefreshCw, Maximize2, Shield, Eye } from 'lucide-react';

interface Props {
  camera: CameraStreamItem;
  cellIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStream: (id: string, newStream: 'main' | 'sub') => void;
  onRestartStream: (cam: CameraStreamItem) => void;
  onTakeScreenshot: (cam: CameraStreamItem, dataUrl: string) => void;
  onExpand1x1: (cam: CameraStreamItem) => void;
}

export const VideoCell: React.FC<Props> = ({
  camera,
  cellIndex,
  isSelected,
  onSelect,
  onToggleStream,
  onRestartStream,
  onTakeScreenshot,
  onExpand1x1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const isSub = camera.active_stream === 'sub';

  // Smooth live rendering loop on HTML5 canvas
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = 640);
    let height = (canvas.height = 360);

    // AI detection bounding box positions
    let personX = 140;
    let personDir = 1;
    let carX = 360;
    let carDir = -1;

    const render = () => {
      frameCount++;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ru-RU') + '.' + String(Math.floor(now.getMilliseconds() / 100));

      // 1. Dark CCTV industrial background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0c0f17');
      grad.addColorStop(0.5, '#121722');
      grad.addColorStop(1, '#080a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle architectural room / outdoor lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(width, height * 0.7);
      ctx.moveTo(width * 0.25, 0);
      ctx.lineTo(width * 0.25, height);
      ctx.moveTo(width * 0.75, 0);
      ctx.lineTo(width * 0.75, height);
      ctx.stroke();

      // Simulated depth grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
      for (let y = height * 0.7; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. AI Object Detection: Person
      personX += 0.35 * personDir;
      if (personX > 220) personDir = -1;
      if (personX < 80) personDir = 1;

      // Draw person box
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(personX, 110, 48, 110);
      // Box corners
      ctx.fillStyle = '#10B981';
      ctx.fillRect(personX - 2, 110 - 2, 6, 6);
      ctx.fillRect(personX + 44, 110 - 2, 6, 6);
      ctx.fillRect(personX - 2, 216, 6, 6);
      ctx.fillRect(personX + 44, 216, 6, 6);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.font = 'bold 9.5px ui-monospace, monospace';
      ctx.fillText('PERSON 98%', personX, 102);

      // 4. AI Object Detection: Vehicle / Equipment
      if (cellIndex % 2 === 1) {
        carX += 0.25 * carDir;
        if (carX > 480) carDir = -1;
        if (carX < 320) carDir = 1;

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(carX, 140, 110, 65);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.font = 'bold 9.5px ui-monospace, monospace';
        ctx.fillText('VEHICLE 94%', carX, 134);
      }

      // 5. Sensor Noise Simulation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let i = 0; i < 40; i++) {
        let rx = Math.random() * width;
        let ry = Math.random() * height;
        ctx.fillRect(rx, ry, 2, 2);
      }

      // 6. OSD Telemetry Watermark (Top Left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.fillText(`PROCAM · ${camera.name.toUpperCase()}`, 16, 26);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`IP: ${camera.ip} · ${now.toISOString().split('T')[0]} ${timeStr}`, 16, 42);

      // Stream quality watermark (Top Right)
      ctx.textAlign = 'right';
      ctx.fillStyle = camera.active_stream === 'main' ? '#10B981' : '#F59E0B';
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.fillText(`${camera.active_stream === 'main' ? 'MAIN STREAM' : 'SUB STREAM'} (${camera.codec})`, width - 16, 26);
      ctx.textAlign = 'left';

      // 7. Motion Crosshair / Focus reticle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 12, height / 2);
      ctx.lineTo(width / 2 + 12, height / 2);
      ctx.moveTo(width / 2, height / 2 - 12);
      ctx.lineTo(width / 2, height / 2 + 12);
      ctx.stroke();

      // FPS throttling: ~25 FPS on main, ~15 FPS on sub
      const delay = camera.active_stream === 'main' ? 40 : 66;
      setTimeout(() => {
        animId = requestAnimationFrame(render);
      }, delay);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera.active_stream, camera.name, camera.ip, camera.codec, cellIndex]);

  const handleScreenshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    // Trigger download
    const link = document.createElement('a');
    link.download = `snap_${camera.ip.replace(/\./g, '_')}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onTakeScreenshot(camera, dataUrl);
  };

  const handleRestart = () => {
    setIsRestarting(true);
    onRestartStream(camera);
    setTimeout(() => {
      setIsRestarting(false);
    }, 900);
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
      {/* HTML5 Canvas live video stream */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          filter: isRestarting ? 'blur(4px) brightness(0.5)' : 'none',
          transition: 'filter 0.2s ease',
        }}
      />

      {/* Reconnecting Overlay */}
      {isRestarting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(9, 9, 11, 0.65)',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <RefreshCw size={24} color="#10B981" className="animate-spin" />
          <span className="mono" style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700 }}>
            Перезапуск RTSP-потока...
          </span>
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
            <span className="status-dot live-pulse" />
            LIVE
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
            CH-{cellIndex + 1}
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
          {camera.codec} · {isSub ? 'D1 (640×360)' : camera.resolution.split(' ')[0]}
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
        {/* Left: Dynamic FPS & Bitrate */}
        <div className="mono" style={{ fontSize: '11px', display: 'flex', gap: '8px' }}>
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
            {isSub ? '15 FPS' : `${camera.fps} FPS`}
          </span>
          <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>
            {isSub ? '720 kbps' : `${camera.bitrate_kbps} kbps`}
          </span>
        </div>

        {/* Right: Stream switcher, Screenshot, Restart, Maximize */}
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
              onClick={() => onToggleStream(camera.id, 'main')}
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
              title="Основной поток высокого разрешения (Full HD / 4K)"
            >
              Main
            </button>
            <button
              onClick={() => onToggleStream(camera.id, 'sub')}
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
              title="Субпоток низкого разрешения для экономии трафика"
            >
              Sub
            </button>
          </div>

          {/* Screenshot button */}
          <button
            onClick={handleScreenshot}
            className="btn-pill"
            style={{ padding: '4px 7px', fontSize: '11px' }}
            title="Сделать моментальный снимок кадра (PNG)"
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
            onClick={() => onExpand1x1(camera)}
            className="btn-pill"
            style={{ padding: '4px 7px', fontSize: '11px' }}
            title="Развернуть камеру на полный экран 1х1"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
