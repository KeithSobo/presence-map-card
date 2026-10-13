import {
  SensorConfig,
  HomeAssistant,
  HassEntity,
  Target,
  RawTargetData,
  DetectionBoundary,
  OccupancyStatus,
  ReportingStatus,
} from '../types';
import { transformToWorld, isValidBoundary, evaluateBoundaryContainment } from '../coords';

export interface SensorParseResult {
  sensorId: string;
  available: boolean;
  occupancyStatus: OccupancyStatus;
  reportingStatus: ReportingStatus;
  targets: Target[];
  boundary?: DetectionBoundary;
  timestamp: number;
  error?: string;
}

export class InovelliZhaAdapter {
  /**
   * Suffix lists for Inovelli and generic presence detection boundary entities.
   * Priority: Inovelli standard suffixes first, followed by generic mmWave suffixes.
   */
  public static readonly BOUNDARY_SUFFIXES = {
    minX: ['width_minimum_left', 'min_x', 'x_min', 'boundary_min_x', 'zone1_x_min'],
    maxX: ['width_maximum_right', 'max_x', 'x_max', 'boundary_max_x', 'zone1_x_max'],
    minY: ['depth_minimum_near', 'min_y', 'y_min', 'boundary_min_y', 'zone1_y_min'],
    maxY: ['depth_maximum_far', 'max_y', 'y_max', 'boundary_max_y', 'zone1_y_max'],
    minZ: ['height_minimum_floor', 'min_z', 'z_min', 'boundary_min_z'],
    maxZ: ['height_maximum_ceiling', 'max_z', 'z_max', 'boundary_max_z'],
  };

  /**
   * Returns all entity IDs that could affect this sensor (targets, occupancy, reporting, and all boundary entities).
   */
  public static getMonitoredEntityIds(sensor: SensorConfig): string[] {
    const ids = new Set<string>();

    if (sensor.targets_entity) ids.add(sensor.targets_entity);
    if (sensor.occupancy_entity) ids.add(sensor.occupancy_entity);
    if (sensor.reporting_entity) ids.add(sensor.reporting_entity);

    // Explicit boundary overrides
    if (sensor.boundary_min_x_entity) ids.add(sensor.boundary_min_x_entity);
    if (sensor.boundary_max_x_entity) ids.add(sensor.boundary_max_x_entity);
    if (sensor.boundary_min_y_entity) ids.add(sensor.boundary_min_y_entity);
    if (sensor.boundary_max_y_entity) ids.add(sensor.boundary_max_y_entity);
    if (sensor.boundary_min_z_entity) ids.add(sensor.boundary_min_z_entity);
    if (sensor.boundary_max_z_entity) ids.add(sensor.boundary_max_z_entity);

    // Prefix-discovered boundary entities
    if (sensor.boundary_prefix) {
      const prefix = sensor.boundary_prefix;
      const allSuffixes = [
        ...this.BOUNDARY_SUFFIXES.minX,
        ...this.BOUNDARY_SUFFIXES.maxX,
        ...this.BOUNDARY_SUFFIXES.minY,
        ...this.BOUNDARY_SUFFIXES.maxY,
        ...this.BOUNDARY_SUFFIXES.minZ,
        ...this.BOUNDARY_SUFFIXES.maxZ,
      ];
      for (const suffix of allSuffixes) {
        ids.add(`${prefix}${suffix}`);
      }
    }

    return Array.from(ids);
  }

  /**
   * Safely parses target items from various attribute formats (Array, JSON string, or malformed).
   */
  public static extractRawTargets(attrValue: unknown): RawTargetData[] {
    if (!attrValue) {
      return [];
    }

    let parsed = attrValue;
    if (typeof attrValue === 'string') {
      const trimmed = attrValue.trim();
      if (!trimmed || trimmed === 'none' || trimmed === 'unavailable' || trimmed === 'unknown') {
        return [];
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [];
      }
    }

    let items: unknown[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      items = [parsed];
    } else {
      return [];
    }

    const validTargets: RawTargetData[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;

      const record = item as Record<string, unknown>;
      const numX = Number(record.x);
      const numY = Number(record.y);

      if (!Number.isFinite(numX) || !Number.isFinite(numY)) {
        continue;
      }

      const rawId = record.target_id !== undefined ? (record.target_id as string | number) : i + 1;
      const numZ = Number.isFinite(Number(record.z)) ? Number(record.z) : undefined;
      const dop = Number.isFinite(Number(record.dop)) ? Number(record.dop) : undefined;

      validTargets.push({
        x: numX,
        y: numY,
        z: numZ,
        dop,
        target_id: rawId,
        timestamp: record.timestamp as number | string | undefined,
      });
    }

    return validTargets;
  }

