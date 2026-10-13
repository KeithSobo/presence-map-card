import { describe, it, expect } from 'vitest';
import {
  toMeters,
  fromMeters,
  formatDistance,
  formatFeetInches,
  transformToWorld,
  transformBoundaryBox,
  isValidBoundary,
  evaluateBoundaryContainment,
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

    it('formats imperial distances in feet and inches', () => {
      // 1 meter = ~3' 3"
      expect(formatFeetInches(1.0)).toBe('3\' 3"');
      expect(formatDistance(1.0, 'imperial')).toBe('3\' 3"');

      // 3.048 meters = 10'
      expect(formatFeetInches(3.048)).toBe("10'");
      expect(formatDistance(3.048, 'imperial')).toBe("10'");

      // Small distance < 1 ft
      expect(formatFeetInches(0.1524)).toBe('6"');
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

  describe('Detection Boundary Validation and Containment', () => {
    it('validates detection boundary correctly and rejects invalid or reversed ranges', () => {
      expect(isValidBoundary(undefined)).toBe(false);
      expect(isValidBoundary({ minX: 0, maxX: 100, minY: 0 } as any)).toBe(false);
      // Reversed x
      expect(isValidBoundary({ minX: 100, maxX: 0, minY: 0, maxY: 100 })).toBe(false);
      // Reversed y
      expect(isValidBoundary({ minX: -50, maxX: 50, minY: 100, maxY: 0 })).toBe(false);
      // Reversed z
      expect(
        isValidBoundary({ minX: -50, maxX: 50, minY: 0, maxY: 100, minZ: 200, maxZ: 100 })
      ).toBe(false);
      // Valid
      expect(isValidBoundary({ minX: -50, maxX: 50, minY: 0, maxY: 100 })).toBe(true);
      expect(isValidBoundary({ minX: -50, maxX: 50, minY: 0, maxY: 100, minZ: 0, maxZ: 200 })).toBe(
        true
      );
    });

    it('evaluates 2D and 3D containment correctly', () => {
      const b2D = { minX: -100, maxX: 100, minY: 0, maxY: 200 };
      expect(evaluateBoundaryContainment({ x: 0, y: 100 }, b2D)).toBe('inside');
      expect(evaluateBoundaryContainment({ x: 150, y: 100 }, b2D)).toBe('outside');

      const b3D = { minX: -100, maxX: 100, minY: 0, maxY: 200, minZ: -50, maxZ: 150 };
      // Inside 3D
      expect(evaluateBoundaryContainment({ x: 0, y: 100, z: 20 }, b3D)).toBe('inside');
      // Outside 3D because of height
      expect(evaluateBoundaryContainment({ x: 0, y: 100, z: 200 }, b3D)).toBe('outside');
      // Missing target z coordinate when 3D boundary is configured -> unverified
      expect(evaluateBoundaryContainment({ x: 0, y: 100 }, b3D)).toBe('unverified');
    });

    it('computes 4 world corners for valid boundary box and empty array for invalid', () => {
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

      expect(transformBoundaryBox({ minX: 100, maxX: 0, minY: 0, maxY: 100 }, {})).toEqual([]);
    });
  });
});
