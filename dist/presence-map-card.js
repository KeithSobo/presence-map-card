// src/config.ts
var DEFAULT_PALETTE = [
  "#03a9f4",
  // Light Blue
  "#4caf50",
  // Green
  "#ff9800",
  // Orange
  "#e91e63",
  // Pink
  "#9c27b0",
  // Purple
  "#00bcd4",
  // Cyan
  "#ffeb3b",
  // Yellow
  "#f44336"
  // Red
];
function validateConfig(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") {
    return {
      valid: false,
      errors: ["Configuration must be a valid object"],
      config: { type: "custom:presence-map-card", sensors: [] }
    };
  }
  const obj = raw;
  const displayUnits = obj.display_units === "imperial" ? "imperial" : "metric";
  const theme = obj.theme === "light" || obj.theme === "dark" ? obj.theme : "auto";
  const staleTimeout = typeof obj.stale_timeout === "number" && obj.stale_timeout > 0 ? obj.stale_timeout : 10;
  const rangeMeters = typeof obj.range_meters === "number" && obj.range_meters > 0 ? obj.range_meters : 6;
  const trailHistorySeconds = typeof obj.trail_history_seconds === "number" && obj.trail_history_seconds > 0 ? obj.trail_history_seconds : 10;
  const trailMaxPoints = typeof obj.trail_max_points === "number" && obj.trail_max_points > 0 ? Math.min(Math.round(obj.trail_max_points), 200) : 30;
  let floorplan = void 0;
  if (obj.floorplan && typeof obj.floorplan === "object") {
    const fp = obj.floorplan;
    if (typeof fp.image === "string" && fp.image.trim().length > 0) {
      const width = typeof fp.width_meters === "number" && fp.width_meters > 0 ? fp.width_meters : 10;
      const height = typeof fp.height_meters === "number" && fp.height_meters > 0 ? fp.height_meters : 8;
      floorplan = {
        image: fp.image.trim(),
        width_meters: width,
        height_meters: height
      };
    }
  }
  const demoMode = Boolean(obj.demo_mode);
  const rawSensors = Array.isArray(obj.sensors) ? obj.sensors : [];
  if (!demoMode && rawSensors.length === 0) {
    errors.push('At least one sensor should be configured in "sensors" or enable "demo_mode"');
  }
  const normalizedSensors = rawSensors.map((s, idx) => {
    const sensorObj = s && typeof s === "object" ? s : {};
    const id = typeof sensorObj.id === "string" && sensorObj.id.trim() ? sensorObj.id.trim() : `sensor_${idx + 1}`;
    const name = typeof sensorObj.name === "string" && sensorObj.name.trim() ? sensorObj.name.trim() : `Sensor ${idx + 1}`;
    const targetsEntity = typeof sensorObj.targets_entity === "string" ? sensorObj.targets_entity.trim() : "";
    const targetsAttribute = typeof sensorObj.targets_attribute === "string" && sensorObj.targets_attribute.trim() ? sensorObj.targets_attribute.trim() : "targets";
    const occupancyEntity = typeof sensorObj.occupancy_entity === "string" && sensorObj.occupancy_entity.trim() ? sensorObj.occupancy_entity.trim() : void 0;
    const reportingEntity = typeof sensorObj.reporting_entity === "string" && sensorObj.reporting_entity.trim() ? sensorObj.reporting_entity.trim() : void 0;
    const boundaryPrefix = typeof sensorObj.boundary_prefix === "string" && sensorObj.boundary_prefix.trim() ? sensorObj.boundary_prefix.trim() : void 0;
    const validUnits = ["mm", "cm", "m", "in", "ft"];
    const sourceUnits = typeof sensorObj.source_units === "string" && validUnits.includes(sensorObj.source_units) ? sensorObj.source_units : "cm";
    const pos = sensorObj.position && typeof sensorObj.position === "object" ? sensorObj.position : {};
    const posX = typeof pos.x === "number" ? pos.x : 0;
    const posY = typeof pos.y === "number" ? pos.y : 0;
    const rotation = typeof sensorObj.rotation === "number" ? sensorObj.rotation : 0;
    const mirrorX = Boolean(sensorObj.mirror_x);
    const mirrorY = Boolean(sensorObj.mirror_y);
    const color = typeof sensorObj.color === "string" && sensorObj.color.trim() ? sensorObj.color.trim() : DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
    const fov = typeof sensorObj.fov === "number" && sensorObj.fov > 0 && sensorObj.fov <= 360 ? sensorObj.fov : 120;
    const maxDistance = typeof sensorObj.max_distance === "number" && sensorObj.max_distance > 0 ? sensorObj.max_distance : rangeMeters;
    const boundaryMinXEntity = typeof sensorObj.boundary_min_x_entity === "string" && sensorObj.boundary_min_x_entity.trim() ? sensorObj.boundary_min_x_entity.trim() : void 0;
    const boundaryMaxXEntity = typeof sensorObj.boundary_max_x_entity === "string" && sensorObj.boundary_max_x_entity.trim() ? sensorObj.boundary_max_x_entity.trim() : void 0;
    const boundaryMinYEntity = typeof sensorObj.boundary_min_y_entity === "string" && sensorObj.boundary_min_y_entity.trim() ? sensorObj.boundary_min_y_entity.trim() : void 0;
    const boundaryMaxYEntity = typeof sensorObj.boundary_max_y_entity === "string" && sensorObj.boundary_max_y_entity.trim() ? sensorObj.boundary_max_y_entity.trim() : void 0;
    const boundaryMinZEntity = typeof sensorObj.boundary_min_z_entity === "string" && sensorObj.boundary_min_z_entity.trim() ? sensorObj.boundary_min_z_entity.trim() : void 0;
    const boundaryMaxZEntity = typeof sensorObj.boundary_max_z_entity === "string" && sensorObj.boundary_max_z_entity.trim() ? sensorObj.boundary_max_z_entity.trim() : void 0;
    const trailAttribute = typeof sensorObj.trail_attribute === "string" && sensorObj.trail_attribute.trim() ? sensorObj.trail_attribute.trim() : void 0;
    return {
      id,
      name,
      targets_entity: targetsEntity,
      targets_attribute: targetsAttribute,
      occupancy_entity: occupancyEntity,
      reporting_entity: reportingEntity,
      boundary_prefix: boundaryPrefix,
      boundary_min_x_entity: boundaryMinXEntity,
      boundary_max_x_entity: boundaryMaxXEntity,
      boundary_min_y_entity: boundaryMinYEntity,
      boundary_max_y_entity: boundaryMaxYEntity,
      boundary_min_z_entity: boundaryMinZEntity,
      boundary_max_z_entity: boundaryMaxZEntity,
      source_units: sourceUnits,
      position: { x: posX, y: posY },
      rotation,
      mirror_x: mirrorX,
      mirror_y: mirrorY,
      color,
      fov,
      max_distance: maxDistance,
      trail_attribute: trailAttribute
    };
  });
  const config = {
    type: typeof obj.type === "string" ? obj.type : "custom:presence-map-card",
    title: typeof obj.title === "string" ? obj.title : void 0,
    display_units: displayUnits,
    theme,
    stale_timeout: staleTimeout,
    range_meters: rangeMeters,
    show_rings: obj.show_rings !== false,
    show_trails: obj.show_trails !== false,
    show_labels: obj.show_labels !== false,
    show_coordinates: Boolean(obj.show_coordinates),
    show_boundaries: obj.show_boundaries !== false,
    show_last_known: obj.show_last_known !== false,
    trail_history_seconds: trailHistorySeconds,
    trail_max_points: trailMaxPoints,
    demo_mode: demoMode,
    floorplan,
    sensors: normalizedSensors
  };
  return {
    valid: errors.length === 0,
    errors,
    config
  };
}
function getStubConfig() {
  return {
    type: "custom:presence-map-card",
    title: "PresenceMap",
    display_units: "metric",
    theme: "auto",
    stale_timeout: 10,
    range_meters: 6,
    show_rings: true,
    show_trails: true,
    show_labels: true,
    show_boundaries: true,
    sensors: [
      {
        id: "sensor_1",
        name: "Presence Sensor",
        targets_entity: "sensor.mmwave_targets",
        occupancy_entity: "binary_sensor.mmwave_occupancy",
        source_units: "cm",
        color: "#03a9f4",
        fov: 120,
        position: { x: 0, y: 0 },
        rotation: 0,
        mirror_x: false,
        mirror_y: false
      }
    ]
  };
}

