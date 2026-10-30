import React from 'react';
import { CameraStreamItem, GridLayout } from '../types';
import { VideoCell } from './VideoCell';
import { LayoutGrid, Maximize, Camera, Layers, Zap } from 'lucide-react';

interface Props {
  cameras: CameraStreamItem[];
  selectedCameraId: string;
  layout: GridLayout;
  onLayoutChange: (layout: GridLayout) => void;
  onSelectCamera: (cam: CameraStreamItem) => void;
  onToggleStream: (id: string, newStream: 'main' | 'sub') => void;
  onToggleAllStreams: (stream: 'main' | 'sub') => void;
  onRestartStream: (cam: CameraStreamItem) => void;
  onTakeScreenshot: (cam: CameraStreamItem, dataUrl: string) => void;
  onSnapAll: () => void;
  onExpand1x1: (cam: CameraStreamItem) => void;
  onOpenAddModal: () => void;
}

export const VideoGrid: React.FC<Props> = ({
  cameras,
  selectedCameraId,
  layout,
  onLayoutChange,
  onSelectCamera,
  onToggleStream,
  onToggleAllStreams,
  onRestartStream,
  onTakeScreenshot,
  onSnapAll,
  onExpand1x1,
  onOpenAddModal,
}) => {
  // Determine number of cells based on layout
  const cellsCountMap: Record<GridLayout, number> = {
    '1x1': 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
  };
  const count = cellsCountMap[layout];
  const activeCameras = cameras.slice(0, count);

  // Calculate total incoming bitrate
  const totalBitrate = activeCameras.reduce((acc, c) => {
    return acc + (c.active_stream === 'main' ? c.bitrate_kbps : 720);
  }, 0);
  const totalMbps = (totalBitrate / 1000).toFixed(1);

  // Fullscreen trigger
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const gridColsClassMap: Record<GridLayout, string> = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4',
  };

  return (
    <div
      className="panel-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Eyebrow & Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span className="eyebrow">// ПАНЕЛЬ ПРОСМОТРА И ПОТОКОВ</span>
          <span
            className="mono"
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--emerald)',
              border: '1px solid var(--emerald-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={12} />
            Суммарный поток: {totalMbps} Мбит/с · {activeCameras.length} активных каналов
          </span>
        </div>

        {/* Right: Layout Switcher & Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Layout Buttons (Capsules) */}
          <div className="tabs-container">
            {(['1x1', '2x2', '3x3', '4x4'] as GridLayout[]).map((mode) => (
              <button
                key={mode}
                className={`tab-pill mono ${layout === mode ? 'active' : ''}`}
                style={{ fontWeight: 800, padding: '5px 12px' }}
                onClick={() => onLayoutChange(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Quick stream switch for all */}
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
              onClick={() => onToggleAllStreams('main')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#E4E4E7',
                padding: '4px 9px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Перевести все камеры в сетке на Main Stream"
            >
              Все Main
            </button>
            <button
              onClick={() => onToggleAllStreams('sub')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#E4E4E7',
                padding: '4px 9px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Перевести все камеры в сетке на экономичный Sub Stream"
            >
              Все Sub
            </button>
          </div>

          {/* Snap All button */}
          <button
            className="btn-pill"
            style={{ padding: '6px 12px', fontSize: '11.5px' }}
            onClick={onSnapAll}
            title="Сделать снимки со всех активных камер в сетке"
          >
            <Camera size={13} color="#10B981" />
            Снимок всех камер
          </button>

          {/* Fullscreen button */}
          <button
            className="btn-pill"
            style={{ padding: '6px 12px', fontSize: '11.5px' }}
            onClick={toggleFullscreen}
            title="Полноэкранный режим (F11)"
          >
            <Maximize size={13} />
            Полноэкранный режим
          </button>
        </div>
      </div>

      {/* Grid Canvas Area */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns:
            layout === '1x1'
              ? '1fr'
              : layout === '2x2'
              ? 'repeat(2, minmax(0, 1fr))'
              : layout === '3x3'
              ? 'repeat(3, minmax(0, 1fr))'
              : 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
          alignContent: 'start',
        }}
      >
        {activeCameras.map((cam, idx) => (
          <VideoCell
            key={cam.id}
            camera={cam}
            cellIndex={idx}
            isSelected={cam.id === selectedCameraId}
            onSelect={() => onSelectCamera(cam)}
            onToggleStream={onToggleStream}
            onRestartStream={onRestartStream}
            onTakeScreenshot={onTakeScreenshot}
            onExpand1x1={onExpand1x1}
          />
        ))}

        {/* Empty placeholder cells if fewer cameras available */}
        {activeCameras.length < count &&
          Array.from({ length: count - activeCameras.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={onOpenAddModal}
              style={{
                aspectRatio: '16 / 9',
                borderRadius: '14px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                background: 'rgba(9, 9, 11, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--muted)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--emerald)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              <LayoutGrid size={24} color="#10B981" />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>+ Подключить камеру</span>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--muted-dark)' }}>
                RTSP / ONVIF Profile S
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};
