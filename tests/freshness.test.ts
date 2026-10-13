import { describe, it, expect } from 'vitest';
import { TargetFreshnessManager } from '../src/freshness';
import { Target, TrailPoint } from '../src/types';

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
    isLive: true,
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
    expect(manager.getActiveTargets()[0].isLive).toBe(true);

    // Advance time past stale timeout (e.g. 6 seconds later without new update)
    const checkTime = startTime + 6000;
    manager.prune(checkTime);

    const active = manager.getActiveTargets();
    expect(active).toHaveLength(1);
    expect(active[0].isStale).toBe(true);
    expect(active[0].isLive).toBe(false);
    expect(active[0].isLastKnown).toBe(true);
    expect(active[0].ageSeconds).toBe(6);
  });

  it('preserves retained positions even after 2x stale timeout and 39 minutes elapsed', () => {
    const manager = new TargetFreshnessManager({ staleTimeoutSeconds: 5, showLastKnown: true });
    const startTime = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, startTime);
    manager.update([t1], startTime);

    // Advance time past 2x stale timeout (11 seconds later)
    const dropTime = startTime + 11000;
    manager.prune(dropTime);

    // Retained positions must NOT be deleted
    let targets = manager.getActiveTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0].isLastKnown).toBe(true);
    expect(targets[0].isStale).toBe(true);
    expect(targets[0].isLive).toBe(false);

    // Advance time 39 minutes later (2,340,000 ms)
    const thirtyNineMinutesLater = startTime + 39 * 60 * 1000;
    manager.prune(thirtyNineMinutesLater);

    targets = manager.getActiveTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0].isLastKnown).toBe(true);
    expect(targets[0].ageSeconds).toBe(39 * 60);
  });

  it('preserves the last snapshot as last-known positions on live-to-clear transition', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, now);
    const t2 = createMockTarget('sensor_2', 1, 4.0, 5.0, now);

    manager.update([t1, t2], now);
    expect(manager.getActiveTargets()).toHaveLength(2);

    // Sensor 1 occupancy cleared: update via clearedSensorIds or updateSensor('sensor_1', [], 'clear', 'enabled')
    manager.update([], now + 1000, ['sensor_1']);

    const remaining = manager.getActiveTargets();
    expect(remaining).toHaveLength(2); // sensor_1 preserved as last-known, sensor_2 still live

    const s1Target = remaining.find(t => t.sensorId === 'sensor_1');
    expect(s1Target).toBeDefined();
    expect(s1Target?.isLive).toBe(false);
    expect(s1Target?.isStale).toBe(true);
    expect(s1Target?.isLastKnown).toBe(true);

    const s2Target = remaining.find(t => t.sensorId === 'sensor_2');
    expect(s2Target).toBeDefined();
    expect(s2Target?.isLive).toBe(true);
  });

  it('ends live styling when reporting is disabled while preserving last-known coordinates', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    const t1 = createMockTarget('sensor_1', 1, 2.5, 3.5, now);
    manager.updateSensor('sensor_1', [t1], 'occupied', 'disabled', now);

    const targets = manager.getActiveTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0].isLive).toBe(false);
    expect(targets[0].isStale).toBe(true);
    expect(targets[0].isLastKnown).toBe(true);
    expect(targets[0].worldX).toBe(2.5);
    expect(targets[0].worldY).toBe(3.5);
  });

  it('replaces previous snapshots with new snapshots without unbounded ID accumulation', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    // Snapshot 1: sensor reports targets 1 and 2
    const t1 = createMockTarget('sensor_1', 1, 1.0, 1.0, now);
    const t2 = createMockTarget('sensor_1', 2, 2.0, 2.0, now);
    manager.updateSensor('sensor_1', [t1, t2], 'occupied', 'enabled', now);

    expect(manager.getActiveTargets()).toHaveLength(2);

    // Snapshot 2: sensor reports only target 3
    const t3 = createMockTarget('sensor_1', 3, 3.0, 3.0, now + 1000);
    manager.updateSensor('sensor_1', [t3], 'occupied', 'enabled', now + 1000);

    const targets = manager.getActiveTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0].scopedId).toBe('sensor_1:3');
    // Ensure old targets 1 and 2 did not accumulate
    expect(targets.find(t => t.rawTargetId === 1)).toBeUndefined();
    expect(targets.find(t => t.rawTargetId === 2)).toBeUndefined();
  });

  it('respects show_last_known: false by hiding stale/last-known positions', () => {
    const manager = new TargetFreshnessManager({ showLastKnown: false, staleTimeoutSeconds: 5 });
    const now = 100000;

    const t1 = createMockTarget('sensor_1', 1, 1.0, 2.0, now);
    manager.update([t1], now);
    expect(manager.getActiveTargets()).toHaveLength(1);

    // After 6 seconds, target becomes stale
    manager.prune(now + 6000);
    // With showLastKnown: false, stale/last-known targets should not be returned
    expect(manager.getActiveTargets()).toHaveLength(0);
  });

  it('stores source trails without fabricating timestamps and source trails take precedence', () => {
    const manager = new TargetFreshnessManager();
    const now = 100000;

    const sourceTrail: TrailPoint[] = [
      { worldX: 0.5, worldY: 1.0, sequence: 0 },
      { worldX: 0.6, worldY: 1.2, sequence: 1 },
      { worldX: 0.8, worldY: 1.5, sequence: 2 },
    ];

    const t1 = createMockTarget('sensor_1', 1, 0.8, 1.5, now);
    manager.updateSensor('sensor_1', [t1], 'occupied', 'enabled', now, sourceTrail);

    const sourceTrails = manager.getSourceTrails();
    expect(sourceTrails.get('sensor_1')).toEqual(sourceTrail);
    // Source trail points should NOT have fabricated timestamps
    expect(sourceTrails.get('sensor_1')![0].timestamp).toBeUndefined();
    expect(sourceTrails.get('sensor_1')![0].sequence).toBe(0);

    // Since source trail was provided, frontend trail should NOT be generated for this sensor
    const frontendTrails = manager.getFrontendTrails();
    expect(frontendTrails.get('sensor_1:1')).toBeUndefined();
  });

  it('bounds frontend trail history by time and point count', () => {
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

    // Prune at 25 seconds later: trail points must be expired and pruned
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
    expect(manager.getSourceTrails().size).toBe(0);
  });
});
