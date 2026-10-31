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
  HardDrive,
  FolderOpen,
  Folder,
  Film,
  RefreshCw,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { ExportArchiveModal } from './ExportArchiveModal';

interface LocalRecordFile {
  filename: string;
  path: string;
  size: number;
  date: string;
  url: string;
}

interface Props {
  devices: DeviceItem[];
}

export const PlaybackModule: React.FC<Props> = ({ devices }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'nvr'>('local');
  const [localFiles, setLocalFiles] = useState<LocalRecordFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<LocalRecordFile | null>(null);
  const [fileSearch, setFileSearch] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // Filter only devices that are NVR / have multi-channel recordings
  const nvrDevices = devices.filter((d) => d.type === 'nvr' || d.channelsCount > 1 || d.channels.length > 1);

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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [recordingsDir, setRecordingsDir] = useState<string>('~/Videos/ProCam_Recordings');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDeletingFiles, setIsDeletingFiles] = useState<boolean>(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState<boolean>(false);

  // Fetch current recordings directory from backend
  const fetchRecordingsDir = async () => {
    try {
      const res = await fetch('/api/record/dir');
      if (res.ok) {
        const d = await res.json();
        if (d && d.dir) {
          setRecordingsDir(d.dir);
        }
      }
    } catch (e) {}
  };

  // Open native GUI folder chooser dialog on host OS
  const handleSelectFolder = async () => {
    try {
      const res = await fetch('/api/record/select-folder', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.dir) {
          setRecordingsDir(d.dir);
          fetchLocalFiles();
        }
      }
    } catch (e) {}
  };

  // Toggle selection of a local recording file for batch actions
  const toggleSelectFileName = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileNames((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
    );
  };

  // Select or deselect all local recordings
  const toggleSelectAllLocal = () => {
    if (selectedFileNames.length === localFiles.length && localFiles.length > 0) {
      setSelectedFileNames([]);
    } else {
      setSelectedFileNames(localFiles.map((f) => f.filename));
    }
  };

  // Download all selected files as a single ZIP archive
  const handleDownloadSelectedZip = () => {
    if (selectedFileNames.length === 0) return;
    const param = encodeURIComponent(selectedFileNames.join(','));
    const a = document.createElement('a');
    a.href = `/api/record/download-zip?files=${param}`;
    a.download = `procam_export_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Delete selected files from disk
  const handleDeleteSelected = async () => {
    if (selectedFileNames.length === 0) return;
    if (!window.confirm(`Удалить выбранные файлы (${selectedFileNames.length} шт.) с диска безвозвратно?`)) {
      return;
    }
    setIsDeletingFiles(true);
    try {
      const res = await fetch('/api/record/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: selectedFileNames }),
      });
      if (res.ok) {
        if (selectedFile && selectedFileNames.includes(selectedFile.filename)) {
          setSelectedFile(null);
        }
        setSelectedFileNames([]);
        fetchLocalFiles();
      }
    } catch (e) {}
    setIsDeletingFiles(false);
  };

  // Export NVR segment to MP4 via backend
  const handleExportNvrSegment = async () => {
    if (selectedChannels.length === 0) return;
    const target = selectedChannels[0];
    setIsExporting(true);
    setExportNotice('Экспорт отрезка архива...');

    const startSec = Math.max(0, currentSeconds - 300);
    const endSec = Math.min(86399, currentSeconds + 300);
    const startStr = formatTime(startSec);
    const endStr = formatTime(endSec);

    try {
      const res = await fetch(
        `/api/isapi/playback/download?ip=${encodeURIComponent(target.device.ip)}&user=${encodeURIComponent(target.device.login)}&pass=${encodeURIComponent(target.device.password)}&channel=${target.channel.channelNumber}&date=${selectedDate}&start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`
      );
      const data = await res.json();
      if (data.success) {
        setExportNotice(`✔ Экспорт сохранен: ${data.filename}`);
        fetchLocalFiles();
        setTimeout(() => setExportNotice(null), 5000);
      } else {
        setExportNotice(`Ошибка: ${data.error || 'NVR не ответил'}`);
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (e: any) {
      setExportNotice(`Ошибка: ${e.message}`);
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch local recorded video files from disk
  const fetchLocalFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/record/list');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.files)) {
          setLocalFiles(data.files);
          if (data.dir) {
            setRecordingsDir(data.dir);
          }
          if (data.files.length > 0 && !selectedFile) {
            setSelectedFile(data.files[0]);
          }
        }
      }
    } catch (e) {}
    setIsLoadingFiles(false);
  };

  useEffect(() => {
    fetchLocalFiles();
    fetchRecordingsDir();
  }, []);

  const handleOpenRecordingsFolder = () => {
    fetch('/api/record/open-folder', { method: 'POST' }).catch(() => {});
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Initialize with first available NVR channel if none selected
  useEffect(() => {
    if (selectedChannels.length === 0 && nvrDevices.length > 0) {
      const firstDev = nvrDevices[0];
      const firstCh = firstDev.channels[0];
      if (firstCh) {
        setSelectedChannels([{ device: firstDev, channel: firstCh }]);
      }
    }
  }, [nvrDevices]);

  // Query recorded segments when channel or date changes
  useEffect(() => {
    if (selectedChannels.length === 0) {
      setSegments([]);
      setIsPlaying(false);
      return;
    }
    const target = selectedChannels[0];
    setIsSearching(true);
    setIsPlaying(false);

    fetch(
      `/api/isapi/playback/search?ip=${encodeURIComponent(target.device.ip)}&port=${target.device.httpPort}&user=${encodeURIComponent(target.device.login)}&pass=${encodeURIComponent(target.device.password)}&channel=${target.channel.channelNumber}&date=${selectedDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.segments && Array.isArray(data.segments)) {
          setSegments(data.segments);
        } else {
          setSegments([]);
        }
      })
      .catch(() => {
        setSegments([]);
      })
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
    if (!timelineRef.current || segments.length === 0) return;
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
          width: '280px',
          background: '#0d1017',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Playback Mode Switcher */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('local');
              fetchLocalFiles();
            }}
            style={{
              flex: 1,
              fontSize: '11px',
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <HardDrive size={13} color={activeTab === 'local' ? 'var(--emerald)' : 'var(--muted)'} />
            <span>Записи на диске</span>
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'nvr' ? 'active' : ''}`}
            onClick={() => setActiveTab('nvr')}
            style={{
              flex: 1,
              fontSize: '11px',
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <Server size={13} color={activeTab === 'nvr' ? '#60A5FA' : 'var(--muted)'} />
            <span>Архив NVR</span>
          </button>
        </div>

        {/* Tab 1: Local Recordings List */}
        {activeTab === 'local' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Header with Open Folder & Choose Directory & Refresh */}
            <div
              style={{
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <span className="mono" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700 }}>
                КЛИПОВ: {localFiles.length}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="btn-pill"
                  style={{ padding: '3px 7px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Выбрать другую папку для сохранения (через системный диалог)"
                >
                  <Folder size={12} color="var(--emerald)" />
                  <span>Обзор...</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRecordingsFolder}
                  className="btn-pill"
                  style={{ padding: '3px 7px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Открыть текущую папку в проводнике"
                >
                  <FolderOpen size={12} />
                  <span>Папка</span>
                </button>
                <button
                  type="button"
                  onClick={fetchLocalFiles}
                  className="btn-pill"
                  style={{ padding: '3px 6px', fontSize: '10px' }}
                  title="Обновить список"
                >
                  <RefreshCw size={12} className={isLoadingFiles ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Folder path info */}
            <div
              style={{
                padding: '4px 10px',
                fontSize: '9.5px',
                color: 'rgba(255, 255, 255, 0.45)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={recordingsDir}
            >
              <Folder size={11} color="rgba(255, 255, 255, 0.3)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                {recordingsDir}
              </span>
            </div>

            {/* Multi-selection Toolbar */}
            <div
              style={{
                padding: '5px 8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: selectedFileNames.length > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: selectedFileNames.length > 0 ? 'var(--emerald)' : 'var(--muted)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={localFiles.length > 0 && selectedFileNames.length === localFiles.length}
                  onChange={toggleSelectAllLocal}
                  style={{ accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>
                  {selectedFileNames.length > 0
                    ? `Выбрано: ${selectedFileNames.length}`
                    : 'Выбрать все'}
                </span>
              </label>

              {selectedFileNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadSelectedZip}
                    className="btn-pill"
                    style={{
                      padding: '2px 7px',
                      fontSize: '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: 'var(--emerald)',
                      border: '1px solid var(--emerald-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Скачать выбранные файлы единым ZIP архивом"
                  >
                    <Download size={11} />
                    <span>ZIP</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={isDeletingFiles}
                    className="btn-pill"
                    style={{
                      padding: '2px 7px',
                      fontSize: '10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Удалить выбранные файлы с диска"
                  >
                    <Trash2 size={11} />
                    <span>Удалить</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Input */}
            <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <input
                type="text"
                placeholder="Поиск по имени файла..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Files Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {localFiles.length === 0 ? (
                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', lineHeight: 1.5 }}>
                  <Film size={30} color="rgba(255, 255, 255, 0.15)" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontWeight: 600 }}>Нет сохраненных записей</span>
                  <div style={{ fontSize: '10px', color: '#71717A', marginTop: '6px' }}>
                    Нажмите красную кнопку «REC» на любой камере в Живом виде для записи отрезка на диск.
                  </div>
                </div>
              ) : (
                localFiles
                  .filter((f) => !fileSearch || f.filename.toLowerCase().includes(fileSearch.toLowerCase()))
                  .map((f) => {
                    const isCur = selectedFile?.filename === f.filename;
                    const isChecked = selectedFileNames.includes(f.filename);
                    return (
                      <div
                        key={f.filename}
                        onClick={() => setSelectedFile(f)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isCur
                            ? 'rgba(16, 185, 129, 0.14)'
                            : isChecked
                            ? 'rgba(59, 130, 246, 0.1)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: isCur
                            ? '1px solid var(--emerald-border)'
                            : isChecked
                            ? '1px solid rgba(59, 130, 246, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectFileName(f.filename, e as any)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: 'var(--emerald)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                            <Film size={12} color={isCur ? 'var(--emerald)' : 'var(--muted)'} style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: isCur ? '#FFFFFF' : '#D4D4D8',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={f.filename}
                            >
                              {f.filename}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--muted)' }}>
                            <span className="mono">{f.date}</span>
                            <span className="mono" style={{ color: 'var(--emerald)' }}>
                              {formatFileSize(f.size)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Date Selector Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <CalendarIcon size={13} color="var(--emerald)" />
                <span className="eyebrow">// ВЫБОР ДАТЫ АРХИВА NVR</span>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              />

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid var(--emerald-border)',
                  color: '#10B981',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                title="Экспорт архива по времени и нескольким каналам"
              >
                <Download size={13} />
                <span>Мастер экспорта архива</span>
              </button>
            </div>

            {/* Synchronous Channel Selector Tree */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF' }}>
                  Каналы поиска NVR:
                </span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--emerald)' }}>
                  {selectedChannels.length} выбрано
                </span>
              </div>

              {nvrDevices.length === 0 ? (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', lineHeight: 1.5 }}>
                  <Server size={32} color="rgba(255, 255, 255, 0.2)" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
                    Нет регистраторов NVR
                  </span>
                  <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginBottom: '14px' }}>
                    Ваши камеры — автономные (без встроенных накопителей или SD-карт). Все записи сохраняются напрямую на диск вашего ПК.
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('local')}
                    className="btn-pill btn-pill-primary"
                    style={{ width: '100%', padding: '7px 10px', fontSize: '11px', justifyContent: 'center', gap: '6px' }}
                  >
                    <HardDrive size={13} />
                    <span>Открыть записи на диске</span>
                  </button>
                </div>
              ) : (
                nvrDevices.map((dev) => (
                  <div key={dev.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#E4E4E7' }}>
                      <Server size={13} color="#60A5FA" />
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
                ))
              )}
            </div>

            {/* Legend */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#090c12' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                Типы записей архива:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#60A5FA' }}>
                  <div style={{ width: '8px', height: '8px', background: '#3B82F6', borderRadius: '2px' }} />
                  <span>Постоянная запись (24/7)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B' }}>
                  <div style={{ width: '8px', height: '8px', background: '#F59E0B', borderRadius: '2px' }} />
                  <span>Детекция движения (Motion)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#EF4444' }}>
                  <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '2px' }} />
                  <span>Тревожное событие (Alarm)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Main Area: Local Video Player or Playback Video Grid + 24H Timeline Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%' }}>
        {activeTab === 'local' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#0a0d14' }}>
            {/* Header Toolbar */}
            <div
              style={{
                height: '46px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#0e121a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Film size={18} color="#3B82F6" />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#F3F4F6',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedFile ? selectedFile.filename : 'Локальный видеоплеер'}
                </span>
                {selectedFile && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60A5FA',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatFileSize(selectedFile.size)}
                  </span>
                )}
                {selectedFile && (
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {selectedFile.date}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedFileNames.length > 0 && (
                  <button
                    onClick={handleDownloadSelectedZip}
                    title="Скачать выбранные файлы единым ZIP архивом"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '5px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid var(--emerald-border)',
                      color: 'var(--emerald)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <Download size={14} />
                    <span>Скачать ZIP ({selectedFileNames.length})</span>
                  </button>
                )}

                <button
                  onClick={handleSelectFolder}
                  title="Выбрать другую папку для сохранения записей"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '5px',
                    background: '#1F2937',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#E5E7EB',
                    cursor: 'pointer',
                  }}
                >
                  <Folder size={14} color="var(--emerald)" />
                  <span>Выбрать папку</span>
                </button>

                <button
                  onClick={handleOpenRecordingsFolder}
                  title="Открыть папку с записями в файловом менеджере"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '5px',
                    background: '#1F2937',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#E5E7EB',
                    cursor: 'pointer',
                  }}
                >
                  <FolderOpen size={14} />
                  <span>Открыть папку</span>
                </button>

                {selectedFile && (
                  <a
                    href={selectedFile.url}
                    download={selectedFile.filename}
                    title="Скачать видеофайл"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '5px',
                      background: '#2563EB',
                      border: 'none',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Download size={14} />
                    <span>Скачать MP4</span>
                  </a>
                )}
              </div>
            </div>

            {/* Video Viewport */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000000',
                position: 'relative',
                minHeight: 0,
              }}
            >
              {selectedFile ? (
                <video
                  key={selectedFile.url}
                  src={selectedFile.url}
                  controls
                  autoPlay
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    background: '#000000',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', padding: '24px' }}>
                  <HardDrive size={54} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: '#D1D5DB' }}>
                    Нет выбранной записи
                  </div>
                  <div style={{ fontSize: '12px', maxWidth: '420px', lineHeight: 1.5 }}>
                    Выберите файл записи из списка слева для просмотра, или запустите запись нажав кнопку{' '}
                    <span style={{ color: '#EF4444', fontWeight: 600 }}>● REC</span> на любой камере в режиме онлайн-просмотра.
                  </div>
                </div>
              )}
            </div>

            {/* Footer Status */}
            <div
              style={{
                height: '36px',
                background: '#0c0f17',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Каталог архива:</span>
                <span style={{ color: '#E4E4E7', fontFamily: 'monospace', fontWeight: 600 }}>{recordingsDir}</span>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="btn-pill"
                  style={{ padding: '2px 8px', fontSize: '10.5px', color: 'var(--emerald)' }}
                  title="Изменить папку для сохранения записей"
                >
                  Сменить папку...
                </button>
              </div>
              <div>
                Формат: <span style={{ color: '#60A5FA' }}>H.264 / H.265 MP4 (Lossless StreamCopy)</span>
              </div>
            </div>
          </div>
        ) : (
          nvrDevices.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                background: '#0a0d14',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Server size={32} color="#60A5FA" />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                Архив NVR активен при наличии сетевого видеорегистратора
              </h3>

              <p style={{ maxWidth: '520px', fontSize: '12.5px', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '20px' }}>
                В вашей системе сейчас подключены <strong>автономные IP-камеры</strong> (без встроенных карт памяти).
                У них нет встроенного накопителя, поэтому весь архив ведется <strong>напрямую на жестком диске вашего ПК</strong>.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxWidth: '480px',
                  width: '100%',
                  background: '#0e121a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: '#E4E4E7' }}>
                  <HardDrive size={16} color="var(--emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#FFFFFF' }}>Локальная запись на ПК:</strong> в Живом виде нажмите красную кнопку <strong>● REC</strong> на камере (или кнопку <strong>● REC Все</strong>), и видео сохранится на диск в MP4.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: '#E4E4E7' }}>
                  <Film size={16} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#FFFFFF' }}>Настоящий видеоплеер:</strong> во вкладке <strong>«Записи на диске»</strong> работает реальный плеер с перемоткой, звуком, пакетным скачиванием в ZIP и открытием папки.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('local')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: 'var(--emerald)',
                  border: 'none',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
              >
                <HardDrive size={16} />
                <span>Перейти в «Записи на диске»</span>
              </button>
            </div>
          ) : (
            <>
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
                      {/* Show message when no segments exist in NVR archive */}
                      {segments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          <CalendarIcon size={38} color="rgba(255, 255, 255, 0.2)" style={{ margin: '0 auto 10px' }} />
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#E4E4E7', marginBottom: '4px' }}>
                            Нет записей в архиве NVR
                          </div>
                          <div style={{ fontSize: '11px', color: '#71717A', maxWidth: '320px', lineHeight: 1.5 }}>
                            На канале #{item.channel.channelNumber} устройства {item.device.name} нет сохраненных записей за {selectedDate}.
                          </div>
                        </div>
                      ) : (
                        <img
                          src={`/api/isapi/picture?ip=${encodeURIComponent(item.device.ip)}&port=${item.device.httpPort}&user=${encodeURIComponent(item.device.login)}&pass=${encodeURIComponent(item.device.password)}&channel=${item.channel.channelIdHik}&t=${Math.floor(currentSeconds / 2)}`}
                          alt={item.channel.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )}

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
                            {item.device.channels.length === 1
                              ? item.device.name
                              : /^(основной поток|субпоток|profile|stream)/i.test(item.channel.name)
                              ? `${item.device.name} · Канал ${item.channel.channelNumber}`
                              : `${item.device.name} · ${item.channel.name.replace(/^Канал \d+:\s*/, '')}`}
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
                style={{
                  padding: '5px 12px',
                  opacity: segments.length === 0 ? 0.6 : 1,
                  cursor: segments.length === 0 ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  if (segments.length === 0) {
                    alert(`В архиве NVR нет сохраненных записей за ${selectedDate}.`);
                    return;
                  }
                  setIsPlaying(!isPlaying);
                }}
                title={segments.length === 0 ? 'В архиве регистратора нет записей за эту дату' : isPlaying ? 'Пауза' : 'Воспроизведение'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                {isPlaying ? 'Пауза' : segments.length === 0 ? 'Нет записей' : 'Воспроизведение'}
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

            {/* Current Playback Timestamp & Export Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
                <Clock size={13} color="var(--emerald)" />
                <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.6px' }}>
                  {selectedDate} {formatTime(currentSeconds)}
                </span>
              </div>

              <button
                type="button"
                className="btn-pill"
                onClick={() => setIsExportModalOpen(true)}
                title="Экспорт архива по времени и нескольким каналам в MP4"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--emerald)',
                  border: '1px solid var(--emerald-border)',
                  cursor: 'pointer',
                }}
              >
                <Download size={12} />
                <span>Экспорт архива...</span>
              </button>

              <button
                type="button"
                className="btn-pill"
                onClick={handleExportNvrSegment}
                disabled={isExporting}
                title="Быстрый экспорт отрезка архива ±5 мин в локальное хранилище MP4"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  fontSize: '11px',
                  background: isExporting ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(37, 99, 235, 0.4)',
                  cursor: isExporting ? 'wait' : 'pointer',
                }}
              >
                <Download size={12} />
                <span>{isExporting ? 'Экспорт...' : 'Отрезок (10 мин)'}</span>
              </button>

              {exportNotice && (
                <span
                  style={{
                    fontSize: '11px',
                    color: exportNotice.startsWith('✔') ? 'var(--emerald)' : '#F59E0B',
                    fontWeight: 600,
                  }}
                >
                  {exportNotice}
                </span>
              )}
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
              cursor: segments.length === 0 ? 'default' : 'pointer',
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {segments.length === 0 ? (
                <span style={{ fontSize: '10.5px', color: '#71717A', letterSpacing: '0.02em', userSelect: 'none' }}>
                  Шкала пуста — в архиве NVR нет записей за {selectedDate}
                </span>
              ) : (
                segments.map((seg, idx) => {
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
                })
              )}
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
            {segments.length > 0 && (
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
            )}
          </div>
        </div>
      </>
    )
  )}
</div>

      {/* NVR Archive Multi-Channel & Custom Time Range Export Modal */}
      <ExportArchiveModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        devices={devices}
        selectedDate={selectedDate}
        currentSeconds={currentSeconds}
        initialChannels={selectedChannels}
        onExportSuccess={(msg) => {
          setExportNotice(msg);
          fetchLocalFiles();
          setTimeout(() => setExportNotice(null), 6000);
        }}
      />
    </div>
  );
};
