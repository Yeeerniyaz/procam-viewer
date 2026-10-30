export interface CameraStreamItem {
  id: string;
  name: string;
  ip: string;
  mac: string;
  vendor: string;
  model: string;
  device_type: 'camera' | 'nvr';
  device_label: string;
  zone: string;
  status: 'online' | 'offline';
  ping_ms: number;
  ports: number[];
  codec: string;
  resolution: string;
  fps: number;
  bitrate_kbps: number;
  rtsp_main: string;
  rtsp_sub: string;
  active_stream: 'main' | 'sub';
  channel: number;
}

export interface NetInterfaceInfo {
  name: string;
  kind: 'wired' | 'wifi';
  label: string;
  ip: string;
  subnet: string;
  carrier: boolean;
}

export interface SystemInfo {
  app: string;
  version: string;
  os: string;
  arch: string;
  ip: string;
  subnet: string;
  interfaces: NetInterfaceInfo[];
}

export interface StreamDiagnostics {
  codec: string;
  resolution: string;
  fps: number;
  bitrate_kbps: number;
  gop: number;
  audio_codec: string;
  auth_type: string;
  rtsp_url: string;
  ping_ms: number;
  jitter_ms: number;
  loss: number;
  ports: number[];
  rtsp_open: boolean;
  onvif_open: boolean;
  sdk_open: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'RTSP' | 'ONVIF' | 'NET' | 'SUCCESS' | 'WARN';
  message: string;
}

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';
export type FilterType = 'all' | 'camera' | 'nvr' | 'online' | 'offline';
