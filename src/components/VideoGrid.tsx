import React from 'react';
import { ActiveGridCell, GridLayout } from '../types';
import { VideoCell } from './VideoCell';
import { LayoutGrid, Maximize, Camera, Zap, Plus, Search, Video } from 'lucide-react';

interface Props {
  cells: ActiveGridCell[];
  selectedCellId: string;
  layout: GridLayout;
  onLayoutChange: (layout: GridLayout) => void;
  onSelectCell: (cell: ActiveGridCell) => void;
  onToggleStream: (cellId: string, newStream: 'main' | 'sub') => void;
  onToggleAllStreams: (stream: 'main' | 'sub') => void;
  onRestartStream: (cell: ActiveGridCell) => void;
  onTakeScreenshot: (cell: ActiveGridCell) => void;
  onSnapAll: () => void;
  onExpand1x1: (cell: ActiveGridCell) => void;
  onOpenAddModal: () => void;
  onScanNetwork: () => void;
}

export const VideoGrid: React.FC<Props> = ({
  cells,
  selectedCellId,
  layout,
  onLayoutChange,
  onSelectCell,
  onToggleStream,
  onToggleAllStreams,
  onRestartStream,
  onTakeScreenshot,
  onSnapAll,
  onExpand1x1,
  onOpenAddModal,
  onScanNetwork,
}) => {
  const cellsCountMap: Record<string, number> = {
    '1x1': 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
    '5x5': 25,
    '6x6': 36,
    '7x7': 49,
    '8x8': 64,
    '1+5': 6,
    '1+7': 8,
    '1+12': 13,
    '2+8': 10,
    '1+1+12': 14,
  };
  const count = cellsCountMap[layout];
  const visibleCells = cells.slice(0, count);

  // Total bitrate
  const totalBitrate = visibleCells.reduce((acc, c) => {
    return acc + (c.activeStream === 'main' ? c.bitrateKbps : 720);
  }, 0);
  const totalMbps = (totalBitrate / 1000).toFixed(1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
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
          {visibleCells.length > 0 && (
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
              Суммарный поток: {totalMbps} Мбит/с · {visibleCells.length} активных каналов
            </span>
          )}
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
          {visibleCells.length > 0 && (
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
                title="Перевести все ячейки на основной поток (Main Stream)"
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
                title="Перевести все ячейки на экономичный субпоток (Sub Stream)"
              >
                Все Sub
              </button>
            </div>
          )}

          {visibleCells.length > 0 && (
            <button
              className="btn-pill"
              style={{ padding: '6px 12px', fontSize: '11.5px' }}
              onClick={onSnapAll}
              title="Сделать снимки со всех активных камер в сетке"
            >
              <Camera size={13} color="#10B981" />
              Снимок всех камер
            </button>
          )}

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
      {cells.length === 0 ? (
        /* Empty State */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            textAlign: 'center',
            gap: '16px',
            color: 'var(--muted)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LayoutGrid size={32} color="#10B981" />
          </div>

          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
              Нет активных видеопотоков в сетке
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '380px', lineHeight: 1.6, margin: '0 auto' }}>
              Подключите новую IP-камеру или видеорегистратор NVR, либо выберите каналы в списке устройств слева для вывода на экран.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
            <button className="btn-pill btn-pill-primary" onClick={onOpenAddModal}>
              <Plus size={14} />
              + Добавить камеру или NVR
            </button>
            <button className="btn-pill" onClick={onScanNetwork}>
              <Search size={14} />
              Найти камеры в сети
            </button>
          </div>
        </div>
      ) : (
        /* Video Cells Grid */
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
          {visibleCells.map((cell, idx) => (
            <VideoCell
              key={cell.cellId}
              cell={cell}
              cellIndex={idx}
              isSelected={cell.cellId === selectedCellId}
              onSelect={() => onSelectCell(cell)}
              onToggleStream={onToggleStream}
              onRestartStream={onRestartStream}
              onTakeScreenshot={onTakeScreenshot}
              onExpand1x1={onExpand1x1}
            />
          ))}

          {/* Empty placeholder cells if fewer cells than layout slots */}
          {visibleCells.length < count &&
            Array.from({ length: count - visibleCells.length }).map((_, i) => (
              <div
                key={`empty-slot-${i}`}
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
                <span style={{ fontSize: '12px', fontWeight: 600 }}>+ Подключить канал</span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--muted-dark)' }}>
                  RTSP / ISAPI
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