  /**
   * Resolves entity timestamp in milliseconds.
   * Prioritizes explicit target timestamp, then entity last_target_update, fallback to last_updated or now.
   */
  public static resolveTimestamp(
    rawTarget: RawTargetData,
    entityState: HassEntity | undefined,
    fallbackNow: number
  ): number {
    if (rawTarget.timestamp) {
      const ts =
        typeof rawTarget.timestamp === 'string'
          ? Date.parse(rawTarget.timestamp)
          : Number(rawTarget.timestamp);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }

    if (entityState?.attributes?.last_target_update) {
      const ts = Date.parse(String(entityState.attributes.last_target_update));
      if (Number.isFinite(ts) && ts > 0) return ts;
    }

    if (entityState?.last_updated) {
      const ts = Date.parse(entityState.last_updated);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }

    return fallbackNow;
  }

  /**
   * Reads a numeric value from an entity ID if present, valid, and not unavailable.
   */
  private static readEntityNumber(
    entityId: string | undefined,
    hass: HomeAssistant
  ): number | undefined {
    if (!entityId) return undefined;
    const stateObj = hass.states[entityId];
    if (stateObj && stateObj.state && !['unavailable', 'unknown'].includes(stateObj.state)) {
      const val = parseFloat(stateObj.state);
      if (Number.isFinite(val)) return val;
    }
    return undefined;
  }

  /**
   * Extracts detection boundaries with explicit override precedence over prefix discovery.
   * Requires all 4 valid x/y bounds. Rejects reversed ranges.
   */
  public static extractBoundary(
    sensor: SensorConfig,
    hass: HomeAssistant
  ): DetectionBoundary | undefined {
    const resolveBound = (
      explicitEntity: string | undefined,
      suffixes: string[]
    ): number | undefined => {
      // 1. Explicit override takes precedence
      if (explicitEntity) {
        const val = this.readEntityNumber(explicitEntity, hass);
        if (val !== undefined) return val;
      }

      // 2. Prefix discovery
      if (sensor.boundary_prefix) {
        const prefix = sensor.boundary_prefix;
        for (const suffix of suffixes) {
          const val = this.readEntityNumber(`${prefix}${suffix}`, hass);
          if (val !== undefined) return val;
        }
      }

      return undefined;
    };

    const minX = resolveBound(sensor.boundary_min_x_entity, this.BOUNDARY_SUFFIXES.minX);
    const maxX = resolveBound(sensor.boundary_max_x_entity, this.BOUNDARY_SUFFIXES.maxX);
    const minY = resolveBound(sensor.boundary_min_y_entity, this.BOUNDARY_SUFFIXES.minY);
    const maxY = resolveBound(sensor.boundary_max_y_entity, this.BOUNDARY_SUFFIXES.maxY);

    // Require all 4 x/y boundaries
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) {
      return undefined;
    }

    const minZ = resolveBound(sensor.boundary_min_z_entity, this.BOUNDARY_SUFFIXES.minZ);
    const maxZ = resolveBound(sensor.boundary_max_z_entity, this.BOUNDARY_SUFFIXES.maxZ);

    const boundary: DetectionBoundary = {
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      sourceUnits: sensor.source_units ?? 'cm',
    };

    if (!isValidBoundary(boundary)) {
      return undefined;
    }

