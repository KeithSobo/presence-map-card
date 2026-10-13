import {
  PresenceMapCardConfig,
  SensorConfig,
  DisplayUnits,
  ThemeMode,
  UnitOfLength,
} from './types';

export const DEFAULT_PALETTE = [
  '#03a9f4', // Light Blue
  '#4caf50', // Green
  '#ff9800', // Orange
  '#e91e63', // Pink
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#f44336', // Red
];

export function validateConfig(raw: unknown): {
  valid: boolean;
  errors: string[];
  config: PresenceMapCardConfig;
} {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: ['Configuration must be a valid object'],
      config: { type: 'custom:presence-map-card', sensors: [] },
    };
  }

  const obj = raw as Record<string, unknown>;

  const displayUnits: DisplayUnits = obj.display_units === 'imperial' ? 'imperial' : 'metric';

  const theme: ThemeMode = obj.theme === 'light' || obj.theme === 'dark' ? obj.theme : 'auto';

  const staleTimeout =
    typeof obj.stale_timeout === 'number' && obj.stale_timeout > 0 ? obj.stale_timeout : 10;

  const rangeMeters =
    typeof obj.range_meters === 'number' && obj.range_meters > 0 ? obj.range_meters : 6;

  const trailHistorySeconds =
    typeof obj.trail_history_seconds === 'number' && obj.trail_history_seconds > 0
      ? obj.trail_history_seconds
      : 10;

  const trailMaxPoints =
    typeof obj.trail_max_points === 'number' && obj.trail_max_points > 0
      ? Math.min(Math.round(obj.trail_max_points), 200)
      : 30;

  let floorplan = undefined;
  if (obj.floorplan && typeof obj.floorplan === 'object') {
    const fp = obj.floorplan as Record<string, unknown>;
    if (typeof fp.image === 'string' && fp.image.trim().length > 0) {
      const width =
        typeof fp.width_meters === 'number' && fp.width_meters > 0 ? fp.width_meters : 10;
      const height =
        typeof fp.height_meters === 'number' && fp.height_meters > 0 ? fp.height_meters : 8;
      floorplan = {
        image: fp.image.trim(),
        width_meters: width,
        height_meters: height,
      };
    }
  }

  const demoMode = Boolean(obj.demo_mode);

  const rawSensors = Array.isArray(obj.sensors) ? obj.sensors : [];
  if (!demoMode && rawSensors.length === 0) {
    errors.push('At least one sensor should be configured in "sensors" or enable "demo_mode"');
  }

  const normalizedSensors: SensorConfig[] = rawSensors.map((s, idx) => {
    const sensorObj = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const id =
      typeof sensorObj.id === 'string' && sensorObj.id.trim()
        ? sensorObj.id.trim()
        : `sensor_${idx + 1}`;
    const name =
      typeof sensorObj.name === 'string' && sensorObj.name.trim()
        ? sensorObj.name.trim()
        : `Sensor ${idx + 1}`;
    const targetsEntity =
      typeof sensorObj.targets_entity === 'string' ? sensorObj.targets_entity.trim() : '';
    const targetsAttribute =
      typeof sensorObj.targets_attribute === 'string' && sensorObj.targets_attribute.trim()
        ? sensorObj.targets_attribute.trim()
        : 'targets';
    const occupancyEntity =
      typeof sensorObj.occupancy_entity === 'string' && sensorObj.occupancy_entity.trim()
        ? sensorObj.occupancy_entity.trim()
        : undefined;
    const reportingEntity =
      typeof sensorObj.reporting_entity === 'string' && sensorObj.reporting_entity.trim()
        ? sensorObj.reporting_entity.trim()
        : undefined;
    const boundaryPrefix =
      typeof sensorObj.boundary_prefix === 'string' && sensorObj.boundary_prefix.trim()
        ? sensorObj.boundary_prefix.trim()
        : undefined;

    const validUnits: UnitOfLength[] = ['mm', 'cm', 'm', 'in', 'ft'];
    const sourceUnits: UnitOfLength =
      typeof sensorObj.source_units === 'string' &&
      validUnits.includes(sensorObj.source_units as UnitOfLength)
        ? (sensorObj.source_units as UnitOfLength)
        : 'cm';

    const pos = (
      sensorObj.position && typeof sensorObj.position === 'object' ? sensorObj.position : {}
    ) as Record<string, unknown>;
    const posX = typeof pos.x === 'number' ? pos.x : 0;
    const posY = typeof pos.y === 'number' ? pos.y : 0;
    const rotation = typeof sensorObj.rotation === 'number' ? sensorObj.rotation : 0;
    const mirrorX = Boolean(sensorObj.mirror_x);
    const mirrorY = Boolean(sensorObj.mirror_y);
    const color =
      typeof sensorObj.color === 'string' && sensorObj.color.trim()
        ? sensorObj.color.trim()
        : DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
    const fov =
      typeof sensorObj.fov === 'number' && sensorObj.fov > 0 && sensorObj.fov <= 360
        ? sensorObj.fov
        : 120;
    const maxDistance =
      typeof sensorObj.max_distance === 'number' && sensorObj.max_distance > 0
        ? sensorObj.max_distance
        : rangeMeters;

    return {
      id,
      name,
      targets_entity: targetsEntity,
      targets_attribute: targetsAttribute,
      occupancy_entity: occupancyEntity,
      reporting_entity: reportingEntity,
      boundary_prefix: boundaryPrefix,
      source_units: sourceUnits,
      position: { x: posX, y: posY },
      rotation,
      mirror_x: mirrorX,
      mirror_y: mirrorY,
      color,
      fov,
      max_distance: maxDistance,
    };
  });

  const config: PresenceMapCardConfig = {
    type: typeof obj.type === 'string' ? obj.type : 'custom:presence-map-card',
    title: typeof obj.title === 'string' ? obj.title : undefined,
    display_units: displayUnits,
    theme,
    stale_timeout: staleTimeout,
    range_meters: rangeMeters,
    show_rings: obj.show_rings !== false,
    show_trails: obj.show_trails !== false,
    show_labels: obj.show_labels !== false,
    show_boundaries: obj.show_boundaries !== false,
    trail_history_seconds: trailHistorySeconds,
    trail_max_points: trailMaxPoints,
    demo_mode: demoMode,
    floorplan,
    sensors: normalizedSensors,
  };

  return {
    valid: errors.length === 0,
    errors,
    config,
  };
}

export function getStubConfig(): PresenceMapCardConfig {
  return {
    type: 'custom:presence-map-card',
    title: 'PresenceMap',
    display_units: 'metric',
    theme: 'auto',
    stale_timeout: 10,
    range_meters: 6,
    show_rings: true,
    show_trails: true,
    show_labels: true,
    show_boundaries: true,
    sensors: [
      {
        id: 'sensor_1',
        name: 'Presence Sensor',
        targets_entity: 'sensor.mmwave_targets',
        occupancy_entity: 'binary_sensor.mmwave_occupancy',
        source_units: 'cm',
        color: '#03a9f4',
        fov: 120,
        position: { x: 0, y: 0 },
        rotation: 0,
        mirror_x: false,
        mirror_y: false,
      },
    ],
  };
}
