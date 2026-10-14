import {
  SensorConfig,
  HomeAssistant,
  HassEntity,
  Target,
  RawTargetData,
  TrailPoint,
  DetectionBoundary,
  OccupancyStatus,
  ReportingStatus,
} from '../types';
import { transformToWorld, isValidBoundary, evaluateBoundaryContainment } from '../coords';

export interface TrailValidationResult {
  status: 'none' | 'compatible' | 'empty' | 'unsupported' | 'unavailable';
  message: string;
  pointCount?: number;
}

export interface TargetsValidationResult {
  status: 'compatible' | 'empty' | 'unsupported' | 'unavailable';
  message: string;
  targetCount?: number;
}

export interface BoundaryDetailItem {
  key: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ';
  label: string;
  configuredEntity?: string;
  resolvedEntity?: string;
  source: 'explicit' | 'prefix' | 'none';
  value?: number;
  unit?: string;
  status: 'valid' | 'missing' | 'unavailable' | 'invalid';
  error?: string;
}

export interface BoundaryResolutionResult {
  items: BoundaryDetailItem[];
  isCompleteXY: boolean;
  isValid: boolean;
  error?: string;
}

export interface SensorFeedbackItem {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface SensorParseResult {
  sensorId: string;
  available: boolean;
  occupancyStatus: OccupancyStatus;
  reportingStatus: ReportingStatus;
  targets: Target[];
  sourceTrail?: TrailPoint[];
  boundary?: DetectionBoundary;
  timestamp: number;
  lastReportTimestamp?: number;
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
   * Safely parses source-provided trail points (from sensor.trail_attribute).
   * Supports array of coordinate objects [{x, y}] or array of tuples [[x, y]], or JSON strings.
   * Treats points as ordered sequence without fabricating artificial timestamps.
   */
  public static extractRawTrail(
    attrValue: unknown,
    transformParams: {
      position?: { x: number; y: number };
      rotation?: number;
      mirrorX?: boolean;
      mirrorY?: boolean;
      sourceUnits: import('../types').UnitOfLength;
    },
    maxPoints = 50
  ): TrailPoint[] {
    if (!attrValue) return [];

    let parsed = attrValue;
    if (typeof attrValue === 'string') {
      const trimmed = attrValue.trim();
      if (!trimmed || ['none', 'unavailable', 'unknown'].includes(trimmed)) return [];
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) return [];

    const points: TrailPoint[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item) continue;

      let x: number | undefined;
      let y: number | undefined;

      if (Array.isArray(item) && item.length >= 2) {
        x = Number(item[0]);
        y = Number(item[1]);
      } else if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        x = Number(obj.x);
        y = Number(obj.y);
      }

