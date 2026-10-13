import { PresenceMapCardConfig, HomeAssistant, DetectionBoundary, Target } from './types';
import { validateConfig, getStubConfig } from './config';
import { PRESENCE_MAP_VERSION } from './config/version';
import { InovelliZhaAdapter } from './adapters';
import { TargetFreshnessManager } from './freshness';
import { renderSvg } from './rendering';
import { createDemoTargets } from './demo';
import './editor/presence-map-editor';

console.info(
  `%c PresenceMap %c v${PRESENCE_MAP_VERSION} `,
  'color: #ffffff; background: #03a9f4; font-weight: bold; border-radius: 3px 0 0 3px;',
  'color: #03a9f4; background: #263238; font-weight: bold; border-radius: 0 3px 3px 0;'
);

export class PresenceMapCard extends HTMLElement {
  private _config!: PresenceMapCardConfig;
  private _hass?: HomeAssistant;
  private _freshnessManager: TargetFreshnessManager;
  private _boundaries: Map<string, DetectionBoundary> = new Map();
  private _timer?: ReturnType<typeof setInterval>;
  private _demoStep: number = 0;
  private _resizeObserver?: ResizeObserver;
  private _root: ShadowRoot;
  private _lastEntitySnapshots: Map<string, string> = new Map();

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._freshnessManager = new TargetFreshnessManager();
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('presence-map-editor');
  }

  public static getStubConfig(): PresenceMapCardConfig {
    return getStubConfig();
  }

  public setConfig(rawConfig: unknown): void {
    const { valid, errors, config } = validateConfig(rawConfig);
    if (!valid && !config.demo_mode && (!config.sensors || config.sensors.length === 0)) {
      throw new Error(`[PresenceMap] Configuration error: ${errors.join(', ')}`);
    }

    this._config = config;
    this._freshnessManager.updateOptions({
      staleTimeoutSeconds: config.stale_timeout,
      trailHistorySeconds: config.trail_history_seconds,
      trailMaxPoints: config.trail_max_points,
    });

    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._config) return;

    // In demo mode, hass state updates do not overwrite simulated data
    if (this._config.demo_mode) {
      return;
    }

    // Performance optimization: check if any monitored entities actually changed
    let hasRelevantChanges = false;
    const sensors = this._config.sensors || [];

    for (const sensor of sensors) {
      const entitiesToCheck = InovelliZhaAdapter.getMonitoredEntityIds(sensor);

      for (const entityId of entitiesToCheck) {
        const stateObj = hass.states[entityId];
        const snapshot = stateObj
          ? `${stateObj.state}|${JSON.stringify(stateObj.attributes?.targets || '')}|${stateObj.last_updated}`
          : 'missing';

        if (this._lastEntitySnapshots.get(entityId) !== snapshot) {
          hasRelevantChanges = true;
          this._lastEntitySnapshots.set(entityId, snapshot);
        }
      }
    }

    if (hasRelevantChanges || this._lastEntitySnapshots.size === 0) {
      this._updateSensorData();
      this._render();
    }
  }

  public connectedCallback(): void {
    if (!this._timer) {
      // 1-second background ticker to prune expired trails, handle stale targets,
      // and animate demo targets if active
      this._timer = setInterval(() => {
        this._handleTick();
      }, 1000);
    }

    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        this._render();
      });
      this._resizeObserver.observe(this);
    }
  }

  public disconnectedCallback(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }
  }

  public getCardSize(): number {
    return 6;
  }

  private _handleTick(): void {
    const now = Date.now();

    if (this._config?.demo_mode) {
      this._demoStep++;
      const demoTargets = createDemoTargets(now, this._demoStep);
      this._freshnessManager.update(demoTargets, now);
      this._render();
      return;
    }

    // Normal sensor mode: check for staleness and expired trails
    this._freshnessManager.prune(now);
    this._render();
  }

  private _updateSensorData(): void {
    if (!this._hass || !this._config) return;

    const now = Date.now();
    const allTargets: Target[] = [];
    const clearedSensorIds: string[] = [];

    const sensors = this._config.sensors || [];
    for (const sensor of sensors) {
      const res = InovelliZhaAdapter.parseSensor(sensor, this._hass, now);

      if (res.boundary) {
        this._boundaries.set(sensor.id, res.boundary);
      } else {
        this._boundaries.delete(sensor.id);
      }

      if (res.occupancyStatus === 'clear' || res.reportingStatus === 'disabled') {
        clearedSensorIds.push(sensor.id);
      } else if (res.available) {
        allTargets.push(...res.targets);
      }
    }

    this._freshnessManager.update(allTargets, now, clearedSensorIds);
  }

  private _isDarkMode(): boolean {
    if (!this._config) return false;
    if (this._config.theme === 'dark') return true;
    if (this._config.theme === 'light') return false;

    if (this._hass?.selectedTheme) {
      const allThemes = this._hass.themes?.themes as
        Record<string, { modes?: { dark?: boolean } }> | undefined;
      const themeObj = allThemes?.[this._hass.selectedTheme];
      if (themeObj?.modes?.dark !== undefined) return Boolean(themeObj.modes.dark);
    }

    if (this._hass?.darkMode !== undefined) {
      return this._hass.darkMode;
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  }

  private _render(): void {
    if (!this._config) return;

    const isDark = this._isDarkMode();
    const targets = this._freshnessManager.getActiveTargets();
    const trails = this._freshnessManager.getTrails();

    const svgHtml = renderSvg({
      config: this._config,
      targets,
      trails,
      boundaries: this._boundaries,
      isDark,
      demoMode: Boolean(this._config.demo_mode),
    });

    const titleHtml = this._config.title
      ? `<div class="card-header"><h1 class="card-title">${this._config.title}</h1></div>`
      : '';

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: var(--ha-card-background, var(--card-background-color, ${isDark ? '#1a1c1e' : '#ffffff'}));
          color: var(--primary-text-color, ${isDark ? '#ffffff' : '#212121'});
          box-shadow: var(--ha-card-box-shadow, none);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, ${isDark ? '#2c2e33' : '#e0e0e0'}));
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          position: relative;
        }
        .card-header {
          padding: 16px 16px 8px 16px;
        }
        .card-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 600;
          line-height: 1.3;
          color: inherit;
        }
        .canvas-container {
          padding: 8px 12px 12px 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }
        svg {
          width: 100%;
          height: auto;
          max-height: 520px;
          display: block;
          border-radius: 8px;
        }
      </style>
      <ha-card>
        ${titleHtml}
        <div class="canvas-container">
          ${svgHtml}
        </div>
      </ha-card>
    `;
  }
}

// Register Custom Element
if (!customElements.get('presence-map-card')) {
  customElements.define('presence-map-card', PresenceMapCard);
}

// Register Custom Card for Home Assistant card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'presence-map-card',
  name: 'PresenceMap',
  preview: true,
  description: 'Multi-sensor mmWave presence radar and floor-plan custom card',
  documentationURL: 'https://github.com/KeithSobo/presence-map-card',
});