    return boundary;
  }

  /**
   * Parses occupancy sensor state into 'occupied', 'clear', or 'unknown'.
   */
  public static parseOccupancy(sensor: SensorConfig, hass: HomeAssistant): OccupancyStatus {
    if (!sensor.occupancy_entity) {
      return 'unknown';
    }
    const occState = hass.states[sensor.occupancy_entity];
    if (!occState || ['unavailable', 'unknown'].includes(occState.state)) {
      return 'unknown';
    }
    if (occState.state === 'on') {
      return 'occupied';
    }
    if (occState.state === 'off') {
      return 'clear';
    }
    return 'unknown';
  }

  /**
   * Parses reporting switch state into 'enabled', 'disabled', or 'unknown'.
   */
  public static parseReporting(sensor: SensorConfig, hass: HomeAssistant): ReportingStatus {
    if (!sensor.reporting_entity) {
      return 'enabled';
    }
    const repState = hass.states[sensor.reporting_entity];
    if (!repState || ['unavailable', 'unknown'].includes(repState.state)) {
      return 'unknown';
    }
    if (repState.state === 'on') {
      return 'enabled';
    }
    if (repState.state === 'off') {
      return 'disabled';
    }
    return 'unknown';
  }

  /**
   * Main parsing method for a configured sensor against Home Assistant state.
   */
  public static parseSensor(
    sensor: SensorConfig,
    hass: HomeAssistant,
    now: number
  ): SensorParseResult {
    const targetEntityId = sensor.targets_entity;
    const targetState = hass.states[targetEntityId];

    const occupancyStatus = this.parseOccupancy(sensor, hass);
    const reportingStatus = this.parseReporting(sensor, hass);
    const boundary = this.extractBoundary(sensor, hass);

    if (!targetState || ['unavailable', 'unknown'].includes(targetState.state)) {
      return {
        sensorId: sensor.id,
        available: false,
        occupancyStatus,
        reportingStatus,
        targets: [],
        boundary,
        timestamp: now,
        error: `Entity ${targetEntityId || 'unconfigured'} is unavailable or not found`,
      };
    }

    // Only clear targets if occupancy is explicitly clear ('off') or reporting is explicitly disabled ('off').
    // Unknown occupancy or unknown reporting MUST NOT erase valid fresh coordinates!
    if (occupancyStatus === 'clear' || reportingStatus === 'disabled') {
      return {
        sensorId: sensor.id,
        available: true,
        occupancyStatus,
        reportingStatus,
        targets: [],
        boundary,
        timestamp: now,
      };
    }

    const attrName = sensor.targets_attribute || 'targets';
    const rawAttr = targetState.attributes ? targetState.attributes[attrName] : undefined;
    const rawTargets = this.extractRawTargets(rawAttr);

    const transformParams = {
      position: sensor.position,
      rotation: sensor.rotation,
      mirrorX: sensor.mirror_x,
      mirrorY: sensor.mirror_y,
      sourceUnits: sensor.source_units ?? 'cm',
    };

    const targets: Target[] = rawTargets.map(raw => {
      const { worldX, worldY, localX, localY } = transformToWorld(raw.x, raw.y, transformParams);
      const ts = this.resolveTimestamp(raw, targetState, now);
      const scopedId = `${sensor.id}:${raw.target_id}`;

      // Evaluate inside/outside boundary status in sensor's source coordinate system and units
      const boundaryStatus = evaluateBoundaryContainment(
        { x: raw.x, y: raw.y, z: raw.z },
        boundary
      );

      return {
        scopedId,
        sensorId: sensor.id,
        sensorColor: sensor.color || '#03a9f4',
        rawTargetId: raw.target_id,
        sourceX: raw.x,
        sourceY: raw.y,
        sourceZ: raw.z,
        x: localX,
        y: localY,
        z:
          raw.z !== undefined
            ? transformParams.sourceUnits === 'cm'
              ? raw.z / 100
              : raw.z
            : undefined,
        worldX,
        worldY,
        dop: raw.dop,
        timestamp: ts,
        isStale: false,
        boundaryStatus,
      };
    });

    return {
      sensorId: sensor.id,
      available: true,
      occupancyStatus,
      reportingStatus,
      targets,
      boundary,
      timestamp: now,
    };
  }
}
