import React, { useState } from 'react';
import { CameraStreamItem, GridLayout } from '../types';
import { X, Copy, Download, Check, ListMusic } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraStreamItem[];
  layout: GridLayout;
}

export const ExportConfigModal: React.FC<Props> = ({ isOpen, onClose, cameras, layout }) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const configObj = {
    app: 'ProCam Viewer',
    version: '4.1.0',
    exported_at: new Date().toISOString(),
    layout: layout,
    cameras_count: cameras.length,
    cameras: cameras.map((c) => ({
      id: c.id,
      name: c.name,
      ip: c.ip,
      mac: c.mac,
      vendor: c.vendor,
      model: c.model,
      device_type: c.device_type,
      codec: c.codec,
      resolution: c.resolution,
      fps: c.fps,
      bitrate_kbps: c.bitrate_kbps,
      active_stream: c.active_stream,
      rtsp_main: c.rtsp_main,
      rtsp_sub: c.rtsp_sub,
    })),
  };

  const jsonString = JSON.stringify(configObj, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procam_viewer_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadM3U = () => {
    let m3u = '#EXTM3U\n';
    cameras.forEach((c) => {
      m3u += `#EXTINF:-1 group-title="${c.zone}" tvg-name="${c.name}", ${c.name} (${c.vendor})\n`;
      m3u += `${c.active_stream === 'main' ? c.rtsp_main : c.rtsp_sub}\n`;
    });

    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procam_streams_${Date.now()}.m3u8`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">// ЭКСПОРТ КОНФИГУРАЦИИ</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              Экспорт камер, профилей потоков и раскладки
            </h3>
          </div>
          <button className="btn-pill" style={{ padding: '6px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* JSON Preview Box */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
              Формат JSON (резервная копия и перенос на другой ПК):
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? 'var(--emerald)' : 'var(--muted)',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Скопировано!' : 'Скопировать JSON'}
            </button>
          </div>

          <pre
            className="mono"
            style={{
              background: '#09090B',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '240px',
              overflowY: 'auto',
              fontSize: '11px',
              lineHeight: 1.5,
              color: '#34D399',
            }}
          >
            {jsonString}
          </pre>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button className="btn-pill" onClick={handleDownloadM3U} title="Экспорт плейлиста для VLC / PotPlayer">
            <ListMusic size={14} color="#60A5FA" />
            Экспорт плейлиста VLC (M3U8)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-pill" onClick={onClose}>
              Закрыть
            </button>
            <button className="btn-pill btn-pill-primary" onClick={handleDownloadJSON}>
              <Download size={14} />
              Скачать JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
