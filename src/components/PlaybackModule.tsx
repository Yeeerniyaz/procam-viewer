import React, { useState, useEffect, useRef } from 'react';
import { DeviceItem, ChannelItem, PlaybackSegment } from '../types';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  FastForward,
  Camera,
  Download,
  Calendar as CalendarIcon,
  Server,
  Video,
  Clock,
  Layers,
  Search,
  Maximize2,
} from 'lucide-react';

interface Props {
  devices: DeviceItem[];
}

export const PlaybackModule: React.FC<Props> = ({ devices }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedChannels, setSelectedChannels] = useState<{ device: DeviceItem; channel: ChannelItem }[]>([]);
  const [playbackLayout, setPlaybackLayout] = useState<'1x1' | '2x2' | '3x3'>('2x2');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [timelineZoom, setTimelineZoom] = useState<'24h' | '6h' | '1h' | '15m'>('24h');
  const [currentSeconds, setCurrentSeconds] = useState<number>(36000); // 10:00:00 by default
  const [segments, setSegments] = useState<PlaybackSegment[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState<boolean>(false);

  // Initialize with first available channel if none selected
  useEffect(() => {
    if (selectedChannels.length === 0 && devices.length > 0) {
      const firstDev = devices[0];
      const firstCh = firstDev.channels[0];
      if (firstCh) {
        setSelectedChannels([{ device: firstDev, channel: firstCh }]);
      }
    }
  }, [devices]);

  // Query recorded segments when channel or date changes
  useEffect(() => {
    if (selectedChannels.length === 0) return;
    const target = selectedChannels[0];
    setIsSearching(true);

    fetch(
      `/api/isapi/playback/search?ip=${encodeURIComponent(target.device.ip)}&port=${target.device.httpPort}&user=${encodeURIComponent(target.device.login)}&pass=${encodeURIComponent(target.device.password)}&channel=${target.channel.channelNumber}&date=${selectedDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.segments && Array.isArray(data.segments)) {
          setSegments(data.segments);
        }
      })
      .catch(() => {})
      .finally(() => setIsSearching(false));
  }, [selectedChannels, selectedDate]);

  // Playback timer progression
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSeconds((prev) => {
        const next = prev + playbackSpeed;
        if (next >= 86400) {
          setIsPlaying(false);
          return 86400;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Format seconds into HH:MM:SS
  const formatTime = (totalSec: number): string => {
    const s = Math.max(0, Math.min(Math.floor(totalSec), 86399));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle channel selection for synchronous playback
  const toggleChannelSelect = (device: DeviceItem, channel: ChannelItem) => {
    const exists = selectedChannels.some(
      (c) => c.device.id === device.id && c.channel.id === channel.id
    );
    if (exists) {
      setSelectedChannels((prev) =>
        prev.filter((c) => !(c.device.id === device.id && c.channel.id === channel.id))
      );
    } else {
      if (selectedChannels.length >= 9) return;
      setSelectedChannels((prev) => [...prev, { device, channel }]);
    }
  };

  // Timeline Click / Scrub
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(clickX / rect.width, 1));
    setCurrentSeconds(Math.round(pct * 86400));
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingTimeline(true);
    handleTimelineClick(e);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingTimeline) {
      handleTimelineClick(e);
    }
  };

  const handleTimelineMouseUp = () => {
    setIsDraggingTimeline(false);
  };

  // Step 1 frame (approx 40ms / 1 second)
  const stepFrame = (dir: number) => {
    setCurrentSeconds((prev) => Math.max(0, Math.min(prev + dir, 86399)));
  };

  // Capacity of playback grid
  const playbackCapacity = playbackLayout === '1x1' ? 1 : playbackLayout === '2x2' ? 4 : 9;
  const visiblePlayback = selectedChannels.slice(0, playbackCapacity);

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 44px)', background: '#07090e', overflow: 'hidden' }}>
      {/* 1. Left Sidebar: Channels & Date Selection */}
      <aside
        style={{
          width: '270px',
          background: '#0d1017',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Date Selector Header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CalendarIcon size={14} color="var(--emerald)" />
            <span className="eyebrow">// ВЫБОР ДАТЫ АРХИВА</span>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
            }}
          />
        </div>

        {/* Synchronous Channel Selector Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF' }}>
              Каналы синхронного поиска:
            </span>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--emerald)' }}>
              {selectedChannels.length} выбрано
            </span>
          </div>

          {devices.map((dev) => (
            <div key={dev.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#E4E4E7' }}>
                {dev.type === 'nvr' ? <Server size={13} color="#60A5FA" /> : <Video size={13} color="var(--emerald)" />}
                <span>{dev.name}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '16px' }}>
                {dev.channels.map((ch) => {
                  const isChecked = selectedChannels.some(
                    (c) => c.device.id === dev.id && c.channel.id === ch.id
                  );

                  return (
                    <label
                      key={ch.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 6px',
                        borderRadius: '5px',
                        background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: isChecked ? '#FFFFFF' : '#A1A1AA',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleChannelSelect(dev, ch)}
                        style={{ accentColor: 'var(--emerald)' }}
                      />
                      <span className="mono" style={{ fontSize: '10px', color: isChecked ? 'var(--emerald)' : 'var(--muted)' }}>
                        #{ch.channelNumber}
                      </span>
                      <span>{ch.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#090c12' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
            Типы записей архива:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA' }}>
              <div style={{ width: '10px', height: '10px', background: '#3B82F6', borderRadius: '2px' }} />
              <span>Постоянная запись (24/7)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B' }}>
              <div style={{ width: '10px', height: '10px', background: '#F59E0B', borderRadius: '2px' }} />
              <span>Детекция движения (Motion)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
              <div style={{ width: '10px', height: '10px', background: '#EF4444', borderRadius: '2px' }} />
              <span>Тревожное событие (Alarm)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Area: Playback Video Grid + 24H Timeline Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
        {/* Synchronous Playback Video Grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns:
              playbackLayout === '1x1'
                ? '1fr'
                : playbackLayout === '2x2'
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)',
            gridTemplateRows:
              playbackLayout === '1x1'
                ? '1fr'
                : playbackLayout === '2x2'
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)',
            gap: '1px',
            background: '#000000',
            padding: '1px',
            minHeight: 0,
          }}
        >
          {Array.from({ length: playbackCapacity }).map((_, idx) => {
            const item = visiblePlayback[idx];

            if (!item) {
              return (
                <div
                  key={idx}
                  style={{
                    background: '#07090e',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.25)',
                    fontSize: '11px',
                  }}
                >
                  <span className="mono">КАНАЛ ВОСПРОИЗВЕДЕНИЯ #{idx + 1}</span>
                  <span>Выберите канал в дереве слева</span>
                </div>
              );
            }

            // RTSP Track URL format for Hikvision ISAPI Playback
            const startIso = `${selectedDate.replace(/-/g, '')}T${formatTime(currentSeconds).replace(/:/g, '')}Z`;
            const endIso = `${selectedDate.replace(/-/g, '')}T235959Z`;
            const trackURL = `rtsp://${item.device.login}:${item.device.password}@${item.device.ip}:${item.device.rtspPort}/Streaming/tracks/${item.channel.channelNumber}01?starttime=${startIso}&endtime=${endIso}`;

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  background: '#040507',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Live/Playback frame snapshot */}
                <img
                  src={`/api/isapi/picture?ip=${encodeURIComponent(item.device.ip)}&port=${item.device.httpPort}&user=${encodeURIComponent(item.device.login)}&pass=${encodeURIComponent(item.device.password)}&channel=${item.channel.channelIdHik}&t=${Math.floor(currentSeconds / 2)}`}
                  alt={item.channel.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />

                {/* Top Info Header */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 10px',
                    background: 'linear-gradient(to bottom, rgba(7, 9, 14, 0.9) 0%, rgba(7, 9, 14, 0) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="status-dot online" style={{ width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFFFFF' }}>
                      {item.channel.name}
                    </span>
                    <span className="mono" style={{ fontSize: '9px', color: 'var(--muted)' }}>
                      ({item.device.ip})
                    </span>
                  </div>

                  <div className="mono" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--emerald)' }}>
                    {selectedDate} {formatTime(currentSeconds)}
                  </div>
                </div>

                {/* OSD Watermark */}
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '10px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  АРХИВ NVR · {playbackSpeed}x
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Interactive 24-Hour Timeline Scrubber & Control Bar */}
        <div
          style={{
            height: '115px',
            background: '#0d1017',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            userSelect: 'none',
          }}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
        >
          {/* Top Control Bar: Play/Pause, Speed, Zoom, Current Time */}
          <div
            style={{
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn-pill"
                style={{ padding: '5px 8px' }}
                onClick={() => stepFrame(-1)}
                title="Шаг назад (1 кадр)"
              >
                <SkipBack size={13} />
              </button>

              <button
                type="button"
                className="btn-pill btn-pill-primary"
                style={{ padding: '5px 12px' }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                {isPlaying ? 'Пауза' : 'Воспроизведение'}
              </button>

              <button
                type="button"
                className="btn-pill"
                style={{ padding: '5px 8px' }}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentSeconds(0);
                }}
                title="Остановить"
              >
                <Square size={12} fill="currentColor" />
              </button>

              <button
                type="button"
                className="btn-pill"
                style={{ padding: '5px 8px' }}
                onClick={() => stepFrame(1)}
                title="Шаг вперед (1 кадр)"
              >
                <SkipForward size={13} />
              </button>

              <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

              {/* Speed Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {[0.5, 1, 2, 4, 8, 16].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`tab-pill mono ${playbackSpeed === spd ? 'active' : ''}`}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{ padding: '2px 6px', fontSize: '10.5px' }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Current Playback Timestamp */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={13} color="var(--emerald)" />
              <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.6px' }}>
                {selectedDate} {formatTime(currentSeconds)}
              </span>
            </div>

            {/* Grid layout selector for playback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(['1x1', '2x2', '3x3'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`tab-pill mono ${playbackLayout === l ? 'active' : ''}`}
                  onClick={() => setPlaybackLayout(l)}
                  style={{ padding: '2px 7px', fontSize: '11px' }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 24-Hour Timeline Ruler & Tracks */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            onMouseDown={handleTimelineMouseDown}
            style={{
              flex: 1,
              position: 'relative',
              background: '#07090e',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 10px 4px',
            }}
          >
            {/* Record segments bar */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '24px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '4px',
              }}
            >
              {segments.map((seg, idx) => {
                const leftPct = (seg.startSec / 86400) * 100;
                const widthPct = Math.max(((seg.endSec - seg.startSec) / 86400) * 100, 0.4);
                let color = '#3B82F6'; // continuous blue
                if (seg.type === 'motion') color = '#F59E0B'; // motion yellow
                else if (seg.type === 'alarm') color = '#EF4444'; // alarm red

                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 0,
                      bottom: 0,
                      background: color,
                      opacity: 0.85,
                    }}
                    title={`${seg.type.toUpperCase()}: ${seg.startTime} — ${seg.endTime}`}
                  />
                );
              })}
            </div>

            {/* Time ruler ticks (00:00 to 24:00) */}
            <div style={{ position: 'relative', width: '100%', height: '18px' }}>
              {Array.from({ length: 25 }, (_, i) => i).map((hour) => {
                const pct = (hour / 24) * 100;
                return (
                  <div
                    key={hour}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ width: '1px', height: '6px', background: 'rgba(255, 255, 255, 0.2)' }} />
                    <span className="mono" style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                      {hour.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Playhead Needle (Curved red indicator) */}
            <div
              style={{
                position: 'absolute',
                left: `${(currentSeconds / 86400) * 100}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#EF4444',
                boxShadow: '0 0 8px #EF4444',
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  background: '#EF4444',
                  borderRadius: '50%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
