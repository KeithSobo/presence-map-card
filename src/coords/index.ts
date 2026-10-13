import {
  UnitOfLength,
  DisplayUnits,
  SensorPosition,
  DetectionBoundary,
  BoundaryStatus,
} from '../types';

export const UNIT_TO_METERS: Record<UnitOfLength, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1.0,
  in: 0.0254,
  ft: 0.3048,
};

export function toMeters(val: number, unit: UnitOfLength = 'cm'): number {
  const factor = UNIT_TO_METERS[unit] ?? 0.01;
  return val * factor;
}

export function fromMeters(
  meters: number,
  target: DisplayUnits
): { value: number; unitLabel: string } {
  if (target === 'imperial') {
    const feet = meters / 0.3048;
    return { value: feet, unitLabel: 'ft' };
  }
  return { value: meters, unitLabel: 'm' };
}

export function formatFeetInches(meters: number): string {
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

export function formatDistance(meters: number, units: DisplayUnits): string {
  if (units === 'imperial') {
    return formatFeetInches(meters);
  }
  return `${meters.toFixed(1)} m`;
}

export interface TransformParams {
  position?: SensorPosition;
  rotation?: number; // degrees clockwise
  mirrorX?: boolean;
  mirrorY?: boolean;
  sourceUnits?: UnitOfLength;
}

/**
 * Transforms sensor-relative raw coordinates (where +y is forward, +x is right)
 * to world Cartesian coordinates (in meters).
 */
export function transformToWorld(
  rawX: number,
  rawY: number,
  params: TransformParams
): { worldX: number; worldY: number; localX: number; localY: number } {
  const sourceUnits = params.sourceUnits ?? 'cm';
  let lx = toMeters(rawX, sourceUnits);
  let ly = toMeters(rawY, sourceUnits);

  if (params.mirrorX) {
    lx = -lx;
  }
  if (params.mirrorY) {
    ly = -ly;
  }

  const deg = params.rotation ?? 0;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Clockwise rotation where +y is forward, +x is right
  const rx = lx * cos + ly * sin;
  const ry = -lx * sin + ly * cos;

  const posX = params.position?.x ?? 0;
  const posY = params.position?.y ?? 0;

  return {
    worldX: posX + rx,
    worldY: posY + ry,
    localX: lx,
    localY: ly,
  };
}

/**
 * Validates whether a detection boundary has all 4 required x/y bounds,
 * non-reversed ranges, and valid height bounds if present.
 */
export function isValidBoundary(boundary?: DetectionBoundary): boolean {
  if (!boundary) return false;
  const { minX, maxX, minY, maxY, minZ, maxZ } = boundary;

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return false;
  }

  if (minX > maxX || minY > maxY) {
    return false;
  }

  // If height limits are present, validate them
  if (minZ !== undefined && maxZ !== undefined) {
    if (!Number.isFinite(minZ) || !Number.isFinite(maxZ) || minZ > maxZ) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates whether a target coordinate (in sensor source units) falls inside,
 * outside, or unverified relative to a detection boundary.
 */
export function evaluateBoundaryContainment(
  targetLocal: { x: number; y: number; z?: number },
  boundary?: DetectionBoundary
): BoundaryStatus {
  if (!isValidBoundary(boundary) || !boundary) {
    return 'none';
  }

  const in2D =
    targetLocal.x >= boundary.minX &&
    targetLocal.x <= boundary.maxX &&
    targetLocal.y >= boundary.minY &&
    targetLocal.y <= boundary.maxY;

  if (!in2D) {
    return 'outside';
  }

  // 3D Height evaluation if configured
  const hasHeightConfig = boundary.minZ !== undefined || boundary.maxZ !== undefined;
  if (hasHeightConfig) {
    if (
      boundary.minZ === undefined ||
      boundary.maxZ === undefined ||
      targetLocal.z === undefined ||
      !Number.isFinite(targetLocal.z)
    ) {
      // Required height value or target z coordinate is missing -> unverified
      return 'unverified';
    }

    if (targetLocal.z >= boundary.minZ && targetLocal.z <= boundary.maxZ) {
      return 'inside';
    }
    return 'outside';
  }

  return 'inside';
}

/**
 * Computes the 4 corners of a detection boundary box in world coordinates (meters).
 * Uses the exact same transform pipeline as target coordinates.
 */
export function transformBoundaryBox(
  boundary: DetectionBoundary,
  params: TransformParams
): Array<{ x: number; y: number }> {
  if (!isValidBoundary(boundary)) {
    return [];
  }

  const { minX, maxX, minY, maxY } = boundary;

  const localCorners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  return localCorners.map(pt => {
    const res = transformToWorld(pt.x, pt.y, params);
    return { x: res.worldX, y: res.worldY };
  });
}
