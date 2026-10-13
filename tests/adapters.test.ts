import { describe, it, expect } from 'vitest';
import { InovelliZhaAdapter } from '../src/adapters/inovelli';
import { HomeAssistant, SensorConfig, RawTargetData } from '../src/types';

describe('Inovelli ZHA Adapter and HA Entity Parsing', () => {
  const baseSensor: SensorConfig = {
    id: 'garage_radar',
    name: 'Garage mmWave',
    targets_entity: 'sensor.mmwave_targets',
    occupancy_entity: 'binary_sensor.garage_lights_occupancy',
    reporting_entity: 'switch.garage_reporting',
    boundary_prefix: 'number.garage_lights_mmwave_',
    source_units: 'cm',
    color: '#03a9f4',
    position: { x: 0, y: 0 },
    rotation: 0,
  };

  const now = 1700000000000;

  it('parses valid target array matching supplied Inovelli ZHA quirk data shape', () => {
    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '1',
          attributes: {
            targets: [{ x: -85, y: 102, z: -6, dop: 100, target_id: 1 }],
          },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'binary_sensor.garage_lights_occupancy': {
          entity_id: 'binary_sensor.garage_lights_occupancy',
          state: 'on',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'switch.garage_reporting': {
          entity_id: 'switch.garage_reporting',
          state: 'on',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    expect(result.available).toBe(true);
    expect(result.occupancy).toBe(true);
    expect(result.reportingEnabled).toBe(true);
    expect(result.targets).toHaveLength(1);

    const t = result.targets[0];
    expect(t.scopedId).toBe('garage_radar:1');
    expect(t.rawTargetId).toBe(1);
    expect(t.x).toBeCloseTo(-0.85);
    expect(t.y).toBeCloseTo(1.02);
    expect(t.z).toBeCloseTo(-0.06);
    expect(t.dop).toBe(100);
    expect(t.isStale).toBe(false);
  });

  it('parses single target object not wrapped in an array', () => {
    const raw = InovelliZhaAdapter.extractRawTargets({ x: 50, y: 100, target_id: 'single' });
    expect(raw).toHaveLength(1);
    expect(raw[0].target_id).toBe('single');
  });

  it('parses JSON string encoded targets attribute', () => {
    const rawJsonString = JSON.stringify([{ x: 120, y: 350, dop: -45, target_id: 'target_A' }]);
    const rawTargets = InovelliZhaAdapter.extractRawTargets(rawJsonString);
    expect(rawTargets).toHaveLength(1);
    expect(rawTargets[0].x).toBe(120);
    expect(rawTargets[0].y).toBe(350);
    expect(rawTargets[0].dop).toBe(-45);
    expect(rawTargets[0].target_id).toBe('target_A');
  });

  it('gracefully handles empty, invalid, and malformed target values', () => {
    expect(InovelliZhaAdapter.extractRawTargets(null)).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets(undefined)).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('none')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('unavailable')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('unknown')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('not-json-content')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets(12345)).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets([{ invalid: 'no coordinates' }])).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets([{ x: 'invalid', y: 100 }])).toEqual([]);
  });

  it('resolves timestamp from explicit target timestamp, last_target_update, or entity last_updated', () => {
    const rawTarget1: RawTargetData = { x: 0, y: 0, target_id: 1, timestamp: 1700000005000 };
    expect(InovelliZhaAdapter.resolveTimestamp(rawTarget1, undefined, 100)).toBe(1700000005000);

    const rawTarget2: RawTargetData = {
      x: 0,
      y: 0,
      target_id: 1,
      timestamp: '2026-10-13T12:00:00Z',
    };
    expect(InovelliZhaAdapter.resolveTimestamp(rawTarget2, undefined, 100)).toBe(
      Date.parse('2026-10-13T12:00:00Z')
    );

    const rawTarget3: RawTargetData = { x: 0, y: 0, target_id: 1 };
    const entityState1: any = {
      attributes: { last_target_update: '2026-10-13T12:30:00Z' },
    };
    expect(InovelliZhaAdapter.resolveTimestamp(rawTarget3, entityState1, 100)).toBe(
      Date.parse('2026-10-13T12:30:00Z')
    );

    const entityState2: any = {
      attributes: {},
      last_updated: '2026-10-13T12:45:00Z',
    };
    expect(InovelliZhaAdapter.resolveTimestamp(rawTarget3, entityState2, 100)).toBe(
      Date.parse('2026-10-13T12:45:00Z')
    );

    expect(InovelliZhaAdapter.resolveTimestamp(rawTarget3, undefined, 9999)).toBe(9999);
  });

  it('handles occupancy-clear by returning 0 active targets even if target coordinates remain', () => {
    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '0',
          attributes: {
            targets: [{ x: 50, y: 100, target_id: 1 }],
          },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'binary_sensor.garage_lights_occupancy': {
          entity_id: 'binary_sensor.garage_lights_occupancy',
          state: 'off',
          attributes: {},
          last_changed: '2026-10-13T12:05:00Z',
          last_updated: '2026-10-13T12:05:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    expect(result.occupancy).toBe(false);
    expect(result.targets).toHaveLength(0);
  });

  it('handles reporting-switch disabled by returning 0 active targets', () => {
    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '1',
          attributes: {
            targets: [{ x: 50, y: 100, target_id: 1 }],
          },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'switch.garage_reporting': {
          entity_id: 'switch.garage_reporting',
          state: 'off',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    expect(result.reportingEnabled).toBe(false);
    expect(result.targets).toHaveLength(0);
  });

  it('marks sensor unavailable when target entity is missing or unavailable', () => {
    const hass1: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: 'unavailable',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const res1 = InovelliZhaAdapter.parseSensor(baseSensor, hass1, now);
    expect(res1.available).toBe(false);

    const hass2: HomeAssistant = { states: {} };
    const res2 = InovelliZhaAdapter.parseSensor(baseSensor, hass2, now);
    expect(res2.available).toBe(false);
    expect(res2.error).toContain('is unavailable or not found');
  });

  it('extracts detection boundaries using alternate suffix names', () => {
    const hass: HomeAssistant = {
      states: {
        'number.garage_lights_mmwave_min_x': {
          entity_id: 'number.garage_lights_mmwave_min_x',
          state: '-100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_max_x': {
          entity_id: 'number.garage_lights_mmwave_max_x',
          state: '100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_min_y': {
          entity_id: 'number.garage_lights_mmwave_min_y',
          state: '10',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_max_y': {
          entity_id: 'number.garage_lights_mmwave_max_y',
          state: '200',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const boundary = InovelliZhaAdapter.extractBoundary(baseSensor, hass);
    expect(boundary).toBeDefined();
    expect(boundary?.minX).toBe(-100);
    expect(boundary?.maxX).toBe(100);

    // Sensor without boundary prefix returns undefined
    expect(
      InovelliZhaAdapter.extractBoundary({ ...baseSensor, boundary_prefix: undefined }, hass)
    ).toBeUndefined();
  });

  it('supports source_units in meters and custom target attribute name', () => {
    const sensorMeters: SensorConfig = {
      ...baseSensor,
      source_units: 'm',
      targets_attribute: 'custom_targets',
      position: { x: 1, y: 2 },
    };

    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '1',
          attributes: {
            custom_targets: [{ x: 1.5, y: 3.0, z: 0.5, target_id: 'm1' }],
          },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const res = InovelliZhaAdapter.parseSensor(sensorMeters, hass, now);
    expect(res.targets).toHaveLength(1);
    expect(res.targets[0].x).toBe(1.5);
    expect(res.targets[0].y).toBe(3.0);
    expect(res.targets[0].z).toBe(0.5);
    expect(res.targets[0].worldX).toBeCloseTo(2.5); // 1 + 1.5
    expect(res.targets[0].worldY).toBeCloseTo(5.0); // 2 + 3.0
  });
});
