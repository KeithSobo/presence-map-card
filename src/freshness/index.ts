import { Target, TrailPoint } from '../types';

export interface FreshnessOptions {
  staleTimeoutSeconds: number;
  trailHistorySeconds: number;
  trailMaxPoints: number;
}

export class TargetFreshnessManager {
  private activeTargets: Map<string, Target> = new Map();
  private trails: Map<string, TrailPoint[]> = new Map();
  private options: FreshnessOptions;

  constructor(options: Partial<FreshnessOptions> = {}) {
    this.options = {
      staleTimeoutSeconds: options.staleTimeoutSeconds ?? 10,
      trailHistorySeconds: options.trailHistorySeconds ?? 10,
      trailMaxPoints: options.trailMaxPoints ?? 30,
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
  }

  /**
   * Updates state with a new set of incoming targets from sensors.
   * Targets belong to specific sensors; if clearedSensorIds is provided,
   * any active targets for those sensors are removed.
   */
  public update(incomingTargets: Target[], now: number, clearedSensorIds: string[] = []): void {
    // 1. Remove targets from sensors whose occupancy cleared or reporting stopped
    if (clearedSensorIds.length > 0) {
      const clearedSet = new Set(clearedSensorIds);
      for (const [scopedId, t] of this.activeTargets.entries()) {
        if (clearedSet.has(t.sensorId)) {
          this.activeTargets.delete(scopedId);
        }
      }
    }

    // 2. Add or update incoming targets
    const staleMs = this.options.staleTimeoutSeconds * 1000;

    for (const target of incomingTargets) {
      const isStale = now - target.timestamp > staleMs;
      const targetWithStaleness: Target = {
        ...target,
        isStale,
      };

      this.activeTargets.set(target.scopedId, targetWithStaleness);

      // Record trail point if target is live (not stale)
      if (!isStale) {
        this.addTrailPoint(target.scopedId, target.worldX, target.worldY, target.timestamp);
      }
    }

    // 3. Prune old trails and completely expired targets
    this.prune(now);
  }

  private addTrailPoint(scopedId: string, worldX: number, worldY: number, timestamp: number): void {
    let list = this.trails.get(scopedId);
    if (!list) {
      list = [];
      this.trails.set(scopedId, list);
    }

    // Don't add duplicate point if target hasn't moved noticeably (< 2cm)
    const last = list[list.length - 1];
    if (last) {
      const dist = Math.hypot(worldX - last.worldX, worldY - last.worldY);
      if (dist < 0.02 && timestamp - last.timestamp < 1000) {
        return;
      }
    }

    list.push({ worldX, worldY, timestamp });

    // Enforce max points limit
    if (list.length > this.options.trailMaxPoints) {
      list.splice(0, list.length - this.options.trailMaxPoints);
    }
  }

  /**
   * Prunes stale targets and expired trail history.
   * Called on incoming updates and periodically by the card timer.
   */
  public prune(now: number): void {
    const staleMs = this.options.staleTimeoutSeconds * 1000;
    const dropMs = staleMs * 2; // Drop targets after 2x stale timeout without updates
    const trailCutoff = now - this.options.trailHistorySeconds * 1000;

    // Prune active targets
    for (const [scopedId, target] of this.activeTargets.entries()) {
      const age = now - target.timestamp;
      if (age > dropMs) {
        this.activeTargets.delete(scopedId);
      } else if (age > staleMs) {
        target.isStale = true;
      }
    }

    // Prune trails
    for (const [scopedId, trailList] of this.trails.entries()) {
      // Remove points older than trail window
      const validPoints = trailList.filter(pt => pt.timestamp >= trailCutoff);

      if (validPoints.length === 0) {
        this.trails.delete(scopedId);
      } else {
        this.trails.set(scopedId, validPoints);
      }
    }
  }

  public getActiveTargets(): Target[] {
    return Array.from(this.activeTargets.values());
  }

  public getTrails(): Map<string, TrailPoint[]> {
    return this.trails;
  }

  public clear(): void {
    this.activeTargets.clear();
    this.trails.clear();
  }
}
