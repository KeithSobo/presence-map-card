import { PresenceMapCardConfig, HomeAssistant } from '../types';

interface HaFormElement extends HTMLElement {
  schema?: unknown[];
  data?: Record<string, unknown>;
  hass?: HomeAssistant;
  computeLabel?: (schema: { label?: string; name: string }) => string;
}

export class PresenceMapEditor extends HTMLElement {
  private _config?: PresenceMapCardConfig;
  private _lastEmittedConfig?: PresenceMapCardConfig;
  private _hass?: HomeAssistant;
  private _root: ShadowRoot;
  private _form?: HaFormElement;
  private _staticSchema?: unknown[];

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public connectedCallback(): void {
    this._ensureForm();
  }

  public setConfig(config: PresenceMapCardConfig): void {
    const isEcho = this._isConfigEqual(config, this._lastEmittedConfig);
    this._config = { ...config };

    this._ensureForm();

    if (isEcho) {
      // Parent echoed our own emitted config back.
      // Do not overwrite form.data or remount inputs to preserve active typing, caret, and focus!
      return;
    }

    if (this._form) {
      const newFormData = this._configToFormData(this._config);
      if (!this._isFormDataEqual(this._form.data, newFormData)) {
        this._form.data = newFormData;
      }
    }
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._form) {
      this._form.hass = hass;
    }
  }

  private _computeSchema() {
    return [
      { name: 'title', label: 'Title', selector: { text: {} } },
      {
        name: 'display_units',
        label: 'Display Units',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'metric', label: 'Metric (Meters / Centimeters)' },
              { value: 'imperial', label: 'Imperial (Feet / Inches)' },
            ],
          },
        },
      },
      {
        name: 'theme',
        label: 'Theme Override',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'auto', label: 'Automatic (HA Theme)' },
              { value: 'light', label: 'Force Light Mode' },
              { value: 'dark', label: 'Force Dark Mode' },
            ],
          },
        },
      },
      {
        type: 'grid',
        name: '',
        schema: [
          {
            name: 'range_meters',
            label: 'Radar Range (Meters)',
            selector: { number: { mode: 'box', min: 1, max: 20 } },
          },
          {
            name: 'stale_timeout',
            label: 'Stale Timeout (Seconds)',
            selector: { number: { mode: 'box', min: 1, max: 60 } },
          },
        ],
      },
      {
        type: 'grid',
        name: '',
        schema: [
          { name: 'show_rings', label: 'Show Distance Rings', selector: { boolean: {} } },
          { name: 'show_trails', label: 'Show Target Trails', selector: { boolean: {} } },
          { name: 'show_labels', label: 'Show Target Labels', selector: { boolean: {} } },
          { name: 'show_coordinates', label: 'Show X/Y Coordinates', selector: { boolean: {} } },
          { name: 'show_boundaries', label: 'Show Boundaries', selector: { boolean: {} } },
        ],
      },
      { name: 'demo_mode', label: 'Demo Mode (Simulated Data)', selector: { boolean: {} } },
      {
        name: '',
        type: 'expandable',
        title: 'Floor-Plan Settings',
        schema: [
          {
            name: 'floorplan_image',
            label: 'Image URL or Path (e.g. /local/floorplan.png)',
            selector: { text: {} },
          },
          {
            type: 'grid',
            name: '',
            schema: [
              {
                name: 'floorplan_width',
                label: 'Width (Meters)',
                selector: { number: { mode: 'box', min: 1, max: 100 } },
              },
              {
                name: 'floorplan_height',
                label: 'Height (Meters)',
                selector: { number: { mode: 'box', min: 1, max: 100 } },
              },
            ],
          },
        ],
      },
      {
        name: '',
        type: 'expandable',
        title: 'Primary Sensor Configuration',
        schema: [
          {
            name: 'sensor_name',
            label: 'Sensor Display Name',
            selector: { text: {} },
          },
          {
            name: 'sensor_targets_entity',
            label: 'Targets Entity (Required)',
            selector: { entity: { domain: 'sensor' } },
          },
          {
            name: 'sensor_occupancy_entity',
            label: 'Occupancy Binary Sensor (Optional)',
            selector: { entity: { domain: 'binary_sensor' } },
          },
          {
            name: 'sensor_reporting_entity',
            label: 'Reporting Switch (Optional - Enables radar reporting)',
            selector: { entity: { domain: 'switch' } },
          },
          {
            name: 'sensor_boundary_prefix',
            label: 'Boundary Entity Prefix (e.g. number.garage_lights_mmwave_)',
            selector: { text: {} },
          },
          {
            type: 'grid',
            name: '',
            schema: [
              {
                name: 'sensor_source_units',
                label: 'Sensor Source Units',
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      { value: 'cm', label: 'Centimeters (cm)' },
                      { value: 'm', label: 'Meters (m)' },
                      { value: 'in', label: 'Inches (in)' },
                      { value: 'ft', label: 'Feet (ft)' },
                    ],
                  },
                },
              },
              { name: 'sensor_color', label: 'Sensor Color', selector: { text: {} } },
            ],
          },
          {
            type: 'grid',
            name: '',
            schema: [
              {
                name: 'sensor_fov',
                label: 'Illustrative Field of View (Degrees)',
                selector: { number: { mode: 'box', min: 30, max: 360 } },
              },
              {
                name: 'sensor_rotation',
                label: 'Rotation Angle (Degrees)',
                selector: { number: { mode: 'box', min: 0, max: 359 } },
              },
            ],
          },
          {
            type: 'grid',
            name: '',
            schema: [
              {
                name: 'sensor_mirror_x',
                label: 'Mirror X (Horizontal)',
                selector: { boolean: {} },
              },
              { name: 'sensor_mirror_y', label: 'Mirror Y (Vertical)', selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        name: '',
        type: 'expandable',
        title: 'Explicit Boundary Overrides (Precedence over prefix)',
        schema: [
          {
            name: 'sensor_boundary_min_x_entity',
            label: 'Width Min Left / X Min',
            selector: { entity: { domain: 'number' } },
          },
          {
            name: 'sensor_boundary_max_x_entity',
            label: 'Width Max Right / X Max',
            selector: { entity: { domain: 'number' } },
          },
          {
            name: 'sensor_boundary_min_y_entity',
            label: 'Depth Min Near / Y Min',
            selector: { entity: { domain: 'number' } },
          },
          {
            name: 'sensor_boundary_max_y_entity',
            label: 'Depth Max Far / Y Max',
            selector: { entity: { domain: 'number' } },
          },
          {
            name: 'sensor_boundary_min_z_entity',
            label: 'Height Min Floor / Z Min (Optional)',
            selector: { entity: { domain: 'number' } },
          },
          {
            name: 'sensor_boundary_max_z_entity',
            label: 'Height Max Ceiling / Z Max (Optional)',
            selector: { entity: { domain: 'number' } },
          },
        ],
      },
    ];
  }

  private _configToFormData(config: PresenceMapCardConfig): Record<string, unknown> {
    const primarySensor = config.sensors && config.sensors[0] ? config.sensors[0] : undefined;

    return {
      title: config.title ?? '',
      display_units: config.display_units ?? 'metric',
      theme: config.theme ?? 'auto',
      range_meters: config.range_meters ?? 6,
      stale_timeout: config.stale_timeout ?? 10,
      show_rings: config.show_rings !== false,
      show_trails: config.show_trails !== false,
      show_labels: config.show_labels !== false,
      show_coordinates: Boolean(config.show_coordinates),
      show_boundaries: config.show_boundaries !== false,
      demo_mode: Boolean(config.demo_mode),
      floorplan_image: config.floorplan?.image ?? '',
      floorplan_width: config.floorplan?.width_meters ?? 10,
      floorplan_height: config.floorplan?.height_meters ?? 8,
      sensor_name: primarySensor?.name ?? '',
      sensor_targets_entity: primarySensor?.targets_entity ?? '',
      sensor_occupancy_entity: primarySensor?.occupancy_entity ?? '',
      sensor_reporting_entity: primarySensor?.reporting_entity ?? '',
      sensor_boundary_prefix: primarySensor?.boundary_prefix ?? '',
      sensor_boundary_min_x_entity: primarySensor?.boundary_min_x_entity ?? '',
      sensor_boundary_max_x_entity: primarySensor?.boundary_max_x_entity ?? '',
      sensor_boundary_min_y_entity: primarySensor?.boundary_min_y_entity ?? '',
      sensor_boundary_max_y_entity: primarySensor?.boundary_max_y_entity ?? '',
      sensor_boundary_min_z_entity: primarySensor?.boundary_min_z_entity ?? '',
      sensor_boundary_max_z_entity: primarySensor?.boundary_max_z_entity ?? '',
      sensor_source_units: primarySensor?.source_units ?? 'cm',
      sensor_color: primarySensor?.color ?? '#0284c7',
      sensor_fov: primarySensor?.fov ?? 120,
      sensor_rotation: primarySensor?.rotation ?? 0,
      sensor_mirror_x: Boolean(primarySensor?.mirror_x),
      sensor_mirror_y: Boolean(primarySensor?.mirror_y),
    };
  }

  private _formDataToConfig(formData: Record<string, unknown>): PresenceMapCardConfig {
    const config: PresenceMapCardConfig = {
      ...this._config,
      type: this._config?.type || 'custom:presence-map-card',
      title: typeof formData.title === 'string' && formData.title ? formData.title : undefined,
      display_units: formData.display_units === 'imperial' ? 'imperial' : 'metric',
      theme: formData.theme === 'light' || formData.theme === 'dark' ? formData.theme : 'auto',
      range_meters: Number(formData.range_meters) || 6,
      stale_timeout: Number(formData.stale_timeout) || 10,
      show_rings: Boolean(formData.show_rings),
      show_trails: Boolean(formData.show_trails),
      show_labels: Boolean(formData.show_labels),
      show_coordinates: Boolean(formData.show_coordinates),
      show_boundaries: Boolean(formData.show_boundaries),
      demo_mode: Boolean(formData.demo_mode),
    };

    if (typeof formData.floorplan_image === 'string' && formData.floorplan_image.trim()) {
      config.floorplan = {
        image: formData.floorplan_image.trim(),
        width_meters: Number(formData.floorplan_width) || 10,
        height_meters: Number(formData.floorplan_height) || 8,
      };
    } else {
      config.floorplan = undefined;
    }

    const existingSensors = Array.isArray(this._config?.sensors) ? [...this._config.sensors] : [];
    const primary = existingSensors[0] || { id: 'sensor_1', name: 'Primary Sensor' };

    const validUnits = ['cm', 'm', 'in', 'ft'] as const;
    const sourceUnits =
      typeof formData.sensor_source_units === 'string' &&
      validUnits.includes(formData.sensor_source_units as (typeof validUnits)[number])
        ? (formData.sensor_source_units as (typeof validUnits)[number])
        : 'cm';

    const cleanStr = (val: unknown): string | undefined =>
      typeof val === 'string' && val.trim() ? val.trim() : undefined;

    const updatedPrimary = {
      ...primary,
      name:
        typeof formData.sensor_name === 'string' && formData.sensor_name.trim()
          ? formData.sensor_name.trim()
          : primary.name || 'Primary Sensor',
      targets_entity:
        typeof formData.sensor_targets_entity === 'string' ? formData.sensor_targets_entity : '',
      occupancy_entity: cleanStr(formData.sensor_occupancy_entity),
      reporting_entity: cleanStr(formData.sensor_reporting_entity),
      boundary_prefix: cleanStr(formData.sensor_boundary_prefix),
      boundary_min_x_entity: cleanStr(formData.sensor_boundary_min_x_entity),
      boundary_max_x_entity: cleanStr(formData.sensor_boundary_max_x_entity),
      boundary_min_y_entity: cleanStr(formData.sensor_boundary_min_y_entity),
      boundary_max_y_entity: cleanStr(formData.sensor_boundary_max_y_entity),
      boundary_min_z_entity: cleanStr(formData.sensor_boundary_min_z_entity),
      boundary_max_z_entity: cleanStr(formData.sensor_boundary_max_z_entity),
      source_units: sourceUnits,
      color:
        typeof formData.sensor_color === 'string' && formData.sensor_color
          ? formData.sensor_color
          : '#0284c7',
      fov: Number(formData.sensor_fov) || 120,
      rotation: Number(formData.sensor_rotation) || 0,
      mirror_x: Boolean(formData.sensor_mirror_x),
      mirror_y: Boolean(formData.sensor_mirror_y),
    };

    existingSensors[0] = updatedPrimary;
    config.sensors = existingSensors;

    return config;
  }

  private _ensureForm(): void {
    if (this._form) return;

    if (!this._staticSchema) {
      this._staticSchema = this._computeSchema();
    }

    this._root.innerHTML = `
      <style>
        .editor-container {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-sizing: border-box;
        }
        ha-form {
          display: block;
        }
      </style>
      <div class="editor-container">
        <ha-form></ha-form>
      </div>
    `;

    const form = this._root.querySelector('ha-form') as HaFormElement | null;
    if (!form) return;

    this._form = form;
    this._form.schema = this._staticSchema;
    if (this._hass) {
      this._form.hass = this._hass;
    }
    this._form.computeLabel = (s: { label?: string; name: string }) => s.label || s.name;

    if (this._config) {
      this._form.data = this._configToFormData(this._config);
    }

    this._form.addEventListener('value-changed', (ev: Event) => {
      const customEv = ev as CustomEvent<{ value: Record<string, unknown> }>;
      const newFormData = customEv.detail.value;
      const newConfig = this._formDataToConfig(newFormData);
      this._config = newConfig;
      this._lastEmittedConfig = JSON.parse(JSON.stringify(newConfig));

      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  private _isConfigEqual(a?: PresenceMapCardConfig, b?: PresenceMapCardConfig): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private _isFormDataEqual(a?: Record<string, unknown>, b?: Record<string, unknown>): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }
}

if (!customElements.get('presence-map-editor')) {
  customElements.define('presence-map-editor', PresenceMapEditor);
}