// src/config/version.ts
var PRESENCE_MAP_VERSION = "2026.10.1";

// src/coords/index.ts
var UNIT_TO_METERS = {
  mm: 1e-3,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048
};
function toMeters(val, unit = "cm") {
  const factor = UNIT_TO_METERS[unit] ?? 0.01;
  return val * factor;
}
function formatFeetInches(meters) {
  const totalInches = Math.round(meters / 0.0254);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (feet === 0) {
    return `${inches}"`;
  }
  if (inches === 0) {
    return `${feet}'`;
  }
  return `${feet}' ${inches}"`;
}
function formatDistance(meters, units) {
  if (units === "imperial") {
    return formatFeetInches(meters);
  }
  return `${meters.toFixed(1)} m`;
}
function transformToWorld(rawX, rawY, params) {
  const sourceUnits = params.sourceUnits ?? "cm";
  let lx = toMeters(rawX, sourceUnits);
  let ly = toMeters(rawY, sourceUnits);
  if (params.mirrorX) {
    lx = -lx;
  }
  if (params.mirrorY) {
    ly = -ly;
  }
  const deg = params.rotation ?? 0;
  const rad = deg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = lx * cos + ly * sin;
  const ry = -lx * sin + ly * cos;
  const posX = params.position?.x ?? 0;
  const posY = params.position?.y ?? 0;
  return {
    worldX: posX + rx,
    worldY: posY + ry,
    localX: lx,
    localY: ly
  };
}
function isValidBoundary(boundary) {
  if (!boundary) return false;
  const { minX, maxX, minY, maxY, minZ, maxZ } = boundary;
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return false;
  }
  if (minX > maxX || minY > maxY) {
    return false;
  }
  if (minZ !== void 0 && maxZ !== void 0) {
    if (!Number.isFinite(minZ) || !Number.isFinite(maxZ) || minZ > maxZ) {
      return false;
    }
  }
  return true;
}
function evaluateBoundaryContainment(targetLocal, boundary) {
  if (!isValidBoundary(boundary) || !boundary) {
    return "none";
  }
  const in2D = targetLocal.x >= boundary.minX && targetLocal.x <= boundary.maxX && targetLocal.y >= boundary.minY && targetLocal.y <= boundary.maxY;
  if (!in2D) {
    return "outside";
  }
  const hasHeightConfig = boundary.minZ !== void 0 || boundary.maxZ !== void 0;
  if (hasHeightConfig) {
    if (boundary.minZ === void 0 || boundary.maxZ === void 0 || targetLocal.z === void 0 || !Number.isFinite(targetLocal.z)) {
      return "unverified";
    }
    if (targetLocal.z >= boundary.minZ && targetLocal.z <= boundary.maxZ) {
      return "inside";
    }
    return "outside";
  }
  return "inside";
}
function transformBoundaryBox(boundary, params) {
  if (!isValidBoundary(boundary)) {
    return [];
  }
  const { minX, maxX, minY, maxY } = boundary;
  const localCorners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
  return localCorners.map((pt) => {
    const res = transformToWorld(pt.x, pt.y, params);
    return { x: res.worldX, y: res.worldY };
  });
}

