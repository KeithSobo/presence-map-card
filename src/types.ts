export type UnitOfLength = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type DisplayUnits = 'metric' | 'imperial';
export type ThemeMode = 'auto' | 'light' | 'dark';

export interface SensorPosition {
  x: number;
  y: number;
}

export interface DetectionBoundary {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface SensorConfig {
  id: string;
  name: string;
  targets_entity: string;
  targets_attribute?: string;
  occupancy_entity?: string;
  reporting_entity?: string;
  boundary_prefix?: string;
  source_units?: UnitOfLength;
  position?: SensorPosition;
  rotation?: number; // degrees clockwise
  mirror_x?: boolean;
  mirror_y?: boolean;
  color?: string;
  fov?: number; // degrees, default 120
  max_distance?: number; // in meters, default 6
}

export interface FloorplanConfig {
  image: string;
  width_meters: number;
  height_meters: number;
}

export interface PresenceMapCardConfig {
  type: string;
  title?: string;
  display_units?: DisplayUnits;
  theme?: ThemeMode;
  stale_timeout?: number; // seconds
  range_meters?: number; // meters for radar mode
  show_rings?: boolean;
  show_trails?: boolean;
  show_labels?: boolean;
  show_boundaries?: boolean;
  trail_history_seconds?: number;
  trail_max_points?: number;
  demo_mode?: boolean;
  floorplan?: FloorplanConfig;
  sensors?: SensorConfig[];
}

export interface RawTargetData {
  x: number;
  y: number;
  z?: number;
  dop?: number;
  target_id: number | string;
  timestamp?: number | string;
}

export interface Target {
  scopedId: string;
  sensorId: string;
  sensorColor: string;
  rawTargetId: string | number;
  x: number; // sensor local in meters
  y: number; // sensor local in meters
  z?: number;
  worldX: number; // world coordinates in meters
  worldY: number; // world coordinates in meters
  dop?: number;
  timestamp: number;
  isStale: boolean;
}

export interface TrailPoint {
  worldX: number;
  worldY: number;
  timestamp: number;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  themes?: Record<string, unknown>;
  selectedTheme?: string | null;
  darkMode?: boolean;
  callService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>
  ) => Promise<unknown>;
}

export interface CustomCardEntry {
  type: string;
  name: string;
  preview?: boolean;
  description: string;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}
