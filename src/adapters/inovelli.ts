import {
  SensorConfig,
  HomeAssistant,
  HassEntity,
  Target,
  RawTargetData,
  DetectionBoundary,
} from '../types';
import { transformToWorld } from '../coords';

export interface SensorParseResult {
  sensorId: string;
  available: boolean;
  occupancy: boolean | null; // null if not configured
  reportingEnabled: boolean;
  targets: Target[];
  boundary?: DetectionBoundary;
  timestamp: number;
  error?: string;
}

export class InovelliZhaAdapter {
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
   * Prioritizes explicit target timestamp, then entity last_updated, fallback to current time.
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
   * Reads optional detection boundaries from number entities matching boundary_prefix or entity attributes.
   */
  public static extractBoundary(
    sensor: SensorConfig,
    hass: HomeAssistant
  ): DetectionBoundary | undefined {
    if (!sensor.boundary_prefix) {
      return undefined;
    }

    const prefix = sensor.boundary_prefix;
    const findNumber = (...suffixes: string[]): number | undefined => {
      for (const suffix of suffixes) {
        const entityId = `${prefix}${suffix}`;
        const stateObj = hass.states[entityId];
        if (stateObj && stateObj.state && !['unavailable', 'unknown'].includes(stateObj.state)) {
          const val = parseFloat(stateObj.state);
          if (Number.isFinite(val)) return val;
        }
      }
      return undefined;
    };

    const minX = findNumber('x_min', 'min_x', 'boundary_min_x', 'zone1_x_min');
    const maxX = findNumber('x_max', 'max_x', 'boundary_max_x', 'zone1_x_max');
    const minY = findNumber('y_min', 'min_y', 'boundary_min_y', 'zone1_y_min');
    const maxY = findNumber('y_max', 'max_y', 'boundary_max_y', 'zone1_y_max');

    if (minX !== undefined || maxX !== undefined || minY !== undefined || maxY !== undefined) {
      return { minX, maxX, minY, maxY };
    }

    return undefined;
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

    if (!targetState || ['unavailable', 'unknown'].includes(targetState.state)) {
      return {
        sensorId: sensor.id,
        available: false,
        occupancy: null,
        reportingEnabled: true,
        targets: [],
        timestamp: now,
        error: `Entity ${targetEntityId || 'unconfigured'} is unavailable or not found`,
      };
    }

    // Check reporting switch if configured
    let reportingEnabled = true;
    if (sensor.reporting_entity) {
      const reportingState = hass.states[sensor.reporting_entity];
      if (reportingState && reportingState.state === 'off') {
        reportingEnabled = false;
      }
    }

    // Check occupancy binary sensor if configured
    let occupancy: boolean | null = null;
    if (sensor.occupancy_entity) {
      const occState = hass.states[sensor.occupancy_entity];
      if (occState) {
        occupancy = occState.state === 'on';
      }
    }

    // Extract boundaries
    const boundary = this.extractBoundary(sensor, hass);

    // If reporting is disabled or occupancy is explicitly cleared (false), return no active targets
    if (!reportingEnabled || occupancy === false) {
      return {
        sensorId: sensor.id,
        available: true,
        occupancy,
        reportingEnabled,
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

      return {
        scopedId,
        sensorId: sensor.id,
        sensorColor: sensor.color || '#03a9f4',
        rawTargetId: raw.target_id,
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
      };
    });

    return {
      sensorId: sensor.id,
      available: true,
      occupancy,
      reportingEnabled,
      targets,
      boundary,
      timestamp: now,
    };
  }
}
