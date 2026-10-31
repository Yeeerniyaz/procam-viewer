export type DeviceProtocol = 'hikvision' | 'dahua' | 'onvif' | 'custom';
export type DeviceType = 'camera' | 'nvr';
export type VmsModule = 'live' | 'playback' | 'devices' | 'events';

export type GridLayout =
  | '1x1'
  | '2x2'
  | '3x3'
  | '4x4'
  | '5x5'
  | '6x6'
  | '7x7'
  | '8x8'
  | '1+5'
  | '1+7'
  | '1+12'
  | '2+8'
  | '1+1+12';

export interface ChannelItem {
  id: string; // e.g. "dev-1-ch-1"
  channelNumber: number; // 1, 2, ...
  channelIdHik: string; // "101", "201", "1"
  name: string; // "Канал 1: Вход"
  enabled: boolean;
  rtspMain: string;
  rtspSub: string;
  activeStream: 'main' | 'sub';
  status: 'online' | 'offline' | 'checking';
  pingMs: number;
  resolution: string;
  codec: string;
}

export interface DeviceItem {
  id: string;
  name: string;
  type: DeviceType;
  protocol: DeviceProtocol;
  ip: string;
  httpPort: number;
  rtspPort: number;
  login: string;
  password: string;
  channelsCount: number;
  channels: ChannelItem[];
  status: 'online' | 'offline' | 'checking';
  pingMs: number;
  model?: string;
  serial?: string;
  firmware?: string;
  expanded?: boolean;
}

export interface ActiveGridCell {
  cellId: string;
  deviceId: string;
  channelId: string;
  channelNumber: number;
  channelName: string;
  deviceName: string;
  deviceIp: string;
  deviceProtocol: DeviceProtocol;
  httpPort: number;
  rtspPort: number;
  login: string;
  password: string;
  channelIdHik: string;
  rtspMain: string;
  rtspSub: string;
  activeStream: 'main' | 'sub';
  status: 'online' | 'offline' | 'connecting';
  pingMs: number;
  codec: string;
  resolution: string;
  fps: number;
  bitrateKbps: number;
  isRecording?: boolean;
  isMuted?: boolean;
  zoomLevel?: number;
  panX?: number;
  panY?: number;
}

export interface CustomView {
  id: string;
  name: string;
  layout: GridLayout;
  createdAt: string;
  cells: {
    cellIndex: number;
    deviceId: string;
    channelId: string;
    activeStream: 'main' | 'sub';
  }[];
}

export interface CameraFolder {
  id: string;
  name: string;
  color?: string;
  cameraKeys: string[]; // `${deviceId}_${channelId}`
}

export interface PlaybackSegment {
  startTime: string; // "08:00:00"
  endTime: string;   // "12:30:00"
  startSec: number;  // 0 to 86400
  endSec: number;
  type: 'continuous' | 'motion' | 'alarm';
  trackId: string;
}

export interface DiscoveredCam {
  ip: string;
  mac: string;
  vendor: string;
  model: string;
  serial: string;
  firmware: string;
  type: 'camera' | 'nvr';
  protocol: DeviceProtocol;
  rtspPort: number;
  httpPort: number;
  selected?: boolean;
}

export interface NetInterfaceInfo {
  name: string;
  kind: 'wired' | 'wifi';
  label: string;
  ip: string;
  subnet: string;
  carrier: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'RTSP' | 'ISAPI' | 'NET' | 'SUCCESS' | 'WARN';
  message: string;
}

export type FilterType = 'all' | 'camera' | 'nvr' | 'online' | 'offline';

/**
 * Cleans a device name by stripping generic ONVIF model fluff (e.g. "(CCTV)", "Network Camera")
 * and adding a short IP hint if the remaining name is generic.
 */
export function cleanDeviceName(name?: string, ip?: string): string {
  if (!name) return '';
  let clean = name.trim();
  clean = clean
    .replace(/\s*\(\s*cctv\s*\)\s*/gi, ' ')
    .replace(/\bnetwork camera\b/gi, '')
    .replace(/\bip camera\b/gi, 'IP Camera')
    .replace(/\s+/g, ' ')
    .trim();

  const isGeneric = !clean || /^(ip\s*camera|camera|камера)$/i.test(clean);
  if (isGeneric && ip) {
    const parts = ip.split('.');
    const suffix = parts.length === 4 ? `.${parts[3]}` : ip;
    return `IP Camera (${suffix})`;
  }
  return clean || 'Камера';
}

/**
 * Returns a human-friendly, clean, and unambiguous display name for a camera cell.
 * Handles generic channel names ("Основной поток", "Канал 1"), standalone IP cameras,
 * multi-channel NVRs, and custom-named channels.
 */
export function getCellDisplayName(cell: ActiveGridCell | null | undefined): string {
  if (!cell) return '';
  const devName = (cell.deviceName || '').trim();
  const chName = (cell.channelName || '').trim();
  const ip = cell.deviceIp || '';

  const cleanDev = cleanDeviceName(devName, ip);

  // Check if channelName is generic stream technical jargon ("Основной поток", "Канал 1: Основной поток", "substream")
  const isGenericStreamOnly =
    !chName ||
    /^(канал\s*\d+:\s*)?(основной поток(\s*\(.*\))?|субпоток(\s*\(.*\))?|main\s*stream|sub\s*stream|stream\s*\d+|profile\s*\d+)$/i.test(chName);

  // Check if channelName is just a numbered channel like "Канал 1"
  const isNumberedChannelOnly = /^(канал|ch)\s*\d+$/i.test(chName);

  // If channelName is pure stream jargon, prioritize clean device name
  if (isGenericStreamOnly) {
    if (cleanDev) return cleanDev;
    return `Камера ${cell.channelNumber || 1}`;
  }

  // If channel is numbered ("Канал 1", "Канал 2"...)
  if (isNumberedChannelOnly) {
    if (cleanDev && !/^(канал|ch)\s*\d+$/i.test(cleanDev)) {
      return `${cleanDev} · CH ${cell.channelNumber || 1}`;
    }
    return cleanDev || chName || `Камера ${cell.channelNumber || 1}`;
  }

  // If both device and channel have distinctive meaningful names
  if (cleanDev && chName && cleanDev.toLowerCase() !== chName.toLowerCase()) {
    if (chName.toLowerCase().startsWith(cleanDev.toLowerCase())) {
      return chName;
    }
    const cleanCh = chName.replace(/^(канал|ch)\s*\d+:\s*/i, '').trim();
    if (/^(основной поток|субпоток|main\s*stream|sub\s*stream)/i.test(cleanCh)) {
      return cleanDev;
    }
    if (cleanCh && cleanCh.toLowerCase() !== cleanDev.toLowerCase()) {
      return `${cleanDev} · ${cleanCh}`;
    }
    return cleanDev;
  }

  return cleanDev || chName || `Камера ${cell.channelNumber || 1}`;
}

