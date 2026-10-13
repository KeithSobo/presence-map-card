import { describe, it, expect } from 'vitest';
import { TargetFreshnessManager } from '../src/freshness';
import { Target } from '../src/types';

describe('Target Freshness and Trail Management', () => {
  const createMockTarget = (
    sensorId: string,
    rawTargetId: number,
    x: number,
    y: number,
    timestamp: number
  ): Target => ({
    scopedId: `${sensorId}:${rawTargetId}`,
    sensorId,
    sensorColor: '#03a9f4',
    rawTargetId,
    x,
    y,
    worldX: x,
    worldY: y,
    timestamp,
    isStale: false,
  });

  it('scopes target identity by sensor when multiple sensors share target IDs', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    // Sensor 1 and Sensor 2 both reporting target_id: 1
    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, now);
    const t2 = createMockTarget('sensor_2', 1, 4.0, 5.0, now);

    manager.update([t1, t2], now);

    const active = manager.getActiveTargets();
    expect(active).toHaveLength(2);

    const activeIds = active.map(t => t.scopedId);
    expect(activeIds).toContain('sensor_1:1');
    expect(activeIds).toContain('sensor_2:1');
  });

  it('marks targets as stale when exceeding stale timeout', () => {
    const manager = new TargetFreshnessManager({ staleTimeoutSeconds: 5 });
    const startTime = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, startTime);
    manager.update([t1], startTime);

    expect(manager.getActiveTargets()[0].isStale).toBe(false);

    // Advance time past stale timeout (e.g. 6 seconds later without new update)
    const checkTime = startTime + 6000;
    manager.prune(checkTime);

    const active = manager.getActiveTargets();
    expect(active).toHaveLength(1);
    expect(active[0].isStale).toBe(true);
  });

  it('drops targets completely after 2x stale timeout without updates', () => {
    const manager = new TargetFreshnessManager({ staleTimeoutSeconds: 5 });
    const startTime = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, startTime);
    manager.update([t1], startTime);

    // Advance time past 2x stale timeout (11 seconds later)
    const dropTime = startTime + 11000;
    manager.prune(dropTime);

    expect(manager.getActiveTargets()).toHaveLength(0);
  });

  it('immediately clears targets for sensors in clearedSensorIds', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, now);
    const t2 = createMockTarget('sensor_2', 1, 4.0, 5.0, now);

    manager.update([t1, t2], now);
    expect(manager.getActiveTargets()).toHaveLength(2);

    // Sensor 1 occupancy cleared
    manager.update([], now + 1000, ['sensor_1']);

    const remaining = manager.getActiveTargets();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].sensorId).toBe('sensor_2');
  });

  it('bounds trail history by time and point count', () => {
    const manager = new TargetFreshnessManager({
      trailHistorySeconds: 5,
      trailMaxPoints: 4,
    });

    const startTime = 100000;

    // Simulate 6 sequential movement points 1 second apart
    for (let i = 0; i < 6; i++) {
      const stepTime = startTime + i * 1000;
      const target = createMockTarget('sensor_1', 1, i * 0.5, i * 0.5, stepTime);
      manager.update([target], stepTime);
    }

    const trails = manager.getTrails();
    const trailList = trails.get('sensor_1:1');
    expect(trailList).toBeDefined();

    // Must be bounded by trailMaxPoints (4)
    expect(trailList!.length).toBeLessThanOrEqual(4);

    // Prune at 25 seconds later: target and all trail points must be expired and pruned
    manager.prune(startTime + 25000);
    const prunedTrails = manager.getTrails().get('sensor_1:1');
    expect(prunedTrails).toBeUndefined();
  });

  it('clears all targets and trails when clear is called', () => {
    const manager = new TargetFreshnessManager();
    const target = createMockTarget('sensor_1', 1, 1.0, 1.0, 1000);
    manager.update([target], 1000);
    expect(manager.getActiveTargets()).toHaveLength(1);

    manager.clear();
    expect(manager.getActiveTargets()).toHaveLength(0);
    expect(manager.getTrails().size).toBe(0);
  });
});
