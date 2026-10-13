import { describe, it, expect } from 'vitest';
import { validateConfig, getStubConfig, DEFAULT_PALETTE } from '../src/config';

describe('Configuration Validator and Defaults', () => {
  it('rejects null or non-object configs', () => {
    const res1 = validateConfig(null);
    expect(res1.valid).toBe(false);
    expect(res1.errors.length).toBeGreaterThan(0);

    const res2 = validateConfig('invalid');
    expect(res2.valid).toBe(false);
  });

  it('rejects configs with empty sensors when demo_mode is false', () => {
    const res = validateConfig({ type: 'custom:presence-map-card', sensors: [] });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('At least one sensor');
  });

  it('accepts empty sensors when demo_mode is true', () => {
    const res = validateConfig({ type: 'custom:presence-map-card', demo_mode: true });
    expect(res.valid).toBe(true);
    expect(res.config.demo_mode).toBe(true);
  });

  it('normalizes valid configuration with defaults', () => {
    const raw = {
      type: 'custom:presence-map-card',
      title: 'Hallway Radar',
      sensors: [
        {
          targets_entity: 'sensor.inovelli_targets',
        },
      ],
    };

    const { valid, config } = validateConfig(raw);
    expect(valid).toBe(true);
    expect(config.title).toBe('Hallway Radar');
    expect(config.display_units).toBe('metric');
    expect(config.theme).toBe('auto');
    expect(config.stale_timeout).toBe(10);
    expect(config.range_meters).toBe(6);
    expect(config.show_rings).toBe(true);
    expect(config.show_trails).toBe(true);
    expect(config.show_labels).toBe(true);
    expect(config.show_boundaries).toBe(true);
    expect(config.trail_history_seconds).toBe(10);
    expect(config.trail_max_points).toBe(30);

    expect(config.sensors).toHaveLength(1);
    const sensor = config.sensors![0];
    expect(sensor.id).toBe('sensor_1');
    expect(sensor.name).toBe('Sensor 1');
    expect(sensor.source_units).toBe('cm');
    expect(sensor.color).toBe(DEFAULT_PALETTE[0]);
    expect(sensor.fov).toBe(120);
    expect(sensor.max_distance).toBe(6);
    expect(sensor.position).toEqual({ x: 0, y: 0 });
    expect(sensor.rotation).toBe(0);
    expect(sensor.mirror_x).toBe(false);
    expect(sensor.mirror_y).toBe(false);
  });

  it('parses custom floorplan settings and handles fallback defaults for floorplan', () => {
    const raw = {
      type: 'custom:presence-map-card',
      floorplan: {
        image: '/local/house.png',
        width_meters: 15,
        height_meters: 12,
      },
      sensors: [{ id: 's1', targets_entity: 'sensor.target' }],
    };

    const { valid, config } = validateConfig(raw);
    expect(valid).toBe(true);
    expect(config.floorplan).toBeDefined();
    expect(config.floorplan?.image).toBe('/local/house.png');
    expect(config.floorplan?.width_meters).toBe(15);
    expect(config.floorplan?.height_meters).toBe(12);

    // Floorplan with missing or invalid width/height uses defaults
    const raw2 = {
      type: 'custom:presence-map-card',
      floorplan: {
        image: '/local/house.png',
        width_meters: -5,
        height_meters: 0,
      },
      sensors: [{ id: 's1', targets_entity: 'sensor.target' }],
    };
    const res2 = validateConfig(raw2);
    expect(res2.config.floorplan?.width_meters).toBe(10);
    expect(res2.config.floorplan?.height_meters).toBe(8);

    // Floorplan with empty image is ignored
    const raw3 = {
      type: 'custom:presence-map-card',
      floorplan: { image: '   ' },
      sensors: [{ id: 's1', targets_entity: 'sensor.target' }],
    };
    expect(validateConfig(raw3).config.floorplan).toBeUndefined();
  });

  it('handles negative or invalid numbers by reverting to defaults', () => {
    const raw = {
      type: 'custom:presence-map-card',
      stale_timeout: -5,
      range_meters: -1,
      trail_history_seconds: 0,
      trail_max_points: -10,
      sensors: [
        {
          id: '   ',
          name: '   ',
          targets_entity: 'sensor.test',
          source_units: 'invalid_unit',
          fov: 400, // > 360 -> defaults to 120
          max_distance: -5,
        },
      ],
    };

    const { config } = validateConfig(raw);
    expect(config.stale_timeout).toBe(10);
    expect(config.range_meters).toBe(6);
    expect(config.trail_history_seconds).toBe(10);
    expect(config.trail_max_points).toBe(30);

    const s = config.sensors![0];
    expect(s.id).toBe('sensor_1');
    expect(s.name).toBe('Sensor 1');
    expect(s.source_units).toBe('cm');
    expect(s.fov).toBe(120);
    expect(s.max_distance).toBe(6);
  });

  it('normalizes imperial display units and light/dark theme overrides', () => {
    const raw = {
      type: 'custom:presence-map-card',
      display_units: 'imperial',
      theme: 'dark',
      sensors: [{ id: 's1', targets_entity: 'sensor.target' }],
    };

    const { config } = validateConfig(raw);
    expect(config.display_units).toBe('imperial');
    expect(config.theme).toBe('dark');
  });

  it('provides a valid stub configuration for Lovelace card picker', () => {
    const stub = getStubConfig();
    expect(stub.type).toBe('custom:presence-map-card');
    expect(stub.title).toBe('PresenceMap');
    expect(stub.sensors).toBeDefined();
    expect(stub.sensors!.length).toBeGreaterThan(0);
    expect(stub.sensors![0].targets_entity).toBe('sensor.mmwave_targets');
  });
});