// src/adapters/inovelli.ts
var InovelliZhaAdapter = class {
  /**
   * Returns all entity IDs that could affect this sensor (targets, occupancy, reporting, and all boundary entities).
   */
  static getMonitoredEntityIds(sensor) {
    const ids = /* @__PURE__ */ new Set();
    if (sensor.targets_entity) ids.add(sensor.targets_entity);
    if (sensor.occupancy_entity) ids.add(sensor.occupancy_entity);
    if (sensor.reporting_entity) ids.add(sensor.reporting_entity);
    if (sensor.boundary_min_x_entity) ids.add(sensor.boundary_min_x_entity);
    if (sensor.boundary_max_x_entity) ids.add(sensor.boundary_max_x_entity);
    if (sensor.boundary_min_y_entity) ids.add(sensor.boundary_min_y_entity);
    if (sensor.boundary_max_y_entity) ids.add(sensor.boundary_max_y_entity);
    if (sensor.boundary_min_z_entity) ids.add(sensor.boundary_min_z_entity);
    if (sensor.boundary_max_z_entity) ids.add(sensor.boundary_max_z_entity);
    if (sensor.boundary_prefix) {
      const prefix = sensor.boundary_prefix;
      const allSuffixes = [
        ...this.BOUNDARY_SUFFIXES.minX,
        ...this.BOUNDARY_SUFFIXES.maxX,
        ...this.BOUNDARY_SUFFIXES.minY,
        ...this.BOUNDARY_SUFFIXES.maxY,
        ...this.BOUNDARY_SUFFIXES.minZ,
        ...this.BOUNDARY_SUFFIXES.maxZ
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
  static extractRawTargets(attrValue) {
    if (!attrValue) {
      return [];
    }
    let parsed = attrValue;
    if (typeof attrValue === "string") {
      const trimmed = attrValue.trim();
      if (!trimmed || trimmed === "none" || trimmed === "unavailable" || trimmed === "unknown") {
        return [];
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [];
      }
    }
    let items = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      items = [parsed];
    } else {
      return [];
    }
    const validTargets = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== "object") continue;
      const record = item;
      const numX = Number(record.x);
      const numY = Number(record.y);
      if (!Number.isFinite(numX) || !Number.isFinite(numY)) {
        continue;
      }
      const rawId = record.target_id !== void 0 ? record.target_id : i + 1;
      const numZ = Number.isFinite(Number(record.z)) ? Number(record.z) : void 0;
      const dop = Number.isFinite(Number(record.dop)) ? Number(record.dop) : void 0;
      validTargets.push({
        x: numX,
        y: numY,
        z: numZ,
        dop,
        target_id: rawId,
        timestamp: record.timestamp
      });
    }
    return validTargets;
  }
  /**
   * Safely parses source-provided trail points (from sensor.trail_attribute).
   * Supports array of coordinate objects [{x, y}] or array of tuples [[x, y]], or JSON strings.
   * Treats points as ordered sequence without fabricating artificial timestamps.
   */
  static extractRawTrail(attrValue, transformParams, maxPoints = 50) {
    if (!attrValue) return [];
    let parsed = attrValue;
    if (typeof attrValue === "string") {
      const trimmed = attrValue.trim();
      if (!trimmed || ["none", "unavailable", "unknown"].includes(trimmed)) return [];
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    const points = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item) continue;
      let x;
      let y;
      if (Array.isArray(item) && item.length >= 2) {
        x = Number(item[0]);
        y = Number(item[1]);
      } else if (typeof item === "object") {
        const obj = item;
        x = Number(obj.x);
        y = Number(obj.y);
      }
      if (x !== void 0 && y !== void 0 && Number.isFinite(x) && Number.isFinite(y)) {
        const { worldX, worldY } = transformToWorld(x, y, transformParams);
        points.push({
          worldX,
          worldY,
          sequence: points.length
        });
      }
    }
    if (points.length > maxPoints) {
      return points.slice(points.length - maxPoints);
    }
    return points;
  }
  /**
   * Resolves entity timestamp in milliseconds.
   * Prioritizes explicit target timestamp, then entity last_target_update, fallback to last_updated or now.
   */
  static resolveTimestamp(rawTarget, entityState, fallbackNow) {
    if (rawTarget.timestamp) {
      const ts = typeof rawTarget.timestamp === "string" ? Date.parse(rawTarget.timestamp) : Number(rawTarget.timestamp);
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
  static readEntityNumber(entityId, hass) {
    if (!entityId) return void 0;
    const stateObj = hass.states[entityId];
    if (stateObj && stateObj.state && !["unavailable", "unknown"].includes(stateObj.state)) {
      const val = parseFloat(stateObj.state);
      if (Number.isFinite(val)) return val;
    }
    return void 0;
  }
  /**
   * Extracts detection boundaries with explicit override precedence over prefix discovery.
   * Requires all 4 valid x/y bounds. Rejects reversed ranges.
   */
  static extractBoundary(sensor, hass) {
    const resolveBound = (explicitEntity, suffixes) => {
      if (explicitEntity) {
        const val = this.readEntityNumber(explicitEntity, hass);
        if (val !== void 0) return val;
      }
      if (sensor.boundary_prefix) {
        const prefix = sensor.boundary_prefix;
        for (const suffix of suffixes) {
          const val = this.readEntityNumber(`${prefix}${suffix}`, hass);
          if (val !== void 0) return val;
        }
      }
      return void 0;
    };
    const minX = resolveBound(sensor.boundary_min_x_entity, this.BOUNDARY_SUFFIXES.minX);
    const maxX = resolveBound(sensor.boundary_max_x_entity, this.BOUNDARY_SUFFIXES.maxX);
    const minY = resolveBound(sensor.boundary_min_y_entity, this.BOUNDARY_SUFFIXES.minY);
    const maxY = resolveBound(sensor.boundary_max_y_entity, this.BOUNDARY_SUFFIXES.maxY);
    if (minX === void 0 || maxX === void 0 || minY === void 0 || maxY === void 0) {
      return void 0;
    }
    const minZ = resolveBound(sensor.boundary_min_z_entity, this.BOUNDARY_SUFFIXES.minZ);
    const maxZ = resolveBound(sensor.boundary_max_z_entity, this.BOUNDARY_SUFFIXES.maxZ);
    const boundary = {
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      sourceUnits: sensor.source_units ?? "cm"
    };
    if (!isValidBoundary(boundary)) {
      return void 0;
    }
    return boundary;
  }
  /**
   * Parses occupancy sensor state into 'occupied', 'clear', or 'unknown'.
   */
  static parseOccupancy(sensor, hass) {
    if (!sensor.occupancy_entity) {
      return "unknown";
    }
    const occState = hass.states[sensor.occupancy_entity];
    if (!occState || ["unavailable", "unknown"].includes(occState.state)) {
      return "unknown";
    }
    if (occState.state === "on") {
      return "occupied";
    }
    if (occState.state === "off") {
      return "clear";
    }
    return "unknown";
  }
  /**
   * Parses reporting switch state into 'enabled', 'disabled', or 'unknown'.
   */
  static parseReporting(sensor, hass) {
    if (!sensor.reporting_entity) {
      return "enabled";
    }
    const repState = hass.states[sensor.reporting_entity];
    if (!repState || ["unavailable", "unknown"].includes(repState.state)) {
      return "unknown";
    }
    if (repState.state === "on") {
      return "enabled";
    }
    if (repState.state === "off") {
      return "disabled";
    }
    return "unknown";
  }
  /**
   * Main parsing method for a configured sensor against Home Assistant state.
   */
  static parseSensor(sensor, hass, now) {
    const targetEntityId = sensor.targets_entity;
    const targetState = hass.states[targetEntityId];
    const occupancyStatus = this.parseOccupancy(sensor, hass);
    const reportingStatus = this.parseReporting(sensor, hass);
    const boundary = this.extractBoundary(sensor, hass);
    if (!targetState || ["unavailable", "unknown"].includes(targetState.state)) {
      return {
        sensorId: sensor.id,
        available: false,
        occupancyStatus,
        reportingStatus,
        targets: [],
        boundary,
        timestamp: now,
        error: `Entity ${targetEntityId || "unconfigured"} is unavailable or not found`
      };
    }
    const attrName = sensor.targets_attribute || "targets";
    const rawAttr = targetState.attributes ? targetState.attributes[attrName] : void 0;
    const rawTargets = this.extractRawTargets(rawAttr);
    const transformParams = {
      position: sensor.position,
      rotation: sensor.rotation,
      mirrorX: sensor.mirror_x,
      mirrorY: sensor.mirror_y,
      sourceUnits: sensor.source_units ?? "cm"
    };
    let sourceTrail = void 0;
    if (sensor.trail_attribute && targetState.attributes) {
      const rawTrailAttr = targetState.attributes[sensor.trail_attribute];
      sourceTrail = this.extractRawTrail(rawTrailAttr, transformParams);
    }
    const isClearOrDisabled = occupancyStatus === "clear" || reportingStatus === "disabled";
    const targets = rawTargets.map((raw) => {
      const { worldX, worldY, localX, localY } = transformToWorld(raw.x, raw.y, transformParams);
      const ts = this.resolveTimestamp(raw, targetState, now);
      const ageMs = Math.max(0, now - ts);
      const ageSeconds = Math.round(ageMs / 1e3);
      const scopedId = `${sensor.id}:${raw.target_id}`;
      const boundaryStatus = evaluateBoundaryContainment(
        { x: raw.x, y: raw.y, z: raw.z },
        boundary
      );
      return {
        scopedId,
        sensorId: sensor.id,
        sensorColor: sensor.color || "#03a9f4",
        rawTargetId: raw.target_id,
        sourceX: raw.x,
        sourceY: raw.y,
        sourceZ: raw.z,
        x: localX,
        y: localY,
        z: raw.z !== void 0 ? transformParams.sourceUnits === "cm" ? raw.z / 100 : raw.z : void 0,
        worldX,
        worldY,
        dop: raw.dop,
        timestamp: ts,
        ageSeconds,
        isStale: isClearOrDisabled,
        isLastKnown: isClearOrDisabled,
        isLive: !isClearOrDisabled,
        boundaryStatus
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
      lastReportTimestamp: targets.length > 0 ? targets[0].timestamp : void 0
    };
  }
};
/**
 * Suffix lists for Inovelli and generic presence detection boundary entities.
 * Priority: Inovelli standard suffixes first, followed by generic mmWave suffixes.
 */
InovelliZhaAdapter.BOUNDARY_SUFFIXES = {
  minX: ["width_minimum_left", "min_x", "x_min", "boundary_min_x", "zone1_x_min"],
  maxX: ["width_maximum_right", "max_x", "x_max", "boundary_max_x", "zone1_x_max"],
  minY: ["depth_minimum_near", "min_y", "y_min", "boundary_min_y", "zone1_y_min"],
  maxY: ["depth_maximum_far", "max_y", "y_max", "boundary_max_y", "zone1_y_max"],
  minZ: ["height_minimum_floor", "min_z", "z_min", "boundary_min_z"],
  maxZ: ["height_maximum_ceiling", "max_z", "z_max", "boundary_max_z"]
};

// src/freshness/index.ts
var TargetFreshnessManager = class {
  constructor(options = {}) {
    this.sensorSnapshots = /* @__PURE__ */ new Map();
    this.frontendTrails = /* @__PURE__ */ new Map();
    this.sourceTrails = /* @__PURE__ */ new Map();
    this.options = {
      staleTimeoutSeconds: options.staleTimeoutSeconds ?? 10,
      trailHistorySeconds: options.trailHistorySeconds ?? 10,
      trailMaxPoints: options.trailMaxPoints ?? 30,
      showLastKnown: options.showLastKnown !== false
    };
  }
  updateOptions(options) {
    if (options.staleTimeoutSeconds !== void 0) {
      this.options.staleTimeoutSeconds = options.staleTimeoutSeconds;
    }
    if (options.trailHistorySeconds !== void 0) {
      this.options.trailHistorySeconds = options.trailHistorySeconds;
    }
    if (options.trailMaxPoints !== void 0) {
      this.options.trailMaxPoints = options.trailMaxPoints;
    }
    if (options.showLastKnown !== void 0) {
      this.options.showLastKnown = options.showLastKnown;
    }
  }
  /**
   * Updates state for an individual sensor.
   * - A non-empty target snapshot replaces that sensor's previous snapshot without unbounded accumulation.
   * - If occupancy is clear or reporting disabled, incoming/existing targets are kept as last-known positions,
   *   ending live status immediately.
   * - If a sensor reports 0 targets but has a previous snapshot, the last-known snapshot is preserved.
   */
  updateSensor(sensorId, targets, occupancyStatus, reportingStatus, now, sourceTrail) {
    const staleMs = this.options.staleTimeoutSeconds * 1e3;
    const isClearOrDisabled = occupancyStatus === "clear" || reportingStatus === "disabled";
    if (sourceTrail && sourceTrail.length > 0) {
      this.sourceTrails.set(sensorId, sourceTrail);
    }
    if (targets.length > 0) {
      const processed = targets.map((t) => {
        const ageMs = Math.max(0, now - t.timestamp);
        const ageSeconds = Math.round(ageMs / 1e3);
        const isStale = isClearOrDisabled || ageMs > staleMs;
        const targetWithMeta = {
          ...t,
          ageSeconds,
          isStale,
          isLastKnown: isClearOrDisabled || isStale,
          isLive: !isClearOrDisabled && !isStale
        };
        if (targetWithMeta.isLive && (!sourceTrail || sourceTrail.length === 0)) {
          this.addFrontendTrailPoint(t.scopedId, t.worldX, t.worldY, t.timestamp);
        }
        return targetWithMeta;
      });
      this.sensorSnapshots.set(sensorId, processed);
    } else {
      const existing = this.sensorSnapshots.get(sensorId);
      if (existing && existing.length > 0) {
        const updated = existing.map((t) => {
          const ageMs = Math.max(0, now - t.timestamp);
          return {
            ...t,
            ageSeconds: Math.round(ageMs / 1e3),
            isStale: true,
            isLastKnown: true,
            isLive: false
          };
        });
        this.sensorSnapshots.set(sensorId, updated);
      }
    }
    this.prune(now);
  }
  /**
   * Backward-compatible update method grouping targets by sensor.
   */
  update(incomingTargets, now, clearedSensorIds = []) {
    const bySensor = /* @__PURE__ */ new Map();
    for (const t of incomingTargets) {
      let list = bySensor.get(t.sensorId);
      if (!list) {
        list = [];
        bySensor.set(t.sensorId, list);
      }
      list.push(t);
    }
    const clearedSet = new Set(clearedSensorIds);
    for (const [sensorId, targets] of bySensor.entries()) {
      const isCleared = clearedSet.has(sensorId);
      this.updateSensor(sensorId, targets, isCleared ? "clear" : "occupied", "enabled", now);
    }
    for (const clearedId of clearedSensorIds) {
      if (!bySensor.has(clearedId)) {
        this.updateSensor(clearedId, [], "clear", "enabled", now);
      }
    }
  }
  addFrontendTrailPoint(scopedId, worldX, worldY, timestamp) {
    let list = this.frontendTrails.get(scopedId);
    if (!list) {
      list = [];
      this.frontendTrails.set(scopedId, list);
    }
    const last = list[list.length - 1];
    if (last) {
      const dist = Math.hypot(worldX - last.worldX, worldY - last.worldY);
      if (dist < 0.02 && last.timestamp !== void 0 && timestamp - last.timestamp < 1e3) {
        return;
      }
    }
    list.push({ worldX, worldY, timestamp });
    if (list.length > this.options.trailMaxPoints) {
      list.splice(0, list.length - this.options.trailMaxPoints);
    }
  }
  /**
   * Prunes stale targets and expires frontend trails.
   * Retained / last-known positions are NEVER deleted just because time elapsed.
   */
  prune(now) {
    const staleMs = this.options.staleTimeoutSeconds * 1e3;
    const trailCutoff = now - this.options.trailHistorySeconds * 1e3;
    for (const list of this.sensorSnapshots.values()) {
      for (const t of list) {
        const ageMs = Math.max(0, now - t.timestamp);
        t.ageSeconds = Math.round(ageMs / 1e3);
        if (ageMs > staleMs) {
          t.isStale = true;
          t.isLive = false;
          t.isLastKnown = true;
        }
      }
    }
    for (const [scopedId, trailList] of this.frontendTrails.entries()) {
      const validPoints = trailList.filter(
        (pt) => pt.timestamp !== void 0 && pt.timestamp >= trailCutoff
      );
      if (validPoints.length === 0) {
        this.frontendTrails.delete(scopedId);
      } else {
        this.frontendTrails.set(scopedId, validPoints);
      }
    }
  }
  /**
   * Returns targets to display according to show_last_known option.
   */
  getAllTargets() {
    const showLastKnown = this.options.showLastKnown !== false;
    const result = [];
    for (const list of this.sensorSnapshots.values()) {
      for (const t of list) {
        if (t.isLive) {
          result.push(t);
        } else if (showLastKnown) {
          result.push(t);
        }
      }
    }
    return result;
  }
  getActiveTargets() {
    return this.getAllTargets();
  }
  getTrails() {
    return this.frontendTrails;
  }
  getFrontendTrails() {
    return this.frontendTrails;
  }
  getSourceTrails() {
    return this.sourceTrails;
  }
  clear() {
    this.sensorSnapshots.clear();
    this.frontendTrails.clear();
    this.sourceTrails.clear();
  }
};

// src/rendering/index.ts
function formatAgeString(ageSeconds) {
  if (ageSeconds === void 0 || ageSeconds < 0) return "";
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}
function renderSvg(ctx) {
  const { config, targets, trails, boundaries, isDark, demoMode } = ctx;
  const isFloorplan = Boolean(config.floorplan?.image);
  const units = config.display_units || "metric";
  const width = 800;
  const height = isFloorplan ? 600 : 700;
  const bgColor = isDark ? "#111827" : "#f8fafc";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const secondaryTextColor = isDark ? "#94a3b8" : "#475569";
  const ringColor = isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.14)";
  const boundaryBorderColor = "#0284c7";
  const boundaryFillColor = isDark ? "rgba(2, 132, 199, 0.15)" : "rgba(2, 132, 199, 0.08)";
  let projectX;
  let projectY;
  let scalePxPerMeter;
  let originX = width / 2;
  let originY = height / 2;
  if (isFloorplan && config.floorplan) {
    const fpW = config.floorplan.width_meters || 10;
    const fpH = config.floorplan.height_meters || 8;
    const scaleX = width / fpW;
    const scaleY = height / fpH;
    scalePxPerMeter = Math.min(scaleX, scaleY);
    projectX = (wx) => wx * scaleX;
    projectY = (wy) => wy * scaleY;
  } else {
    const maxRange = config.range_meters || 6;
    const hasSingleForwardSensor = config.sensors?.length === 1 && (config.sensors[0].fov || 120) <= 180;
    originX = width / 2;
    originY = hasSingleForwardSensor ? height * 0.85 : height / 2;
    const availableRadius = hasSingleForwardSensor ? Math.min(width / 2.2, height * 0.75) : Math.min(width, height) / 2.2;
    scalePxPerMeter = availableRadius / maxRange;
    projectX = (wx) => originX + wx * scalePxPerMeter;
    projectY = (wy) => originY - wy * scalePxPerMeter;
  }
  const svgParts = [];
  svgParts.push(`
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="presence-map-svg" width="100%" height="100%">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2 2" />
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${bgColor}" rx="8" />
  `);
  if (isFloorplan && config.floorplan?.image) {
    svgParts.push(`
      <image href="${config.floorplan.image}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" opacity="${isDark ? "0.75" : "0.85"}" />
    `);
  } else {
    svgParts.push(`
      <rect width="${width}" height="${height}" fill="url(#radarGrid)" opacity="0.6" />
    `);
  }
  if (config.show_rings !== false && !isFloorplan) {
    const range = config.range_meters || 6;
    const ringStep = range <= 4 ? 1 : range <= 8 ? 2 : 3;
    svgParts.push(`
      <line x1="${originX - 15}" y1="${originY}" x2="${originX + 15}" y2="${originY}" stroke="${secondaryTextColor}" stroke-width="1.5" />
      <line x1="${originX}" y1="${originY - 15}" x2="${originX}" y2="${originY + 15}" stroke="${secondaryTextColor}" stroke-width="1.5" />
    `);
    for (let r = ringStep; r <= range; r += ringStep) {
      const radiusPx = r * scalePxPerMeter;
      const labelText = formatDistance(r, units);
      svgParts.push(`
        <circle cx="${originX}" cy="${originY}" r="${radiusPx}" fill="none" stroke="${ringColor}" stroke-width="1" stroke-dasharray="4 4" />
        <text x="${originX + 6}" y="${originY - radiusPx + 14}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, -apple-system, sans-serif" font-weight="600">${labelText}</text>
      `);
    }
  }
  const sensors = config.sensors || [];
  sensors.forEach((sensor) => {
    const sensorColor = sensor.color || "#0284c7";
    const sPosX = isFloorplan ? sensor.position?.x ?? 0 : 0;
    const sPosY = isFloorplan ? sensor.position?.y ?? 0 : 0;
    const px = projectX(sPosX);
    const py = projectY(sPosY);
    const fov = sensor.fov || 120;
    const sensorRange = sensor.max_distance || config.range_meters || 6;
    const radiusPx = sensorRange * scalePxPerMeter;
    const rotDeg = sensor.rotation || 0;
    if (fov < 360 && radiusPx > 0) {
      const halfFov = fov / 2;
      const startAngleDeg = rotDeg - halfFov;
      const endAngleDeg = rotDeg + halfFov;
      const toCanvasRad = (deg) => (deg - 90) * Math.PI / 180;
      const x1 = px + radiusPx * Math.cos(toCanvasRad(startAngleDeg));
      const y1 = py + radiusPx * Math.sin(toCanvasRad(startAngleDeg));
      const x2 = px + radiusPx * Math.cos(toCanvasRad(endAngleDeg));
      const y2 = py + radiusPx * Math.sin(toCanvasRad(endAngleDeg));
      const largeArc = fov > 180 ? 1 : 0;
      svgParts.push(`
        <path d="M ${px} ${py} L ${x1} ${y1} A ${radiusPx} ${radiusPx} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${sensorColor}" fill-opacity="${isDark ? "0.07" : "0.04"}"
              stroke="${sensorColor}" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="3 3" />
      `);
    }
    if (config.show_boundaries !== false) {
      const boundary = boundaries.get(sensor.id);
      if (boundary && isValidBoundary(boundary)) {
        const corners = transformBoundaryBox(boundary, {
          position: sensor.position,
          rotation: sensor.rotation,
          mirrorX: sensor.mirror_x,
          mirrorY: sensor.mirror_y,
          sourceUnits: sensor.source_units
        });
        if (corners.length === 4) {
          const pointsAttr = corners.map((pt) => `${projectX(pt.x)},${projectY(pt.y)}`).join(" ");
          svgParts.push(`
            <polygon points="${pointsAttr}" fill="${boundaryFillColor}" stroke="${boundaryBorderColor}" stroke-width="1.8" stroke-dasharray="4 3" />
            <text x="${projectX(corners[0].x) + 6}" y="${projectY(corners[0].y) - 6}" fill="${boundaryBorderColor}" font-size="10" font-family="system-ui, sans-serif" font-weight="600">Detection Zone</text>
          `);
        }
      }
    }
    const markerAngleRad = (rotDeg - 90) * Math.PI / 180;
    const markerSize = 10;
    const tipX = px + markerSize * 1.4 * Math.cos(markerAngleRad);
    const tipY = py + markerSize * 1.4 * Math.sin(markerAngleRad);
    const leftX = px + markerSize * Math.cos(markerAngleRad + 2.3);
    const leftY = py + markerSize * Math.sin(markerAngleRad + 2.3);
    const rightX = px + markerSize * Math.cos(markerAngleRad - 2.3);
    const rightY = py + markerSize * Math.sin(markerAngleRad - 2.3);
    svgParts.push(`
      <polygon points="${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}" fill="${sensorColor}" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="${px}" cy="${py}" r="3" fill="#ffffff" />
    `);
    if (config.show_labels !== false && sensor.name) {
      svgParts.push(`
        <text x="${px}" y="${py + 18}" text-anchor="middle" fill="${secondaryTextColor}" font-size="10" font-family="system-ui, sans-serif" font-weight="600">${sensor.name}</text>
      `);
    }
  });
  if (config.show_trails !== false) {
    if (ctx.sourceTrails) {
      for (const [sensorId, pointList] of ctx.sourceTrails.entries()) {
        const sensor = config.sensors?.find((s) => s.id === sensorId);
        const color = sensor?.color || "#0284c7";
        const total = pointList.length;
        for (let i = 0; i < total; i++) {
          const pt = pointList[i];
          const progress = total > 1 ? (i + 1) / total : 1;
          const opacity = (0.15 + progress * 0.55).toFixed(2);
          const r = (2.2 + progress * 1.4).toFixed(1);
          svgParts.push(`
            <circle class="source-trail-dot" cx="${projectX(pt.worldX)}" cy="${projectY(pt.worldY)}" r="${r}" fill="${color}" fill-opacity="${opacity}" />
          `);
        }
      }
    }
    for (const [scopedId, trailList] of trails.entries()) {
      if (trailList.length < 2) continue;
      const sensorId = scopedId.split(":")[0];
      if (ctx.sourceTrails && ctx.sourceTrails.has(sensorId)) {
        continue;
      }
      const target = targets.find((t) => t.scopedId === scopedId);
      const color = target ? target.sensorColor : "#0284c7";
      for (let i = 0; i < trailList.length - 1; i++) {
        const p1 = trailList[i];
        const p2 = trailList[i + 1];
        const progress = (i + 1) / trailList.length;
        const opacity = (progress * 0.6).toFixed(2);
        const strokeWidth = (progress * 3 + 1).toFixed(1);
        svgParts.push(`
          <line x1="${projectX(p1.worldX)}" y1="${projectY(p1.worldY)}"
                x2="${projectX(p2.worldX)}" y2="${projectY(p2.worldY)}"
                stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" stroke-linecap="round" />
        `);
      }
    }
  }
  for (const target of targets) {
    const tx = projectX(target.worldX);
    const ty = projectY(target.worldY);
    const isLastKnown = Boolean(target.isLastKnown);
    const isStale = Boolean(target.isStale || isLastKnown);
    const isLive = Boolean(target.isLive && !target.isStale && !isLastKnown);
    let dotFillColor = target.sensorColor || "#0284c7";
    let dotStrokeColor = "#ffffff";
    const strokeWidth = "2";
    let strokeDasharray = "none";
    if (target.boundaryStatus === "inside") {
      dotFillColor = "#10b981";
    } else if (target.boundaryStatus === "outside") {
      dotFillColor = "#f59e0b";
    } else if (target.boundaryStatus === "unverified") {
      dotFillColor = target.sensorColor || "#0284c7";
      dotStrokeColor = "#f59e0b";
      strokeDasharray = "3 2";
    }
    if (isLastKnown) {
      dotFillColor = isDark ? "rgba(75, 85, 99, 0.15)" : "rgba(156, 163, 175, 0.15)";
      dotStrokeColor = isDark ? "#9ca3af" : "#64748b";
      strokeDasharray = "3 3";
    } else if (isStale) {
      dotFillColor = isDark ? "#4b5563" : "#9ca3af";
      dotStrokeColor = isDark ? "#374151" : "#d1d5db";
      strokeDasharray = "2 2";
    }
    const fillOpacity = isLastKnown ? "0.35" : isStale ? "0.5" : "0.95";
    const targetClass = isLastKnown ? "target-last-known target-stale" : isStale ? "target-stale" : "target-live";
    svgParts.push(`
      <g class="presence-target ${targetClass}" data-target-id="${target.scopedId}">
        <!-- Pulse ring for active fresh targets -->
        ${isLive ? `<circle cx="${tx}" cy="${ty}" r="15" fill="${dotFillColor}" fill-opacity="0.25" filter="url(#glow)">
                 <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                 <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
               </circle>` : ""}

        <!-- Center Target Dot / Marker -->
        <circle cx="${tx}" cy="${ty}" r="7" fill="${dotFillColor}" fill-opacity="${fillOpacity}" stroke="${dotStrokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" />
    `);
    if (target.dop !== void 0 && Math.abs(target.dop) > 5 && isLive) {
      const isApproaching = target.dop > 0;
      const arrowLength = 12;
      const arrowDy = isApproaching ? arrowLength : -arrowLength;
      svgParts.push(`
        <path d="M ${tx} ${ty - arrowDy} L ${tx - 4} ${ty - arrowDy + (isApproaching ? -4 : 4)} M ${tx} ${ty - arrowDy} L ${tx + 4} ${ty - arrowDy + (isApproaching ? -4 : 4)}"
              stroke="${dotStrokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      `);
    }
    if (config.show_labels !== false) {
      let mainLabel = `T${target.rawTargetId}`;
      const ageStr = formatAgeString(target.ageSeconds);
      if (isLastKnown && ageStr) {
        mainLabel += ` (${ageStr})`;
      } else if (isStale && ageStr) {
        mainLabel += ` (stale ${ageStr})`;
      }
      const labelBadgeBg = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)";
      const labelBadgeText = textColor;
      const labelBadgeWidth = mainLabel.length * 7 + 10;
      svgParts.push(`
        <rect x="${tx + 9}" y="${ty - 16}" width="${labelBadgeWidth}" height="14" rx="3" fill="${labelBadgeBg}" stroke="${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}" stroke-width="0.5" />
        <text x="${tx + 13}" y="${ty - 5}" fill="${labelBadgeText}" font-size="9" font-family="system-ui, sans-serif" font-weight="700">${mainLabel}</text>
      `);
      if (config.show_coordinates) {
        let coordText = `x:${Math.round(target.sourceX)} y:${Math.round(target.sourceY)}`;
        if (target.sourceZ !== void 0) {
          coordText += ` z:${Math.round(target.sourceZ)}`;
        }
        const coordWidth = coordText.length * 6 + 8;
        svgParts.push(`
          <rect x="${tx + 9}" y="${ty + 1}" width="${coordWidth}" height="12" rx="2" fill="${labelBadgeBg}" />
          <text x="${tx + 13}" y="${ty + 10}" fill="${secondaryTextColor}" font-size="8" font-family="monospace">${coordText}</text>
        `);
      }
    }
    svgParts.push(`</g>`);
  }
  if (demoMode) {
    svgParts.push(`
      <g class="demo-badge">
        <rect x="${width - 190}" y="12" width="178" height="26" rx="13" fill="#f59e0b" fill-opacity="0.9" />
        <text x="${width - 101}" y="29" text-anchor="middle" fill="#ffffff" font-size="11" font-family="system-ui, sans-serif" font-weight="bold">
          DEMO (Simulated Data)
        </text>
      </g>
    `);
  }
  const liveCount = targets.filter((t) => t.isLive !== false && !t.isStale && !t.isLastKnown).length;
  let statusText;
  if (ctx.isSourceAvailable === false) {
    statusText = "SOURCE UNAVAILABLE \u2014 Waiting for entity";
  } else if (ctx.reportingStatus === "disabled") {
    statusText = targets.length > 0 ? "REPORTING DISABLED \u2014 showing last reported positions" : "REPORTING DISABLED";
  } else if (ctx.occupancyStatus === "clear") {
    statusText = targets.length > 0 ? "OCCUPANCY CLEAR \u2014 showing last reported positions" : "OCCUPANCY CLEAR";
  } else if (liveCount > 0) {
    statusText = `LIVE \u2014 ${liveCount} active target${liveCount === 1 ? "" : "s"}`;
    const retainedCount = targets.length - liveCount;
    if (retainedCount > 0) {
      statusText += ` (${retainedCount} last known)`;
    }
  } else if (targets.length > 0) {
    const maxAge = targets.reduce(
      (max, t) => t.ageSeconds !== void 0 && t.ageSeconds > max ? t.ageSeconds : max,
      0
    );
    const ageStr = formatAgeString(maxAge);
    statusText = ageStr ? `NO RECENT DATA \u2014 last report ${ageStr} ago` : "NO RECENT DATA \u2014 showing last reported positions";
  } else {
    statusText = "WAITING FOR TARGET DATA";
  }
  svgParts.push(`
    <g class="status-footer">
      <text x="14" y="${height - 12}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, sans-serif">
        ${statusText}
      </text>
    </g>
  `);
  svgParts.push(`</svg>`);
  return svgParts.join("");
}

// src/demo/index.ts
function createDemoTargets(now, stepIndex = 0) {
  const t = now / 1e3 + stepIndex * 0.5;
  const s1x = 1.2 * Math.sin(t * 0.8);
  const s1y = 2 + 1 * Math.cos(t * 0.5);
  const dop1 = Math.round(-Math.sin(t * 0.5) * 80);
  const s2x = 0.8 * Math.cos(t * 0.6);
  const s2y = 1.8 + 0.8 * Math.sin(t * 0.4);
  const dop2 = Math.round(Math.cos(t * 0.4) * 60);
  const targets = [
    {
      scopedId: "demo_sensor_1:1",
      sensorId: "demo_sensor_1",
      sensorColor: "#0284c7",
      rawTargetId: 1,
      sourceX: Math.round(s1x * 100),
      sourceY: Math.round(s1y * 100),
      x: s1x,
      y: s1y,
      worldX: s1x,
      worldY: s1y,
      dop: dop1,
      timestamp: now,
      isStale: false,
      boundaryStatus: "inside"
    },
    {
      scopedId: "demo_sensor_2:1",
      sensorId: "demo_sensor_2",
      sensorColor: "#10b981",
      rawTargetId: 1,
      sourceX: Math.round(s2x * 100),
      sourceY: Math.round(s2y * 100),
      x: s2x,
      y: s2y,
      // Transformed by sensor 2 placement (x: 2.5, y: 1.5, rot: 90)
      worldX: 2.5 + s2y,
      worldY: 1.5 - s2x,
      dop: dop2,
      timestamp: now,
      isStale: false,
      boundaryStatus: "inside"
    }
  ];
  return targets;
}

// src/editor/presence-map-editor.ts
var PresenceMapEditor = class extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this._ensureForm();
  }
  setConfig(config) {
    const isEcho = this._isConfigEqual(config, this._lastEmittedConfig);
    this._config = { ...config };
    this._ensureForm();
    if (isEcho) {
      return;
    }
    if (this._form) {
      const newFormData = this._configToFormData(this._config);
      if (!this._isFormDataEqual(this._form.data, newFormData)) {
        this._form.data = newFormData;
      }
    }
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) {
      this._form.hass = hass;
    }
  }
  _computeSchema() {
    return [
      { name: "title", label: "Title", selector: { text: {} } },
      {
        name: "display_units",
        label: "Display Units",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "metric", label: "Metric (Meters / Centimeters)" },
              { value: "imperial", label: "Imperial (Feet / Inches)" }
            ]
          }
        }
      },
      {
        name: "theme",
        label: "Theme Override",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "auto", label: "Automatic (HA Theme)" },
              { value: "light", label: "Force Light Mode" },
              { value: "dark", label: "Force Dark Mode" }
            ]
          }
        }
      },
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: "range_meters",
            label: "Radar Range (Meters)",
            selector: { number: { mode: "box", min: 1, max: 20 } }
          },
          {
            name: "stale_timeout",
            label: "Stale Timeout (Seconds)",
            selector: { number: { mode: "box", min: 1, max: 60 } }
          }
        ]
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_rings", label: "Show Distance Rings", selector: { boolean: {} } },
          { name: "show_trails", label: "Show Target Trails", selector: { boolean: {} } },
          { name: "show_labels", label: "Show Target Labels", selector: { boolean: {} } },
          { name: "show_coordinates", label: "Show X/Y Coordinates", selector: { boolean: {} } },
          { name: "show_boundaries", label: "Show Boundaries", selector: { boolean: {} } },
          {
            name: "show_last_known",
            label: "Show Last-Known Positions When Clear",
            selector: { boolean: {} }
          }
        ]
      },
      { name: "demo_mode", label: "Demo Mode (Simulated Data)", selector: { boolean: {} } },
      {
        name: "",
        type: "expandable",
        title: "Floor-Plan Settings",
        schema: [
          {
            name: "floorplan_image",
            label: "Image URL or Path (e.g. /local/floorplan.png)",
            selector: { text: {} }
          },
          {
            type: "grid",
            name: "",
            schema: [
              {
                name: "floorplan_width",
                label: "Width (Meters)",
                selector: { number: { mode: "box", min: 1, max: 100 } }
              },
              {
                name: "floorplan_height",
                label: "Height (Meters)",
                selector: { number: { mode: "box", min: 1, max: 100 } }
              }
            ]
          }
        ]
      },
      {
        name: "",
        type: "expandable",
        title: "Primary Sensor Configuration",
        schema: [
          {
            name: "sensor_name",
            label: "Sensor Display Name",
            selector: { text: {} }
          },
          {
            name: "sensor_targets_entity",
            label: "Targets Entity (Required)",
            selector: { entity: { domain: "sensor" } }
          },
          {
            name: "sensor_occupancy_entity",
            label: "Occupancy Binary Sensor (Optional)",
            selector: { entity: { domain: "binary_sensor" } }
          },
          {
            name: "sensor_reporting_entity",
            label: "Reporting Switch (Optional - Enables radar reporting)",
            selector: { entity: { domain: "switch" } }
          },
          {
            name: "sensor_boundary_prefix",
            label: "Boundary Entity Prefix (e.g. number.garage_lights_mmwave_)",
            selector: { text: {} }
          },
          {
            name: "sensor_trail_attribute",
            label: "Source Trail Attribute (e.g. trail)",
            selector: { text: {} }
          },
          {
            type: "grid",
            name: "",
            schema: [
              {
                name: "sensor_position_x",
                label: "Sensor Position X (Meters)",
                selector: { number: { mode: "box", step: 0.1 } }
              },
              {
                name: "sensor_position_y",
                label: "Sensor Position Y (Meters)",
                selector: { number: { mode: "box", step: 0.1 } }
              }
            ]
          },
          {
            type: "grid",
            name: "",
            schema: [
              {
                name: "sensor_source_units",
                label: "Sensor Source Units",
                selector: {
                  select: {
                    mode: "dropdown",
                    options: [
                      { value: "cm", label: "Centimeters (cm)" },
                      { value: "m", label: "Meters (m)" },
                      { value: "in", label: "Inches (in)" },
                      { value: "ft", label: "Feet (ft)" }
                    ]
                  }
                }
              },
              { name: "sensor_color", label: "Sensor Color", selector: { text: {} } }
            ]
          },
          {
            type: "grid",
            name: "",
            schema: [
              {
                name: "sensor_fov",
                label: "Illustrative Field of View (Degrees)",
                selector: { number: { mode: "box", min: 30, max: 360 } }
              },
              {
                name: "sensor_rotation",
                label: "Rotation Angle (Degrees)",
                selector: { number: { mode: "box", min: 0, max: 359 } }
              }
            ]
          },
          {
            type: "grid",
            name: "",
            schema: [
              {
                name: "sensor_mirror_x",
                label: "Mirror X (Horizontal)",
                selector: { boolean: {} }
              },
              { name: "sensor_mirror_y", label: "Mirror Y (Vertical)", selector: { boolean: {} } }
            ]
          }
        ]
      },
      {
        name: "",
        type: "expandable",
        title: "Explicit Boundary Overrides (Precedence over prefix)",
        schema: [
          {
            name: "sensor_boundary_min_x_entity",
            label: "Width Min Left / X Min",
            selector: { entity: { domain: "number" } }
          },
          {
            name: "sensor_boundary_max_x_entity",
            label: "Width Max Right / X Max",
            selector: { entity: { domain: "number" } }
          },
          {
            name: "sensor_boundary_min_y_entity",
            label: "Depth Min Near / Y Min",
            selector: { entity: { domain: "number" } }
          },
          {
            name: "sensor_boundary_max_y_entity",
            label: "Depth Max Far / Y Max",
            selector: { entity: { domain: "number" } }
          },
          {
            name: "sensor_boundary_min_z_entity",
            label: "Height Min Floor / Z Min (Optional)",
            selector: { entity: { domain: "number" } }
          },
          {
            name: "sensor_boundary_max_z_entity",
            label: "Height Max Ceiling / Z Max (Optional)",
            selector: { entity: { domain: "number" } }
          }
        ]
      }
    ];
  }
  _configToFormData(config) {
    const primarySensor = config.sensors && config.sensors[0] ? config.sensors[0] : void 0;
    return {
      title: config.title ?? "",
      display_units: config.display_units ?? "metric",
      theme: config.theme ?? "auto",
      range_meters: config.range_meters ?? 6,
      stale_timeout: config.stale_timeout ?? 10,
      show_rings: config.show_rings !== false,
      show_trails: config.show_trails !== false,
      show_labels: config.show_labels !== false,
      show_coordinates: Boolean(config.show_coordinates),
      show_boundaries: config.show_boundaries !== false,
      show_last_known: config.show_last_known !== false,
      demo_mode: Boolean(config.demo_mode),
      floorplan_image: config.floorplan?.image ?? "",
      floorplan_width: config.floorplan?.width_meters ?? 10,
      floorplan_height: config.floorplan?.height_meters ?? 8,
      sensor_name: primarySensor?.name ?? "",
      sensor_targets_entity: primarySensor?.targets_entity ?? "",
      sensor_occupancy_entity: primarySensor?.occupancy_entity ?? "",
      sensor_reporting_entity: primarySensor?.reporting_entity ?? "",
      sensor_boundary_prefix: primarySensor?.boundary_prefix ?? "",
      sensor_trail_attribute: primarySensor?.trail_attribute ?? "",
      sensor_position_x: primarySensor?.position?.x ?? 0,
      sensor_position_y: primarySensor?.position?.y ?? 0,
      sensor_boundary_min_x_entity: primarySensor?.boundary_min_x_entity ?? "",
      sensor_boundary_max_x_entity: primarySensor?.boundary_max_x_entity ?? "",
      sensor_boundary_min_y_entity: primarySensor?.boundary_min_y_entity ?? "",
      sensor_boundary_max_y_entity: primarySensor?.boundary_max_y_entity ?? "",
      sensor_boundary_min_z_entity: primarySensor?.boundary_min_z_entity ?? "",
      sensor_boundary_max_z_entity: primarySensor?.boundary_max_z_entity ?? "",
      sensor_source_units: primarySensor?.source_units ?? "cm",
      sensor_color: primarySensor?.color ?? "#0284c7",
      sensor_fov: primarySensor?.fov ?? 120,
      sensor_rotation: primarySensor?.rotation ?? 0,
      sensor_mirror_x: Boolean(primarySensor?.mirror_x),
      sensor_mirror_y: Boolean(primarySensor?.mirror_y)
    };
  }
  _formDataToConfig(formData) {
    const config = {
      ...this._config,
      type: this._config?.type || "custom:presence-map-card",
      title: typeof formData.title === "string" && formData.title ? formData.title : void 0,
      display_units: formData.display_units === "imperial" ? "imperial" : "metric",
      theme: formData.theme === "light" || formData.theme === "dark" ? formData.theme : "auto",
      range_meters: Number(formData.range_meters) || 6,
      stale_timeout: Number(formData.stale_timeout) || 10,
      show_rings: Boolean(formData.show_rings),
      show_trails: Boolean(formData.show_trails),
      show_labels: Boolean(formData.show_labels),
      show_coordinates: Boolean(formData.show_coordinates),
      show_boundaries: Boolean(formData.show_boundaries),
      show_last_known: formData.show_last_known !== false,
      demo_mode: Boolean(formData.demo_mode)
    };
    if (typeof formData.floorplan_image === "string" && formData.floorplan_image.trim()) {
      config.floorplan = {
        image: formData.floorplan_image.trim(),
        width_meters: Number(formData.floorplan_width) || 10,
        height_meters: Number(formData.floorplan_height) || 8
      };
    } else {
      config.floorplan = void 0;
    }
    const existingSensors = Array.isArray(this._config?.sensors) ? [...this._config.sensors] : [];
    const primary = existingSensors[0] || { id: "sensor_1", name: "Primary Sensor" };
    const validUnits = ["cm", "m", "in", "ft"];
    const sourceUnits = typeof formData.sensor_source_units === "string" && validUnits.includes(formData.sensor_source_units) ? formData.sensor_source_units : "cm";
    const cleanStr = (val) => typeof val === "string" && val.trim() ? val.trim() : void 0;
    const posX = formData.sensor_position_x !== void 0 && formData.sensor_position_x !== "" ? Number(formData.sensor_position_x) : primary.position?.x ?? 0;
    const posY = formData.sensor_position_y !== void 0 && formData.sensor_position_y !== "" ? Number(formData.sensor_position_y) : primary.position?.y ?? 0;
    const updatedPrimary = {
      ...primary,
      name: typeof formData.sensor_name === "string" && formData.sensor_name.trim() ? formData.sensor_name.trim() : primary.name || "Primary Sensor",
      targets_entity: typeof formData.sensor_targets_entity === "string" ? formData.sensor_targets_entity : "",
      occupancy_entity: cleanStr(formData.sensor_occupancy_entity),
      reporting_entity: cleanStr(formData.sensor_reporting_entity),
      boundary_prefix: cleanStr(formData.sensor_boundary_prefix),
      trail_attribute: cleanStr(formData.sensor_trail_attribute),
      position: {
        x: Number.isNaN(posX) ? 0 : posX,
        y: Number.isNaN(posY) ? 0 : posY
      },
      boundary_min_x_entity: cleanStr(formData.sensor_boundary_min_x_entity),
      boundary_max_x_entity: cleanStr(formData.sensor_boundary_max_x_entity),
      boundary_min_y_entity: cleanStr(formData.sensor_boundary_min_y_entity),
      boundary_max_y_entity: cleanStr(formData.sensor_boundary_max_y_entity),
      boundary_min_z_entity: cleanStr(formData.sensor_boundary_min_z_entity),
      boundary_max_z_entity: cleanStr(formData.sensor_boundary_max_z_entity),
      source_units: sourceUnits,
      color: typeof formData.sensor_color === "string" && formData.sensor_color ? formData.sensor_color : "#0284c7",
      fov: Number(formData.sensor_fov) || 120,
      rotation: Number(formData.sensor_rotation) || 0,
      mirror_x: Boolean(formData.sensor_mirror_x),
      mirror_y: Boolean(formData.sensor_mirror_y)
    };
    existingSensors[0] = updatedPrimary;
    config.sensors = existingSensors;
    return config;
  }
  _ensureForm() {
    if (this._form) return;
    if (!this._staticSchema) {
      this._staticSchema = this._computeSchema();
    }
    this._root.innerHTML = `
      <style>
        .editor-container {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-sizing: border-box;
        }
        ha-form {
          display: block;
        }
      </style>
      <div class="editor-container">
        <ha-form></ha-form>
      </div>
    `;
    const form = this._root.querySelector("ha-form");
    if (!form) return;
    this._form = form;
    this._form.schema = this._staticSchema;
    if (this._hass) {
      this._form.hass = this._hass;
    }
    this._form.computeLabel = (s) => s.label || s.name;
    if (this._config) {
      this._form.data = this._configToFormData(this._config);
    }
    this._form.addEventListener("value-changed", (ev) => {
      const customEv = ev;
      const newFormData = customEv.detail.value;
      const newConfig = this._formDataToConfig(newFormData);
      this._config = newConfig;
      this._lastEmittedConfig = JSON.parse(JSON.stringify(newConfig));
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true
        })
      );
    });
  }
  _isConfigEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }
  _isFormDataEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }
};
if (!customElements.get("presence-map-editor")) {
  customElements.define("presence-map-editor", PresenceMapEditor);
}

