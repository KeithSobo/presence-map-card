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
   * Validates a candidate trail attribute on an entity against supported trail coordinate formats.
   * Reuses the exact parsing logic of extractRawTrail to ensure format consistency.
   */
  static validateTrailAttribute(targetsEntityId, attributeName, hass) {
    if (!attributeName || !attributeName.trim()) {
      return {
        status: "none",
        message: "None \u2014 collect trails in the card"
      };
    }
    const cleanAttr = attributeName.trim();
    if (!targetsEntityId || !hass?.states) {
      return {
        status: "unavailable",
        message: "Target entity is unavailable or not found"
      };
    }
    const stateObj = hass.states[targetsEntityId];
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) {
      return {
        status: "unavailable",
        message: `Entity "${targetsEntityId}" is unavailable or not found`
      };
    }
    if (!stateObj.attributes || !(cleanAttr in stateObj.attributes)) {
      return {
        status: "unavailable",
        message: `Attribute "${cleanAttr}" not found on "${targetsEntityId}"`
      };
    }
    const rawValue = stateObj.attributes[cleanAttr];
    if (rawValue === null || rawValue === void 0) {
      return {
        status: "empty",
        message: `Attribute "${cleanAttr}" is empty`,
        pointCount: 0
      };
    }
    let parsed = rawValue;
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (!trimmed || ["none", "unavailable", "unknown"].includes(trimmed)) {
        return {
          status: "empty",
          message: `Attribute "${cleanAttr}" is empty (${trimmed || "blank"})`,
          pointCount: 0
        };
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          status: "unsupported",
          message: `Attribute "${cleanAttr}" contains malformed JSON`
        };
      }
    }
    if (!Array.isArray(parsed)) {
      return {
        status: "unsupported",
        message: `Attribute "${cleanAttr}" must be an array of coordinates`
      };
    }
    if (parsed.length === 0) {
      return {
        status: "empty",
        message: "Empty trail data (0 points)",
        pointCount: 0
      };
    }
    let validCount = 0;
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
        validCount++;
      }
    }
    if (validCount > 0) {
      return {
        status: "compatible",
        message: `Compatible trail data (${validCount} point${validCount === 1 ? "" : "s"} found)`,
        pointCount: validCount
      };
    }
    return {
      status: "unsupported",
      message: "Unsupported trail data format (no valid coordinate points)",
      pointCount: 0
    };
  }
  /**
   * Validates a candidate target coordinate attribute on an entity against supported target formats.
   * Distinguishes valid empty target data from missing or malformed data.
   */
  static validateTargetsAttribute(targetsEntityId, attributeName, hass) {
    const attrName = attributeName && attributeName.trim() ? attributeName.trim() : "targets";
    if (!targetsEntityId || !hass?.states) {
      return {
        status: "unavailable",
        message: "Targets entity is not configured or Home Assistant is unavailable"
      };
    }
    const stateObj = hass.states[targetsEntityId];
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) {
      return {
        status: "unavailable",
        message: `Entity "${targetsEntityId}" is unavailable or not found`
      };
    }
    if (!stateObj.attributes || !(attrName in stateObj.attributes)) {
      return {
        status: "unavailable",
        message: `Attribute "${attrName}" not found on "${targetsEntityId}"`
      };
    }
    const rawValue = stateObj.attributes[attrName];
    if (rawValue === null || rawValue === void 0) {
      return {
        status: "empty",
        message: "Valid target data with no current targets (room clear)",
        targetCount: 0
      };
    }
    let parsed = rawValue;
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (!trimmed || ["none", "unavailable", "unknown"].includes(trimmed)) {
        return {
          status: "empty",
          message: `Valid target data with no current targets (${trimmed || "blank"})`,
          targetCount: 0
        };
      }
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          status: "unsupported",
          message: `Attribute "${attrName}" contains malformed JSON`
        };
      }
    }
    if (!Array.isArray(parsed) && (typeof parsed !== "object" || parsed === null)) {
      return {
        status: "unsupported",
        message: `Attribute "${attrName}" must be a JSON array or object`
      };
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      return {
        status: "empty",
        message: "Valid target data with no current targets (room clear)",
        targetCount: 0
      };
    }
    const extracted = this.extractRawTargets(rawValue);
    if (extracted.length > 0) {
      return {
        status: "compatible",
        message: `Compatible target data: ${extracted.length} active target${extracted.length === 1 ? "" : "s"}`,
        targetCount: extracted.length
      };
    }
    const count = Array.isArray(parsed) ? parsed.length : 1;
    if (count > 0) {
      return {
        status: "unsupported",
        message: `Unsupported target format (${count} item${count === 1 ? "" : "s"} missing valid x/y numbers)`
      };
    }
    return {
      status: "empty",
      message: "Valid target data with no current targets (room clear)",
      targetCount: 0
    };
  }
  /**
   * Resolves detailed status and precedence of detection boundary entities.
   * Matches actual adapter behavior: explicit override first if valid number, then prefix fallback.
   */
  static resolveBoundaryDetails(sensor, hass) {
    const definitions = [
      {
        key: "minX",
        label: "Width Min Left / X Min",
        explicitEntity: sensor.boundary_min_x_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minX
      },
      {
        key: "maxX",
        label: "Width Max Right / X Max",
        explicitEntity: sensor.boundary_max_x_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxX
      },
      {
        key: "minY",
        label: "Depth Min Near / Y Min",
        explicitEntity: sensor.boundary_min_y_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minY
      },
      {
        key: "maxY",
        label: "Depth Max Far / Y Max",
        explicitEntity: sensor.boundary_max_y_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxY
      },
      {
        key: "minZ",
        label: "Height Min Floor / Z Min",
        explicitEntity: sensor.boundary_min_z_entity,
        suffixes: this.BOUNDARY_SUFFIXES.minZ,
        isOptionalZ: true
      },
      {
        key: "maxZ",
        label: "Height Max Ceiling / Z Max",
        explicitEntity: sensor.boundary_max_z_entity,
        suffixes: this.BOUNDARY_SUFFIXES.maxZ,
        isOptionalZ: true
      }
    ];
    const items = [];
    for (const def of definitions) {
      let resolvedEntity = void 0;
      let source = "none";
      let value = void 0;
      let unit = void 0;
      let status = "missing";
      let error2 = void 0;
      if (def.explicitEntity) {
        resolvedEntity = def.explicitEntity;
        if (!hass?.states) {
          status = "unavailable";
          error2 = "Home Assistant state is unavailable";
        } else {
          const stateObj = hass.states[def.explicitEntity];
          if (!stateObj) {
            status = "missing";
            error2 = `Entity "${def.explicitEntity}" not found in Home Assistant`;
          } else if (["unavailable", "unknown"].includes(stateObj.state)) {
            status = "unavailable";
            error2 = `Entity "${def.explicitEntity}" is ${stateObj.state}`;
          } else {
            const num = parseFloat(stateObj.state);
            if (Number.isFinite(num)) {
              value = num;
              source = "explicit";
              status = "valid";
              unit = stateObj.attributes?.unit_of_measurement || sensor.source_units || "cm";
            } else {
              status = "invalid";
              error2 = `Entity state "${stateObj.state}" is not a valid number`;
            }
          }
        }
      }
      if (status !== "valid" && sensor.boundary_prefix && hass?.states) {
        const prefix = sensor.boundary_prefix;
        for (const suffix of def.suffixes) {
          const candidateId = `${prefix}${suffix}`;
          const stateObj = hass.states[candidateId];
          if (stateObj && !["unavailable", "unknown"].includes(stateObj.state)) {
            const num = parseFloat(stateObj.state);
            if (Number.isFinite(num)) {
              resolvedEntity = candidateId;
              source = "prefix";
              value = num;
              status = "valid";
              error2 = void 0;
              unit = stateObj.attributes?.unit_of_measurement || sensor.source_units || "cm";
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
        error: error2
      });
    }
    const minXItem = items.find((i) => i.key === "minX");
    const maxXItem = items.find((i) => i.key === "maxX");
    const minYItem = items.find((i) => i.key === "minY");
    const maxYItem = items.find((i) => i.key === "maxY");
    const minZItem = items.find((i) => i.key === "minZ");
    const maxZItem = items.find((i) => i.key === "maxZ");
    const isCompleteXY = Boolean(
      minXItem?.status === "valid" && maxXItem?.status === "valid" && minYItem?.status === "valid" && maxYItem?.status === "valid"
    );
    let isValid = false;
    let error = void 0;
    if (!isCompleteXY) {
      error = "All 4 X/Y limits (min X, max X, min Y, max Y) are required to form a detection boundary";
    } else {
      const minX = minXItem.value;
      const maxX = maxXItem.value;
      const minY = minYItem.value;
      const maxY = maxYItem.value;
      if (minX > maxX) {
        error = `Invalid X range: Min (${minX}) is greater than Max (${maxX})`;
      } else if (minY > maxY) {
        error = `Invalid Y range: Min (${minY}) is greater than Max (${maxY})`;
      } else if (minZItem?.value !== void 0 && maxZItem?.value !== void 0 && minZItem.value > maxZItem.value) {
        error = `Invalid Z range: Min (${minZItem.value}) is greater than Max (${maxZItem.value})`;
      } else {
        isValid = true;
      }
    }
    return {
      items,
      isCompleteXY,
      isValid,
      error
    };
  }
  /**
   * Compiles concise setup feedback items for a sensor based on current Home Assistant entity states.
   * Treats an empty room as a valid state without inferring hardware faults.
   */
  static getSensorSetupFeedback(sensor, hass) {
    const items = [];
    if (!sensor.targets_entity || !sensor.targets_entity.trim()) {
      items.push({
        type: "warning",
        message: "Targets entity not selected (required for live radar detections)"
      });
    } else if (!hass?.states || !hass.states[sensor.targets_entity] || ["unavailable", "unknown"].includes(hass.states[sensor.targets_entity].state)) {
      items.push({
        type: "warning",
        message: `Targets entity "${sensor.targets_entity}" is missing or unavailable`
      });
    } else {
      const attrName = sensor.targets_attribute || "targets";
      const targetValidation = this.validateTargetsAttribute(sensor.targets_entity, attrName, hass);
      if (targetValidation.status === "compatible") {
        items.push({
          type: "success",
          message: targetValidation.message
        });
      } else if (targetValidation.status === "empty") {
        items.push({
          type: "info",
          message: targetValidation.message
        });
      } else if (targetValidation.status === "unsupported") {
        items.push({
          type: "error",
          message: targetValidation.message
        });
      } else {
        items.push({
          type: "warning",
          message: targetValidation.message
        });
      }
    }
    if (sensor.reporting_entity) {
      const repState = hass?.states?.[sensor.reporting_entity];
      if (repState?.state === "off") {
        items.push({
          type: "info",
          message: `Target reporting switch "${sensor.reporting_entity}" is off (targets will be treated as last-known)`
        });
      } else if (!repState || ["unavailable", "unknown"].includes(repState.state)) {
        items.push({
          type: "warning",
          message: `Reporting switch "${sensor.reporting_entity}" is unavailable`
        });
      }
    }
    if (sensor.occupancy_entity) {
      const occState = hass?.states?.[sensor.occupancy_entity];
      if (occState?.state === "off") {
        items.push({
          type: "info",
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is clear (off)`
        });
      } else if (occState?.state === "on") {
        items.push({
          type: "success",
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is occupied (on)`
        });
      } else if (!occState || ["unavailable", "unknown"].includes(occState.state)) {
        items.push({
          type: "warning",
          message: `Occupancy binary sensor "${sensor.occupancy_entity}" is unavailable`
        });
      }
    }
    return items;
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
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function generateUniqueSensorId(existingSensors, baseId = "sensor") {
  const existingIds = new Set(existingSensors.map((s) => s.id).filter(Boolean));
  let cleanBase = (baseId || "sensor").trim();
  cleanBase = cleanBase.replace(/_copy(_\d+)?$/, "");
  if (!cleanBase) cleanBase = "sensor";
  if (baseId.includes("_copy")) {
    const candidate = `${cleanBase}_copy`;
    if (!existingIds.has(candidate)) return candidate;
    let i = 2;
    while (existingIds.has(`${cleanBase}_copy_${i}`)) {
      i++;
    }
    return `${cleanBase}_copy_${i}`;
  }
  let counter = 1;
  while (existingIds.has(`${cleanBase}_${counter}`)) {
    counter++;
  }
  return `${cleanBase}_${counter}`;
}
function metersToFeetInches(meters) {
  const isNegative = meters < 0;
  const absMeters = Math.abs(meters);
  const totalInches = absMeters / 0.0254;
  let feet = Math.floor(totalInches / 12);
  let inches = parseFloat((totalInches % 12).toFixed(1));
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return {
    feet: isNegative ? -feet : feet,
    inches
  };
}
function feetInchesToMeters(feet, inches, sign = 1) {
  const isNeg = sign < 0 || feet < 0 || Object.is(feet, -0);
  const absFeet = Math.abs(feet);
  const absInches = Math.abs(inches);
  const totalFeet = absFeet + absInches / 12;
  const meters = (isNeg ? -1 : 1) * totalFeet * 0.3048;
  return parseFloat(meters.toFixed(3));
}
var CSS_NAMED_COLORS = /* @__PURE__ */ new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
  "transparent",
  "currentcolor"
]);
function isValidColor(val) {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim().toLowerCase();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(trimmed)) return true;
  if (/^(rgb|rgba|hsl|hsla)\(\s*[-0-9.%,/ ]+\s*\)$/.test(trimmed)) return true;
  return CSS_NAMED_COLORS.has(trimmed);
}
var GENERAL_SCHEMA = [
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
  }
];
var RADAR_BOOLEANS_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_rings", label: "Show Distance Rings", selector: { boolean: {} } },
      { name: "show_labels", label: "Show Target Labels", selector: { boolean: {} } },
      { name: "show_coordinates", label: "Show X/Y Coordinates", selector: { boolean: {} } }
    ]
  }
];
var TARGETS_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_trails", label: "Show Target Trails", selector: { boolean: {} } },
      {
        name: "show_last_known",
        label: "Show Last-Known Positions When Clear",
        selector: { boolean: {} }
      }
    ]
  },
  {
    name: "stale_timeout",
    label: "Stale Timeout (Seconds)",
    helper: "Seconds of silence before live targets are marked stale (default: 10s).",
    selector: { number: { mode: "box", min: 1, max: 60 } }
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "trail_history_seconds",
        label: "Trail Duration (Seconds)",
        helper: "How long trail breadcrumbs remain visible before expiring (default: 10s).",
        selector: { number: { mode: "box", min: 1, max: 120 } }
      },
      {
        name: "trail_max_points",
        label: "Maximum Trail Points",
        helper: "Maximum number of historical points retained per target (1\u2013200, default: 30).",
        selector: { number: { mode: "box", min: 1, max: 200 } }
      }
    ]
  }
];
var FLOORPLAN_IMAGE_SCHEMA = [
  {
    name: "floorplan_image",
    label: "Image URL or Path (e.g. /local/floorplan.png)",
    selector: { text: {} }
  }
];
var ADVANCED_SCHEMA = [
  { name: "demo_mode", label: "Demo Mode (Simulated Data)", selector: { boolean: {} } }
];
var SENSOR_MAIN_HA_SCHEMA = [
  {
    name: "name",
    label: "Sensor Display Name",
    selector: { text: {} }
  },
  {
    name: "targets_entity",
    label: "Targets Entity (Required for live data)",
    selector: { entity: { domain: "sensor" } }
  },
  {
    name: "occupancy_entity",
    label: "Occupancy Binary Sensor (Optional)",
    helper: "Allows live targets to be cleared immediately when occupancy turns off.",
    selector: { entity: { domain: "binary_sensor" } }
  }
];
var SENSOR_PLACEMENT_HA_SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "rotation",
        label: "Rotation Angle (Degrees)",
        selector: { number: { mode: "box", min: 0, max: 359 } }
      },
      {
        name: "fov",
        label: "Illustrative Field of View (Degrees)",
        selector: { number: { mode: "box", min: 30, max: 360 } }
      }
    ]
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "mirror_x",
        label: "Mirror X (Horizontal)",
        selector: { boolean: {} }
      },
      {
        name: "mirror_y",
        label: "Mirror Y (Vertical)",
        selector: { boolean: {} }
      }
    ]
  }
];
var SENSOR_BOUNDARIES_SCHEMA = [
  {
    name: "boundary_prefix",
    label: "Boundary Entity Prefix (e.g. number.garage_lights_mmwave_)",
    selector: { text: {} }
  },
  {
    name: "boundary_min_x_entity",
    label: "Width Min Left / X Min",
    selector: { entity: { domain: "number" } }
  },
  {
    name: "boundary_max_x_entity",
    label: "Width Max Right / X Max",
    selector: { entity: { domain: "number" } }
  },
  {
    name: "boundary_min_y_entity",
    label: "Depth Min Near / Y Min",
    selector: { entity: { domain: "number" } }
  },
  {
    name: "boundary_max_y_entity",
    label: "Depth Max Far / Y Max",
    selector: { entity: { domain: "number" } }
  },
  {
    name: "boundary_min_z_entity",
    label: "Height Min Floor / Z Min (Optional)",
    selector: { entity: { domain: "number" } }
  },
  {
    name: "boundary_max_z_entity",
    label: "Height Max Ceiling / Z Max (Optional)",
    selector: { entity: { domain: "number" } }
  }
];
var SENSOR_ADVANCED_SCHEMA = [
  {
    name: "source_units",
    label: "Sensor Source Units",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "mm", label: "Millimeters (mm)" },
          { value: "cm", label: "Centimeters (cm)" },
          { value: "m", label: "Meters (m)" },
          { value: "in", label: "Inches (in)" },
          { value: "ft", label: "Feet (ft)" }
        ]
      }
    }
  },
  {
    name: "reporting_entity",
    label: "Target reporting switch (optional)",
    helper: "Used to detect when reporting is off. This card does not turn the switch on.",
    selector: { entity: { domain: "switch" } }
  }
];
var CHEVRON_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
var ARROW_UP_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
var ARROW_DOWN_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
var COPY_SVG = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
var TRASH_SVG = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
var PLUS_SVG = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
var PresenceMapEditor = class extends HTMLElement {
  constructor() {
    super();
    this._expandedSections = /* @__PURE__ */ new Set();
    this._sensorDomNodes = /* @__PURE__ */ new Map();
    this._isInitialized = false;
    this._root = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this._ensureLayout();
  }
  disconnectedCallback() {
    this._sensorDomNodes.clear();
  }
  setConfig(config) {
    const isEcho = this._isConfigEqual(config, this._lastEmittedConfig);
    this._config = JSON.parse(JSON.stringify(config));
    this._ensureLayout();
    if (isEcho) {
      return;
    }
    this._updateAllFormData();
    this._reconcileSensors();
  }
  set hass(hass) {
    this._hass = hass;
    this._updateHassAcrossForms();
  }
  _ensureLayout() {
    if (this._isInitialized) return;
    this._isInitialized = true;
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .pm-editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          box-sizing: border-box;
          font-family: var(--paper-font-body1_-_font-family, inherit);
          color: var(--primary-text-color, #212121);
        }
        .pm-accordion {
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
          border-radius: var(--ha-card-border-radius, 8px);
          background-color: var(--card-background-color, #ffffff);
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .pm-accordion:focus-within {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: none;
          border-bottom: 1px solid transparent;
          cursor: pointer;
          text-align: left;
          user-select: none;
          box-sizing: border-box;
          outline: none;
          transition: background-color 0.15s ease;
        }
        .pm-accordion.expanded > .pm-accordion-header {
          border-bottom-color: var(--divider-color, rgba(0, 0, 0, 0.12));
        }
        .pm-accordion-header:hover,
        .pm-accordion-header:focus-visible {
          background-color: var(--divider-color, rgba(0, 0, 0, 0.06));
        }
        .pm-accordion-header:focus-visible {
          outline: 2px solid var(--primary-color, #03a9f4);
          outline-offset: -2px;
        }
        .pm-header-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .pm-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          transition: transform 0.2s ease;
          color: var(--secondary-text-color, #757575);
          flex-shrink: 0;
        }
        .pm-chevron svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }
        .pm-accordion.expanded > .pm-accordion-header .pm-chevron,
        .pm-sub-accordion.expanded > .pm-sub-accordion-header .pm-chevron {
          transform: rotate(180deg);
        }
        .pm-header-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color, #212121);
          white-space: nowrap;
        }
        .pm-header-summary {
          font-size: 12px;
          color: var(--secondary-text-color, #757575);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-left: 4px;
        }
        .pm-color-badge {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }
        .pm-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .pm-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 4px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--secondary-text-color, #757575);
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          box-sizing: border-box;
        }
        .pm-icon-btn:hover:not(:disabled) {
          background-color: rgba(127, 127, 127, 0.18);
          color: var(--primary-text-color, #212121);
        }
        .pm-icon-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .pm-icon-btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }
        .pm-accordion-content {
          display: none;
          padding: 16px;
          box-sizing: border-box;
        }
        .pm-accordion.expanded > .pm-accordion-content {
          display: block;
        }
        .pm-sub-accordion {
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
          border-radius: 6px;
          margin-top: 12px;
          background: var(--card-background-color, #ffffff);
          overflow: hidden;
        }
        .pm-sub-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.015));
          border: none;
          border-bottom: 1px solid transparent;
          cursor: pointer;
          text-align: left;
          outline: none;
          transition: background-color 0.15s ease;
          color: var(--primary-text-color, #212121);
        }
        .pm-sub-accordion.expanded > .pm-sub-accordion-header {
          border-bottom-color: var(--divider-color, rgba(0, 0, 0, 0.08));
        }
        .pm-sub-accordion-header:hover,
        .pm-sub-accordion-header:focus-visible {
          background-color: var(--divider-color, rgba(0, 0, 0, 0.05));
        }
        .pm-sub-accordion-content {
          display: none;
          padding: 12px;
        }
        .pm-sub-accordion.expanded > .pm-sub-accordion-content {
          display: block;
        }
        .pm-add-sensor-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          margin-top: 12px;
          border: 1px dashed var(--primary-color, #03a9f4);
          border-radius: var(--ha-card-border-radius, 8px);
          background: rgba(3, 169, 244, 0.04);
          color: var(--primary-color, #03a9f4);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .pm-add-sensor-btn:hover {
          background: rgba(3, 169, 244, 0.1);
        }
        .pm-add-sensor-btn svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
        .pm-sensor-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        /* Measurement inputs */
        .pm-measurement-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pm-dual-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pm-unit-input-group {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .pm-unit-input-group:focus-within {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-unit-input-group input {
          border: none;
          outline: none;
          background: transparent;
          padding: 8px 10px;
          width: 76px;
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          box-sizing: border-box;
        }
        .pm-unit-suffix {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
          padding-right: 8px;
          user-select: none;
        }
        .pm-sign-select {
          padding: 8px 6px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-weight: bold;
          outline: none;
        }
        /* Color control */
        .pm-color-control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
          margin-bottom: 12px;
        }
        .pm-color-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pm-color-preview-box {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          flex-shrink: 0;
        }
        .pm-native-color-picker {
          width: 36px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
          box-sizing: border-box;
        }
        .pm-color-text-input {
          flex: 1;
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .pm-color-text-input:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-color-presets-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .pm-color-preset-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          box-sizing: border-box;
          padding: 0;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .pm-color-preset-btn:hover {
          transform: scale(1.15);
        }
        .pm-color-preset-btn.active {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 0 1px #fff;
        }
        .pm-color-validation-msg {
          font-size: 11px;
          color: var(--error-color, #d32f2f);
        }
        /* Diagnostics Feedback Box */
        .pm-sensor-feedback-box {
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .pm-feedback-header {
          font-size: 12px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 6px;
        }
        .pm-feedback-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pm-feedback-item {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 4px;
        }
        .pm-feedback-success {
          color: var(--success-color, #2e7d32);
          background: rgba(76, 175, 80, 0.08);
        }
        .pm-feedback-info {
          color: var(--primary-color, #0288d1);
          background: rgba(3, 169, 244, 0.08);
        }
        .pm-feedback-warning {
          color: var(--warning-color, #e65100);
          background: rgba(255, 152, 0, 0.08);
        }
        .pm-feedback-error {
          color: var(--error-color, #d32f2f);
          background: rgba(244, 67, 54, 0.08);
        }
        /* Boundary Feedback Table */
        .pm-boundary-feedback-container {
          margin-top: 14px;
          padding: 12px;
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
        }
        .pm-boundary-feedback-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-text-color, #212121);
          margin-bottom: 2px;
        }
        .pm-boundary-feedback-desc {
          font-size: 11px;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 8px;
        }
        .pm-boundary-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }
        .pm-boundary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          padding: 5px 8px;
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.05));
        }
        .pm-boundary-label-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pm-boundary-entity-name {
          font-family: monospace;
          font-size: 11px;
          color: var(--secondary-text-color, #757575);
        }
        .pm-boundary-source-tag {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .pm-source-explicit {
          background: rgba(3, 169, 244, 0.15);
          color: #0284c7;
        }
        .pm-source-prefix {
          background: rgba(156, 39, 176, 0.15);
          color: #9c27b0;
        }
        .pm-source-none {
          background: rgba(127, 127, 127, 0.15);
          color: #757575;
        }
        .pm-boundary-val {
          font-weight: 500;
          color: var(--primary-text-color, #212121);
        }
        .pm-boundary-summary-badge {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pm-boundary-summary-valid {
          background: rgba(76, 175, 80, 0.1);
          color: var(--success-color, #2e7d32);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .pm-boundary-summary-invalid {
          background: rgba(255, 152, 0, 0.1);
          color: var(--warning-color, #e65100);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        /* Placement Guidance Box */
        .pm-placement-guide {
          margin-top: 12px;
          padding: 12px;
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
        }
        .pm-guide-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 6px;
        }
        .pm-guide-list {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: var(--primary-text-color, #212121);
          line-height: 1.5;
        }
        .pm-guide-list li {
          margin-bottom: 4px;
        }
        /* Attribute Selectors */
        .pm-attr-selector-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
        }
        .pm-field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
        }
        .pm-select-box,
        .pm-custom-text-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          background-color: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .pm-select-box:focus,
        .pm-custom-text-input:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-field-helper {
          font-size: 12px;
          color: var(--secondary-text-color, #757575);
          line-height: 1.4;
        }
        .pm-validation-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 4px;
        }
        .pm-validation-compatible {
          background-color: rgba(76, 175, 80, 0.1);
          color: var(--success-color, #2e7d32);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .pm-validation-empty {
          background-color: rgba(33, 150, 243, 0.08);
          color: var(--primary-color, #0288d1);
          border: 1px solid rgba(33, 150, 243, 0.25);
        }
        .pm-validation-unsupported {
          background-color: rgba(244, 67, 54, 0.1);
          color: var(--error-color, #d32f2f);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }
        .pm-validation-unavailable {
          background-color: rgba(255, 152, 0, 0.1);
          color: var(--warning-color, #e65100);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        .pm-validation-none {
          display: none;
        }
        ha-form {
          display: block;
        }
      </style>
      <div class="pm-editor">
        <!-- 1. General Section -->
        <div class="pm-accordion" data-section="general">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-general">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">General</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-general" role="region">
            <ha-form class="ha-form-general"></ha-form>
          </div>
        </div>

        <!-- 2. Radar Display Section -->
        <div class="pm-accordion" data-section="radar">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-radar">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Radar Display</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-radar" role="region">
            <div class="pm-radar-range-container"></div>
            <ha-form class="ha-form-radar"></ha-form>
          </div>
        </div>

        <!-- 3. Targets & Trails Section -->
        <div class="pm-accordion" data-section="targets">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-targets">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Targets &amp; Trails</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-targets" role="region">
            <ha-form class="ha-form-targets"></ha-form>
          </div>
        </div>

        <!-- 4. Floor Plan Section -->
        <div class="pm-accordion" data-section="floorplan">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-floorplan">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Floor Plan</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-floorplan" role="region">
            <ha-form class="ha-form-floorplan ha-form-floorplan-image"></ha-form>
            <div class="pm-floorplan-dims-container"></div>
          </div>
        </div>

        <!-- 5. Sensors Section -->
        <div class="pm-accordion" data-section="sensors">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-sensors">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Sensors</span>
              <span class="pm-header-summary pm-sensor-count-summary"></span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-sensors" role="region">
            <div class="pm-sensor-list"></div>
            <button type="button" class="pm-add-sensor-btn" aria-label="Add Sensor">
              ${PLUS_SVG} Add Sensor
            </button>
          </div>
        </div>

        <!-- 6. Advanced Section -->
        <div class="pm-accordion" data-section="advanced">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-advanced">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Advanced</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-advanced" role="region">
            <ha-form class="ha-form-advanced"></ha-form>
          </div>
        </div>
      </div>
    `;
    this._root.querySelectorAll(".pm-accordion").forEach((accordionEl) => {
      const sectionKey = accordionEl.dataset.section;
      if (!sectionKey) return;
      const headerBtn = accordionEl.querySelector(".pm-accordion-header");
      if (!headerBtn) return;
      headerBtn.addEventListener("click", () => {
        this._toggleSection(sectionKey);
      });
      headerBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._toggleSection(sectionKey);
        }
      });
    });
    const addSensorBtn = this._root.querySelector(".pm-add-sensor-btn");
    if (addSensorBtn) {
      addSensorBtn.addEventListener("click", () => {
        this._handleAddSensor();
      });
    }
    this._sensorListEl = this._root.querySelector(".pm-sensor-list");
    this._sensorSummaryEl = this._root.querySelector(".pm-sensor-count-summary");
    this._radarRangeContainer = this._root.querySelector(
      ".pm-radar-range-container"
    );
    this._floorplanDimsContainer = this._root.querySelector(
      ".pm-floorplan-dims-container"
    );
    this._formGeneral = this._setupForm(".ha-form-general", GENERAL_SCHEMA, (data) => {
      const unitsChanged = data.display_units !== (this._config?.display_units ?? "metric");
      this._updateConfig((current) => ({
        ...current,
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : void 0,
        display_units: data.display_units === "imperial" ? "imperial" : "metric",
        theme: data.theme === "light" || data.theme === "dark" ? data.theme : "auto"
      }));
      if (unitsChanged) {
        this._renderGlobalMeasurementInputs();
        this._reconcileSensors();
      }
    });
    this._formRadarBooleans = this._setupForm(".ha-form-radar", RADAR_BOOLEANS_SCHEMA, (data) => {
      this._updateConfig((current) => ({
        ...current,
        range_meters: data.range_meters !== void 0 ? this._parseNum(data.range_meters, current.range_meters ?? 6) : current.range_meters,
        show_rings: data.show_rings !== false,
        show_labels: data.show_labels !== false,
        show_coordinates: Boolean(data.show_coordinates)
      }));
    });
    this._formTargets = this._setupForm(".ha-form-targets", TARGETS_SCHEMA, (data) => {
      this._updateConfig((current) => ({
        ...current,
        show_trails: data.show_trails !== false,
        show_last_known: data.show_last_known !== false,
        stale_timeout: Number(data.stale_timeout) || 10,
        trail_history_seconds: data.trail_history_seconds !== void 0 && data.trail_history_seconds !== "" ? Number(data.trail_history_seconds) : void 0,
        trail_max_points: data.trail_max_points !== void 0 && data.trail_max_points !== "" ? Number(data.trail_max_points) : void 0
      }));
    });
    this._formFloorplanImage = this._setupForm(
      ".ha-form-floorplan-image",
      FLOORPLAN_IMAGE_SCHEMA,
      (data) => {
        this._updateConfig((current) => {
          const imageStr = typeof data.floorplan_image === "string" ? data.floorplan_image.trim() : "";
          if (imageStr) {
            return {
              ...current,
              floorplan: {
                image: imageStr,
                width_meters: data.floorplan_width !== void 0 ? this._parseNum(data.floorplan_width, current.floorplan?.width_meters || 10) : current.floorplan?.width_meters || 10,
                height_meters: data.floorplan_height !== void 0 ? this._parseNum(data.floorplan_height, current.floorplan?.height_meters || 8) : current.floorplan?.height_meters || 8
              }
            };
          } else {
            return {
              ...current,
              floorplan: void 0
            };
          }
        });
      }
    );
    this._formAdvanced = this._setupForm(".ha-form-advanced", ADVANCED_SCHEMA, (data) => {
      this._updateConfig((current) => ({
        ...current,
        demo_mode: Boolean(data.demo_mode)
      }));
    });
    if (this._config) {
      this._updateAllFormData();
      this._renderGlobalMeasurementInputs();
      this._reconcileSensors();
    }
  }
  _setupForm(selector, schema, onValueChange) {
    const form = this._root.querySelector(selector);
    if (!form) return void 0;
    form.schema = schema;
    if (this._hass) form.hass = this._hass;
    form.computeLabel = (s) => s.label || s.name;
    form.computeHelper = (s) => s.helper || "";
    form.addEventListener("value-changed", (ev) => {
      const customEv = ev;
      if (customEv.detail && customEv.detail.value) {
        onValueChange(customEv.detail.value);
      }
    });
    return form;
  }
  _toggleSection(sectionKey) {
    if (this._expandedSections.has(sectionKey)) {
      this._expandedSections.delete(sectionKey);
    } else {
      this._expandedSections.add(sectionKey);
    }
    this._syncAccordionState(sectionKey);
  }
  _syncAccordionState(sectionKey) {
    const globalAccordion = this._root.querySelector(
      `.pm-accordion[data-section="${sectionKey}"]`
    );
    if (globalAccordion) {
      const isExpanded = this._expandedSections.has(sectionKey);
      globalAccordion.classList.toggle("expanded", isExpanded);
      const headerBtn = globalAccordion.querySelector(".pm-accordion-header");
      if (headerBtn) {
        headerBtn.setAttribute("aria-expanded", String(isExpanded));
      }
      return;
    }
    if (sectionKey.startsWith("sensor:")) {
      const parts = sectionKey.split(":");
      const sensorId = parts[1];
      const subSection = parts[2];
      const entry = this._sensorDomNodes.get(sensorId);
      if (!entry) return;
      if (!subSection) {
        const isExpanded = this._expandedSections.has(sectionKey);
        entry.root.classList.toggle("expanded", isExpanded);
        const headerBtn = entry.root.querySelector(".pm-accordion-header");
        if (headerBtn) {
          headerBtn.setAttribute("aria-expanded", String(isExpanded));
        }
      } else {
        const subAcc = entry.root.querySelector(
          `.pm-sub-accordion[data-subsection="${subSection}"]`
        );
        if (subAcc) {
          const isExpanded = this._expandedSections.has(sectionKey);
          subAcc.classList.toggle("expanded", isExpanded);
          const subHeader = subAcc.querySelector(".pm-sub-accordion-header");
          if (subHeader) {
            subHeader.setAttribute("aria-expanded", String(isExpanded));
          }
        }
      }
    }
  }
  _updateAllFormData() {
    if (!this._config) return;
    if (this._formGeneral) {
      const data = {
        title: this._config.title ?? "",
        display_units: this._config.display_units ?? "metric",
        theme: this._config.theme ?? "auto"
      };
      if (!this._isFormDataEqual(this._formGeneral.data, data)) {
        this._formGeneral.data = data;
      }
    }
    if (this._formRadarBooleans) {
      const data = {
        range_meters: this._config.range_meters ?? 6,
        show_rings: this._config.show_rings !== false,
        show_labels: this._config.show_labels !== false,
        show_coordinates: Boolean(this._config.show_coordinates)
      };
      if (!this._isFormDataEqual(this._formRadarBooleans.data, data)) {
        this._formRadarBooleans.data = data;
      }
    }
    if (this._formTargets) {
      const data = {
        show_trails: this._config.show_trails !== false,
        show_last_known: this._config.show_last_known !== false,
        stale_timeout: this._config.stale_timeout ?? 10,
        trail_history_seconds: this._config.trail_history_seconds ?? 10,
        trail_max_points: this._config.trail_max_points ?? 30
      };
      if (!this._isFormDataEqual(this._formTargets.data, data)) {
        this._formTargets.data = data;
      }
    }
    if (this._formFloorplanImage) {
      const data = {
        floorplan_image: this._config.floorplan?.image ?? "",
        floorplan_width: this._config.floorplan?.width_meters ?? 10,
        floorplan_height: this._config.floorplan?.height_meters ?? 8
      };
      if (!this._isFormDataEqual(this._formFloorplanImage.data, data)) {
        this._formFloorplanImage.data = data;
      }
    }
    if (this._formAdvanced) {
      const data = {
        demo_mode: Boolean(this._config.demo_mode)
      };
      if (!this._isFormDataEqual(this._formAdvanced.data, data)) {
        this._formAdvanced.data = data;
      }
    }
    this._renderGlobalMeasurementInputs();
  }
  _renderGlobalMeasurementInputs() {
    const isImperial = this._config?.display_units === "imperial";
    if (this._radarRangeContainer) {
      const storedMeters = this._config?.range_meters ?? 6;
      if (isImperial) {
        const { feet, inches } = metersToFeetInches(storedMeters);
        this._radarRangeContainer.innerHTML = `
          <div class="pm-measurement-field">
            <label class="pm-field-label">Radar Range (ft / in)</label>
            <div class="pm-dual-input-row">
              <div class="pm-unit-input-group">
                <input type="number" class="pm-range-ft" min="3" max="65" step="1" value="${feet}" placeholder="ft" aria-label="Radar range feet" />
                <span class="pm-unit-suffix">ft</span>
              </div>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-range-in" min="0" max="11.9" step="0.5" value="${inches}" placeholder="in" aria-label="Radar range inches" />
                <span class="pm-unit-suffix">in</span>
              </div>
            </div>
            <div class="pm-field-helper">Radar visualization radius (equivalent to ${storedMeters}m).</div>
          </div>
        `;
        const ftInput = this._radarRangeContainer.querySelector(".pm-range-ft");
        const inInput = this._radarRangeContainer.querySelector(".pm-range-in");
        const onChange = () => {
          const ft = parseFloat(ftInput.value) || 0;
          const inc = parseFloat(inInput.value) || 0;
          const newMeters = feetInchesToMeters(ft, inc);
          this._updateConfig((current) => ({ ...current, range_meters: Math.max(1, newMeters) }));
        };
        ftInput.addEventListener("input", onChange);
        inInput.addEventListener("input", onChange);
      } else {
        this._radarRangeContainer.innerHTML = `
          <div class="pm-measurement-field">
            <label class="pm-field-label">Radar Range (Meters)</label>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-range-m" min="1" max="20" step="0.5" value="${storedMeters}" placeholder="m" aria-label="Radar range meters" />
              <span class="pm-unit-suffix">m</span>
            </div>
            <div class="pm-field-helper">Radar visualization radius in meters (1 to 20).</div>
          </div>
        `;
        const mInput = this._radarRangeContainer.querySelector(".pm-range-m");
        mInput.addEventListener("input", () => {
          const val = parseFloat(mInput.value);
          if (Number.isFinite(val) && val > 0) {
            this._updateConfig((current) => ({ ...current, range_meters: val }));
          }
        });
      }
    }
    if (this._floorplanDimsContainer) {
      const storedWidth = this._config?.floorplan?.width_meters ?? 10;
      const storedHeight = this._config?.floorplan?.height_meters ?? 8;
      if (isImperial) {
        const wImp = metersToFeetInches(storedWidth);
        const hImp = metersToFeetInches(storedHeight);
        this._floorplanDimsContainer.innerHTML = `
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Floor-Plan Width (ft / in)</label>
              <div class="pm-dual-input-row">
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-w-ft" min="3" max="328" step="1" value="${wImp.feet}" placeholder="ft" aria-label="Floor plan width feet" />
                  <span class="pm-unit-suffix">ft</span>
                </div>
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-w-in" min="0" max="11.9" step="0.5" value="${wImp.inches}" placeholder="in" aria-label="Floor plan width inches" />
                  <span class="pm-unit-suffix">in</span>
                </div>
              </div>
            </div>
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Floor-Plan Height (ft / in)</label>
              <div class="pm-dual-input-row">
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-h-ft" min="3" max="328" step="1" value="${hImp.feet}" placeholder="ft" aria-label="Floor plan height feet" />
                  <span class="pm-unit-suffix">ft</span>
                </div>
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-h-in" min="0" max="11.9" step="0.5" value="${hImp.inches}" placeholder="in" aria-label="Floor plan height inches" />
                  <span class="pm-unit-suffix">in</span>
                </div>
              </div>
            </div>
          </div>
        `;
        const wFt = this._floorplanDimsContainer.querySelector(".pm-fp-w-ft");
        const wIn = this._floorplanDimsContainer.querySelector(".pm-fp-w-in");
        const hFt = this._floorplanDimsContainer.querySelector(".pm-fp-h-ft");
        const hIn = this._floorplanDimsContainer.querySelector(".pm-fp-h-in");
        const onDimChange = () => {
          if (!this._config?.floorplan?.image) return;
          const newW = feetInchesToMeters(parseFloat(wFt.value) || 0, parseFloat(wIn.value) || 0);
          const newH = feetInchesToMeters(parseFloat(hFt.value) || 0, parseFloat(hIn.value) || 0);
          this._updateConfig((current) => ({
            ...current,
            floorplan: current.floorplan ? {
              ...current.floorplan,
              width_meters: Math.max(1, newW),
              height_meters: Math.max(1, newH)
            } : void 0
          }));
        };
        wFt.addEventListener("input", onDimChange);
        wIn.addEventListener("input", onDimChange);
        hFt.addEventListener("input", onDimChange);
        hIn.addEventListener("input", onDimChange);
      } else {
        this._floorplanDimsContainer.innerHTML = `
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Width (Meters)</label>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-fp-w-m" min="1" max="100" step="0.5" value="${storedWidth}" placeholder="m" aria-label="Floor plan width meters" />
                <span class="pm-unit-suffix">m</span>
              </div>
            </div>
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Height (Meters)</label>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-fp-h-m" min="1" max="100" step="0.5" value="${storedHeight}" placeholder="m" aria-label="Floor plan height meters" />
                <span class="pm-unit-suffix">m</span>
              </div>
            </div>
          </div>
        `;
        const wInput = this._floorplanDimsContainer.querySelector(".pm-fp-w-m");
        const hInput = this._floorplanDimsContainer.querySelector(".pm-fp-h-m");
        const onMetricDimChange = () => {
          if (!this._config?.floorplan?.image) return;
          const newW = parseFloat(wInput.value);
          const newH = parseFloat(hInput.value);
          this._updateConfig((current) => ({
            ...current,
            floorplan: current.floorplan ? {
              ...current.floorplan,
              width_meters: Number.isFinite(newW) && newW > 0 ? newW : current.floorplan.width_meters,
              height_meters: Number.isFinite(newH) && newH > 0 ? newH : current.floorplan.height_meters
            } : void 0
          }));
        };
        wInput.addEventListener("input", onMetricDimChange);
        hInput.addEventListener("input", onMetricDimChange);
      }
    }
  }
  _updateHassAcrossForms() {
    if (!this._hass) return;
    if (this._formGeneral) this._formGeneral.hass = this._hass;
    if (this._formRadarBooleans) this._formRadarBooleans.hass = this._hass;
    if (this._formTargets) this._formTargets.hass = this._hass;
    if (this._formFloorplanImage) this._formFloorplanImage.hass = this._hass;
    if (this._formAdvanced) this._formAdvanced.hass = this._hass;
    for (const [sensorId, entry] of this._sensorDomNodes.entries()) {
      if (entry.formMain) entry.formMain.hass = this._hass;
      if (entry.formPlacement) entry.formPlacement.hass = this._hass;
      if (entry.formBoundaries) entry.formBoundaries.hass = this._hass;
      if (entry.formAdvanced) entry.formAdvanced.hass = this._hass;
      const sensor = this._config?.sensors?.find((s) => s.id === sensorId);
      if (sensor) {
        this._renderSensorFeedback(entry, sensor);
        this._renderBoundaryFeedback(entry, sensor);
        this._populateTargetsSelector(entry, sensor);
        this._populateTrailSelector(entry, sensor);
      }
    }
  }
  _reconcileSensors() {
    if (!this._sensorListEl) return;
    const sensors = this._config?.sensors || [];
    if (this._sensorSummaryEl) {
      this._sensorSummaryEl.textContent = `(${sensors.length} configured)`;
    }
    const currentSensorIds = new Set(sensors.map((s) => s.id));
    for (const [id, entry] of this._sensorDomNodes.entries()) {
      if (!currentSensorIds.has(id)) {
        entry.root.remove();
        this._sensorDomNodes.delete(id);
      }
    }
    sensors.forEach((sensor, index) => {
      let entry = this._sensorDomNodes.get(sensor.id);
      if (!entry) {
        entry = this._createSensorDomNode(sensor);
        this._sensorDomNodes.set(sensor.id, entry);
      }
      this._sensorListEl?.appendChild(entry.root);
      this._updateSensorDomEntry(entry, sensor, index, sensors.length);
    });
  }
  _createSensorDomNode(sensor) {
    const root = document.createElement("div");
    root.className = "pm-accordion";
    root.dataset.sensorId = sensor.id;
    root.innerHTML = `
      <div class="pm-accordion-header" role="button" tabindex="0" aria-expanded="false">
        <div class="pm-header-title-group">
          <span class="pm-chevron">${CHEVRON_SVG}</span>
          <span class="pm-color-badge"></span>
          <span class="pm-header-title"></span>
          <span class="pm-header-summary"></span>
        </div>
        <div class="pm-header-actions">
          <button type="button" class="pm-icon-btn btn-move-up" title="Move Up">${ARROW_UP_SVG}</button>
          <button type="button" class="pm-icon-btn btn-move-down" title="Move Down">${ARROW_DOWN_SVG}</button>
          <button type="button" class="pm-icon-btn btn-duplicate" title="Duplicate">${COPY_SVG}</button>
          <button type="button" class="pm-icon-btn btn-remove" title="Remove">${TRASH_SVG}</button>
        </div>
      </div>
      <div class="pm-accordion-content" role="region">
        <!-- Sensor Diagnostics & Status Box -->
        <div class="pm-sensor-feedback-box">
          <div class="pm-feedback-header">Sensor Status &amp; Diagnostics</div>
          <div class="pm-feedback-list"></div>
        </div>

        <ha-form class="ha-form-sensor-main"></ha-form>

        <!-- Sensor Color Control -->
        <div class="pm-color-control-group">
          <label class="pm-field-label">Sensor Color</label>
          <div class="pm-color-input-row">
            <span class="pm-color-preview-box" title="Color Preview"></span>
            <input type="color" class="pm-native-color-picker" aria-label="Color picker" />
            <input type="text" class="pm-color-text-input" placeholder="#03a9f4" aria-label="Custom color input" />
          </div>
          <div class="pm-color-presets-row" role="group" aria-label="Preset colors">
            ${DEFAULT_PALETTE.map(
      (p) => `
              <button type="button" class="pm-color-preset-btn" data-color="${p}" style="background-color: ${p}" aria-label="Color preset ${p}" title="${p}"></button>
            `
    ).join("")}
          </div>
          <div class="pm-color-validation-msg" style="display: none;"></div>
        </div>

        <!-- Placement Subsection -->
        <div class="pm-sub-accordion" data-subsection="placement">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Placement</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <div class="pm-pos-x-container"></div>
            <div class="pm-pos-y-container"></div>
            <ha-form class="ha-form-sensor-placement"></ha-form>

            <!-- Placement Guidance Box -->
            <div class="pm-placement-guide">
              <div class="pm-guide-title">Placement &amp; Coordinate Guidance</div>
              <ul class="pm-guide-list">
                <li><strong>Coordinate Origin &amp; Directions</strong>: In radar mode, (0, 0) is centered with +X right and +Y forward/up. On floor plans, (0, 0) is at the top-left corner with +X right across width and +Y downward across height.</li>
                <li><strong>Sensor Position vs. Targets</strong>: Sensor Position (X, Y) sets the physical mounting point. Target coordinates reported by the sensor (+Y forward from face, +X right) are rotated, mirrored, and translated relative to this position.</li>
                <li><strong>Rotation (0\xB0\u2013359\xB0)</strong>: Clockwise rotation where 0\xB0 points forward/up (+Y), 90\xB0 points right (+X), 180\xB0 points down (-Y), and 270\xB0 points left (-X).</li>
                <li><strong>Mirror X / Y</strong>: Mirror X flips left/right target movement horizontally; Mirror Y flips depth/forward movement vertically (useful for inverted or ceiling mounts).</li>
                <li><strong>Field of View (FOV)</strong>: Illustrative visual coverage cone rendered on the card (default 120\xB0). It does not configure or limit physical hardware detection.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Boundaries Subsection -->
        <div class="pm-sub-accordion" data-subsection="boundaries">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Boundaries</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <ha-form class="ha-form-sensor-boundaries"></ha-form>
            <div class="pm-boundary-feedback-container"></div>
          </div>
        </div>

        <!-- Advanced Subsection -->
        <div class="pm-sub-accordion" data-subsection="advanced">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Advanced</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <ha-form class="ha-form-sensor-advanced"></ha-form>

            <!-- Targets Attribute Selector -->
            <div class="pm-attr-selector-container pm-targets-attr-container">
              <label class="pm-field-label">Targets attribute (optional)</label>
              <select class="pm-select-box pm-targets-select" aria-label="Targets attribute (optional)">
                <option value="">Default \u2014 targets</option>
              </select>
              <div class="pm-targets-custom-wrapper" style="display: none; margin-top: 6px;">
                <input type="text" class="pm-custom-text-input pm-targets-custom-input" placeholder="Custom targets attribute" aria-label="Custom targets attribute name" />
              </div>
              <div class="pm-field-helper">Attribute on the targets entity containing coordinate arrays. Leave unset to use the default 'targets' attribute.</div>
              <div class="pm-validation-badge pm-targets-validation pm-validation-none"></div>
            </div>

            <!-- Trail Source Subsection inside Advanced -->
            <div class="pm-sub-accordion" data-subsection="trail" style="margin-top: 14px;">
              <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
                <span class="pm-sub-title">Trail source</span>
                <span class="pm-chevron">${CHEVRON_SVG}</span>
              </button>
              <div class="pm-sub-accordion-content">
                <div class="pm-attr-selector-container">
                  <label class="pm-field-label">History attribute (optional)</label>
                  <select class="pm-select-box pm-trail-select" aria-label="History attribute (optional)">
                    <option value="">None \u2014 collect trails in the card</option>
                  </select>
                  <div class="pm-trail-custom-wrapper" style="display: none; margin-top: 6px;">
                    <input type="text" class="pm-custom-text-input pm-trail-custom-input" placeholder="Custom attribute name" aria-label="Custom attribute name" />
                  </div>
                  <div class="pm-field-helper">Use an attribute containing historical coordinates. Leave unset to collect trails while the card is running.</div>
                  <div class="pm-validation-badge pm-trail-validation pm-validation-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const header = root.querySelector(".pm-accordion-header");
    const headerTitle = root.querySelector(".pm-header-title");
    const headerSummary = root.querySelector(".pm-header-summary");
    const colorBadge = root.querySelector(".pm-color-badge");
    const btnMoveUp = root.querySelector(".btn-move-up");
    const btnMoveDown = root.querySelector(".btn-move-down");
    const btnDuplicate = root.querySelector(".btn-duplicate");
    const btnRemove = root.querySelector(".btn-remove");
    const feedbackBox = root.querySelector(".pm-feedback-list");
    header.addEventListener("click", () => {
      this._toggleSection(`sensor:${sensor.id}`);
    });
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._toggleSection(`sensor:${sensor.id}`);
      }
    });
    btnMoveUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this._handleMoveSensor(sensor.id, -1);
    });
    btnMoveDown.addEventListener("click", (e) => {
      e.stopPropagation();
      this._handleMoveSensor(sensor.id, 1);
    });
    btnDuplicate.addEventListener("click", (e) => {
      e.stopPropagation();
      this._handleDuplicateSensor(sensor.id);
    });
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      this._handleRemoveSensor(sensor.id);
    });
    root.querySelectorAll(".pm-sub-accordion").forEach((subAcc) => {
      const subKey = subAcc.dataset.subsection;
      if (!subKey) return;
      const subHeader = subAcc.querySelector(".pm-sub-accordion-header");
      if (!subHeader) return;
      subHeader.addEventListener("click", () => {
        this._toggleSection(`sensor:${sensor.id}:${subKey}`);
      });
      subHeader.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._toggleSection(`sensor:${sensor.id}:${subKey}`);
        }
      });
    });
    const formMain = root.querySelector(".ha-form-sensor-main");
    const formPlacement = root.querySelector(".ha-form-sensor-placement");
    const formBoundaries = root.querySelector(".ha-form-sensor-boundaries");
    const formAdvanced = root.querySelector(".ha-form-sensor-advanced");
    const colorPreviewBox = root.querySelector(".pm-color-preview-box");
    const colorPickerInput = root.querySelector(".pm-native-color-picker");
    const colorTextInput = root.querySelector(".pm-color-text-input");
    const colorPresetContainer = root.querySelector(".pm-color-presets-row");
    const colorValidationMsg = root.querySelector(".pm-color-validation-msg");
    colorPickerInput.addEventListener("input", () => {
      const val = colorPickerInput.value;
      this._updateSensorById(sensor.id, (s) => {
        s.color = val;
      });
    });
    colorTextInput.addEventListener("input", () => {
      const val = colorTextInput.value.trim();
      if (!val) return;
      const isValid = isValidColor(val);
      if (isValid) {
        colorValidationMsg.style.display = "none";
        this._updateSensorById(sensor.id, (s) => {
          s.color = val;
        });
      } else {
        colorValidationMsg.textContent = "Invalid color format (hex, rgb, hsl, or CSS name)";
        colorValidationMsg.style.display = "block";
      }
    });
    colorPresetContainer.querySelectorAll(".pm-color-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.color;
        if (color) {
          colorValidationMsg.style.display = "none";
          this._updateSensorById(sensor.id, (s) => {
            s.color = color;
          });
        }
      });
    });
    const posXContainer = root.querySelector(".pm-pos-x-container");
    const posYContainer = root.querySelector(".pm-pos-y-container");
    const boundaryFeedbackContainer = root.querySelector(
      ".pm-boundary-feedback-container"
    );
    const targetsSelect = root.querySelector(".pm-targets-select");
    const targetsCustomWrapper = root.querySelector(".pm-targets-custom-wrapper");
    const targetsCustomInput = root.querySelector(".pm-targets-custom-input");
    const targetsValidationBadge = root.querySelector(".pm-targets-validation");
    targetsSelect.addEventListener("change", () => {
      const chosen = targetsSelect.value;
      if (chosen === "__custom__") {
        targetsCustomWrapper.style.display = "block";
        targetsCustomInput.focus();
        this._updateSensorById(sensor.id, (s) => {
          s.targets_attribute = this._cleanStr(targetsCustomInput.value);
        });
      } else if (chosen === "") {
        targetsCustomWrapper.style.display = "none";
        this._updateSensorById(sensor.id, (s) => {
          delete s.targets_attribute;
        });
      } else {
        targetsCustomWrapper.style.display = "none";
        this._updateSensorById(sensor.id, (s) => {
          s.targets_attribute = chosen;
        });
      }
    });
    targetsCustomInput.addEventListener("input", () => {
      this._updateSensorById(sensor.id, (s) => {
        s.targets_attribute = this._cleanStr(targetsCustomInput.value);
      });
    });
    const trailSelect = root.querySelector(".pm-trail-select");
    const trailCustomWrapper = root.querySelector(".pm-trail-custom-wrapper");
    const trailCustomInput = root.querySelector(".pm-trail-custom-input");
    const trailValidationBadge = root.querySelector(".pm-trail-validation");
    trailSelect.addEventListener("change", () => {
      const chosen = trailSelect.value;
      if (chosen === "__custom__") {
        trailCustomWrapper.style.display = "block";
        trailCustomInput.focus();
        this._updateSensorById(sensor.id, (s) => {
          s.trail_attribute = this._cleanStr(trailCustomInput.value);
        });
      } else if (chosen === "") {
        trailCustomWrapper.style.display = "none";
        this._updateSensorById(sensor.id, (s) => {
          delete s.trail_attribute;
        });
      } else {
        trailCustomWrapper.style.display = "none";
        this._updateSensorById(sensor.id, (s) => {
          s.trail_attribute = chosen;
        });
      }
    });
    trailCustomInput.addEventListener("input", () => {
      this._updateSensorById(sensor.id, (s) => {
        s.trail_attribute = this._cleanStr(trailCustomInput.value);
      });
    });
    this._initSensorForm(formMain, SENSOR_MAIN_HA_SCHEMA, (sensorRef, val) => {
      sensorRef.name = typeof val.name === "string" && val.name.trim() ? val.name.trim() : "";
      sensorRef.targets_entity = typeof val.targets_entity === "string" ? val.targets_entity : "";
      sensorRef.occupancy_entity = this._cleanStr(val.occupancy_entity);
    });
    this._initSensorForm(formPlacement, SENSOR_PLACEMENT_HA_SCHEMA, (sensorRef, val) => {
      const posX = val.position_x !== void 0 ? val.position_x : val.x;
      const posY = val.position_y !== void 0 ? val.position_y : val.y;
      if (posX !== void 0 || posY !== void 0) {
        sensorRef.position = {
          x: this._parseNum(posX, sensorRef.position?.x ?? 0),
          y: this._parseNum(posY, sensorRef.position?.y ?? 0)
        };
      }
      sensorRef.rotation = this._parseNum(val.rotation, 0);
      sensorRef.fov = this._parseNum(val.fov, 120);
      sensorRef.mirror_x = Boolean(val.mirror_x);
      sensorRef.mirror_y = Boolean(val.mirror_y);
    });
    this._initSensorForm(formBoundaries, SENSOR_BOUNDARIES_SCHEMA, (sensorRef, val) => {
      sensorRef.boundary_prefix = this._cleanStr(val.boundary_prefix);
      sensorRef.boundary_min_x_entity = this._cleanStr(val.boundary_min_x_entity);
      sensorRef.boundary_max_x_entity = this._cleanStr(val.boundary_max_x_entity);
      sensorRef.boundary_min_y_entity = this._cleanStr(val.boundary_min_y_entity);
      sensorRef.boundary_max_y_entity = this._cleanStr(val.boundary_max_y_entity);
      sensorRef.boundary_min_z_entity = this._cleanStr(val.boundary_min_z_entity);
      sensorRef.boundary_max_z_entity = this._cleanStr(val.boundary_max_z_entity);
    });
    this._initSensorForm(formAdvanced, SENSOR_ADVANCED_SCHEMA, (sensorRef, val) => {
      const validUnits = ["mm", "cm", "m", "in", "ft"];
      sensorRef.source_units = typeof val.source_units === "string" && validUnits.includes(val.source_units) ? val.source_units : "cm";
      sensorRef.reporting_entity = this._cleanStr(val.reporting_entity);
    });
    return {
      root,
      headerTitle,
      headerSummary,
      colorBadge,
      btnMoveUp,
      btnMoveDown,
      btnDuplicate,
      btnRemove,
      feedbackBox,
      formMain,
      colorPreviewBox,
      colorPickerInput,
      colorTextInput,
      colorPresetContainer,
      colorValidationMsg,
      formPlacement,
      posXContainer,
      posYContainer,
      formBoundaries,
      boundaryFeedbackContainer,
      formAdvanced,
      targetsSelect,
      targetsCustomWrapper,
      targetsCustomInput,
      targetsValidationBadge,
      trailSelect,
      trailCustomWrapper,
      trailCustomInput,
      trailValidationBadge
    };
  }
  _initSensorForm(form, schema, updateFn) {
    form.schema = schema;
    if (this._hass) form.hass = this._hass;
    form.computeLabel = (s) => s.label || s.name;
    form.computeHelper = (s) => s.helper || "";
    form.addEventListener("value-changed", (ev) => {
      const customEv = ev;
      const sensorId = form.closest(".pm-accordion")?.getAttribute("data-sensor-id");
      if (sensorId && customEv.detail && customEv.detail.value) {
        this._updateSensorById(sensorId, (sensor) => updateFn(sensor, customEv.detail.value));
      }
    });
  }
  _updateSensorDomEntry(entry, sensor, index, totalSensors) {
    entry.headerTitle.textContent = sensor.name || "Unnamed Sensor";
    entry.headerSummary.textContent = sensor.targets_entity ? sensor.targets_entity : "No targets entity configured";
    entry.colorBadge.style.backgroundColor = sensor.color || "#03a9f4";
    entry.btnMoveUp.disabled = index === 0;
    entry.btnMoveUp.setAttribute("aria-disabled", String(index === 0));
    entry.btnMoveUp.setAttribute("aria-label", `Move ${sensor.name || "sensor"} up`);
    entry.btnMoveDown.disabled = index === totalSensors - 1;
    entry.btnMoveDown.setAttribute("aria-disabled", String(index === totalSensors - 1));
    entry.btnMoveDown.setAttribute("aria-label", `Move ${sensor.name || "sensor"} down`);
    entry.btnDuplicate.setAttribute("aria-label", `Duplicate ${sensor.name || "sensor"}`);
    entry.btnRemove.setAttribute("aria-label", `Remove ${sensor.name || "sensor"}`);
    const isExpanded = this._expandedSections.has(`sensor:${sensor.id}`);
    entry.root.classList.toggle("expanded", isExpanded);
    const headerBtn = entry.root.querySelector(".pm-accordion-header");
    if (headerBtn) {
      headerBtn.setAttribute("aria-expanded", String(isExpanded));
    }
    entry.root.querySelectorAll(".pm-sub-accordion").forEach((subAcc) => {
      const subKey = subAcc.dataset.subsection;
      if (!subKey) return;
      const isSubExpanded = this._expandedSections.has(`sensor:${sensor.id}:${subKey}`);
      subAcc.classList.toggle("expanded", isSubExpanded);
      const subHeader = subAcc.querySelector(".pm-sub-accordion-header");
      if (subHeader) {
        subHeader.setAttribute("aria-expanded", String(isSubExpanded));
      }
    });
    const mainData = {
      name: sensor.name ?? "",
      targets_entity: sensor.targets_entity ?? "",
      occupancy_entity: sensor.occupancy_entity ?? ""
    };
    if (!this._isFormDataEqual(entry.formMain.data, mainData)) {
      entry.formMain.data = mainData;
    }
    const currentColor = sensor.color || "#03a9f4";
    entry.colorPreviewBox.style.backgroundColor = currentColor;
    if (entry.colorTextInput.value !== currentColor) {
      entry.colorTextInput.value = currentColor;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(currentColor)) {
      entry.colorPickerInput.value = currentColor;
    }
    entry.colorPresetContainer.querySelectorAll(".pm-color-preset-btn").forEach((btn) => {
      const c = btn.dataset.color;
      btn.classList.toggle("active", c?.toLowerCase() === currentColor.toLowerCase());
    });
    const placementData = {
      position_x: sensor.position?.x ?? 0,
      position_y: sensor.position?.y ?? 0,
      x: sensor.position?.x ?? 0,
      y: sensor.position?.y ?? 0,
      rotation: sensor.rotation ?? 0,
      fov: sensor.fov ?? 120,
      mirror_x: Boolean(sensor.mirror_x),
      mirror_y: Boolean(sensor.mirror_y)
    };
    if (!this._isFormDataEqual(entry.formPlacement.data, placementData)) {
      entry.formPlacement.data = placementData;
    }
    this._renderSensorPositionInputs(entry, sensor);
    const boundariesData = {
      boundary_prefix: sensor.boundary_prefix ?? "",
      boundary_min_x_entity: sensor.boundary_min_x_entity ?? "",
      boundary_max_x_entity: sensor.boundary_max_x_entity ?? "",
      boundary_min_y_entity: sensor.boundary_min_y_entity ?? "",
      boundary_max_y_entity: sensor.boundary_max_y_entity ?? "",
      boundary_min_z_entity: sensor.boundary_min_z_entity ?? "",
      boundary_max_z_entity: sensor.boundary_max_z_entity ?? ""
    };
    if (!this._isFormDataEqual(entry.formBoundaries.data, boundariesData)) {
      entry.formBoundaries.data = boundariesData;
    }
    const advancedData = {
      source_units: sensor.source_units ?? "cm",
      reporting_entity: sensor.reporting_entity ?? ""
    };
    if (!this._isFormDataEqual(entry.formAdvanced.data, advancedData)) {
      entry.formAdvanced.data = advancedData;
    }
    this._renderSensorFeedback(entry, sensor);
    this._renderBoundaryFeedback(entry, sensor);
    this._populateTargetsSelector(entry, sensor);
    this._populateTrailSelector(entry, sensor);
  }
  _renderSensorPositionInputs(entry, sensor) {
    const isImperial = this._config?.display_units === "imperial";
    const currentPosX = sensor.position?.x ?? 0;
    const currentPosY = sensor.position?.y ?? 0;
    if (isImperial) {
      const impX = metersToFeetInches(currentPosX);
      const impY = metersToFeetInches(currentPosY);
      const signX = currentPosX < 0 ? "-1" : "1";
      const signY = currentPosY < 0 ? "-1" : "1";
      entry.posXContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position X (ft / in)</label>
          <div class="pm-dual-input-row">
            <select class="pm-sign-select pm-pos-x-sign" aria-label="Position X sign">
              <option value="1"${signX === "1" ? " selected" : ""}>+</option>
              <option value="-1"${signX === "-1" ? " selected" : ""}>-</option>
            </select>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-x-ft" min="0" step="1" value="${Math.abs(impX.feet)}" placeholder="ft" aria-label="Position X feet" />
              <span class="pm-unit-suffix">ft</span>
            </div>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-x-in" min="0" max="11.9" step="0.5" value="${impX.inches}" placeholder="in" aria-label="Position X inches" />
              <span class="pm-unit-suffix">in</span>
            </div>
          </div>
        </div>
      `;
      entry.posYContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position Y (ft / in)</label>
          <div class="pm-dual-input-row">
            <select class="pm-sign-select pm-pos-y-sign" aria-label="Position Y sign">
              <option value="1"${signY === "1" ? " selected" : ""}>+</option>
              <option value="-1"${signY === "-1" ? " selected" : ""}>-</option>
            </select>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-y-ft" min="0" step="1" value="${Math.abs(impY.feet)}" placeholder="ft" aria-label="Position Y feet" />
              <span class="pm-unit-suffix">ft</span>
            </div>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-y-in" min="0" max="11.9" step="0.5" value="${impY.inches}" placeholder="in" aria-label="Position Y inches" />
              <span class="pm-unit-suffix">in</span>
            </div>
          </div>
        </div>
      `;
      const signXEl = entry.posXContainer.querySelector(".pm-pos-x-sign");
      const ftXEl = entry.posXContainer.querySelector(".pm-pos-x-ft");
      const inXEl = entry.posXContainer.querySelector(".pm-pos-x-in");
      const signYEl = entry.posYContainer.querySelector(".pm-pos-y-sign");
      const ftYEl = entry.posYContainer.querySelector(".pm-pos-y-ft");
      const inYEl = entry.posYContainer.querySelector(".pm-pos-y-in");
      const onXChange = () => {
        const sign = parseInt(signXEl.value, 10) || 1;
        const ft = parseFloat(ftXEl.value) || 0;
        const inc = parseFloat(inXEl.value) || 0;
        const metersX = feetInchesToMeters(ft, inc, sign);
        this._updateSensorById(sensor.id, (s) => {
          s.position = { x: metersX, y: s.position?.y ?? 0 };
        });
      };
      const onYChange = () => {
        const sign = parseInt(signYEl.value, 10) || 1;
        const ft = parseFloat(ftYEl.value) || 0;
        const inc = parseFloat(inYEl.value) || 0;
        const metersY = feetInchesToMeters(ft, inc, sign);
        this._updateSensorById(sensor.id, (s) => {
          s.position = { x: s.position?.x ?? 0, y: metersY };
        });
      };
      signXEl.addEventListener("change", onXChange);
      ftXEl.addEventListener("input", onXChange);
      inXEl.addEventListener("input", onXChange);
      signYEl.addEventListener("change", onYChange);
      ftYEl.addEventListener("input", onYChange);
      inYEl.addEventListener("input", onYChange);
    } else {
      entry.posXContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position X (Meters)</label>
          <div class="pm-unit-input-group">
            <input type="number" class="pm-pos-x-m" step="0.1" value="${currentPosX}" placeholder="m" aria-label="Sensor position X meters" />
            <span class="pm-unit-suffix">m</span>
          </div>
        </div>
      `;
      entry.posYContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position Y (Meters)</label>
          <div class="pm-unit-input-group">
            <input type="number" class="pm-pos-y-m" step="0.1" value="${currentPosY}" placeholder="m" aria-label="Sensor position Y meters" />
            <span class="pm-unit-suffix">m</span>
          </div>
        </div>
      `;
      const mXInput = entry.posXContainer.querySelector(".pm-pos-x-m");
      const mYInput = entry.posYContainer.querySelector(".pm-pos-y-m");
      mXInput.addEventListener("input", () => {
        const val = parseFloat(mXInput.value);
        if (Number.isFinite(val)) {
          this._updateSensorById(sensor.id, (s) => {
            s.position = { x: val, y: s.position?.y ?? 0 };
          });
        }
      });
      mYInput.addEventListener("input", () => {
        const val = parseFloat(mYInput.value);
        if (Number.isFinite(val)) {
          this._updateSensorById(sensor.id, (s) => {
            s.position = { x: s.position?.x ?? 0, y: val };
          });
        }
      });
    }
  }
  _renderSensorFeedback(entry, sensor) {
    const feedbackItems = InovelliZhaAdapter.getSensorSetupFeedback(sensor, this._hass);
    entry.feedbackBox.innerHTML = feedbackItems.map((item) => {
      const icon = item.type === "success" ? "\u2713" : item.type === "info" ? "\u2139" : "\u26A0";
      return `<div class="pm-feedback-item pm-feedback-${item.type}">${icon} ${escapeHtml(item.message)}</div>`;
    }).join("");
  }
  _renderBoundaryFeedback(entry, sensor) {
    const res = InovelliZhaAdapter.resolveBoundaryDetails(sensor, this._hass);
    const rowsHtml = res.items.map((item) => {
      const sourceLabel = item.source === "explicit" ? '<span class="pm-boundary-source-tag pm-source-explicit">Explicit</span>' : item.source === "prefix" ? '<span class="pm-boundary-source-tag pm-source-prefix">Prefix</span>' : '<span class="pm-boundary-source-tag pm-source-none">Unset</span>';
      const valDisplay = item.value !== void 0 ? `${item.value} ${escapeHtml(item.unit || "")}` : `<span style="color: var(--secondary-text-color); font-style: italic;">${escapeHtml(item.error || "not found")}</span>`;
      const entityDisplay = item.resolvedEntity ? `<span class="pm-boundary-entity-name">${escapeHtml(item.resolvedEntity)}</span>` : "";
      return `
          <div class="pm-boundary-row">
            <div class="pm-boundary-label-group">
              <strong>${escapeHtml(item.label)}</strong>
              ${sourceLabel}
              ${entityDisplay}
            </div>
            <div class="pm-boundary-val">${valDisplay}</div>
          </div>
        `;
    }).join("");
    const summaryClass = res.isValid ? "pm-boundary-summary-valid" : "pm-boundary-summary-invalid";
    const summaryIcon = res.isValid ? "\u2713" : "\u26A0";
    const summaryText = res.isValid ? "Complete and valid detection boundary active" : res.error || "Boundary limits incomplete";
    entry.boundaryFeedbackContainer.innerHTML = `
      <div class="pm-boundary-feedback-title">Boundary Detection Limits Status</div>
      <div class="pm-boundary-feedback-desc">These settings read the sensor's detection limits from Home Assistant; this card does not modify them.</div>
      <div class="pm-boundary-table">
        ${rowsHtml}
      </div>
      <div class="pm-boundary-summary-badge ${summaryClass}">
        ${summaryIcon} ${escapeHtml(summaryText)}
      </div>
    `;
  }
  _populateTargetsSelector(entry, sensor) {
    const targetEntityId = sensor.targets_entity;
    const targetState = targetEntityId && this._hass?.states ? this._hass.states[targetEntityId] : void 0;
    const availableAttrs = targetState?.attributes ? Object.keys(targetState.attributes) : [];
    const currentAttr = sensor.targets_attribute || "";
    const isCustom = Boolean(
      currentAttr && currentAttr !== "targets" && !availableAttrs.includes(currentAttr)
    );
    const options = [
      { value: "", label: "Default \u2014 targets" }
    ];
    for (const attr of availableAttrs) {
      if (attr !== "targets") {
        options.push({ value: attr, label: attr });
      }
    }
    if (isCustom) {
      options.push({ value: currentAttr, label: `${currentAttr} (custom/unavailable)` });
    }
    options.push({ value: "__custom__", label: "Custom attribute name..." });
    const isEditingCustom = entry.targetsSelect.value === "__custom__" || entry.targetsCustomWrapper.style.display === "block";
    const selectedValue = isEditingCustom && !currentAttr ? "__custom__" : currentAttr;
    const newOptionsHtml = options.map(
      (opt) => `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? " selected" : ""}>${escapeHtml(opt.label)}</option>`
    ).join("");
    if (entry.targetsSelect.innerHTML !== newOptionsHtml) {
      entry.targetsSelect.innerHTML = newOptionsHtml;
    }
    entry.targetsSelect.value = selectedValue;
    if (isCustom || isEditingCustom) {
      entry.targetsCustomWrapper.style.display = "block";
      if (entry.targetsCustomInput.value !== currentAttr) {
        entry.targetsCustomInput.value = currentAttr;
      }
    } else {
      entry.targetsCustomWrapper.style.display = "none";
    }
    const validation = InovelliZhaAdapter.validateTargetsAttribute(
      sensor.targets_entity,
      sensor.targets_attribute,
      this._hass
    );
    entry.targetsValidationBadge.className = `pm-validation-badge pm-targets-validation pm-validation-${validation.status}`;
    if (validation.status === "compatible") {
      entry.targetsValidationBadge.textContent = `\u2713 ${validation.message}`;
    } else if (validation.status === "empty") {
      entry.targetsValidationBadge.textContent = `\u2139 ${validation.message}`;
    } else {
      entry.targetsValidationBadge.textContent = `\u26A0 ${validation.message}`;
    }
  }
  _populateTrailSelector(entry, sensor) {
    const targetEntityId = sensor.targets_entity;
    const targetState = targetEntityId && this._hass?.states ? this._hass.states[targetEntityId] : void 0;
    const availableAttrs = targetState?.attributes ? Object.keys(targetState.attributes) : [];
    const currentTrailAttr = sensor.trail_attribute || "";
    const isCustom = Boolean(currentTrailAttr && !availableAttrs.includes(currentTrailAttr));
    const options = [
      { value: "", label: "None \u2014 collect trails in the card" }
    ];
    for (const attr of availableAttrs) {
      options.push({ value: attr, label: attr });
    }
    if (isCustom) {
      options.push({ value: currentTrailAttr, label: `${currentTrailAttr} (custom/unavailable)` });
    }
    options.push({ value: "__custom__", label: "Custom attribute name..." });
    const isEditingCustom = entry.trailSelect.value === "__custom__" || entry.trailCustomWrapper.style.display === "block";
    const selectedValue = isEditingCustom && !currentTrailAttr ? "__custom__" : currentTrailAttr;
    const newOptionsHtml = options.map(
      (opt) => `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? " selected" : ""}>${escapeHtml(opt.label)}</option>`
    ).join("");
    if (entry.trailSelect.innerHTML !== newOptionsHtml) {
      entry.trailSelect.innerHTML = newOptionsHtml;
    }
    entry.trailSelect.value = selectedValue;
    if (isCustom || isEditingCustom) {
      entry.trailCustomWrapper.style.display = "block";
      if (entry.trailCustomInput.value !== currentTrailAttr) {
        entry.trailCustomInput.value = currentTrailAttr;
      }
    } else {
      entry.trailCustomWrapper.style.display = "none";
    }
    const validation = InovelliZhaAdapter.validateTrailAttribute(
      sensor.targets_entity,
      sensor.trail_attribute,
      this._hass
    );
    entry.trailValidationBadge.className = `pm-validation-badge pm-trail-validation pm-validation-${validation.status}`;
    if (validation.status === "compatible") {
      entry.trailValidationBadge.textContent = `\u2713 ${validation.message}`;
    } else if (validation.status === "empty") {
      entry.trailValidationBadge.textContent = `\u2139 ${validation.message}`;
    } else if (validation.status === "unsupported" || validation.status === "unavailable") {
      entry.trailValidationBadge.textContent = `\u26A0 ${validation.message}`;
    } else {
      entry.trailValidationBadge.textContent = "";
    }
  }
  _handleAddSensor() {
    const existingSensors = this._config?.sensors || [];
    const newId = generateUniqueSensorId(existingSensors, "sensor");
    const newIndex = existingSensors.length + 1;
    const newSensor = {
      id: newId,
      name: `Sensor ${newIndex}`,
      targets_entity: "",
      source_units: "cm",
      color: DEFAULT_PALETTE[(newIndex - 1) % DEFAULT_PALETTE.length],
      fov: 120,
      position: { x: 0, y: 0 },
      rotation: 0,
      mirror_x: false,
      mirror_y: false
    };
    this._updateConfig((current) => ({
      ...current,
      sensors: [...current.sensors || [], newSensor]
    }));
    this._expandedSections.add("sensors");
    this._expandedSections.add(`sensor:${newId}`);
    this._syncAccordionState("sensors");
    this._syncAccordionState(`sensor:${newId}`);
    this._reconcileSensors();
  }
  _handleDuplicateSensor(sensorId) {
    const sensors = this._config?.sensors || [];
    const index = sensors.findIndex((s) => s.id === sensorId);
    if (index === -1) return;
    const original = sensors[index];
    const newId = generateUniqueSensorId(sensors, `${original.id}_copy`);
    const duplicated = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: original.name ? `${original.name} (Copy)` : "Sensor (Copy)"
    };
    const updated = [...sensors];
    updated.splice(index + 1, 0, duplicated);
    this._updateConfig((current) => ({
      ...current,
      sensors: updated
    }));
    this._expandedSections.add("sensors");
    this._expandedSections.add(`sensor:${newId}`);
    this._syncAccordionState("sensors");
    this._syncAccordionState(`sensor:${newId}`);
    this._reconcileSensors();
  }
  _handleMoveSensor(sensorId, delta) {
    const sensors = [...this._config?.sensors || []];
    const index = sensors.findIndex((s) => s.id === sensorId);
    if (index === -1) return;
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= sensors.length) return;
    const temp = sensors[index];
    sensors[index] = sensors[targetIndex];
    sensors[targetIndex] = temp;
    this._updateConfig((current) => ({
      ...current,
      sensors
    }));
    this._reconcileSensors();
  }
  _handleRemoveSensor(sensorId) {
    const sensors = this._config?.sensors || [];
    const updated = sensors.filter((s) => s.id !== sensorId);
    this._expandedSections.delete(`sensor:${sensorId}`);
    this._expandedSections.delete(`sensor:${sensorId}:placement`);
    this._expandedSections.delete(`sensor:${sensorId}:boundaries`);
    this._expandedSections.delete(`sensor:${sensorId}:advanced`);
    this._expandedSections.delete(`sensor:${sensorId}:trail`);
    this._updateConfig((current) => ({
      ...current,
      sensors: updated
    }));
    this._reconcileSensors();
  }
  _updateSensorById(sensorId, updateFn) {
    const sensors = JSON.parse(JSON.stringify(this._config?.sensors || []));
    const target = sensors.find((s) => s.id === sensorId);
    if (!target) return;
    updateFn(target);
    this._updateConfig((current) => ({
      ...current,
      sensors
    }));
    const entry = this._sensorDomNodes.get(sensorId);
    if (entry) {
      const idx = sensors.findIndex((s) => s.id === sensorId);
      this._updateSensorDomEntry(entry, target, idx, sensors.length);
    }
  }
  _updateConfig(producer) {
    const current = this._config || { type: "custom:presence-map-card", sensors: [] };
    const next = producer({ ...current });
    this._config = next;
    this._lastEmittedConfig = JSON.parse(JSON.stringify(next));
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      })
    );
  }
  _cleanStr(val) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : void 0;
    }
    return void 0;
  }
  _parseNum(val, fallback) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() !== "") {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
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
