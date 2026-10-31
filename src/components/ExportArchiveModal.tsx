import React, { useState, useEffect } from 'react';
import { DeviceItem, ChannelItem } from '../types';
import {
  Download,
  X,
  Calendar,
  Clock,
  FolderOpen,
  Folder,
  CheckSquare,
  Square,
  Film,
  HardDrive,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceItem[];
  selectedDate: string;
  currentSeconds: number;
  initialChannels: { device: DeviceItem; channel: ChannelItem }[];
  onExportSuccess?: (msg: string) => void;
}

export const ExportArchiveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  devices,
  selectedDate,
  currentSeconds,
  initialChannels,
  onExportSuccess,
}) => {
  if (!isOpen) return null;

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number): string => {
    const s = Math.max(0, Math.min(Math.floor(totalSec), 86399));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Parse HH:MM:SS to seconds
  const parseTimeToSec = (t: string): number => {
    const parts = t.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 3600 + parts[1] * 60;
    }
    return 0;
  };

  // State
  const [date, setDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(() => formatTime(Math.max(0, currentSeconds - 900)));
  const [endTime, setEndTime] = useState<string>(() => formatTime(Math.min(86399, currentSeconds + 900)));
  const [destDir, setDestDir] = useState<string>('~/Videos/ProCam_Recordings');
  const [isBrowsingDir, setIsBrowsingDir] = useState<boolean>(false);

  // Selected channels list: `${devId}_${channelNumber}`
  const [selectedChannelKeys, setSelectedChannelKeys] = useState<string[]>(() => {
    if (initialChannels && initialChannels.length > 0) {
      return initialChannels.map((c) => `${c.device.id}_${c.channel.channelNumber}`);
    }
    const firstDev = devices[0];
    if (firstDev && firstDev.channels.length > 0) {
      return [`${firstDev.id}_${firstDev.channels[0].channelNumber}`];
    }
    return [];
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  // Load current recordings folder from backend
  useEffect(() => {
    fetch('/api/record/dir')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.dir) {
          setDestDir(d.dir);
        }
      })
      .catch(() => {});
  }, []);

  // Quick preset buttons
  const applyPreset = (preset: '15m' | '30m' | '1h' | 'day' | 'all') => {
    if (preset === '15m') {
      setStartTime(formatTime(Math.max(0, currentSeconds - 450)));
      setEndTime(formatTime(Math.min(86399, currentSeconds + 450)));
    } else if (preset === '30m') {
      setStartTime(formatTime(Math.max(0, currentSeconds - 900)));
      setEndTime(formatTime(Math.min(86399, currentSeconds + 900)));
    } else if (preset === '1h') {
      setStartTime(formatTime(Math.max(0, currentSeconds - 1800)));
      setEndTime(formatTime(Math.min(86399, currentSeconds + 1800)));
    } else if (preset === 'day') {
      setStartTime('09:00:00');
      setEndTime('18:00:00');
    } else if (preset === 'all') {
      setStartTime('00:00:00');
      setEndTime('23:59:59');
    }
  };

  // Browse destination folder using native system dialog
  const handleBrowseFolder = async () => {
    setIsBrowsingDir(true);
    try {
      const res = await fetch('/api/record/select-folder', { method: 'POST' });
      const data = await res.json();
      if (data && data.success && data.dir) {
        setDestDir(data.dir);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsBrowsingDir(false);
    }
  };

  // Toggle channel select
  const toggleChannel = (devId: string, chNum: number) => {
    const key = `${devId}_${chNum}`;
    setSelectedChannelKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Select all channels across all devices
  const selectAllChannels = () => {
    const allKeys: string[] = [];
    devices.forEach((d) => {
      d.channels.forEach((c) => {
        allKeys.push(`${d.id}_${c.channelNumber}`);
      });
    });
    setSelectedChannelKeys(allKeys);
  };

  const clearAllChannels = () => {
    setSelectedChannelKeys([]);
  };

  // Calculate duration
  const startSec = parseTimeToSec(startTime);
  const endSec = parseTimeToSec(endTime);
  const durationSec = Math.max(0, endSec - startSec);
  const durationMinutes = Math.floor(durationSec / 60);
  const durationHours = (durationMinutes / 60).toFixed(1);

  // Execute Batch Export
  const handleStartExport = async () => {
    if (selectedChannelKeys.length === 0) {
      setStatusMessage('Выберите хотя бы один канал для экспорта');
      setIsError(true);
      return;
    }
    if (durationSec <= 0) {
      setStatusMessage('Время окончания должно быть позже времени начала');
      setIsError(true);
      return;
    }

    setIsExporting(true);
    setStatusMessage('Запуск экспорта отрезков архива через FFmpeg...');
    setIsError(false);

    try {
      // Group by device
      const channelNumbers = selectedChannelKeys.map((k) => {
        const parts = k.split('_');
        return parseInt(parts[parts.length - 1], 10) || 1;
      });

      // Target device (first selected)
      const targetKey = selectedChannelKeys[0];
      const targetDevId = targetKey.substring(0, targetKey.lastIndexOf('_'));
      const dev = devices.find((d) => d.id === targetDevId) || devices[0];

      const res = await fetch('/api/isapi/playback/batch-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: dev.ip,
          user: dev.login || 'admin',
          pass: dev.password || '',
          channels: channelNumbers,
          date,
          start: startTime,
          end: endTime,
          destDir,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`✔ Успешно: запущена запись ${data.count} каналов в папку: ${data.destDir}`);
        setIsError(false);
        if (onExportSuccess) {
          onExportSuccess(`Экспорт ${data.count} каналов успешно запущен`);
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage(`Ошибка: ${data.error || 'Регистратор не ответил'}`);
        setIsError(true);
      }
    } catch (e: any) {
      setStatusMessage(`Ошибка запроса: ${e.message}`);
      setIsError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '680px',
          maxWidth: '100%',
          background: '#0d1017',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#11151f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} color="var(--emerald)" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
              Экспорт и скачивание архива NVR
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Section 1: Time Interval Selection */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="var(--emerald)" />
                1. Диапазон времени и дата записи
              </span>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 600 }}>
                Длительность: {durationMinutes >= 60 ? `${durationHours} ч` : `${durationMinutes} мин`}
              </span>
            </div>

            {/* Date & Time Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '3px' }}>
                  Дата архива
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mono"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      fontSize: '11.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '3px' }}>
                  Время начала (От)
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="ЧЧ:ММ:СС"
                  className="mono"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    borderRadius: '5px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '3px' }}>
                  Время окончания (До)
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="ЧЧ:ММ:СС"
                  className="mono"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    borderRadius: '5px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>Быстрый выбор:</span>
              <button
                type="button"
                className="btn-pill"
                onClick={() => applyPreset('15m')}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                15 минут
              </button>
              <button
                type="button"
                className="btn-pill"
                onClick={() => applyPreset('30m')}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                30 минут
              </button>
              <button
                type="button"
                className="btn-pill"
                onClick={() => applyPreset('1h')}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                1 час
              </button>
              <button
                type="button"
                className="btn-pill"
                onClick={() => applyPreset('day')}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                День (09:00 - 18:00)
              </button>
              <button
                type="button"
                className="btn-pill"
                onClick={() => applyPreset('all')}
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                Сутки целиком
              </button>
            </div>
          </div>

          {/* Section 2: Channels Multi-Selection */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Film size={14} color="#60A5FA" />
                2. Выберите каналы камер ({selectedChannelKeys.length} выбрано)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-pill"
                  onClick={selectAllChannels}
                  style={{ fontSize: '10px', padding: '2px 7px' }}
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  className="btn-pill"
                  onClick={clearAllChannels}
                  style={{ fontSize: '10px', padding: '2px 7px' }}
                >
                  Снять выбор
                </button>
              </div>
            </div>

            {/* Channels List */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '6px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '4px 0',
              }}
            >
              {devices.flatMap((d) =>
                d.channels.map((c) => {
                  const key = `${d.id}_${c.channelNumber}`;
                  const isChecked = selectedChannelKeys.includes(key);
                  return (
                    <div
                      key={key}
                      onClick={() => toggleChannel(d.id, c.channelNumber)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid var(--emerald)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        userSelect: 'none',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare size={14} color="var(--emerald)" />
                      ) : (
                        <Square size={14} color="var(--muted)" />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: isChecked ? '#FFFFFF' : '#D4D4D8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={c.name || `Канал ${c.channelNumber}`}
                        >
                          CH {String(c.channelNumber).padStart(2, '0')}: {c.name || 'Камера'}
                        </span>
                        <span className="mono" style={{ fontSize: '9.5px', color: '#71717A' }}>
                          {d.ip}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 3: Destination Folder (Место сохранения) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderOpen size={14} color="#F59E0B" />
                3. Место сохранения видеофайлов (Папка на компьютере)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={destDir}
                onChange={(e) => setDestDir(e.target.value)}
                className="mono"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  borderRadius: '5px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="btn-pill"
                onClick={handleBrowseFolder}
                disabled={isBrowsingDir}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }}
                title="Открыть системный проводник для выбора папки на диске"
              >
                <Folder size={13} />
                <span>{isBrowsingDir ? 'Выбор...' : 'Обзор...'}</span>
              </button>
            </div>
            <span style={{ fontSize: '10px', color: '#71717A' }}>
              Видеозаписи будут сохранены в стандартном формате MP4 (H.264 / H.265 без перекодирования).
            </span>
          </div>

          {/* Status / Error Message */}
          {statusMessage && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: isError ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                color: isError ? '#EF4444' : 'var(--emerald)',
              }}
            >
              {isError ? <AlertCircle size={14} /> : <Check size={14} />}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#11151f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            К экспорту: <b>{selectedChannelKeys.length}</b> каналов · Длительность: <b>{durationMinutes} мин</b>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-pill"
              onClick={onClose}
              disabled={isExporting}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting || selectedChannelKeys.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 18px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                background: 'var(--emerald)',
                border: 'none',
                color: '#000000',
                cursor: isExporting ? 'wait' : 'pointer',
                opacity: isExporting || selectedChannelKeys.length === 0 ? 0.6 : 1,
              }}
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isExporting ? 'Экспортирую...' : `Скачать архив (${selectedChannelKeys.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
