import { UnitOfLength, DisplayUnits, SensorPosition, DetectionBoundary } from '../types';

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

export function formatDistance(meters: number, units: DisplayUnits): string {
  const converted = fromMeters(meters, units);
  return `${converted.value.toFixed(1)} ${converted.unitLabel}`;
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
 * Computes the 4 corners of a detection boundary box in world coordinates.
 */
export function transformBoundaryBox(
  boundary: DetectionBoundary,
  params: TransformParams
): Array<{ x: number; y: number }> {
  const minX = boundary.minX ?? 0;
  const maxX = boundary.maxX ?? 0;
  const minY = boundary.minY ?? 0;
  const maxY = boundary.maxY ?? 0;

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
