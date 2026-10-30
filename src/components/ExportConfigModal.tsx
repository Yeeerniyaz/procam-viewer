import React, { useState } from 'react';
import { DeviceItem, GridLayout } from '../types';
import { X, Copy, Download, Check, ListMusic } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceItem[];
  layout: GridLayout;
}

export const ExportConfigModal: React.FC<Props> = ({ isOpen, onClose, devices, layout }) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const configObj = {
    app: 'ProCam Viewer',
    version: '4.1.0',
    exported_at: new Date().toISOString(),
    layout: layout,
    devices_count: devices.length,
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      protocol: d.protocol,
      ip: d.ip,
      httpPort: d.httpPort,
      rtspPort: d.rtspPort,
      login: d.login,
      channelsCount: d.channelsCount,
      model: d.model,
      serial: d.serial,
      firmware: d.firmware,
      channels: d.channels.map((ch) => ({
        channelNumber: ch.channelNumber,
        name: ch.name,
        enabled: ch.enabled,
        rtspMain: ch.rtspMain,
        rtspSub: ch.rtspSub,
        resolution: ch.resolution,
        codec: ch.codec,
      })),
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
    devices.forEach((d) => {
      d.channels.forEach((ch) => {
        if (!ch.enabled) return;
        m3u += `#EXTINF:-1 group-title="${d.name}" tvg-name="${ch.name}", ${d.name} - ${ch.name}\n`;
        m3u += `${ch.rtspMain}\n`;
      });
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '14px',
            marginBottom: '16px',
          }}
        >
          <div>
            <span className="eyebrow">// ЭКСПОРТ КОНФИГУРАЦИИ</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              Экспорт устройств, каналов NVR и плейлиста RTSP
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
              Формат JSON (для переноса между ПК и резервного копирования):
            </span>
            <button
              onClick={handleCopy}
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
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Скопировано!' : 'Копировать JSON'}
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
              color: '#A1A1AA',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {jsonString}
          </pre>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="btn-pill"
            style={{ padding: '8px 16px', fontSize: '12.5px' }}
            onClick={handleDownloadM3U}
            title="Экспорт в универсальный плейлист VLC / PotPlayer / IPTV"
          >
            <ListMusic size={14} color="var(--emerald)" />
            Скачать M3U8 (VLC / IPTV)
          </button>

          <button
            className="btn-pill btn-pill-primary"
            style={{ padding: '8px 18px', fontSize: '12.5px' }}
            onClick={handleDownloadJSON}
          >
            <Download size={14} />
            Скачать procam_config.json
          </button>
        </div>
      </div>
    </div>
  );
};
