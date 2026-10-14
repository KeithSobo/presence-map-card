import { PresenceMapCardConfig, HomeAssistant, SensorConfig } from '../types';
import { InovelliZhaAdapter } from '../adapters/inovelli';
import { DEFAULT_PALETTE } from '../config';

interface HaFormElement extends HTMLElement {
  schema?: unknown[];
  data?: Record<string, unknown>;
  hass?: HomeAssistant;
  computeLabel?: (schema: { label?: string; name: string }) => string;
  computeHelper?: (schema: { helper?: string; name: string }) => string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateUniqueSensorId(
  existingSensors: Array<{ id?: string }>,
  baseId = 'sensor'
): string {
  const existingIds = new Set(existingSensors.map(s => s.id).filter(Boolean));

  let cleanBase = (baseId || 'sensor').trim();
  cleanBase = cleanBase.replace(/_copy(_\d+)?$/, '');
  if (!cleanBase) cleanBase = 'sensor';

  if (baseId.includes('_copy')) {
    const candidate = `${cleanBase}_copy`;
    if (!existingIds.has(candidate)) return candidate;
    let i = 2;
    while (existingIds.has(`${cleanBase}_copy_${i}`)) {
      i++;
    }
    return `${cleanBase}_copy_${i}`;
  }

  let counter = 1;
  while (existingIds.has(`${cleanBase}_${counter}`)) {
    counter++;
  }
  return `${cleanBase}_${counter}`;
}

export interface ImperialDistance {
  feet: number;
  inches: number;
}

export function metersToFeetInches(meters: number): ImperialDistance {
  const isNegative = meters < 0;
  const absMeters = Math.abs(meters);
  const totalInches = absMeters / 0.0254;
  let feet = Math.floor(totalInches / 12);
  let inches = parseFloat((totalInches % 12).toFixed(1));
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return {
    feet: isNegative ? -feet : feet,
    inches,
  };
}

export function feetInchesToMeters(feet: number, inches: number, sign = 1): number {
  const isNeg = sign < 0 || feet < 0 || Object.is(feet, -0);
  const absFeet = Math.abs(feet);
  const absInches = Math.abs(inches);
  const totalFeet = absFeet + absInches / 12;
  const meters = (isNeg ? -1 : 1) * totalFeet * 0.3048;
  return parseFloat(meters.toFixed(3));
}

const CSS_NAMED_COLORS = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
  'transparent',
  'currentcolor',
]);

export function isValidColor(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim().toLowerCase();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(trimmed)) return true;
  if (/^(rgb|rgba|hsl|hsla)\(\s*[-0-9.%,/ ]+\s*\)$/.test(trimmed)) return true;
  return CSS_NAMED_COLORS.has(trimmed);
}

const GENERAL_SCHEMA = [
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
];

const RADAR_BOOLEANS_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_rings', label: 'Show Distance Rings', selector: { boolean: {} } },
      { name: 'show_labels', label: 'Show Target Labels', selector: { boolean: {} } },
      { name: 'show_coordinates', label: 'Show X/Y Coordinates', selector: { boolean: {} } },
    ],
  },
];

const TARGETS_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_trails', label: 'Show Target Trails', selector: { boolean: {} } },
      {
        name: 'show_last_known',
        label: 'Show Last-Known Positions When Clear',
        selector: { boolean: {} },
      },
    ],
  },
  {
    name: 'stale_timeout',
    label: 'Stale Timeout (Seconds)',
    helper: 'Seconds of silence before live targets are marked stale (default: 10s).',
    selector: { number: { mode: 'box', min: 1, max: 60 } },
  },
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'trail_history_seconds',
        label: 'Trail Duration (Seconds)',
        helper: 'How long trail breadcrumbs remain visible before expiring (default: 10s).',
        selector: { number: { mode: 'box', min: 1, max: 120 } },
      },
      {
        name: 'trail_max_points',
        label: 'Maximum Trail Points',
        helper: 'Maximum number of historical points retained per target (1–200, default: 30).',
        selector: { number: { mode: 'box', min: 1, max: 200 } },
      },
    ],
  },
];

const FLOORPLAN_IMAGE_SCHEMA = [
  {
    name: 'floorplan_image',
    label: 'Image URL or Path (e.g. /local/floorplan.png)',
    selector: { text: {} },
  },
];

const ADVANCED_SCHEMA = [
  { name: 'demo_mode', label: 'Demo Mode (Simulated Data)', selector: { boolean: {} } },
];

const SENSOR_MAIN_HA_SCHEMA = [
  {
    name: 'name',
    label: 'Sensor Display Name',
    selector: { text: {} },
  },
  {
    name: 'targets_entity',
    label: 'Targets Entity (Required for live data)',
    selector: { entity: { domain: 'sensor' } },
  },
  {
    name: 'occupancy_entity',
    label: 'Occupancy Binary Sensor (Optional)',
    helper: 'Allows live targets to be cleared immediately when occupancy turns off.',
    selector: { entity: { domain: 'binary_sensor' } },
  },
];

const SENSOR_PLACEMENT_HA_SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'rotation',
        label: 'Rotation Angle (Degrees)',
        selector: { number: { mode: 'box', min: 0, max: 359 } },
      },
      {
        name: 'fov',
        label: 'Illustrative Field of View (Degrees)',
        selector: { number: { mode: 'box', min: 30, max: 360 } },
      },
    ],
  },
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'mirror_x',
        label: 'Mirror X (Horizontal)',
        selector: { boolean: {} },
      },
      {
        name: 'mirror_y',
        label: 'Mirror Y (Vertical)',
        selector: { boolean: {} },
      },
    ],
  },
];

const SENSOR_BOUNDARIES_SCHEMA = [
  {
    name: 'boundary_prefix',
    label: 'Boundary Entity Prefix (e.g. number.garage_lights_mmwave_)',
    selector: { text: {} },
  },
  {
    name: 'boundary_min_x_entity',
    label: 'Width Min Left / X Min',
    selector: { entity: { domain: 'number' } },
  },
  {
    name: 'boundary_max_x_entity',
    label: 'Width Max Right / X Max',
    selector: { entity: { domain: 'number' } },
  },
  {
    name: 'boundary_min_y_entity',
    label: 'Depth Min Near / Y Min',
    selector: { entity: { domain: 'number' } },
  },
  {
    name: 'boundary_max_y_entity',
    label: 'Depth Max Far / Y Max',
    selector: { entity: { domain: 'number' } },
  },
  {
    name: 'boundary_min_z_entity',
    label: 'Height Min Floor / Z Min (Optional)',
    selector: { entity: { domain: 'number' } },
  },
  {
    name: 'boundary_max_z_entity',
    label: 'Height Max Ceiling / Z Max (Optional)',
    selector: { entity: { domain: 'number' } },
  },
];

const SENSOR_ADVANCED_SCHEMA = [
  {
    name: 'source_units',
    label: 'Sensor Source Units',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'mm', label: 'Millimeters (mm)' },
          { value: 'cm', label: 'Centimeters (cm)' },
          { value: 'm', label: 'Meters (m)' },
          { value: 'in', label: 'Inches (in)' },
          { value: 'ft', label: 'Feet (ft)' },
        ],
      },
    },
  },
  {
    name: 'reporting_entity',
    label: 'Target reporting switch (optional)',
    helper: 'Used to detect when reporting is off. This card does not turn the switch on.',
    selector: { entity: { domain: 'switch' } },
  },
];

const CHEVRON_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
const ARROW_UP_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
const ARROW_DOWN_SVG = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
const COPY_SVG = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const TRASH_SVG = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
const PLUS_SVG = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;

interface SensorDomEntry {
  root: HTMLElement;
  headerTitle: HTMLElement;
  headerSummary: HTMLElement;
  colorBadge: HTMLElement;
  btnMoveUp: HTMLButtonElement;
  btnMoveDown: HTMLButtonElement;
  btnDuplicate: HTMLButtonElement;
  btnRemove: HTMLButtonElement;
  feedbackBox: HTMLElement;
  formMain: HaFormElement;
  colorPreviewBox: HTMLElement;
  colorPickerInput: HTMLInputElement;
  colorTextInput: HTMLInputElement;
  colorPresetContainer: HTMLElement;
  colorValidationMsg: HTMLElement;
  formPlacement: HaFormElement;
  posXContainer: HTMLElement;
  posYContainer: HTMLElement;
  formBoundaries: HaFormElement;
  boundaryFeedbackContainer: HTMLElement;
  formAdvanced: HaFormElement;
  targetsSelect: HTMLSelectElement;
  targetsCustomWrapper: HTMLElement;
  targetsCustomInput: HTMLInputElement;
  targetsValidationBadge: HTMLElement;
  trailSelect: HTMLSelectElement;
  trailCustomWrapper: HTMLElement;
  trailCustomInput: HTMLInputElement;
  trailValidationBadge: HTMLElement;
}

export class PresenceMapEditor extends HTMLElement {
  private _config?: PresenceMapCardConfig;
  private _lastEmittedConfig?: PresenceMapCardConfig;
  private _hass?: HomeAssistant;
  private _root: ShadowRoot;

  private _expandedSections: Set<string> = new Set();

  private _formGeneral?: HaFormElement;
  private _radarRangeContainer?: HTMLElement;
  private _formRadarBooleans?: HaFormElement;
  private _formTargets?: HaFormElement;
  private _formFloorplanImage?: HaFormElement;
  private _floorplanDimsContainer?: HTMLElement;
  private _formAdvanced?: HaFormElement;

  private _sensorListEl?: HTMLElement;
  private _sensorSummaryEl?: HTMLElement;
  private _sensorDomNodes: Map<string, SensorDomEntry> = new Map();