// src/presence-map-card.ts
console.info(
  `%c PresenceMap %c v${PRESENCE_MAP_VERSION} `,
  "color: #ffffff; background: #03a9f4; font-weight: bold; border-radius: 3px 0 0 3px;",
  "color: #03a9f4; background: #263238; font-weight: bold; border-radius: 0 3px 3px 0;"
);
var PresenceMapCard = class extends HTMLElement {
  constructor() {
    super();
    this._boundaries = /* @__PURE__ */ new Map();
    this._demoStep = 0;
    this._lastEntitySnapshots = /* @__PURE__ */ new Map();
    this._sensorStatuses = /* @__PURE__ */ new Map();
    this._root = this.attachShadow({ mode: "open" });
    this._freshnessManager = new TargetFreshnessManager();
  }
  static getConfigElement() {
    return document.createElement("presence-map-editor");
  }
  static getStubConfig() {
    return getStubConfig();
  }
  setConfig(rawConfig) {
    const { valid, errors, config } = validateConfig(rawConfig);
    if (!valid && !config.demo_mode && (!config.sensors || config.sensors.length === 0)) {
      throw new Error(`[PresenceMap] Configuration error: ${errors.join(", ")}`);
    }
    this._config = config;
    this._freshnessManager.updateOptions({
      staleTimeoutSeconds: config.stale_timeout,
      trailHistorySeconds: config.trail_history_seconds,
      trailMaxPoints: config.trail_max_points,
      showLastKnown: config.show_last_known
    });
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (this._config.demo_mode) {
      return;
    }
    let hasRelevantChanges = false;
    const sensors = this._config.sensors || [];
    for (const sensor of sensors) {
      const entitiesToCheck = InovelliZhaAdapter.getMonitoredEntityIds(sensor);
      for (const entityId of entitiesToCheck) {
        const stateObj = hass.states[entityId];
        const snapshot = stateObj ? `${stateObj.state}|${JSON.stringify(stateObj.attributes?.targets || "")}|${stateObj.last_updated}` : "missing";
        if (this._lastEntitySnapshots.get(entityId) !== snapshot) {
          hasRelevantChanges = true;
          this._lastEntitySnapshots.set(entityId, snapshot);
        }
      }
    }
    if (hasRelevantChanges || this._lastEntitySnapshots.size === 0) {
      this._updateSensorData();
      this._render();
    }
  }
  connectedCallback() {
    if (!this._timer) {
      this._timer = setInterval(() => {
        this._handleTick();
      }, 1e3);
    }
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this._render();
      });
      this._resizeObserver.observe(this);
    }
  }
  disconnectedCallback() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = void 0;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = void 0;
    }
  }
  getCardSize() {
    return 6;
  }
  _handleTick() {
    const now = Date.now();
    if (this._config?.demo_mode) {
      this._demoStep++;
      const demoTargets = createDemoTargets(now, this._demoStep);
      this._freshnessManager.update(demoTargets, now);
      this._render();
      return;
    }
    this._freshnessManager.prune(now);
    this._render();
  }
  _updateSensorData() {
    if (!this._hass || !this._config) return;
    const now = Date.now();
    const sensors = this._config.sensors || [];
    for (const sensor of sensors) {
      const res = InovelliZhaAdapter.parseSensor(sensor, this._hass, now);
      this._sensorStatuses.set(sensor.id, res);
      if (res.boundary) {
        this._boundaries.set(sensor.id, res.boundary);
      } else {
        this._boundaries.delete(sensor.id);
      }
      this._freshnessManager.updateSensor(
        sensor.id,
        res.targets,
        res.occupancyStatus,
        res.reportingStatus,
        now,
        res.sourceTrail
      );
    }
  }
  _isDarkMode() {
    if (!this._config) return false;
    if (this._config.theme === "dark") return true;
    if (this._config.theme === "light") return false;
    if (this._hass?.selectedTheme) {
      const allThemes = this._hass.themes?.themes;
      const themeObj = allThemes?.[this._hass.selectedTheme];
      if (themeObj?.modes?.dark !== void 0) return Boolean(themeObj.modes.dark);
    }
    if (this._hass?.darkMode !== void 0) {
      return this._hass.darkMode;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  }
  _render() {
    if (!this._config) return;
    const isDark = this._isDarkMode();
    const targets = this._freshnessManager.getAllTargets();
    const trails = this._freshnessManager.getFrontendTrails();
    const sourceTrails = this._freshnessManager.getSourceTrails();
    let overallOccupancy = "unknown";
    let overallReporting = "unknown";
    let isSourceAvailable = true;
    if (this._config.sensors && this._config.sensors.length > 0) {
      const primaryRes = this._sensorStatuses.get(this._config.sensors[0].id);
      if (primaryRes) {
        overallOccupancy = primaryRes.occupancyStatus;
        overallReporting = primaryRes.reportingStatus;
        isSourceAvailable = primaryRes.available;
      }
    }
    const svgHtml = renderSvg({
      config: this._config,
      targets,
      trails,
      sourceTrails,
      boundaries: this._boundaries,
      isDark,
      demoMode: Boolean(this._config.demo_mode),
      occupancyStatus: overallOccupancy,
      reportingStatus: overallReporting,
      isSourceAvailable
    });
    const titleHtml = this._config.title ? `<div class="card-header"><h1 class="card-title">${this._config.title}</h1></div>` : "";
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: var(--ha-card-background, var(--card-background-color, ${isDark ? "#1a1c1e" : "#ffffff"}));
          color: var(--primary-text-color, ${isDark ? "#ffffff" : "#212121"});
          box-shadow: var(--ha-card-box-shadow, none);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, ${isDark ? "#2c2e33" : "#e0e0e0"}));
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          position: relative;
        }
        .card-header {
          padding: 16px 16px 8px 16px;
        }
        .card-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 600;
          line-height: 1.3;
          color: inherit;
        }
        .canvas-container {
          padding: 8px 12px 12px 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }
        svg {
          width: 100%;
          height: auto;
          max-height: 520px;
          display: block;
          border-radius: 8px;
        }
      </style>
      <ha-card>
        ${titleHtml}
        <div class="canvas-container">
          ${svgHtml}
        </div>
      </ha-card>
    `;
  }
};
if (!customElements.get("presence-map-card")) {
  customElements.define("presence-map-card", PresenceMapCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "presence-map-card",
  name: "PresenceMap",
  preview: true,
  description: "Multi-sensor mmWave presence radar and floor-plan custom card",
  documentationURL: "https://github.com/KeithSobo/presence-map-card"
});
export {
  PresenceMapCard
};