      if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
        const { worldX, worldY } = transformToWorld(x, y, transformParams);
        points.push({
          worldX,
          worldY,
          sequence: points.length,
        });
      }
    }

    if (points.length > maxPoints) {
      return points.slice(points.length - maxPoints);
    }

    return points;
  }

  /**
   * Validates a candidate trail attribute on an entity against supported trail coordinate formats.
   * Reuses the exact parsing logic of extractRawTrail to ensure format consistency.
   */
  public static validateTrailAttribute(
    targetsEntityId: string | undefined,
    attributeName: string | undefined,
    hass: HomeAssistant | undefined
  ): TrailValidationResult {
    if (!attributeName || !attributeName.trim()) {
      return {
        status: 'none',
        message: 'None — collect trails in the card',
      };
    }

    const cleanAttr = attributeName.trim();

    if (!targetsEntityId || !hass?.states) {
      return {
        status: 'unavailable',
        message: 'Target entity is unavailable or not found',
      };
    }

    const stateObj = hass.states[targetsEntityId];
    if (!stateObj || ['unavailable', 'unknown'].includes(stateObj.state)) {
      return {
        status: 'unavailable',
        message: `Entity "${targetsEntityId}" is unavailable or not found`,
      };
    }

    if (!stateObj.attributes || !(cleanAttr in stateObj.attributes)) {
      return {
        status: 'unavailable',
        message: `Attribute "${cleanAttr}" not found on "${targetsEntityId}"`,
      };
    }

    const rawValue = stateObj.attributes[cleanAttr];
    if (rawValue === null || rawValue === undefined) {
      return {
        status: 'empty',
        message: `Attribute "${cleanAttr}" is empty`,
        pointCount: 0,
      };
    }

    let parsed = rawValue;
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (!trimmed || ['none', 'unavailable', 'unknown'].includes(trimmed)) {
        return {
          status: 'empty',
          message: `Attribute "${cleanAttr}" is empty (${trimmed || 'blank'})`,
          pointCount: 0,
        };
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          status: 'unsupported',
          message: `Attribute "${cleanAttr}" contains malformed JSON`,
        };
      }
    }

    if (!Array.isArray(parsed)) {
      return {
        status: 'unsupported',
        message: `Attribute "${cleanAttr}" must be an array of coordinates`,
      };
    }

    if (parsed.length === 0) {
      return {
        status: 'empty',
        message: 'Empty trail data (0 points)',
        pointCount: 0,
      };
    }

    let validCount = 0;
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item) continue;

      let x: number | undefined;
      let y: number | undefined;

      if (Array.isArray(item) && item.length >= 2) {
        x = Number(item[0]);
        y = Number(item[1]);
      } else if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        x = Number(obj.x);
        y = Number(obj.y);
      }

      if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
        validCount++;
      }
    }

    if (validCount > 0) {
      return {
        status: 'compatible',
        message: `Compatible trail data (${validCount} point${validCount === 1 ? '' : 's'} found)`,
        pointCount: validCount,
      };
    }

    return {
      status: 'unsupported',
      message: 'Unsupported trail data format (no valid coordinate points)',
      pointCount: 0,
    };
  }

  /**
   * Validates a candidate target coordinate attribute on an entity against supported target formats.
   * Distinguishes valid empty target data from missing or malformed data.
   */
  public static validateTargetsAttribute(
    targetsEntityId: string | undefined,
    attributeName: string | undefined,
    hass: HomeAssistant | undefined
  ): TargetsValidationResult {
    const attrName = attributeName && attributeName.trim() ? attributeName.trim() : 'targets';

    if (!targetsEntityId || !hass?.states) {
      return {
        status: 'unavailable',
        message: 'Targets entity is not configured or Home Assistant is unavailable',
      };
    }

    const stateObj = hass.states[targetsEntityId];
    if (!stateObj || ['unavailable', 'unknown'].includes(stateObj.state)) {
      return {
        status: 'unavailable',
        message: `Entity "${targetsEntityId}" is unavailable or not found`,
      };
    }

    if (!stateObj.attributes || !(attrName in stateObj.attributes)) {
      return {
        status: 'unavailable',
        message: `Attribute "${attrName}" not found on "${targetsEntityId}"`,
      };
    }

    const rawValue = stateObj.attributes[attrName];
    if (rawValue === null || rawValue === undefined) {
      return {
        status: 'empty',
        message: 'Valid target data with no current targets (room clear)',
        targetCount: 0,
      };
    }

    let parsed = rawValue;
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (!trimmed || ['none', 'unavailable', 'unknown'].includes(trimmed)) {
        return {
          status: 'empty',
          message: `Valid target data with no current targets (${trimmed || 'blank'})`,
          targetCount: 0,
        };
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          status: 'unsupported',
          message: `Attribute "${attrName}" contains malformed JSON`,
        };
      }
    }

    if (!Array.isArray(parsed) && (typeof parsed !== 'object' || parsed === null)) {
      return {
        status: 'unsupported',
        message: `Attribute "${attrName}" must be a JSON array or object`,
      };
    }

    if (Array.isArray(parsed) && parsed.length === 0) {
      return {
        status: 'empty',
        message: 'Valid target data with no current targets (room clear)',
        targetCount: 0,
      };
    }

    const extracted = this.extractRawTargets(rawValue);
    if (extracted.length > 0) {
      return {
        status: 'compatible',
        message: `Compatible target data: ${extracted.length} active target${extracted.length === 1 ? '' : 's'}`,
        targetCount: extracted.length,
      };
    }

    const count = Array.isArray(parsed) ? parsed.length : 1;
    if (count > 0) {
      return {
        status: 'unsupported',
        message: `Unsupported target format (${count} item${count === 1 ? '' : 's'} missing valid x/y numbers)`,
      };
    }

    return {
      status: 'empty',
      message: 'Valid target data with no current targets (room clear)',
      targetCount: 0,
    };
  }

  /**
   * Resolves detailed status and precedence of detection boundary entities.
   * Matches actual adapter behavior: explicit override first if valid number, then prefix fallback.
   */
  public static resolveBoundaryDetails(
    sensor: SensorConfig,
    hass: HomeAssistant | undefined
  ): BoundaryResolutionResult {
    const definitions: Array<{
      key: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ';
      label: string;
      explicitEntity?: string;
      suffixes: string[];
      isOptionalZ?: boolean;
    }> = [
      {
        key: 'minX',
        label: 'Width Min Left / X Min',
        explicitEntity: sensor.boundary_min_x_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minX,
      },
      {
        key: 'maxX',
        label: 'Width Max Right / X Max',
        explicitEntity: sensor.boundary_max_x_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxX,
      },
      {
        key: 'minY',
        label: 'Depth Min Near / Y Min',
        explicitEntity: sensor.boundary_min_y_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minY,
      },
      {
        key: 'maxY',
        label: 'Depth Max Far / Y Max',
        explicitEntity: sensor.boundary_max_y_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxY,
      },
      {
        key: 'minZ',
        label: 'Height Min Floor / Z Min',
        explicitEntity: sensor.boundary_min_z_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minZ,
        isOptionalZ: true,
      },
      {
        key: 'maxZ',
        label: 'Height Max Ceiling / Z Max',
        explicitEntity: sensor.boundary_max_z_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxZ,
        isOptionalZ: true,
      },
    ];

    const items: BoundaryDetailItem[] = [];

    for (const def of definitions) {
      let resolvedEntity: string | undefined = undefined;
      let source: 'explicit' | 'prefix' | 'none' = 'none';
      let value: number | undefined = undefined;
      let unit: string | undefined = undefined;
      let status: 'valid' | 'missing' | 'unavailable' | 'invalid' = 'missing';
      let error: string | undefined = undefined;

      // 1. Explicit override check
      if (def.explicitEntity) {
        resolvedEntity = def.explicitEntity;
        if (!hass?.states) {
          status = 'unavailable';
          error = 'Home Assistant state is unavailable';
        } else {
          const stateObj = hass.states[def.explicitEntity];
          if (!stateObj) {
            status = 'missing';
            error = `Entity "${def.explicitEntity}" not found in Home Assistant`;
          } else if (['unavailable', 'unknown'].includes(stateObj.state)) {
            status = 'unavailable';
            error = `Entity "${def.explicitEntity}" is ${stateObj.state}`;
          } else {
            const num = parseFloat(stateObj.state);
            if (Number.isFinite(num)) {
              value = num;
              source = 'explicit';
              status = 'valid';
              unit =
                (stateObj.attributes?.unit_of_measurement as string) || sensor.source_units || 'cm';
            } else {
              status = 'invalid';
              error = `Entity state "${stateObj.state}" is not a valid number`;
            }
          }
        }
      }

      // 2. Prefix fallback if explicit not resolved as valid
      if (status !== 'valid' && sensor.boundary_prefix && hass?.states) {
        const prefix = sensor.boundary_prefix;
        for (const suffix of def.suffixes) {
          const candidateId = `${prefix}${suffix}`;
          const stateObj = hass.states[candidateId];
          if (stateObj && !['unavailable', 'unknown'].includes(stateObj.state)) {
            const num = parseFloat(stateObj.state);
            if (Number.isFinite(num)) {
              resolvedEntity = candidateId;
              source = 'prefix';
              value = num;
              status = 'valid';
              error = undefined;
              unit =
                (stateObj.attributes?.unit_of_measurement as string) || sensor.source_units || 'cm';
              break;
            }
          }
        }
      }

      items.push({
        key: def.key,
        label: def.label,
        configuredEntity: def.explicitEntity,
        resolvedEntity,
        source,
        value,
        unit,
        status,
        error,
      });
    }

    const minXItem = items.find(i => i.key === 'minX');
    const maxXItem = items.find(i => i.key === 'maxX');
    const minYItem = items.find(i => i.key === 'minY');
    const maxYItem = items.find(i => i.key === 'maxY');
    const minZItem = items.find(i => i.key === 'minZ');
    const maxZItem = items.find(i => i.key === 'maxZ');

    const isCompleteXY = Boolean(
      minXItem?.status === 'valid' &&
      maxXItem?.status === 'valid' &&
      minYItem?.status === 'valid' &&
      maxYItem?.status === 'valid'
    );

    let isValid = false;
    let error: string | undefined = undefined;

    if (!isCompleteXY) {
      error =
        'All 4 X/Y limits (min X, max X, min Y, max Y) are required to form a detection boundary';
    } else {
      const minX = minXItem!.value!;
      const maxX = maxXItem!.value!;
      const minY = minYItem!.value!;
      const maxY = maxYItem!.value!;

      if (minX > maxX) {
        error = `Invalid X range: Min (${minX}) is greater than Max (${maxX})`;
      } else if (minY > maxY) {
        error = `Invalid Y range: Min (${minY}) is greater than Max (${maxY})`;
      } else if (
        minZItem?.value !== undefined &&
        maxZItem?.value !== undefined &&
        minZItem.value > maxZItem.value
      ) {
        error = `Invalid Z range: Min (${minZItem.value}) is greater than Max (${maxZItem.value})`;
      } else {
        isValid = true;
      }
    }

    return {
      items,
      isCompleteXY,
      isValid,
      error,
    };
  }

  /**
   * Compiles concise setup feedback items for a sensor based on current Home Assistant entity states.
   * Treats an empty room as a valid state without inferring hardware faults.
   */
  public static getSensorSetupFeedback(
    sensor: SensorConfig,
    hass: HomeAssistant | undefined
  ): SensorFeedbackItem[] {
    const items: SensorFeedbackItem[] = [];

    // 1. Targets entity & attribute validation
    if (!sensor.targets_entity || !sensor.targets_entity.trim()) {
      items.push({
        type: 'warning',
        message: 'Targets entity not selected (required for live radar detections)',
      });
    } else if (
      !hass?.states ||
      !hass.states[sensor.targets_entity] ||
      ['unavailable', 'unknown'].includes(hass.states[sensor.targets_entity].state)
    ) {
      items.push({
        type: 'warning',
        message: `Targets entity "${sensor.targets_entity}" is missing or unavailable`,
      });
    } else {
      const attrName = sensor.targets_attribute || 'targets';
      const targetValidation = this.validateTargetsAttribute(sensor.targets_entity, attrName, hass);
      if (targetValidation.status === 'compatible') {
        items.push({
          type: 'success',
          message: targetValidation.message,
        });
      } else if (targetValidation.status === 'empty') {
        items.push({
          type: 'info',
          message: targetValidation.message,
        });
      } else if (targetValidation.status === 'unsupported') {
        items.push({
          type: 'error',
          message: targetValidation.message,
        });
      } else {
        items.push({
          type: 'warning',
          message: targetValidation.message,
        });
      }
    }

    // 2. Reporting switch (if configured)
    if (sensor.reporting_entity) {
      const repState = hass?.states?.[sensor.reporting_entity];
      if (repState?.state === 'off') {
        items.push({
          type: 'info',
          message: `Target reporting switch "${sensor.reporting_entity}" is off (targets will be treated as last-known)`,
        });
      } else if (!repState || ['unavailable', 'unknown'].includes(repState.state)) {
        items.push({
          type: 'warning',
          message: `Reporting switch "${sensor.reporting_entity}" is unavailable`,
        });
      }
    }

    // 3. Occupancy binary sensor (if configured)
    if (sensor.occupancy_entity) {
      const occState = hass?.states?.[sensor.occupancy_entity];
      if (occState?.state === 'off') {
        items.push({
          type: 'info',
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is clear (off)`,
        });
      } else if (occState?.state === 'on') {
        items.push({
          type: 'success',
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is occupied (on)`,
        });
      } else if (!occState || ['unavailable', 'unknown'].includes(occState.state)) {
        items.push({
          type: 'warning',
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is unavailable`,
        });
      }
    }

    return items;
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

    let sourceTrail: TrailPoint[] | undefined = undefined;
    if (sensor.trail_attribute && targetState.attributes) {
      const rawTrailAttr = targetState.attributes[sensor.trail_attribute];
      sourceTrail = this.extractRawTrail(rawTrailAttr, transformParams);
    }

    const isClearOrDisabled = occupancyStatus === 'clear' || reportingStatus === 'disabled';

    const targets: Target[] = rawTargets.map(raw => {
      const { worldX, worldY, localX, localY } = transformToWorld(raw.x, raw.y, transformParams);
      const ts = this.resolveTimestamp(raw, targetState, now);
      const ageMs = Math.max(0, now - ts);
      const ageSeconds = Math.round(ageMs / 1000);
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
        ageSeconds,
        isStale: isClearOrDisabled,
        isLastKnown: isClearOrDisabled,
        isLive: !isClearOrDisabled,
        boundaryStatus,
      };
    });

    return {
      sensorId: sensor.id,
      available: true,
      occupancyStatus,
      reportingStatus,
      targets,
      sourceTrail,
      boundary,
      timestamp: now,
      lastReportTimestamp: targets.length > 0 ? targets[0].timestamp : undefined,
    };
  }
}
