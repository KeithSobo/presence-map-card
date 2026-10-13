import { describe, it, expect } from 'vitest';
import {
  toMeters,
  fromMeters,
  formatDistance,
  transformToWorld,
  transformBoundaryBox,
} from '../src/coords';

describe('Coordinate Transforms and Unit Conversions', () => {
  describe('Unit conversions to meters', () => {
    it('converts millimeters to meters', () => {
      expect(toMeters(1000, 'mm')).toBeCloseTo(1.0);
    });

    it('converts centimeters to meters', () => {
      expect(toMeters(100, 'cm')).toBeCloseTo(1.0);
      expect(toMeters(250, 'cm')).toBeCloseTo(2.5);
    });

    it('converts meters to meters', () => {
      expect(toMeters(5, 'm')).toBe(5.0);
    });

    it('converts inches to meters', () => {
      expect(toMeters(39.3701, 'in')).toBeCloseTo(1.0, 3);
    });

    it('converts feet to meters', () => {
      expect(toMeters(10, 'ft')).toBeCloseTo(3.048, 3);
    });

    it('falls back to centimeters for unrecognized unit', () => {
      expect(toMeters(100, 'unknown' as any)).toBeCloseTo(1.0);
    });
  });

  describe('Display unit conversions from meters', () => {
    it('formats metric distances', () => {
      const res = fromMeters(2.5, 'metric');
      expect(res.value).toBe(2.5);
      expect(res.unitLabel).toBe('m');
      expect(formatDistance(2.5, 'metric')).toBe('2.5 m');
    });

    it('formats imperial distances', () => {
      const res = fromMeters(3.048, 'imperial');
      expect(res.value).toBeCloseTo(10.0, 1);
      expect(res.unitLabel).toBe('ft');
      expect(formatDistance(3.048, 'imperial')).toBe('10.0 ft');
    });
  });

  describe('Planar Coordinate Transforms (Translation, Rotation, Mirroring)', () => {
    it('handles default empty params with defaults', () => {
      const result = transformToWorld(100, 200, {});
      expect(result.localX).toBeCloseTo(1.0);
      expect(result.localY).toBeCloseTo(2.0);
      expect(result.worldX).toBeCloseTo(1.0);
      expect(result.worldY).toBeCloseTo(2.0);
    });

    it('keeps forward target unchanged at 0 deg rotation and 0 origin', () => {
      const result = transformToWorld(0, 200, {
        sourceUnits: 'cm',
        rotation: 0,
        position: { x: 0, y: 0 },
      });

      expect(result.localX).toBeCloseTo(0);
      expect(result.localY).toBeCloseTo(2.0);
      expect(result.worldX).toBeCloseTo(0);
      expect(result.worldY).toBeCloseTo(2.0);
    });

    it('rotates 90 degrees clockwise (forward points right +X)', () => {
      const result = transformToWorld(0, 200, {
        sourceUnits: 'cm',
        rotation: 90,
        position: { x: 0, y: 0 },
      });

      expect(result.worldX).toBeCloseTo(2.0);
      expect(result.worldY).toBeCloseTo(0);
    });

    it('rotates 180 degrees clockwise (forward points down -Y)', () => {
      const result = transformToWorld(0, 200, {
        sourceUnits: 'cm',
        rotation: 180,
        position: { x: 0, y: 0 },
      });

      expect(result.worldX).toBeCloseTo(0);
      expect(result.worldY).toBeCloseTo(-2.0);
    });

    it('rotates 270 degrees clockwise (forward points left -X)', () => {
      const result = transformToWorld(0, 200, {
        sourceUnits: 'cm',
        rotation: 270,
        position: { x: 0, y: 0 },
      });

      expect(result.worldX).toBeCloseTo(-2.0);
      expect(result.worldY).toBeCloseTo(0);
    });

    it('applies sensor translation offset', () => {
      const result = transformToWorld(0, 200, {
        sourceUnits: 'cm',
        rotation: 0,
        position: { x: 5, y: 3 },
      });

      expect(result.worldX).toBeCloseTo(5.0);
      expect(result.worldY).toBeCloseTo(5.0);
    });

    it('applies horizontal and vertical mirroring independently', () => {
      const mx = transformToWorld(100, 200, { mirrorX: true });
      expect(mx.localX).toBeCloseTo(-1.0);
      expect(mx.localY).toBeCloseTo(2.0);

      const my = transformToWorld(100, 200, { mirrorY: true });
      expect(my.localX).toBeCloseTo(1.0);
      expect(my.localY).toBeCloseTo(-2.0);
    });
  });

  describe('Detection Boundary Box Transforms', () => {
    it('computes 4 world corners for boundary box with defaults', () => {
      const boundary = {
        minX: -100,
        maxX: 100,
        minY: 50,
        maxY: 250,
      };

      const corners = transformBoundaryBox(boundary, {
        sourceUnits: 'cm',
        rotation: 0,
        position: { x: 0, y: 0 },
      });

      expect(corners).toHaveLength(4);
      expect(corners[0]).toEqual({ x: -1.0, y: 0.5 });
      expect(corners[1]).toEqual({ x: 1.0, y: 0.5 });
      expect(corners[2]).toEqual({ x: 1.0, y: 2.5 });
      expect(corners[3]).toEqual({ x: -1.0, y: 2.5 });
    });

    it('handles empty boundary object with 0 defaults', () => {
      const corners = transformBoundaryBox({}, {});
      expect(corners).toHaveLength(4);
      expect(corners[0]).toEqual({ x: 0, y: 0 });
    });
  });
});
