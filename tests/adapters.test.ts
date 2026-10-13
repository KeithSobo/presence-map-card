import { describe, it, expect } from 'vitest';
import { InovelliZhaAdapter } from '../src/adapters/inovelli';
import { HomeAssistant, SensorConfig } from '../src/types';

describe('Inovelli ZHA Adapter and HA Entity Parsing', () => {
  const baseSensor: SensorConfig = {
    id: 'garage_radar',
    name: 'Garage mmWave',
    targets_entity: 'sensor.mmwave_targets',
    occupancy_entity: 'binary_sensor.garage_lights_occupancy',
    reporting_entity: 'switch.garage_reporting',
    boundary_prefix: 'number.garage_lights_mmwave_',
    source_units: 'cm',
    color: '#0284c7',
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
    expect(result.occupancyStatus).toBe('occupied');
    expect(result.reportingStatus).toBe('enabled');
    expect(result.targets).toHaveLength(1);

    const t = result.targets[0];
    expect(t.scopedId).toBe('garage_radar:1');
    expect(t.rawTargetId).toBe(1);
    expect(t.sourceX).toBe(-85);
    expect(t.sourceY).toBe(102);
    expect(t.sourceZ).toBe(-6);
    expect(t.x).toBeCloseTo(-0.85);
    expect(t.y).toBeCloseTo(1.02);
    expect(t.z).toBeCloseTo(-0.06);
    expect(t.dop).toBe(100);
    expect(t.isStale).toBe(false);
  });

  it('parses actual Inovelli boundary entity naming scheme from prefix', () => {
    const hass: HomeAssistant = {
      states: {
        'number.garage_lights_mmwave_width_minimum_left': {
          entity_id: 'number.garage_lights_mmwave_width_minimum_left',
          state: '-150',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_width_maximum_right': {
          entity_id: 'number.garage_lights_mmwave_width_maximum_right',
          state: '150',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_minimum_near': {
          entity_id: 'number.garage_lights_mmwave_depth_minimum_near',
          state: '20',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_maximum_far': {
          entity_id: 'number.garage_lights_mmwave_depth_maximum_far',
          state: '450',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_height_minimum_floor': {
          entity_id: 'number.garage_lights_mmwave_height_minimum_floor',
          state: '-50',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_height_maximum_ceiling': {
          entity_id: 'number.garage_lights_mmwave_height_maximum_ceiling',
          state: '250',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const boundary = InovelliZhaAdapter.extractBoundary(baseSensor, hass);
    expect(boundary).toBeDefined();
    expect(boundary?.minX).toBe(-150);
    expect(boundary?.maxX).toBe(150);
    expect(boundary?.minY).toBe(20);
    expect(boundary?.maxY).toBe(450);
    expect(boundary?.minZ).toBe(-50);
    expect(boundary?.maxZ).toBe(250);
  });

  it('gives explicit boundary entity overrides precedence over prefix discovery', () => {
    const customSensor: SensorConfig = {
      ...baseSensor,
      boundary_prefix: 'number.garage_lights_mmwave_',
      boundary_min_x_entity: 'number.custom_left_bound',
      boundary_max_x_entity: 'number.custom_right_bound',
    };

    const hass: HomeAssistant = {
      states: {
        // Prefix entity has -150
        'number.garage_lights_mmwave_width_minimum_left': {
          entity_id: 'number.garage_lights_mmwave_width_minimum_left',
          state: '-150',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        // Explicit override has -200
        'number.custom_left_bound': {
          entity_id: 'number.custom_left_bound',
          state: '-200',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.custom_right_bound': {
          entity_id: 'number.custom_right_bound',
          state: '200',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_minimum_near': {
          entity_id: 'number.garage_lights_mmwave_depth_minimum_near',
          state: '0',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_maximum_far': {
          entity_id: 'number.garage_lights_mmwave_depth_maximum_far',
          state: '300',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const boundary = InovelliZhaAdapter.extractBoundary(customSensor, hass);
    expect(boundary).toBeDefined();
    // Precedence: explicit override value is used
    expect(boundary?.minX).toBe(-200);
    expect(boundary?.maxX).toBe(200);
  });

  it('rejects reversed boundary ranges and incomplete boundary coordinates', () => {
    // Incomplete (only 3 of 4 x/y coordinates provided)
    const incompleteHass: HomeAssistant = {
      states: {
        'number.garage_lights_mmwave_width_minimum_left': {
          entity_id: 'number.garage_lights_mmwave_width_minimum_left',
          state: '-100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_width_maximum_right': {
          entity_id: 'number.garage_lights_mmwave_width_maximum_right',
          state: '100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_minimum_near': {
          entity_id: 'number.garage_lights_mmwave_depth_minimum_near',
          state: '50',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        // Missing max_y!
      },
    };
    expect(InovelliZhaAdapter.extractBoundary(baseSensor, incompleteHass)).toBeUndefined();

    // Reversed range (minX > maxX)
    const reversedHass: HomeAssistant = {
      states: {
        'number.garage_lights_mmwave_width_minimum_left': {
          entity_id: 'number.garage_lights_mmwave_width_minimum_left',
          state: '150', // Reversed!
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_width_maximum_right': {
          entity_id: 'number.garage_lights_mmwave_width_maximum_right',
          state: '-150',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_minimum_near': {
          entity_id: 'number.garage_lights_mmwave_depth_minimum_near',
          state: '20',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_maximum_far': {
          entity_id: 'number.garage_lights_mmwave_depth_maximum_far',
          state: '450',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };
    expect(InovelliZhaAdapter.extractBoundary(baseSensor, reversedHass)).toBeUndefined();
  });

  it('classifies targets inside, outside, or unverified with height limits', () => {
    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '2',
          attributes: {
            targets: [
              { x: -50, y: 150, z: 20, target_id: 1 }, // Inside 3D
              { x: -50, y: 150, z: 300, target_id: 2 }, // Outside 3D (too high)
              { x: -50, y: 150, target_id: 3 }, // Missing z coordinate -> unverified!
              { x: 250, y: 150, z: 20, target_id: 4 }, // Outside 2D
            ],
          },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_width_minimum_left': {
          entity_id: 'number.garage_lights_mmwave_width_minimum_left',
          state: '-100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_width_maximum_right': {
          entity_id: 'number.garage_lights_mmwave_width_maximum_right',
          state: '100',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_minimum_near': {
          entity_id: 'number.garage_lights_mmwave_depth_minimum_near',
          state: '50',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_depth_maximum_far': {
          entity_id: 'number.garage_lights_mmwave_depth_maximum_far',
          state: '300',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_height_minimum_floor': {
          entity_id: 'number.garage_lights_mmwave_height_minimum_floor',
          state: '0',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'number.garage_lights_mmwave_height_maximum_ceiling': {
          entity_id: 'number.garage_lights_mmwave_height_maximum_ceiling',
          state: '200',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const res = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    expect(res.targets).toHaveLength(4);
    expect(res.targets[0].boundaryStatus).toBe('inside');
    expect(res.targets[1].boundaryStatus).toBe('outside');
    expect(res.targets[2].boundaryStatus).toBe('unverified');
    expect(res.targets[3].boundaryStatus).toBe('outside');
  });

  it('keeps fresh coordinates when occupancy sensor is unknown or unavailable', () => {
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
        'binary_sensor.garage_lights_occupancy': {
          entity_id: 'binary_sensor.garage_lights_occupancy',
          state: 'unknown', // Unknown occupancy
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    // Unknown occupancy must NOT erase valid, fresh coordinates!
    expect(result.occupancyStatus).toBe('unknown');
    expect(result.targets).toHaveLength(1);
  });

  it('handles reporting switch unknown/unavailable without suppressing fresh targets', () => {
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
          state: 'unavailable', // Switch unavailable
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(baseSensor, hass, now);
    expect(result.reportingStatus).toBe('unknown');
    expect(result.targets).toHaveLength(1);
  });

  it('returns all monitored entity IDs including boundary prefix discovery entities', () => {
    const monitored = InovelliZhaAdapter.getMonitoredEntityIds(baseSensor);
    expect(monitored).toContain('sensor.mmwave_targets');
    expect(monitored).toContain('binary_sensor.garage_lights_occupancy');
    expect(monitored).toContain('switch.garage_reporting');
    expect(monitored).toContain('number.garage_lights_mmwave_width_minimum_left');
    expect(monitored).toContain('number.garage_lights_mmwave_width_maximum_right');
    expect(monitored).toContain('number.garage_lights_mmwave_depth_minimum_near');
    expect(monitored).toContain('number.garage_lights_mmwave_depth_maximum_far');
  });

  it('handles occupancy-clear by returning retained targets marked as last-known / stale', () => {
    const thirtyNineMinutesAgo = now - 39 * 60 * 1000;
    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '0',
          attributes: {
            targets: [{ x: 50, y: 100, target_id: 1, timestamp: thirtyNineMinutesAgo }],
            trail: [
              { x: 40, y: 90 },
              { x: 45, y: 95 },
              { x: 50, y: 100 },
            ],
          },
          last_changed: new Date(thirtyNineMinutesAgo).toISOString(),
          last_updated: new Date(thirtyNineMinutesAgo).toISOString(),
        },
        'binary_sensor.garage_lights_occupancy': {
          entity_id: 'binary_sensor.garage_lights_occupancy',
          state: 'off',
          attributes: {},
          last_changed: new Date(thirtyNineMinutesAgo + 60000).toISOString(),
          last_updated: new Date(thirtyNineMinutesAgo + 60000).toISOString(),
        },
      },
    };

    const garageWithTrail: SensorConfig = {
      ...baseSensor,
      trail_attribute: 'trail',
    };

    const result = InovelliZhaAdapter.parseSensor(garageWithTrail, hass, now);
    expect(result.occupancyStatus).toBe('clear');
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].isLive).toBe(false);
    expect(result.targets[0].isStale).toBe(true);
    expect(result.targets[0].isLastKnown).toBe(true);
    expect(result.targets[0].sourceX).toBe(50);
    expect(result.targets[0].sourceY).toBe(100);
    expect(result.targets[0].ageSeconds).toBe(39 * 60);

    // Source trail points present, ordered, and without fabricated timestamps
    expect(result.sourceTrail).toBeDefined();
    expect(result.sourceTrail).toHaveLength(3);
    expect(result.sourceTrail![0].sequence).toBe(0);
    expect(result.sourceTrail![0].timestamp).toBeUndefined();
    expect(result.sourceTrail![2].sequence).toBe(2);
    expect(result.sourceTrail![2].timestamp).toBeUndefined();
  });

  it('handles reporting-switch explicitly disabled by returning retained targets marked as last-known', () => {
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
    expect(result.reportingStatus).toBe('disabled');
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].isLive).toBe(false);
    expect(result.targets[0].isStale).toBe(true);
    expect(result.targets[0].isLastKnown).toBe(true);
  });

  it('extractRawTrail parses coordinate tuple arrays [[x, y]] safely without timestamps', () => {
    const tupleTrail = [
      [-50, 100],
      [-40, 110],
      [-30, 120],
    ];
    const points = InovelliZhaAdapter.extractRawTrail(tupleTrail, {
      sourceUnits: 'cm',
      mountingPosition: { x: 0, y: 0 },
      rotationDeg: 0,
      mirrorX: false,
      mirrorY: false,
    });
    expect(points).toHaveLength(3);
    expect(points[0].worldX).toBeCloseTo(-0.5);
    expect(points[0].worldY).toBeCloseTo(1.0);
    expect(points[0].sequence).toBe(0);
    expect(points[0].timestamp).toBeUndefined();
    expect(points[2].sequence).toBe(2);
    expect(points[2].timestamp).toBeUndefined();
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

  it('resolves timestamps across explicit target, last_target_update, last_updated, and fallback', () => {
    // 1. Explicit numeric timestamp
    expect(
      InovelliZhaAdapter.resolveTimestamp(
        { x: 0, y: 0, target_id: 1, timestamp: 123456 },
        undefined,
        now
      )
    ).toBe(123456);

    // 2. Explicit string timestamp
    const isoString = '2026-10-13T10:00:00.000Z';
    expect(
      InovelliZhaAdapter.resolveTimestamp(
        { x: 0, y: 0, target_id: 1, timestamp: isoString },
        undefined,
        now
      )
    ).toBe(Date.parse(isoString));

    // 3. Entity attribute last_target_update
    const entityWithAttr = {
      entity_id: 'sensor.test',
      state: '1',
      attributes: { last_target_update: '2026-10-13T09:00:00.000Z' },
      last_changed: '2026-10-13T08:00:00.000Z',
      last_updated: '2026-10-13T08:00:00.000Z',
    };
    expect(
      InovelliZhaAdapter.resolveTimestamp({ x: 0, y: 0, target_id: 1 }, entityWithAttr, now)
    ).toBe(Date.parse('2026-10-13T09:00:00.000Z'));

    // 4. Entity last_updated
    const entityWithLastUpdated = {
      entity_id: 'sensor.test',
      state: '1',
      attributes: {},
      last_changed: '2026-10-13T08:00:00.000Z',
      last_updated: '2026-10-13T08:00:00.000Z',
    };
    expect(
      InovelliZhaAdapter.resolveTimestamp({ x: 0, y: 0, target_id: 1 }, entityWithLastUpdated, now)
    ).toBe(Date.parse('2026-10-13T08:00:00.000Z'));

    // 5. Fallback now
    expect(
      InovelliZhaAdapter.resolveTimestamp({ x: 0, y: 0, target_id: 1 }, undefined, 999999)
    ).toBe(999999);
  });

  it('handles unexpected occupancy and reporting states as unknown', () => {
    const customHass: HomeAssistant = {
      states: {
        'binary_sensor.garage_lights_occupancy': {
          entity_id: 'binary_sensor.garage_lights_occupancy',
          state: 'standby',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
        'switch.garage_reporting': {
          entity_id: 'switch.garage_reporting',
          state: 'standby',
          attributes: {},
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    expect(InovelliZhaAdapter.parseOccupancy(baseSensor, customHass)).toBe('unknown');
    expect(InovelliZhaAdapter.parseReporting(baseSensor, customHass)).toBe('unknown');

    // Without entities configured
    const noEntitiesSensor: SensorConfig = {
      id: 's',
      name: 'S',
      targets_entity: 'sensor.t',
    };
    expect(InovelliZhaAdapter.parseOccupancy(noEntitiesSensor, customHass)).toBe('unknown');
    expect(InovelliZhaAdapter.parseReporting(noEntitiesSensor, customHass)).toBe('enabled');
  });

  it('extractRawTargets parses various string and non-array formats safely', () => {
    // null or undefined
    expect(InovelliZhaAdapter.extractRawTargets(null)).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets(undefined)).toEqual([]);

    // String keywords
    expect(InovelliZhaAdapter.extractRawTargets('none')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('unavailable')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('unknown')).toEqual([]);
    expect(InovelliZhaAdapter.extractRawTargets('{ invalid json }')).toEqual([]);

    // Valid JSON string array
    const jsonStr = JSON.stringify([{ x: 10, y: 20, target_id: 5 }]);
    expect(InovelliZhaAdapter.extractRawTargets(jsonStr)).toEqual([
      { x: 10, y: 20, z: undefined, dop: undefined, target_id: 5, timestamp: undefined },
    ]);

    // Single object (not in array)
    expect(InovelliZhaAdapter.extractRawTargets({ x: 30, y: 40 })).toEqual([
      { x: 30, y: 40, z: undefined, dop: undefined, target_id: 1, timestamp: undefined },
    ]);

    // Array containing non-object or non-finite coordinates
    expect(
      InovelliZhaAdapter.extractRawTargets([null, 'invalid', { x: 'abc', y: 50 }, { x: 10, y: 20 }])
    ).toEqual([{ x: 10, y: 20, z: undefined, dop: undefined, target_id: 4, timestamp: undefined }]);
  });

  it('returns all monitored entity IDs for explicit overrides and prefix discovery', () => {
    const fullSensor: SensorConfig = {
      ...baseSensor,
      boundary_min_x_entity: 'number.custom_min_x',
      boundary_max_x_entity: 'number.custom_max_x',
      boundary_min_y_entity: 'number.custom_min_y',
      boundary_max_y_entity: 'number.custom_max_y',
      boundary_min_z_entity: 'number.custom_min_z',
      boundary_max_z_entity: 'number.custom_max_z',
    };

    const ids = InovelliZhaAdapter.getMonitoredEntityIds(fullSensor);
    expect(ids).toContain('sensor.mmwave_targets');
    expect(ids).toContain('binary_sensor.garage_lights_occupancy');
    expect(ids).toContain('switch.garage_reporting');
    expect(ids).toContain('number.custom_min_x');
    expect(ids).toContain('number.custom_max_z');
    expect(ids).toContain('number.garage_lights_mmwave_width_minimum_left');
  });

  it('supports non-cm source units when calculating target local coordinates', () => {
    const meterSensor: SensorConfig = {
      ...baseSensor,
      source_units: 'm',
    };

    const hass: HomeAssistant = {
      states: {
        'sensor.mmwave_targets': {
          entity_id: 'sensor.mmwave_targets',
          state: '1',
          attributes: { targets: [{ x: 1.5, y: 2.5, z: 0.5, target_id: 1 }] },
          last_changed: '2026-10-13T12:00:00Z',
          last_updated: '2026-10-13T12:00:00Z',
        },
      },
    };

    const result = InovelliZhaAdapter.parseSensor(meterSensor, hass, now);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].z).toBe(0.5);
    expect(result.targets[0].x).toBe(1.5);
  });
});