  private _isInitialized = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public connectedCallback(): void {
    this._ensureLayout();
  }

  public disconnectedCallback(): void {
    this._sensorDomNodes.clear();
  }

  public setConfig(config: PresenceMapCardConfig): void {
    const isEcho = this._isConfigEqual(config, this._lastEmittedConfig);
    this._config = JSON.parse(JSON.stringify(config));

    this._ensureLayout();

    if (isEcho) {
      return;
    }

    this._updateAllFormData();
    this._reconcileSensors();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._updateHassAcrossForms();
  }

  private _ensureLayout(): void {
    if (this._isInitialized) return;
    this._isInitialized = true;

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .pm-editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          box-sizing: border-box;
          font-family: var(--paper-font-body1_-_font-family, inherit);
          color: var(--primary-text-color, #212121);
        }
        .pm-accordion {
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
          border-radius: var(--ha-card-border-radius, 8px);
          background-color: var(--card-background-color, #ffffff);
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .pm-accordion:focus-within {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: none;
          border-bottom: 1px solid transparent;
          cursor: pointer;
          text-align: left;
          user-select: none;
          box-sizing: border-box;
          outline: none;
          transition: background-color 0.15s ease;
        }
        .pm-accordion.expanded > .pm-accordion-header {
          border-bottom-color: var(--divider-color, rgba(0, 0, 0, 0.12));
        }
        .pm-accordion-header:hover,
        .pm-accordion-header:focus-visible {
          background-color: var(--divider-color, rgba(0, 0, 0, 0.06));
        }
        .pm-accordion-header:focus-visible {
          outline: 2px solid var(--primary-color, #03a9f4);
          outline-offset: -2px;
        }
        .pm-header-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .pm-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          transition: transform 0.2s ease;
          color: var(--secondary-text-color, #757575);
          flex-shrink: 0;
        }
        .pm-chevron svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }
        .pm-accordion.expanded > .pm-accordion-header .pm-chevron,
        .pm-sub-accordion.expanded > .pm-sub-accordion-header .pm-chevron {
          transform: rotate(180deg);
        }
        .pm-header-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color, #212121);
          white-space: nowrap;
        }
        .pm-header-summary {
          font-size: 12px;
          color: var(--secondary-text-color, #757575);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-left: 4px;
        }
        .pm-color-badge {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }
        .pm-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .pm-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 4px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--secondary-text-color, #757575);
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          box-sizing: border-box;
        }
        .pm-icon-btn:hover:not(:disabled) {
          background-color: rgba(127, 127, 127, 0.18);
          color: var(--primary-text-color, #212121);
        }
        .pm-icon-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .pm-icon-btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }
        .pm-accordion-content {
          display: none;
          padding: 16px;
          box-sizing: border-box;
        }
        .pm-accordion.expanded > .pm-accordion-content {
          display: block;
        }
        .pm-sub-accordion {
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
          border-radius: 6px;
          margin-top: 12px;
          background: var(--card-background-color, #ffffff);
          overflow: hidden;
        }
        .pm-sub-accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.015));
          border: none;
          border-bottom: 1px solid transparent;
          cursor: pointer;
          text-align: left;
          outline: none;
          transition: background-color 0.15s ease;
          color: var(--primary-text-color, #212121);
        }
        .pm-sub-accordion.expanded > .pm-sub-accordion-header {
          border-bottom-color: var(--divider-color, rgba(0, 0, 0, 0.08));
        }
        .pm-sub-accordion-header:hover,
        .pm-sub-accordion-header:focus-visible {
          background-color: var(--divider-color, rgba(0, 0, 0, 0.05));
        }
        .pm-sub-accordion-content {
          display: none;
          padding: 12px;
        }
        .pm-sub-accordion.expanded > .pm-sub-accordion-content {
          display: block;
        }
        .pm-add-sensor-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          margin-top: 12px;
          border: 1px dashed var(--primary-color, #03a9f4);
          border-radius: var(--ha-card-border-radius, 8px);
          background: rgba(3, 169, 244, 0.04);
          color: var(--primary-color, #03a9f4);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .pm-add-sensor-btn:hover {
          background: rgba(3, 169, 244, 0.1);
        }
        .pm-add-sensor-btn svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
        .pm-sensor-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        /* Measurement inputs */
        .pm-measurement-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pm-dual-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pm-unit-input-group {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .pm-unit-input-group:focus-within {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-unit-input-group input {
          border: none;
          outline: none;
          background: transparent;
          padding: 8px 10px;
          width: 76px;
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          box-sizing: border-box;
        }
        .pm-unit-suffix {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
          padding-right: 8px;
          user-select: none;
        }
        .pm-sign-select {
          padding: 8px 6px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-weight: bold;
          outline: none;
        }
        /* Color control */
        .pm-color-control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
          margin-bottom: 12px;
        }
        .pm-color-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pm-color-preview-box {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          flex-shrink: 0;
        }
        .pm-native-color-picker {
          width: 36px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
          box-sizing: border-box;
        }
        .pm-color-text-input {
          flex: 1;
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .pm-color-text-input:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-color-presets-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .pm-color-preset-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          box-sizing: border-box;
          padding: 0;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .pm-color-preset-btn:hover {
          transform: scale(1.15);
        }
        .pm-color-preset-btn.active {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 0 1px #fff;
        }
        .pm-color-validation-msg {
          font-size: 11px;
          color: var(--error-color, #d32f2f);
        }
        /* Diagnostics Feedback Box */
        .pm-sensor-feedback-box {
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .pm-feedback-header {
          font-size: 12px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 6px;
        }
        .pm-feedback-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pm-feedback-item {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 4px;
        }
        .pm-feedback-success {
          color: var(--success-color, #2e7d32);
          background: rgba(76, 175, 80, 0.08);
        }
        .pm-feedback-info {
          color: var(--primary-color, #0288d1);
          background: rgba(3, 169, 244, 0.08);
        }
        .pm-feedback-warning {
          color: var(--warning-color, #e65100);
          background: rgba(255, 152, 0, 0.08);
        }
        .pm-feedback-error {
          color: var(--error-color, #d32f2f);
          background: rgba(244, 67, 54, 0.08);
        }
        /* Boundary Feedback Table */
        .pm-boundary-feedback-container {
          margin-top: 14px;
          padding: 12px;
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
        }
        .pm-boundary-feedback-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-text-color, #212121);
          margin-bottom: 2px;
        }
        .pm-boundary-feedback-desc {
          font-size: 11px;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 8px;
        }
        .pm-boundary-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }
        .pm-boundary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          padding: 5px 8px;
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.05));
        }
        .pm-boundary-label-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pm-boundary-entity-name {
          font-family: monospace;
          font-size: 11px;
          color: var(--secondary-text-color, #757575);
        }
        .pm-boundary-source-tag {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .pm-source-explicit {
          background: rgba(3, 169, 244, 0.15);
          color: #0284c7;
        }
        .pm-source-prefix {
          background: rgba(156, 39, 176, 0.15);
          color: #9c27b0;
        }
        .pm-source-none {
          background: rgba(127, 127, 127, 0.15);
          color: #757575;
        }
        .pm-boundary-val {
          font-weight: 500;
          color: var(--primary-text-color, #212121);
        }
        .pm-boundary-summary-badge {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pm-boundary-summary-valid {
          background: rgba(76, 175, 80, 0.1);
          color: var(--success-color, #2e7d32);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .pm-boundary-summary-invalid {
          background: rgba(255, 152, 0, 0.1);
          color: var(--warning-color, #e65100);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        /* Placement Guidance Box */
        .pm-placement-guide {
          margin-top: 12px;
          padding: 12px;
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
          border-radius: 6px;
        }
        .pm-guide-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 6px;
        }
        .pm-guide-list {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: var(--primary-text-color, #212121);
          line-height: 1.5;
        }
        .pm-guide-list li {
          margin-bottom: 4px;
        }
        /* Attribute Selectors */
        .pm-attr-selector-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
        }
        .pm-field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
        }
        .pm-select-box,
        .pm-custom-text-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
          background-color: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .pm-select-box:focus,
        .pm-custom-text-input:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .pm-field-helper {
          font-size: 12px;
          color: var(--secondary-text-color, #757575);
          line-height: 1.4;
        }
        .pm-validation-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 4px;
        }
        .pm-validation-compatible {
          background-color: rgba(76, 175, 80, 0.1);
          color: var(--success-color, #2e7d32);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .pm-validation-empty {
          background-color: rgba(33, 150, 243, 0.08);
          color: var(--primary-color, #0288d1);
          border: 1px solid rgba(33, 150, 243, 0.25);
        }
        .pm-validation-unsupported {
          background-color: rgba(244, 67, 54, 0.1);
          color: var(--error-color, #d32f2f);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }
        .pm-validation-unavailable {
          background-color: rgba(255, 152, 0, 0.1);
          color: var(--warning-color, #e65100);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        .pm-validation-none {
          display: none;
        }
        ha-form {
          display: block;
        }
      </style>
      <div class="pm-editor">
        <!-- 1. General Section -->
        <div class="pm-accordion" data-section="general">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-general">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">General</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-general" role="region">
            <ha-form class="ha-form-general"></ha-form>
          </div>
        </div>

        <!-- 2. Radar Display Section -->
        <div class="pm-accordion" data-section="radar">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-radar">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Radar Display</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-radar" role="region">
            <div class="pm-radar-range-container"></div>
            <ha-form class="ha-form-radar"></ha-form>
          </div>
        </div>

        <!-- 3. Targets & Trails Section -->
        <div class="pm-accordion" data-section="targets">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-targets">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Targets &amp; Trails</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-targets" role="region">
            <ha-form class="ha-form-targets"></ha-form>
          </div>
        </div>

        <!-- 4. Floor Plan Section -->
        <div class="pm-accordion" data-section="floorplan">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-floorplan">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Floor Plan</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-floorplan" role="region">
            <ha-form class="ha-form-floorplan ha-form-floorplan-image"></ha-form>
            <div class="pm-floorplan-dims-container"></div>
          </div>
        </div>

        <!-- 5. Sensors Section -->
        <div class="pm-accordion" data-section="sensors">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-sensors">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Sensors</span>
              <span class="pm-header-summary pm-sensor-count-summary"></span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-sensors" role="region">
            <div class="pm-sensor-list"></div>
            <button type="button" class="pm-add-sensor-btn" aria-label="Add Sensor">
              ${PLUS_SVG} Add Sensor
            </button>
          </div>
        </div>

        <!-- 6. Advanced Section -->
        <div class="pm-accordion" data-section="advanced">
          <button type="button" class="pm-accordion-header" aria-expanded="false" aria-controls="pm-content-advanced">
            <div class="pm-header-title-group">
              <span class="pm-chevron">${CHEVRON_SVG}</span>
              <span class="pm-header-title">Advanced</span>
            </div>
          </button>
          <div class="pm-accordion-content" id="pm-content-advanced" role="region">
            <ha-form class="ha-form-advanced"></ha-form>
          </div>
        </div>
      </div>
    `;

    // Hook up global accordion header clicks & keyboard events
    this._root.querySelectorAll('.pm-accordion').forEach(accordionEl => {
      const sectionKey = (accordionEl as HTMLElement).dataset.section;
      if (!sectionKey) return;
      const headerBtn = accordionEl.querySelector('.pm-accordion-header') as HTMLElement;
      if (!headerBtn) return;

      headerBtn.addEventListener('click', () => {
        this._toggleSection(sectionKey);
      });
      headerBtn.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleSection(sectionKey);
        }
      });
    });

    const addSensorBtn = this._root.querySelector('.pm-add-sensor-btn') as HTMLElement;
    if (addSensorBtn) {
      addSensorBtn.addEventListener('click', () => {
        this._handleAddSensor();
      });
    }

    this._sensorListEl = this._root.querySelector('.pm-sensor-list') as HTMLElement;
    this._sensorSummaryEl = this._root.querySelector('.pm-sensor-count-summary') as HTMLElement;
    this._radarRangeContainer = this._root.querySelector(
      '.pm-radar-range-container'
    ) as HTMLElement;
    this._floorplanDimsContainer = this._root.querySelector(
      '.pm-floorplan-dims-container'
    ) as HTMLElement;

    // Initialize global ha-forms
    this._formGeneral = this._setupForm('.ha-form-general', GENERAL_SCHEMA, data => {
      const unitsChanged = data.display_units !== (this._config?.display_units ?? 'metric');
      this._updateConfig(current => ({
        ...current,
        title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : undefined,
        display_units: data.display_units === 'imperial' ? 'imperial' : 'metric',
        theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'auto',
      }));
      if (unitsChanged) {
        this._renderGlobalMeasurementInputs();
        this._reconcileSensors();
      }
    });

    this._formRadarBooleans = this._setupForm('.ha-form-radar', RADAR_BOOLEANS_SCHEMA, data => {
      this._updateConfig(current => ({
        ...current,
        range_meters:
          data.range_meters !== undefined
            ? this._parseNum(data.range_meters, current.range_meters ?? 6)
            : current.range_meters,
        show_rings: data.show_rings !== false,
        show_labels: data.show_labels !== false,
        show_coordinates: Boolean(data.show_coordinates),
      }));
    });

    this._formTargets = this._setupForm('.ha-form-targets', TARGETS_SCHEMA, data => {
      this._updateConfig(current => ({
        ...current,
        show_trails: data.show_trails !== false,
        show_last_known: data.show_last_known !== false,
        stale_timeout: Number(data.stale_timeout) || 10,
        trail_history_seconds:
          data.trail_history_seconds !== undefined && data.trail_history_seconds !== ''
            ? Number(data.trail_history_seconds)
            : undefined,
        trail_max_points:
          data.trail_max_points !== undefined && data.trail_max_points !== ''
            ? Number(data.trail_max_points)
            : undefined,
      }));
    });

    this._formFloorplanImage = this._setupForm(
      '.ha-form-floorplan-image',
      FLOORPLAN_IMAGE_SCHEMA,
      data => {
        this._updateConfig(current => {
          const imageStr =
            typeof data.floorplan_image === 'string' ? data.floorplan_image.trim() : '';
          if (imageStr) {
            return {
              ...current,
              floorplan: {
                image: imageStr,
                width_meters:
                  data.floorplan_width !== undefined
                    ? this._parseNum(data.floorplan_width, current.floorplan?.width_meters || 10)
                    : current.floorplan?.width_meters || 10,
                height_meters:
                  data.floorplan_height !== undefined
                    ? this._parseNum(data.floorplan_height, current.floorplan?.height_meters || 8)
                    : current.floorplan?.height_meters || 8,
              },
            };
          } else {
            return {
              ...current,
              floorplan: undefined,
            };
          }
        });
      }
    );

    this._formAdvanced = this._setupForm('.ha-form-advanced', ADVANCED_SCHEMA, data => {
      this._updateConfig(current => ({
        ...current,
        demo_mode: Boolean(data.demo_mode),
      }));
    });

    if (this._config) {
      this._updateAllFormData();
      this._renderGlobalMeasurementInputs();
      this._reconcileSensors();
    }
  }

  private _setupForm(
    selector: string,
    schema: unknown[],
    onValueChange: (data: Record<string, unknown>) => void
  ): HaFormElement | undefined {
    const form = this._root.querySelector(selector) as HaFormElement | null;
    if (!form) return undefined;

    form.schema = schema;
    if (this._hass) form.hass = this._hass;
    form.computeLabel = (s: { label?: string; name: string }) => s.label || s.name;
    form.computeHelper = (s: { helper?: string; name: string }) => s.helper || '';

    form.addEventListener('value-changed', (ev: Event) => {
      const customEv = ev as CustomEvent<{ value: Record<string, unknown> }>;
      if (customEv.detail && customEv.detail.value) {
        onValueChange(customEv.detail.value);
      }
    });

    return form;
  }

  private _toggleSection(sectionKey: string): void {
    if (this._expandedSections.has(sectionKey)) {
      this._expandedSections.delete(sectionKey);
    } else {
      this._expandedSections.add(sectionKey);
    }
    this._syncAccordionState(sectionKey);
  }

  private _syncAccordionState(sectionKey: string): void {
    const globalAccordion = this._root.querySelector(
      `.pm-accordion[data-section="${sectionKey}"]`
    ) as HTMLElement | null;
    if (globalAccordion) {
      const isExpanded = this._expandedSections.has(sectionKey);
      globalAccordion.classList.toggle('expanded', isExpanded);
      const headerBtn = globalAccordion.querySelector('.pm-accordion-header');
      if (headerBtn) {
        headerBtn.setAttribute('aria-expanded', String(isExpanded));
      }
      return;
    }

    if (sectionKey.startsWith('sensor:')) {
      const parts = sectionKey.split(':');
      const sensorId = parts[1];
      const subSection = parts[2];
      const entry = this._sensorDomNodes.get(sensorId);
      if (!entry) return;

      if (!subSection) {
        const isExpanded = this._expandedSections.has(sectionKey);
        entry.root.classList.toggle('expanded', isExpanded);
        const headerBtn = entry.root.querySelector('.pm-accordion-header');
        if (headerBtn) {
          headerBtn.setAttribute('aria-expanded', String(isExpanded));
        }
      } else {
        const subAcc = entry.root.querySelector(
          `.pm-sub-accordion[data-subsection="${subSection}"]`
        ) as HTMLElement | null;
        if (subAcc) {
          const isExpanded = this._expandedSections.has(sectionKey);
          subAcc.classList.toggle('expanded', isExpanded);
          const subHeader = subAcc.querySelector('.pm-sub-accordion-header');
          if (subHeader) {
            subHeader.setAttribute('aria-expanded', String(isExpanded));
          }
        }
      }
    }
  }

  private _updateAllFormData(): void {
    if (!this._config) return;

    if (this._formGeneral) {
      const data = {
        title: this._config.title ?? '',
        display_units: this._config.display_units ?? 'metric',
        theme: this._config.theme ?? 'auto',
      };
      if (!this._isFormDataEqual(this._formGeneral.data, data)) {
        this._formGeneral.data = data;
      }
    }

    if (this._formRadarBooleans) {
      const data = {
        range_meters: this._config.range_meters ?? 6,
        show_rings: this._config.show_rings !== false,
        show_labels: this._config.show_labels !== false,
        show_coordinates: Boolean(this._config.show_coordinates),
      };
      if (!this._isFormDataEqual(this._formRadarBooleans.data, data)) {
        this._formRadarBooleans.data = data;
      }
    }

    if (this._formTargets) {
      const data = {
        show_trails: this._config.show_trails !== false,
        show_last_known: this._config.show_last_known !== false,
        stale_timeout: this._config.stale_timeout ?? 10,
        trail_history_seconds: this._config.trail_history_seconds ?? 10,
        trail_max_points: this._config.trail_max_points ?? 30,
      };
      if (!this._isFormDataEqual(this._formTargets.data, data)) {
        this._formTargets.data = data;
      }
    }

    if (this._formFloorplanImage) {
      const data = {
        floorplan_image: this._config.floorplan?.image ?? '',
        floorplan_width: this._config.floorplan?.width_meters ?? 10,
        floorplan_height: this._config.floorplan?.height_meters ?? 8,
      };
      if (!this._isFormDataEqual(this._formFloorplanImage.data, data)) {
        this._formFloorplanImage.data = data;
      }
    }

    if (this._formAdvanced) {
      const data = {
        demo_mode: Boolean(this._config.demo_mode),
      };
      if (!this._isFormDataEqual(this._formAdvanced.data, data)) {
        this._formAdvanced.data = data;
      }
    }

    this._renderGlobalMeasurementInputs();
  }

  private _renderGlobalMeasurementInputs(): void {
    const isImperial = this._config?.display_units === 'imperial';

    // 1. Radar range
    if (this._radarRangeContainer) {
      const storedMeters = this._config?.range_meters ?? 6;
      if (isImperial) {
        const { feet, inches } = metersToFeetInches(storedMeters);
        this._radarRangeContainer.innerHTML = `
          <div class="pm-measurement-field">
            <label class="pm-field-label">Radar Range (ft / in)</label>
            <div class="pm-dual-input-row">
              <div class="pm-unit-input-group">
                <input type="number" class="pm-range-ft" min="3" max="65" step="1" value="${feet}" placeholder="ft" aria-label="Radar range feet" />
                <span class="pm-unit-suffix">ft</span>
              </div>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-range-in" min="0" max="11.9" step="0.5" value="${inches}" placeholder="in" aria-label="Radar range inches" />
                <span class="pm-unit-suffix">in</span>
              </div>
            </div>
            <div class="pm-field-helper">Radar visualization radius (equivalent to ${storedMeters}m).</div>
          </div>
        `;
        const ftInput = this._radarRangeContainer.querySelector('.pm-range-ft') as HTMLInputElement;
        const inInput = this._radarRangeContainer.querySelector('.pm-range-in') as HTMLInputElement;
        const onChange = () => {
          const ft = parseFloat(ftInput.value) || 0;
          const inc = parseFloat(inInput.value) || 0;
          const newMeters = feetInchesToMeters(ft, inc);
          this._updateConfig(current => ({ ...current, range_meters: Math.max(1, newMeters) }));
        };
        ftInput.addEventListener('input', onChange);
        inInput.addEventListener('input', onChange);
      } else {
        this._radarRangeContainer.innerHTML = `
          <div class="pm-measurement-field">
            <label class="pm-field-label">Radar Range (Meters)</label>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-range-m" min="1" max="20" step="0.5" value="${storedMeters}" placeholder="m" aria-label="Radar range meters" />
              <span class="pm-unit-suffix">m</span>
            </div>
            <div class="pm-field-helper">Radar visualization radius in meters (1 to 20).</div>
          </div>
        `;
        const mInput = this._radarRangeContainer.querySelector('.pm-range-m') as HTMLInputElement;
        mInput.addEventListener('input', () => {
          const val = parseFloat(mInput.value);
          if (Number.isFinite(val) && val > 0) {
            this._updateConfig(current => ({ ...current, range_meters: val }));
          }
        });
      }
    }

    // 2. Floor plan dimensions
    if (this._floorplanDimsContainer) {
      const storedWidth = this._config?.floorplan?.width_meters ?? 10;
      const storedHeight = this._config?.floorplan?.height_meters ?? 8;

      if (isImperial) {
        const wImp = metersToFeetInches(storedWidth);
        const hImp = metersToFeetInches(storedHeight);
        this._floorplanDimsContainer.innerHTML = `
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Floor-Plan Width (ft / in)</label>
              <div class="pm-dual-input-row">
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-w-ft" min="3" max="328" step="1" value="${wImp.feet}" placeholder="ft" aria-label="Floor plan width feet" />
                  <span class="pm-unit-suffix">ft</span>
                </div>
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-w-in" min="0" max="11.9" step="0.5" value="${wImp.inches}" placeholder="in" aria-label="Floor plan width inches" />
                  <span class="pm-unit-suffix">in</span>
                </div>
              </div>
            </div>
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Floor-Plan Height (ft / in)</label>
              <div class="pm-dual-input-row">
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-h-ft" min="3" max="328" step="1" value="${hImp.feet}" placeholder="ft" aria-label="Floor plan height feet" />
                  <span class="pm-unit-suffix">ft</span>
                </div>
                <div class="pm-unit-input-group">
                  <input type="number" class="pm-fp-h-in" min="0" max="11.9" step="0.5" value="${hImp.inches}" placeholder="in" aria-label="Floor plan height inches" />
                  <span class="pm-unit-suffix">in</span>
                </div>
              </div>
            </div>
          </div>
        `;
        const wFt = this._floorplanDimsContainer.querySelector('.pm-fp-w-ft') as HTMLInputElement;
        const wIn = this._floorplanDimsContainer.querySelector('.pm-fp-w-in') as HTMLInputElement;
        const hFt = this._floorplanDimsContainer.querySelector('.pm-fp-h-ft') as HTMLInputElement;
        const hIn = this._floorplanDimsContainer.querySelector('.pm-fp-h-in') as HTMLInputElement;

        const onDimChange = () => {
          if (!this._config?.floorplan?.image) return;
          const newW = feetInchesToMeters(parseFloat(wFt.value) || 0, parseFloat(wIn.value) || 0);
          const newH = feetInchesToMeters(parseFloat(hFt.value) || 0, parseFloat(hIn.value) || 0);
          this._updateConfig(current => ({
            ...current,
            floorplan: current.floorplan
              ? {
                  ...current.floorplan,
                  width_meters: Math.max(1, newW),
                  height_meters: Math.max(1, newH),
                }
              : undefined,
          }));
        };
        wFt.addEventListener('input', onDimChange);
        wIn.addEventListener('input', onDimChange);
        hFt.addEventListener('input', onDimChange);
        hIn.addEventListener('input', onDimChange);
      } else {
        this._floorplanDimsContainer.innerHTML = `
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Width (Meters)</label>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-fp-w-m" min="1" max="100" step="0.5" value="${storedWidth}" placeholder="m" aria-label="Floor plan width meters" />
                <span class="pm-unit-suffix">m</span>
              </div>
            </div>
            <div class="pm-measurement-field" style="flex: 1; min-width: 140px;">
              <label class="pm-field-label">Height (Meters)</label>
              <div class="pm-unit-input-group">
                <input type="number" class="pm-fp-h-m" min="1" max="100" step="0.5" value="${storedHeight}" placeholder="m" aria-label="Floor plan height meters" />
                <span class="pm-unit-suffix">m</span>
              </div>
            </div>
          </div>
        `;
        const wInput = this._floorplanDimsContainer.querySelector('.pm-fp-w-m') as HTMLInputElement;
        const hInput = this._floorplanDimsContainer.querySelector('.pm-fp-h-m') as HTMLInputElement;
        const onMetricDimChange = () => {
          if (!this._config?.floorplan?.image) return;
          const newW = parseFloat(wInput.value);
          const newH = parseFloat(hInput.value);
          this._updateConfig(current => ({
            ...current,
            floorplan: current.floorplan
              ? {
                  ...current.floorplan,
                  width_meters:
                    Number.isFinite(newW) && newW > 0 ? newW : current.floorplan.width_meters,
                  height_meters:
                    Number.isFinite(newH) && newH > 0 ? newH : current.floorplan.height_meters,
                }
              : undefined,
          }));
        };
        wInput.addEventListener('input', onMetricDimChange);
        hInput.addEventListener('input', onMetricDimChange);
      }
    }
  }

  private _updateHassAcrossForms(): void {
    if (!this._hass) return;

    if (this._formGeneral) this._formGeneral.hass = this._hass;
    if (this._formRadarBooleans) this._formRadarBooleans.hass = this._hass;
    if (this._formTargets) this._formTargets.hass = this._hass;
    if (this._formFloorplanImage) this._formFloorplanImage.hass = this._hass;
    if (this._formAdvanced) this._formAdvanced.hass = this._hass;

    for (const [sensorId, entry] of this._sensorDomNodes.entries()) {
      if (entry.formMain) entry.formMain.hass = this._hass;
      if (entry.formPlacement) entry.formPlacement.hass = this._hass;
      if (entry.formBoundaries) entry.formBoundaries.hass = this._hass;
      if (entry.formAdvanced) entry.formAdvanced.hass = this._hass;

      const sensor = this._config?.sensors?.find(s => s.id === sensorId);
      if (sensor) {
        this._renderSensorFeedback(entry, sensor);
        this._renderBoundaryFeedback(entry, sensor);
        this._populateTargetsSelector(entry, sensor);
        this._populateTrailSelector(entry, sensor);
      }
    }
  }

  private _reconcileSensors(): void {
    if (!this._sensorListEl) return;
    const sensors = this._config?.sensors || [];

    if (this._sensorSummaryEl) {
      this._sensorSummaryEl.textContent = `(${sensors.length} configured)`;
    }

    const currentSensorIds = new Set(sensors.map(s => s.id));

    // Remove obsolete sensor DOM nodes
    for (const [id, entry] of this._sensorDomNodes.entries()) {
      if (!currentSensorIds.has(id)) {
        entry.root.remove();
        this._sensorDomNodes.delete(id);
      }
    }

    sensors.forEach((sensor, index) => {
      let entry = this._sensorDomNodes.get(sensor.id);
      if (!entry) {
        entry = this._createSensorDomNode(sensor);
        this._sensorDomNodes.set(sensor.id, entry);
      }

      this._sensorListEl?.appendChild(entry.root);
      this._updateSensorDomEntry(entry, sensor, index, sensors.length);
    });
  }

  private _createSensorDomNode(sensor: SensorConfig): SensorDomEntry {
    const root = document.createElement('div');
    root.className = 'pm-accordion';
    root.dataset.sensorId = sensor.id;

    root.innerHTML = `
      <div class="pm-accordion-header" role="button" tabindex="0" aria-expanded="false">
        <div class="pm-header-title-group">
          <span class="pm-chevron">${CHEVRON_SVG}</span>
          <span class="pm-color-badge"></span>
          <span class="pm-header-title"></span>
          <span class="pm-header-summary"></span>
        </div>
        <div class="pm-header-actions">
          <button type="button" class="pm-icon-btn btn-move-up" title="Move Up">${ARROW_UP_SVG}</button>
          <button type="button" class="pm-icon-btn btn-move-down" title="Move Down">${ARROW_DOWN_SVG}</button>
          <button type="button" class="pm-icon-btn btn-duplicate" title="Duplicate">${COPY_SVG}</button>
          <button type="button" class="pm-icon-btn btn-remove" title="Remove">${TRASH_SVG}</button>
        </div>
      </div>
      <div class="pm-accordion-content" role="region">
        <!-- Sensor Diagnostics & Status Box -->
        <div class="pm-sensor-feedback-box">
          <div class="pm-feedback-header">Sensor Status &amp; Diagnostics</div>
          <div class="pm-feedback-list"></div>
        </div>

        <ha-form class="ha-form-sensor-main"></ha-form>

        <!-- Sensor Color Control -->
        <div class="pm-color-control-group">
          <label class="pm-field-label">Sensor Color</label>
          <div class="pm-color-input-row">
            <span class="pm-color-preview-box" title="Color Preview"></span>
            <input type="color" class="pm-native-color-picker" aria-label="Color picker" />
            <input type="text" class="pm-color-text-input" placeholder="#03a9f4" aria-label="Custom color input" />
          </div>
          <div class="pm-color-presets-row" role="group" aria-label="Preset colors">
            ${DEFAULT_PALETTE.map(
              p => `
              <button type="button" class="pm-color-preset-btn" data-color="${p}" style="background-color: ${p}" aria-label="Color preset ${p}" title="${p}"></button>
            `
            ).join('')}
          </div>
          <div class="pm-color-validation-msg" style="display: none;"></div>
        </div>

        <!-- Placement Subsection -->
        <div class="pm-sub-accordion" data-subsection="placement">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Placement</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <div class="pm-pos-x-container"></div>
            <div class="pm-pos-y-container"></div>
            <ha-form class="ha-form-sensor-placement"></ha-form>

            <!-- Placement Guidance Box -->
            <div class="pm-placement-guide">
              <div class="pm-guide-title">Placement &amp; Coordinate Guidance</div>
              <ul class="pm-guide-list">
                <li><strong>Coordinate Origin &amp; Directions</strong>: In radar mode, (0, 0) is centered with +X right and +Y forward/up. On floor plans, (0, 0) is at the top-left corner with +X right across width and +Y downward across height.</li>
                <li><strong>Sensor Position vs. Targets</strong>: Sensor Position (X, Y) sets the physical mounting point. Target coordinates reported by the sensor (+Y forward from face, +X right) are rotated, mirrored, and translated relative to this position.</li>
                <li><strong>Rotation (0°–359°)</strong>: Clockwise rotation where 0° points forward/up (+Y), 90° points right (+X), 180° points down (-Y), and 270° points left (-X).</li>
                <li><strong>Mirror X / Y</strong>: Mirror X flips left/right target movement horizontally; Mirror Y flips depth/forward movement vertically (useful for inverted or ceiling mounts).</li>
                <li><strong>Field of View (FOV)</strong>: Illustrative visual coverage cone rendered on the card (default 120°). It does not configure or limit physical hardware detection.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Boundaries Subsection -->
        <div class="pm-sub-accordion" data-subsection="boundaries">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Boundaries</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <ha-form class="ha-form-sensor-boundaries"></ha-form>
            <div class="pm-boundary-feedback-container"></div>
          </div>
        </div>

        <!-- Advanced Subsection -->
        <div class="pm-sub-accordion" data-subsection="advanced">
          <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
            <span class="pm-sub-title">Advanced</span>
            <span class="pm-chevron">${CHEVRON_SVG}</span>
          </button>
          <div class="pm-sub-accordion-content">
            <ha-form class="ha-form-sensor-advanced"></ha-form>

            <!-- Targets Attribute Selector -->
            <div class="pm-attr-selector-container pm-targets-attr-container">
              <label class="pm-field-label">Targets attribute (optional)</label>
              <select class="pm-select-box pm-targets-select" aria-label="Targets attribute (optional)">
                <option value="">Default — targets</option>
              </select>
              <div class="pm-targets-custom-wrapper" style="display: none; margin-top: 6px;">
                <input type="text" class="pm-custom-text-input pm-targets-custom-input" placeholder="Custom targets attribute" aria-label="Custom targets attribute name" />
              </div>
              <div class="pm-field-helper">Attribute on the targets entity containing coordinate arrays. Leave unset to use the default 'targets' attribute.</div>
              <div class="pm-validation-badge pm-targets-validation pm-validation-none"></div>
            </div>

            <!-- Trail Source Subsection inside Advanced -->
            <div class="pm-sub-accordion" data-subsection="trail" style="margin-top: 14px;">
              <button type="button" class="pm-sub-accordion-header" aria-expanded="false">
                <span class="pm-sub-title">Trail source</span>
                <span class="pm-chevron">${CHEVRON_SVG}</span>
              </button>
              <div class="pm-sub-accordion-content">
                <div class="pm-attr-selector-container">
                  <label class="pm-field-label">History attribute (optional)</label>
                  <select class="pm-select-box pm-trail-select" aria-label="History attribute (optional)">
                    <option value="">None — collect trails in the card</option>
                  </select>
                  <div class="pm-trail-custom-wrapper" style="display: none; margin-top: 6px;">
                    <input type="text" class="pm-custom-text-input pm-trail-custom-input" placeholder="Custom attribute name" aria-label="Custom attribute name" />
                  </div>
                  <div class="pm-field-helper">Use an attribute containing historical coordinates. Leave unset to collect trails while the card is running.</div>
                  <div class="pm-validation-badge pm-trail-validation pm-validation-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const header = root.querySelector('.pm-accordion-header') as HTMLElement;
    const headerTitle = root.querySelector('.pm-header-title') as HTMLElement;
    const headerSummary = root.querySelector('.pm-header-summary') as HTMLElement;
    const colorBadge = root.querySelector('.pm-color-badge') as HTMLElement;
    const btnMoveUp = root.querySelector('.btn-move-up') as HTMLButtonElement;
    const btnMoveDown = root.querySelector('.btn-move-down') as HTMLButtonElement;
    const btnDuplicate = root.querySelector('.btn-duplicate') as HTMLButtonElement;
    const btnRemove = root.querySelector('.btn-remove') as HTMLButtonElement;
    const feedbackBox = root.querySelector('.pm-feedback-list') as HTMLElement;

    header.addEventListener('click', () => {
      this._toggleSection(`sensor:${sensor.id}`);
    });
    header.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleSection(`sensor:${sensor.id}`);
      }
    });

    btnMoveUp.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this._handleMoveSensor(sensor.id, -1);
    });

    btnMoveDown.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this._handleMoveSensor(sensor.id, 1);
    });

    btnDuplicate.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this._handleDuplicateSensor(sensor.id);
    });

    btnRemove.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this._handleRemoveSensor(sensor.id);
    });

    root.querySelectorAll('.pm-sub-accordion').forEach(subAcc => {
      const subKey = (subAcc as HTMLElement).dataset.subsection;
      if (!subKey) return;
      const subHeader = subAcc.querySelector('.pm-sub-accordion-header') as HTMLElement;
      if (!subHeader) return;

      subHeader.addEventListener('click', () => {
        this._toggleSection(`sensor:${sensor.id}:${subKey}`);
      });
      subHeader.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleSection(`sensor:${sensor.id}:${subKey}`);
        }
      });
    });

    // Ha-form elements
    const formMain = root.querySelector('.ha-form-sensor-main') as HaFormElement;
    const formPlacement = root.querySelector('.ha-form-sensor-placement') as HaFormElement;
    const formBoundaries = root.querySelector('.ha-form-sensor-boundaries') as HaFormElement;
    const formAdvanced = root.querySelector('.ha-form-sensor-advanced') as HaFormElement;

    // Color elements
    const colorPreviewBox = root.querySelector('.pm-color-preview-box') as HTMLElement;
    const colorPickerInput = root.querySelector('.pm-native-color-picker') as HTMLInputElement;
    const colorTextInput = root.querySelector('.pm-color-text-input') as HTMLInputElement;
    const colorPresetContainer = root.querySelector('.pm-color-presets-row') as HTMLElement;
    const colorValidationMsg = root.querySelector('.pm-color-validation-msg') as HTMLElement;

    // Hook up Color controls
    colorPickerInput.addEventListener('input', () => {
      const val = colorPickerInput.value;
      this._updateSensorById(sensor.id, s => {
        s.color = val;
      });
    });

    colorTextInput.addEventListener('input', () => {
      const val = colorTextInput.value.trim();
      if (!val) return;
      const isValid = isValidColor(val);
      if (isValid) {
        colorValidationMsg.style.display = 'none';
        this._updateSensorById(sensor.id, s => {
          s.color = val;
        });
      } else {
        colorValidationMsg.textContent = 'Invalid color format (hex, rgb, hsl, or CSS name)';
        colorValidationMsg.style.display = 'block';
      }
    });

    colorPresetContainer.querySelectorAll('.pm-color-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = (btn as HTMLElement).dataset.color;
        if (color) {
          colorValidationMsg.style.display = 'none';
          this._updateSensorById(sensor.id, s => {
            s.color = color;
          });
        }
      });
    });

    // Placement containers
    const posXContainer = root.querySelector('.pm-pos-x-container') as HTMLElement;
    const posYContainer = root.querySelector('.pm-pos-y-container') as HTMLElement;

    // Boundary feedback container
    const boundaryFeedbackContainer = root.querySelector(
      '.pm-boundary-feedback-container'
    ) as HTMLElement;

    // Targets attribute controls
    const targetsSelect = root.querySelector('.pm-targets-select') as HTMLSelectElement;
    const targetsCustomWrapper = root.querySelector('.pm-targets-custom-wrapper') as HTMLElement;
    const targetsCustomInput = root.querySelector('.pm-targets-custom-input') as HTMLInputElement;
    const targetsValidationBadge = root.querySelector('.pm-targets-validation') as HTMLElement;

    targetsSelect.addEventListener('change', () => {
      const chosen = targetsSelect.value;
      if (chosen === '__custom__') {
        targetsCustomWrapper.style.display = 'block';
        targetsCustomInput.focus();
        this._updateSensorById(sensor.id, s => {
          s.targets_attribute = this._cleanStr(targetsCustomInput.value);
        });
      } else if (chosen === '') {
        targetsCustomWrapper.style.display = 'none';
        this._updateSensorById(sensor.id, s => {
          delete s.targets_attribute;
        });
      } else {
        targetsCustomWrapper.style.display = 'none';
        this._updateSensorById(sensor.id, s => {
          s.targets_attribute = chosen;
        });
      }
    });

    targetsCustomInput.addEventListener('input', () => {
      this._updateSensorById(sensor.id, s => {
        s.targets_attribute = this._cleanStr(targetsCustomInput.value);
      });
    });

    // Trail controls
    const trailSelect = root.querySelector('.pm-trail-select') as HTMLSelectElement;
    const trailCustomWrapper = root.querySelector('.pm-trail-custom-wrapper') as HTMLElement;
    const trailCustomInput = root.querySelector('.pm-trail-custom-input') as HTMLInputElement;
    const trailValidationBadge = root.querySelector('.pm-trail-validation') as HTMLElement;

    trailSelect.addEventListener('change', () => {
      const chosen = trailSelect.value;
      if (chosen === '__custom__') {
        trailCustomWrapper.style.display = 'block';
        trailCustomInput.focus();
        this._updateSensorById(sensor.id, s => {
          s.trail_attribute = this._cleanStr(trailCustomInput.value);
        });
      } else if (chosen === '') {
        trailCustomWrapper.style.display = 'none';
        this._updateSensorById(sensor.id, s => {
          delete s.trail_attribute;
        });
      } else {
        trailCustomWrapper.style.display = 'none';
        this._updateSensorById(sensor.id, s => {
          s.trail_attribute = chosen;
        });
      }
    });

    trailCustomInput.addEventListener('input', () => {
      this._updateSensorById(sensor.id, s => {
        s.trail_attribute = this._cleanStr(trailCustomInput.value);
      });
    });

    this._initSensorForm(formMain, SENSOR_MAIN_HA_SCHEMA, (sensorRef, val) => {
      sensorRef.name = typeof val.name === 'string' && val.name.trim() ? val.name.trim() : '';
      sensorRef.targets_entity = typeof val.targets_entity === 'string' ? val.targets_entity : '';
      sensorRef.occupancy_entity = this._cleanStr(val.occupancy_entity);
    });

    this._initSensorForm(formPlacement, SENSOR_PLACEMENT_HA_SCHEMA, (sensorRef, val) => {
      const posX = val.position_x !== undefined ? val.position_x : val.x;
      const posY = val.position_y !== undefined ? val.position_y : val.y;
      if (posX !== undefined || posY !== undefined) {
        sensorRef.position = {
          x: this._parseNum(posX, sensorRef.position?.x ?? 0),
          y: this._parseNum(posY, sensorRef.position?.y ?? 0),
        };
      }
      sensorRef.rotation = this._parseNum(val.rotation, 0);
      sensorRef.fov = this._parseNum(val.fov, 120);
      sensorRef.mirror_x = Boolean(val.mirror_x);
      sensorRef.mirror_y = Boolean(val.mirror_y);
    });

    this._initSensorForm(formBoundaries, SENSOR_BOUNDARIES_SCHEMA, (sensorRef, val) => {
      sensorRef.boundary_prefix = this._cleanStr(val.boundary_prefix);
      sensorRef.boundary_min_x_entity = this._cleanStr(val.boundary_min_x_entity);
      sensorRef.boundary_max_x_entity = this._cleanStr(val.boundary_max_x_entity);
      sensorRef.boundary_min_y_entity = this._cleanStr(val.boundary_min_y_entity);
      sensorRef.boundary_max_y_entity = this._cleanStr(val.boundary_max_y_entity);
      sensorRef.boundary_min_z_entity = this._cleanStr(val.boundary_min_z_entity);
      sensorRef.boundary_max_z_entity = this._cleanStr(val.boundary_max_z_entity);
    });

    this._initSensorForm(formAdvanced, SENSOR_ADVANCED_SCHEMA, (sensorRef, val) => {
      const validUnits = ['mm', 'cm', 'm', 'in', 'ft'] as const;
      sensorRef.source_units =
        typeof val.source_units === 'string' &&
        validUnits.includes(val.source_units as (typeof validUnits)[number])
          ? (val.source_units as (typeof validUnits)[number])
          : 'cm';
      sensorRef.reporting_entity = this._cleanStr(val.reporting_entity);
    });

    return {
      root,
      headerTitle,
      headerSummary,
      colorBadge,
      btnMoveUp,
      btnMoveDown,
      btnDuplicate,
      btnRemove,
      feedbackBox,
      formMain,
      colorPreviewBox,
      colorPickerInput,
      colorTextInput,
      colorPresetContainer,
      colorValidationMsg,
      formPlacement,
      posXContainer,
      posYContainer,
      formBoundaries,
      boundaryFeedbackContainer,
      formAdvanced,
      targetsSelect,
      targetsCustomWrapper,
      targetsCustomInput,
      targetsValidationBadge,
      trailSelect,
      trailCustomWrapper,
      trailCustomInput,
      trailValidationBadge,
    };
  }

  private _initSensorForm(
    form: HaFormElement,
    schema: unknown[],
    updateFn: (sensor: SensorConfig, val: Record<string, unknown>) => void
  ): void {
    form.schema = schema;
    if (this._hass) form.hass = this._hass;
    form.computeLabel = (s: { label?: string; name: string }) => s.label || s.name;
    form.computeHelper = (s: { helper?: string; name: string }) => s.helper || '';

    form.addEventListener('value-changed', (ev: Event) => {
      const customEv = ev as CustomEvent<{ value: Record<string, unknown> }>;
      const sensorId = form.closest('.pm-accordion')?.getAttribute('data-sensor-id');
      if (sensorId && customEv.detail && customEv.detail.value) {
        this._updateSensorById(sensorId, sensor => updateFn(sensor, customEv.detail.value));
      }
    });
  }

  private _updateSensorDomEntry(
    entry: SensorDomEntry,
    sensor: SensorConfig,
    index: number,
    totalSensors: number
  ): void {
    entry.headerTitle.textContent = sensor.name || 'Unnamed Sensor';
    entry.headerSummary.textContent = sensor.targets_entity
      ? sensor.targets_entity
      : 'No targets entity configured';
    entry.colorBadge.style.backgroundColor = sensor.color || '#03a9f4';

    entry.btnMoveUp.disabled = index === 0;
    entry.btnMoveUp.setAttribute('aria-disabled', String(index === 0));
    entry.btnMoveUp.setAttribute('aria-label', `Move ${sensor.name || 'sensor'} up`);

    entry.btnMoveDown.disabled = index === totalSensors - 1;
    entry.btnMoveDown.setAttribute('aria-disabled', String(index === totalSensors - 1));
    entry.btnMoveDown.setAttribute('aria-label', `Move ${sensor.name || 'sensor'} down`);

    entry.btnDuplicate.setAttribute('aria-label', `Duplicate ${sensor.name || 'sensor'}`);
    entry.btnRemove.setAttribute('aria-label', `Remove ${sensor.name || 'sensor'}`);

    const isExpanded = this._expandedSections.has(`sensor:${sensor.id}`);
    entry.root.classList.toggle('expanded', isExpanded);
    const headerBtn = entry.root.querySelector('.pm-accordion-header');
    if (headerBtn) {
      headerBtn.setAttribute('aria-expanded', String(isExpanded));
    }

    entry.root.querySelectorAll('.pm-sub-accordion').forEach(subAcc => {
      const subKey = (subAcc as HTMLElement).dataset.subsection;
      if (!subKey) return;
      const isSubExpanded = this._expandedSections.has(`sensor:${sensor.id}:${subKey}`);
      subAcc.classList.toggle('expanded', isSubExpanded);
      const subHeader = subAcc.querySelector('.pm-sub-accordion-header');
      if (subHeader) {
        subHeader.setAttribute('aria-expanded', String(isSubExpanded));
      }
    });

    // Ha-form data updates
    const mainData = {
      name: sensor.name ?? '',
      targets_entity: sensor.targets_entity ?? '',
      occupancy_entity: sensor.occupancy_entity ?? '',
    };
    if (!this._isFormDataEqual(entry.formMain.data, mainData)) {
      entry.formMain.data = mainData;
    }

    // Color UI updates
    const currentColor = sensor.color || '#03a9f4';
    entry.colorPreviewBox.style.backgroundColor = currentColor;
    if (entry.colorTextInput.value !== currentColor) {
      entry.colorTextInput.value = currentColor;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(currentColor)) {
      entry.colorPickerInput.value = currentColor;
    }

    entry.colorPresetContainer.querySelectorAll('.pm-color-preset-btn').forEach(btn => {
      const c = (btn as HTMLElement).dataset.color;
      btn.classList.toggle('active', c?.toLowerCase() === currentColor.toLowerCase());
    });

    // Placement ha-form
    const placementData = {
      position_x: sensor.position?.x ?? 0,
      position_y: sensor.position?.y ?? 0,
      x: sensor.position?.x ?? 0,
      y: sensor.position?.y ?? 0,
      rotation: sensor.rotation ?? 0,
      fov: sensor.fov ?? 120,
      mirror_x: Boolean(sensor.mirror_x),
      mirror_y: Boolean(sensor.mirror_y),
    };
    if (!this._isFormDataEqual(entry.formPlacement.data, placementData)) {
      entry.formPlacement.data = placementData;
    }

    // Placement measurement inputs
    this._renderSensorPositionInputs(entry, sensor);

    // Boundaries ha-form
    const boundariesData = {
      boundary_prefix: sensor.boundary_prefix ?? '',
      boundary_min_x_entity: sensor.boundary_min_x_entity ?? '',
      boundary_max_x_entity: sensor.boundary_max_x_entity ?? '',
      boundary_min_y_entity: sensor.boundary_min_y_entity ?? '',
      boundary_max_y_entity: sensor.boundary_max_y_entity ?? '',
      boundary_min_z_entity: sensor.boundary_min_z_entity ?? '',
      boundary_max_z_entity: sensor.boundary_max_z_entity ?? '',
    };
    if (!this._isFormDataEqual(entry.formBoundaries.data, boundariesData)) {
      entry.formBoundaries.data = boundariesData;
    }

    // Advanced ha-form
    const advancedData = {
      source_units: sensor.source_units ?? 'cm',
      reporting_entity: sensor.reporting_entity ?? '',
    };
    if (!this._isFormDataEqual(entry.formAdvanced.data, advancedData)) {
      entry.formAdvanced.data = advancedData;
    }

    // Diagnostics feedback
    this._renderSensorFeedback(entry, sensor);

    // Boundary diagnostics feedback
    this._renderBoundaryFeedback(entry, sensor);

    // Targets attribute & trail attribute selectors
    this._populateTargetsSelector(entry, sensor);
    this._populateTrailSelector(entry, sensor);
  }

  private _renderSensorPositionInputs(entry: SensorDomEntry, sensor: SensorConfig): void {
    const isImperial = this._config?.display_units === 'imperial';
    const currentPosX = sensor.position?.x ?? 0;
    const currentPosY = sensor.position?.y ?? 0;

    if (isImperial) {
      const impX = metersToFeetInches(currentPosX);
      const impY = metersToFeetInches(currentPosY);
      const signX = currentPosX < 0 ? '-1' : '1';
      const signY = currentPosY < 0 ? '-1' : '1';

      entry.posXContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position X (ft / in)</label>
          <div class="pm-dual-input-row">
            <select class="pm-sign-select pm-pos-x-sign" aria-label="Position X sign">
              <option value="1"${signX === '1' ? ' selected' : ''}>+</option>
              <option value="-1"${signX === '-1' ? ' selected' : ''}>-</option>
            </select>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-x-ft" min="0" step="1" value="${Math.abs(impX.feet)}" placeholder="ft" aria-label="Position X feet" />
              <span class="pm-unit-suffix">ft</span>
            </div>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-x-in" min="0" max="11.9" step="0.5" value="${impX.inches}" placeholder="in" aria-label="Position X inches" />
              <span class="pm-unit-suffix">in</span>
            </div>
          </div>
        </div>
      `;

      entry.posYContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position Y (ft / in)</label>
          <div class="pm-dual-input-row">
            <select class="pm-sign-select pm-pos-y-sign" aria-label="Position Y sign">
              <option value="1"${signY === '1' ? ' selected' : ''}>+</option>
              <option value="-1"${signY === '-1' ? ' selected' : ''}>-</option>
            </select>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-y-ft" min="0" step="1" value="${Math.abs(impY.feet)}" placeholder="ft" aria-label="Position Y feet" />
              <span class="pm-unit-suffix">ft</span>
            </div>
            <div class="pm-unit-input-group">
              <input type="number" class="pm-pos-y-in" min="0" max="11.9" step="0.5" value="${impY.inches}" placeholder="in" aria-label="Position Y inches" />
              <span class="pm-unit-suffix">in</span>
            </div>
          </div>
        </div>
      `;

      const signXEl = entry.posXContainer.querySelector('.pm-pos-x-sign') as HTMLSelectElement;
      const ftXEl = entry.posXContainer.querySelector('.pm-pos-x-ft') as HTMLInputElement;
      const inXEl = entry.posXContainer.querySelector('.pm-pos-x-in') as HTMLInputElement;

      const signYEl = entry.posYContainer.querySelector('.pm-pos-y-sign') as HTMLSelectElement;
      const ftYEl = entry.posYContainer.querySelector('.pm-pos-y-ft') as HTMLInputElement;
      const inYEl = entry.posYContainer.querySelector('.pm-pos-y-in') as HTMLInputElement;

      const onXChange = () => {
        const sign = parseInt(signXEl.value, 10) || 1;
        const ft = parseFloat(ftXEl.value) || 0;
        const inc = parseFloat(inXEl.value) || 0;
        const metersX = feetInchesToMeters(ft, inc, sign);
        this._updateSensorById(sensor.id, s => {
          s.position = { x: metersX, y: s.position?.y ?? 0 };
        });
      };

      const onYChange = () => {
        const sign = parseInt(signYEl.value, 10) || 1;
        const ft = parseFloat(ftYEl.value) || 0;
        const inc = parseFloat(inYEl.value) || 0;
        const metersY = feetInchesToMeters(ft, inc, sign);
        this._updateSensorById(sensor.id, s => {
          s.position = { x: s.position?.x ?? 0, y: metersY };
        });
      };

      signXEl.addEventListener('change', onXChange);
      ftXEl.addEventListener('input', onXChange);
      inXEl.addEventListener('input', onXChange);

      signYEl.addEventListener('change', onYChange);
      ftYEl.addEventListener('input', onYChange);
      inYEl.addEventListener('input', onYChange);
    } else {
      entry.posXContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position X (Meters)</label>
          <div class="pm-unit-input-group">
            <input type="number" class="pm-pos-x-m" step="0.1" value="${currentPosX}" placeholder="m" aria-label="Sensor position X meters" />
            <span class="pm-unit-suffix">m</span>
          </div>
        </div>
      `;

      entry.posYContainer.innerHTML = `
        <div class="pm-measurement-field">
          <label class="pm-field-label">Sensor Position Y (Meters)</label>
          <div class="pm-unit-input-group">
            <input type="number" class="pm-pos-y-m" step="0.1" value="${currentPosY}" placeholder="m" aria-label="Sensor position Y meters" />
            <span class="pm-unit-suffix">m</span>
          </div>
        </div>
      `;

      const mXInput = entry.posXContainer.querySelector('.pm-pos-x-m') as HTMLInputElement;
      const mYInput = entry.posYContainer.querySelector('.pm-pos-y-m') as HTMLInputElement;

      mXInput.addEventListener('input', () => {
        const val = parseFloat(mXInput.value);
        if (Number.isFinite(val)) {
          this._updateSensorById(sensor.id, s => {
            s.position = { x: val, y: s.position?.y ?? 0 };
          });
        }
      });

      mYInput.addEventListener('input', () => {
        const val = parseFloat(mYInput.value);
        if (Number.isFinite(val)) {
          this._updateSensorById(sensor.id, s => {
            s.position = { x: s.position?.x ?? 0, y: val };
          });
        }
      });
    }
  }

  private _renderSensorFeedback(entry: SensorDomEntry, sensor: SensorConfig): void {
    const feedbackItems = InovelliZhaAdapter.getSensorSetupFeedback(sensor, this._hass);
    entry.feedbackBox.innerHTML = feedbackItems
      .map(item => {
        const icon = item.type === 'success' ? '✓' : item.type === 'info' ? 'ℹ' : '⚠';
        return `<div class="pm-feedback-item pm-feedback-${item.type}">${icon} ${escapeHtml(item.message)}</div>`;
      })
      .join('');
  }

  private _renderBoundaryFeedback(entry: SensorDomEntry, sensor: SensorConfig): void {
    const res = InovelliZhaAdapter.resolveBoundaryDetails(sensor, this._hass);

    const rowsHtml = res.items
      .map(item => {
        const sourceLabel =
          item.source === 'explicit'
            ? '<span class="pm-boundary-source-tag pm-source-explicit">Explicit</span>'
            : item.source === 'prefix'
              ? '<span class="pm-boundary-source-tag pm-source-prefix">Prefix</span>'
              : '<span class="pm-boundary-source-tag pm-source-none">Unset</span>';

        const valDisplay =
          item.value !== undefined
            ? `${item.value} ${escapeHtml(item.unit || '')}`
            : `<span style="color: var(--secondary-text-color); font-style: italic;">${escapeHtml(item.error || 'not found')}</span>`;

        const entityDisplay = item.resolvedEntity
          ? `<span class="pm-boundary-entity-name">${escapeHtml(item.resolvedEntity)}</span>`
          : '';

        return `
          <div class="pm-boundary-row">
            <div class="pm-boundary-label-group">
              <strong>${escapeHtml(item.label)}</strong>
              ${sourceLabel}
              ${entityDisplay}
            </div>
            <div class="pm-boundary-val">${valDisplay}</div>
          </div>
        `;
      })
      .join('');

    const summaryClass = res.isValid ? 'pm-boundary-summary-valid' : 'pm-boundary-summary-invalid';
    const summaryIcon = res.isValid ? '✓' : '⚠';
    const summaryText = res.isValid
      ? 'Complete and valid detection boundary active'
      : res.error || 'Boundary limits incomplete';

    entry.boundaryFeedbackContainer.innerHTML = `
      <div class="pm-boundary-feedback-title">Boundary Detection Limits Status</div>
      <div class="pm-boundary-feedback-desc">These settings read the sensor's detection limits from Home Assistant; this card does not modify them.</div>
      <div class="pm-boundary-table">
        ${rowsHtml}
      </div>
      <div class="pm-boundary-summary-badge ${summaryClass}">
        ${summaryIcon} ${escapeHtml(summaryText)}
      </div>
    `;
  }

  private _populateTargetsSelector(entry: SensorDomEntry, sensor: SensorConfig): void {
    const targetEntityId = sensor.targets_entity;
    const targetState =
      targetEntityId && this._hass?.states ? this._hass.states[targetEntityId] : undefined;
    const availableAttrs = targetState?.attributes ? Object.keys(targetState.attributes) : [];

    const currentAttr = sensor.targets_attribute || '';
    const isCustom = Boolean(
      currentAttr && currentAttr !== 'targets' && !availableAttrs.includes(currentAttr)
    );

    const options: Array<{ value: string; label: string }> = [
      { value: '', label: 'Default — targets' },
    ];

    for (const attr of availableAttrs) {
      if (attr !== 'targets') {
        options.push({ value: attr, label: attr });
      }
    }

    if (isCustom) {
      options.push({ value: currentAttr, label: `${currentAttr} (custom/unavailable)` });
    }

    options.push({ value: '__custom__', label: 'Custom attribute name...' });

    const isEditingCustom =
      entry.targetsSelect.value === '__custom__' ||
      entry.targetsCustomWrapper.style.display === 'block';

    const selectedValue = isEditingCustom && !currentAttr ? '__custom__' : currentAttr;

    const newOptionsHtml = options
      .map(
        opt =>
          `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
      )
      .join('');

    if (entry.targetsSelect.innerHTML !== newOptionsHtml) {
      entry.targetsSelect.innerHTML = newOptionsHtml;
    }
    entry.targetsSelect.value = selectedValue;

    if (isCustom || isEditingCustom) {
      entry.targetsCustomWrapper.style.display = 'block';
      if (entry.targetsCustomInput.value !== currentAttr) {
        entry.targetsCustomInput.value = currentAttr;
      }
    } else {
      entry.targetsCustomWrapper.style.display = 'none';
    }

    const validation = InovelliZhaAdapter.validateTargetsAttribute(
      sensor.targets_entity,
      sensor.targets_attribute,
      this._hass
    );

    entry.targetsValidationBadge.className = `pm-validation-badge pm-targets-validation pm-validation-${validation.status}`;
    if (validation.status === 'compatible') {
      entry.targetsValidationBadge.textContent = `✓ ${validation.message}`;
    } else if (validation.status === 'empty') {
      entry.targetsValidationBadge.textContent = `ℹ ${validation.message}`;
    } else {
      entry.targetsValidationBadge.textContent = `⚠ ${validation.message}`;
    }
  }

  private _populateTrailSelector(entry: SensorDomEntry, sensor: SensorConfig): void {
    const targetEntityId = sensor.targets_entity;
    const targetState =
      targetEntityId && this._hass?.states ? this._hass.states[targetEntityId] : undefined;
    const availableAttrs = targetState?.attributes ? Object.keys(targetState.attributes) : [];

    const currentTrailAttr = sensor.trail_attribute || '';
    const isCustom = Boolean(currentTrailAttr && !availableAttrs.includes(currentTrailAttr));

    const options: Array<{ value: string; label: string }> = [
      { value: '', label: 'None — collect trails in the card' },
    ];

    for (const attr of availableAttrs) {
      options.push({ value: attr, label: attr });
    }

    if (isCustom) {
      options.push({ value: currentTrailAttr, label: `${currentTrailAttr} (custom/unavailable)` });
    }

    options.push({ value: '__custom__', label: 'Custom attribute name...' });

    const isEditingCustom =
      entry.trailSelect.value === '__custom__' ||
      entry.trailCustomWrapper.style.display === 'block';

    const selectedValue = isEditingCustom && !currentTrailAttr ? '__custom__' : currentTrailAttr;

    const newOptionsHtml = options
      .map(
        opt =>
          `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
      )
      .join('');

    if (entry.trailSelect.innerHTML !== newOptionsHtml) {
      entry.trailSelect.innerHTML = newOptionsHtml;
    }
    entry.trailSelect.value = selectedValue;

    if (isCustom || isEditingCustom) {
      entry.trailCustomWrapper.style.display = 'block';
      if (entry.trailCustomInput.value !== currentTrailAttr) {
        entry.trailCustomInput.value = currentTrailAttr;
      }
    } else {
      entry.trailCustomWrapper.style.display = 'none';
    }

    const validation = InovelliZhaAdapter.validateTrailAttribute(
      sensor.targets_entity,
      sensor.trail_attribute,
      this._hass
    );

    entry.trailValidationBadge.className = `pm-validation-badge pm-trail-validation pm-validation-${validation.status}`;
    if (validation.status === 'compatible') {
      entry.trailValidationBadge.textContent = `✓ ${validation.message}`;
    } else if (validation.status === 'empty') {
      entry.trailValidationBadge.textContent = `ℹ ${validation.message}`;
    } else if (validation.status === 'unsupported' || validation.status === 'unavailable') {
      entry.trailValidationBadge.textContent = `⚠ ${validation.message}`;
    } else {
      entry.trailValidationBadge.textContent = '';
    }
  }

  private _handleAddSensor(): void {
    const existingSensors = this._config?.sensors || [];
    const newId = generateUniqueSensorId(existingSensors, 'sensor');
    const newIndex = existingSensors.length + 1;

    const newSensor: SensorConfig = {
      id: newId,
      name: `Sensor ${newIndex}`,
      targets_entity: '',
      source_units: 'cm',
      color: DEFAULT_PALETTE[(newIndex - 1) % DEFAULT_PALETTE.length],
      fov: 120,
      position: { x: 0, y: 0 },
      rotation: 0,
      mirror_x: false,
      mirror_y: false,
    };

    this._updateConfig(current => ({
      ...current,
      sensors: [...(current.sensors || []), newSensor],
    }));

    this._expandedSections.add('sensors');
    this._expandedSections.add(`sensor:${newId}`);
    this._syncAccordionState('sensors');
    this._syncAccordionState(`sensor:${newId}`);
    this._reconcileSensors();
  }

  private _handleDuplicateSensor(sensorId: string): void {
    const sensors = this._config?.sensors || [];
    const index = sensors.findIndex(s => s.id === sensorId);
    if (index === -1) return;

    const original = sensors[index];
    const newId = generateUniqueSensorId(sensors, `${original.id}_copy`);
    const duplicated: SensorConfig = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: original.name ? `${original.name} (Copy)` : 'Sensor (Copy)',
    };

    const updated = [...sensors];
    updated.splice(index + 1, 0, duplicated);

    this._updateConfig(current => ({
      ...current,
      sensors: updated,
    }));

    this._expandedSections.add('sensors');
    this._expandedSections.add(`sensor:${newId}`);
    this._syncAccordionState('sensors');
    this._syncAccordionState(`sensor:${newId}`);
    this._reconcileSensors();
  }

  private _handleMoveSensor(sensorId: string, delta: -1 | 1): void {
    const sensors = [...(this._config?.sensors || [])];
    const index = sensors.findIndex(s => s.id === sensorId);
    if (index === -1) return;

    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= sensors.length) return;

    const temp = sensors[index];
    sensors[index] = sensors[targetIndex];
    sensors[targetIndex] = temp;

    this._updateConfig(current => ({
      ...current,
      sensors,
    }));

    this._reconcileSensors();
  }

  private _handleRemoveSensor(sensorId: string): void {
    const sensors = this._config?.sensors || [];
    const updated = sensors.filter(s => s.id !== sensorId);

    this._expandedSections.delete(`sensor:${sensorId}`);
    this._expandedSections.delete(`sensor:${sensorId}:placement`);
    this._expandedSections.delete(`sensor:${sensorId}:boundaries`);
    this._expandedSections.delete(`sensor:${sensorId}:advanced`);
    this._expandedSections.delete(`sensor:${sensorId}:trail`);

    this._updateConfig(current => ({
      ...current,
      sensors: updated,
    }));

    this._reconcileSensors();
  }

  private _updateSensorById(sensorId: string, updateFn: (sensor: SensorConfig) => void): void {
    const sensors = JSON.parse(JSON.stringify(this._config?.sensors || [])) as SensorConfig[];
    const target = sensors.find(s => s.id === sensorId);
    if (!target) return;

    updateFn(target);

    this._updateConfig(current => ({
      ...current,
      sensors,
    }));

    const entry = this._sensorDomNodes.get(sensorId);
    if (entry) {
      const idx = sensors.findIndex(s => s.id === sensorId);
      this._updateSensorDomEntry(entry, target, idx, sensors.length);
    }
  }

  private _updateConfig(producer: (current: PresenceMapCardConfig) => PresenceMapCardConfig): void {
    const current = this._config || { type: 'custom:presence-map-card', sensors: [] };
    const next = producer({ ...current });
    this._config = next;
    this._lastEmittedConfig = JSON.parse(JSON.stringify(next));

    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cleanStr(val: unknown): string | undefined {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  private _parseNum(val: unknown, fallback: number): number {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
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
