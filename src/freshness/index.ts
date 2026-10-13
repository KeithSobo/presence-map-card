import { Target, TrailPoint, OccupancyStatus, ReportingStatus } from '../types';

export interface FreshnessOptions {
  staleTimeoutSeconds: number;
  trailHistorySeconds: number;
  trailMaxPoints: number;
  showLastKnown?: boolean;
}

export class TargetFreshnessManager {
  private sensorSnapshots: Map<string, Target[]> = new Map();
  private frontendTrails: Map<string, TrailPoint[]> = new Map();
  private sourceTrails: Map<string, TrailPoint[]> = new Map();
  private options: Required<FreshnessOptions>;

  constructor(options: Partial<FreshnessOptions> = {}) {
    this.options = {
      staleTimeoutSeconds: options.staleTimeoutSeconds ?? 10,
      trailHistorySeconds: options.trailHistorySeconds ?? 10,
      trailMaxPoints: options.trailMaxPoints ?? 30,
      showLastKnown: options.showLastKnown !== false,
    };
  }

  public updateOptions(options: Partial<FreshnessOptions>): void {
    if (options.staleTimeoutSeconds !== undefined) {
      this.options.staleTimeoutSeconds = options.staleTimeoutSeconds;
    }
    if (options.trailHistorySeconds !== undefined) {
      this.options.trailHistorySeconds = options.trailHistorySeconds;
    }
    if (options.trailMaxPoints !== undefined) {
      this.options.trailMaxPoints = options.trailMaxPoints;
    }
    if (options.showLastKnown !== undefined) {
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
  public updateSensor(
    sensorId: string,
    targets: Target[],
    occupancyStatus: OccupancyStatus,
    reportingStatus: ReportingStatus,
    now: number,
    sourceTrail?: TrailPoint[]
  ): void {
    const staleMs = this.options.staleTimeoutSeconds * 1000;
    const isClearOrDisabled = occupancyStatus === 'clear' || reportingStatus === 'disabled';

    if (sourceTrail && sourceTrail.length > 0) {
      this.sourceTrails.set(sensorId, sourceTrail);
    }

    if (targets.length > 0) {
      // New nonempty snapshot replaces the previous snapshot for this sensor
      const processed: Target[] = targets.map(t => {
        const ageMs = Math.max(0, now - t.timestamp);
        const ageSeconds = Math.round(ageMs / 1000);
        const isStale = isClearOrDisabled || ageMs > staleMs;

        const targetWithMeta: Target = {
          ...t,
          ageSeconds,
          isStale,
          isLastKnown: isClearOrDisabled || isStale,
          isLive: !isClearOrDisabled && !isStale,
        };

        if (targetWithMeta.isLive && (!sourceTrail || sourceTrail.length === 0)) {
          this.addFrontendTrailPoint(t.scopedId, t.worldX, t.worldY, t.timestamp);
        }

        return targetWithMeta;
      });

      this.sensorSnapshots.set(sensorId, processed);
    } else {
      // Empty target report: preserve previous last-known snapshot if one exists
      const existing = this.sensorSnapshots.get(sensorId);
      if (existing && existing.length > 0) {
        const updated = existing.map(t => {
          const ageMs = Math.max(0, now - t.timestamp);
          return {
            ...t,
            ageSeconds: Math.round(ageMs / 1000),
            isStale: true,
            isLastKnown: true,
            isLive: false,
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
  public update(incomingTargets: Target[], now: number, clearedSensorIds: string[] = []): void {
    const bySensor = new Map<string, Target[]>();
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
      this.updateSensor(sensorId, targets, isCleared ? 'clear' : 'occupied', 'enabled', now);
    }

    for (const clearedId of clearedSensorIds) {
      if (!bySensor.has(clearedId)) {
        this.updateSensor(clearedId, [], 'clear', 'enabled', now);
      }
    }
  }

  private addFrontendTrailPoint(
    scopedId: string,
    worldX: number,
    worldY: number,
    timestamp: number
  ): void {
    let list = this.frontendTrails.get(scopedId);
    if (!list) {
      list = [];
      this.frontendTrails.set(scopedId, list);
    }

    const last = list[list.length - 1];
    if (last) {
      const dist = Math.hypot(worldX - last.worldX, worldY - last.worldY);
      if (dist < 0.02 && last.timestamp !== undefined && timestamp - last.timestamp < 1000) {
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
  public prune(now: number): void {
    const staleMs = this.options.staleTimeoutSeconds * 1000;
    const trailCutoff = now - this.options.trailHistorySeconds * 1000;

    // Update staleness and age on all targets in snapshots
    for (const list of this.sensorSnapshots.values()) {
      for (const t of list) {
        const ageMs = Math.max(0, now - t.timestamp);
        t.ageSeconds = Math.round(ageMs / 1000);
        if (ageMs > staleMs) {
          t.isStale = true;
          t.isLive = false;
          t.isLastKnown = true;
        }
      }
    }

    // Prune frontend-generated trails by time cutoff
    for (const [scopedId, trailList] of this.frontendTrails.entries()) {
      const validPoints = trailList.filter(
        pt => pt.timestamp !== undefined && pt.timestamp >= trailCutoff
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
  public getAllTargets(): Target[] {
    const showLastKnown = this.options.showLastKnown !== false;
    const result: Target[] = [];

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

  public getActiveTargets(): Target[] {
    return this.getAllTargets();
  }

  public getTrails(): Map<string, TrailPoint[]> {
    return this.frontendTrails;
  }

  public getFrontendTrails(): Map<string, TrailPoint[]> {
    return this.frontendTrails;
  }

  public getSourceTrails(): Map<string, TrailPoint[]> {
    return this.sourceTrails;
  }

  public clear(): void {
    this.sensorSnapshots.clear();
    this.frontendTrails.clear();
    this.sourceTrails.clear();
  }
}
