export type UnitOfLength = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type DisplayUnits = 'metric' | 'imperial';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type BoundaryStatus = 'inside' | 'outside' | 'unverified' | 'none';
export type OccupancyStatus = 'occupied' | 'clear' | 'unknown';
export type ReportingStatus = 'enabled' | 'disabled' | 'unknown';

export interface SensorPosition {
  x: number;
  y: number;
}

export interface DetectionBoundary {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ?: number;
  maxZ?: number;
  sourceUnits?: UnitOfLength;
}

export interface SensorConfig {
  id: string;
  name: string;
  targets_entity: string;
  targets_attribute?: string;
  occupancy_entity?: string;
  reporting_entity?: string;
  boundary_prefix?: string;
  boundary_min_x_entity?: string;
  boundary_max_x_entity?: string;
  boundary_min_y_entity?: string;
  boundary_max_y_entity?: string;
  boundary_min_z_entity?: string;
  boundary_max_z_entity?: string;
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
  show_coordinates?: boolean;
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
  sourceX: number; // local coordinate in source units (e.g. cm)
  sourceY: number; // local coordinate in source units (e.g. cm)
  sourceZ?: number; // local coordinate in source units (e.g. cm)
  x: number; // sensor local in meters
  y: number; // sensor local in meters
  z?: number;
  worldX: number; // world coordinates in meters
  worldY: number; // world coordinates in meters
  dop?: number;
  timestamp: number;
  isStale: boolean;
  ageSeconds?: number;
  boundaryStatus?: BoundaryStatus;
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
