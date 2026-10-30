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
