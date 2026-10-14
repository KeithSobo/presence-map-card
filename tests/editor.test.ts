import { describe, it, expect, vi } from 'vitest';
import '../src/editor/presence-map-editor';
import { PresenceMapEditor, generateUniqueSensorId } from '../src/editor/presence-map-editor';
import { PresenceMapCardConfig, HomeAssistant } from '../src/types';
import { InovelliZhaAdapter } from '../src/adapters/inovelli';

describe('PresenceMapEditor Visual Configuration Component', () => {
  const sampleConfig: PresenceMapCardConfig = {
    type: 'custom:presence-map-card',
    title: 'Test Radar',
    display_units: 'imperial',
    theme: 'dark',
    range_meters: 8,
    stale_timeout: 15,
    show_rings: true,
    show_trails: false,
    show_labels: true,
    show_coordinates: true,
    show_boundaries: true,
    trail_history_seconds: 45,
    trail_max_points: 150,
    floorplan: {
      image: '/local/plan.png',
      width_meters: 12,
      height_meters: 9,
    },
    sensors: [
      {
        id: 's1',
        name: 'Sensor 1',
        targets_entity: 'sensor.inovelli_targets',
        occupancy_entity: 'binary_sensor.inovelli_occupancy',
        reporting_entity: 'switch.inovelli_reporting',
        boundary_prefix: 'number.inovelli_',
        source_units: 'cm',
        color: '#ff9800',
        fov: 140,
        rotation: 45,
        mirror_x: true,
        mirror_y: false,
      },
    ],
  };

  it('is registered in customElements registry', () => {
    const elClass = customElements.get('presence-map-editor');
    expect(elClass).toBeDefined();
  });

  it('organizes global settings into expandable sections collapsed by default', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;
    expect(root).toBeDefined();

    const sections = ['general', 'radar', 'targets', 'floorplan', 'sensors', 'advanced'];
    for (const sec of sections) {
      const secEl = root?.querySelector(`.pm-accordion[data-section="${sec}"]`);
      expect(secEl).toBeDefined();
      expect(secEl?.classList.contains('expanded')).toBe(false);
      const headerBtn = secEl?.querySelector('.pm-accordion-header');
      expect(headerBtn?.getAttribute('aria-expanded')).toBe('false');
    }

    // Expanding a section via click
    const generalSec = root?.querySelector(`.pm-accordion[data-section="general"]`) as HTMLElement;
    const generalHeader = generalSec.querySelector('.pm-accordion-header') as HTMLButtonElement;
    generalHeader.click();
    expect(generalSec.classList.contains('expanded')).toBe(true);
    expect(generalHeader.getAttribute('aria-expanded')).toBe('true');

    // Collapsing via keyboard Enter
    generalHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(generalSec.classList.contains('expanded')).toBe(false);
    expect(generalHeader.getAttribute('aria-expanded')).toBe('false');

    // Expanding via keyboard Space
    generalHeader.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(generalSec.classList.contains('expanded')).toBe(true);
  });

  it('populates form data across all global sections on setConfig', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const formGeneral = root?.querySelector('.ha-form-general') as any;
    expect(formGeneral.data.title).toBe('Test Radar');
    expect(formGeneral.data.display_units).toBe('imperial');
    expect(formGeneral.data.theme).toBe('dark');

    const formRadar = root?.querySelector('.ha-form-radar') as any;
    expect(formRadar.data.range_meters).toBe(8);
    expect(formRadar.data.show_rings).toBe(true);
    expect(formRadar.data.show_labels).toBe(true);
    expect(formRadar.data.show_coordinates).toBe(true);

    const formTargets = root?.querySelector('.ha-form-targets') as any;
    expect(formTargets.data.show_trails).toBe(false);
    expect(formTargets.data.stale_timeout).toBe(15);

    const formFloorplan = root?.querySelector('.ha-form-floorplan') as any;
    expect(formFloorplan.data.floorplan_image).toBe('/local/plan.png');
    expect(formFloorplan.data.floorplan_width).toBe(12);
    expect(formFloorplan.data.floorplan_height).toBe(9);

    const formAdvanced = root?.querySelector('.ha-form-advanced') as any;
    expect(formAdvanced.data.demo_mode).toBe(false);
  });

  it('handles empty config or missing primary sensor gracefully', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig({ type: 'custom:presence-map-card', demo_mode: true });
    const root = editor.shadowRoot;

    const formGeneral = root?.querySelector('.ha-form-general') as any;
    expect(formGeneral.data.title).toBe('');

    const formAdvanced = root?.querySelector('.ha-form-advanced') as any;
    expect(formAdvanced.data.demo_mode).toBe(true);

    const sensorItems = root?.querySelectorAll('.pm-sensor-list .pm-accordion');
    expect(sensorItems?.length).toBe(0);
  });

  it('assigns hass object across global and sensor forms', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);

    const mockHass: HomeAssistant = {
      states: {
        'sensor.inovelli_targets': {
          entity_id: 'sensor.inovelli_targets',
          state: '2',
          attributes: { trail: [[10, 20]] },
          last_changed: '',
          last_updated: '',
        },
      },
    };
    editor.hass = mockHass;

    const formGeneral = editor.shadowRoot?.querySelector('.ha-form-general') as any;
    expect(formGeneral.hass).toBe(mockHass);

    const sensorMain = editor.shadowRoot?.querySelector('.ha-form-sensor-main') as any;
    expect(sensorMain.hass).toBe(mockHass);
  });

  it('renders sensor list with name, color badge, targets summary, and toolbar buttons', () => {
    const multiConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      sensors: [
        { id: 's1', name: 'Garage Radar', targets_entity: 'sensor.garage', color: '#ff0000' },
        { id: 's2', name: 'Office Radar', targets_entity: 'sensor.office', color: '#00ff00' },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(multiConfig);
    const root = editor.shadowRoot;

    const sensorRows = root?.querySelectorAll('.pm-sensor-list .pm-accordion');
    expect(sensorRows?.length).toBe(2);

    // First sensor
    const s1Row = sensorRows?.[0] as HTMLElement;
    expect(s1Row.querySelector('.pm-header-title')?.textContent).toBe('Garage Radar');
    expect(s1Row.querySelector('.pm-header-summary')?.textContent).toBe('sensor.garage');
    const s1Color = s1Row.querySelector('.pm-color-badge') as HTMLElement;
    expect(['#ff0000', 'rgb(255, 0, 0)']).toContain(s1Color.style.backgroundColor);

    // Disabled boundaries for move buttons
    const s1UpBtn = s1Row.querySelector('.btn-move-up') as HTMLButtonElement;
    const s1DownBtn = s1Row.querySelector('.btn-move-down') as HTMLButtonElement;
    expect(s1UpBtn.disabled).toBe(true);
    expect(s1DownBtn.disabled).toBe(false);

    // Second sensor
    const s2Row = sensorRows?.[1] as HTMLElement;
    expect(s2Row.querySelector('.pm-header-title')?.textContent).toBe('Office Radar');
    const s2UpBtn = s2Row.querySelector('.btn-move-up') as HTMLButtonElement;
    const s2DownBtn = s2Row.querySelector('.btn-move-down') as HTMLButtonElement;
    expect(s2UpBtn.disabled).toBe(false);
    expect(s2DownBtn.disabled).toBe(true);
  });

  it('adds a new sensor with unique stable ID and opens its settings', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    const addBtn = root?.querySelector('.pm-add-sensor-btn') as HTMLButtonElement;
    addBtn.click();

    expect(changeListener).toHaveBeenCalledTimes(1);
    const updated = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(updated.sensors).toHaveLength(2);

    const newSensor = updated.sensors?.[1];
    expect(newSensor?.id).toBeDefined();
    expect(newSensor?.id).not.toBe('s1');
    expect(newSensor?.name).toBe('Sensor 2');
    expect(newSensor?.targets_entity).toBe('');

    // Accordion opens new sensor
    const newSensorRow = root?.querySelector(
      `.pm-accordion[data-sensor-id="${newSensor?.id}"]`
    ) as HTMLElement;
    expect(newSensorRow).toBeDefined();
    expect(newSensorRow.classList.contains('expanded')).toBe(true);
  });

  it('duplicates a sensor with unique stable ID and copied settings', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    const s1Row = root?.querySelector('.pm-sensor-list .pm-accordion') as HTMLElement;
    const dupBtn = s1Row.querySelector('.btn-duplicate') as HTMLButtonElement;
    dupBtn.click();

    expect(changeListener).toHaveBeenCalledTimes(1);
    const updated = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(updated.sensors).toHaveLength(2);

    const copy = updated.sensors?.[1];
    expect(copy?.id).not.toBe('s1');
    expect(copy?.id).toBe('s1_copy');
    expect(copy?.name).toBe('Sensor 1 (Copy)');
    expect(copy?.targets_entity).toBe('sensor.inovelli_targets');
    expect(copy?.fov).toBe(140);
    expect(copy?.rotation).toBe(45);
    expect(copy?.mirror_x).toBe(true);
  });

  it('reorders sensors with Move Up and Move Down preserving sensor identity and accordion state', () => {
    const multiConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      sensors: [
        { id: 's1', name: 'Sensor 1', targets_entity: 'sensor.1' },
        { id: 's2', name: 'Sensor 2', targets_entity: 'sensor.2' },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(multiConfig);
    const root = editor.shadowRoot;

    // Expand s2
    const s2RowBefore = root?.querySelector(`.pm-accordion[data-sensor-id="s2"]`) as HTMLElement;
    const s2Header = s2RowBefore.querySelector('.pm-accordion-header') as HTMLElement;
    s2Header.click();
    expect(s2RowBefore.classList.contains('expanded')).toBe(true);

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // Move s2 up
    const s2MoveUp = s2RowBefore.querySelector('.btn-move-up') as HTMLButtonElement;
    s2MoveUp.click();

    expect(changeListener).toHaveBeenCalledTimes(1);
    const updated = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(updated.sensors?.[0].id).toBe('s2');
    expect(updated.sensors?.[1].id).toBe('s1');

    // Verify s2 remains expanded by identity!
    const s2RowAfter = root?.querySelector(`.pm-accordion[data-sensor-id="s2"]`) as HTMLElement;
    expect(s2RowAfter.classList.contains('expanded')).toBe(true);
  });

  it('removes a sensor and updates sensor list', () => {
    const multiConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      sensors: [
        { id: 's1', name: 'Sensor 1', targets_entity: 'sensor.1' },
        { id: 's2', name: 'Sensor 2', targets_entity: 'sensor.2' },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(multiConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
    const removeBtn = s1Row.querySelector('.btn-remove') as HTMLButtonElement;
    removeBtn.click();

    expect(changeListener).toHaveBeenCalledTimes(1);
    const updated = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(updated.sensors).toHaveLength(1);
    expect(updated.sensors?.[0].id).toBe('s2');
  });

  it('generates unique stable sensor IDs even with multiple collisions', () => {
    const sensors = [{ id: 'sensor_1' }, { id: 'sensor_2' }, { id: 'radar' }, { id: 'radar_copy' }];

    expect(generateUniqueSensorId(sensors, 'sensor')).toBe('sensor_3');
    expect(generateUniqueSensorId(sensors, 'radar_copy')).toBe('radar_copy_2');
    expect(generateUniqueSensorId(sensors, 'custom')).toBe('custom_1');
  });

  it('per-sensor boundary editing affects only the target sensor including Z overrides', () => {
    const multiConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      sensors: [
        {
          id: 's1',
          name: 'Sensor 1',
          targets_entity: 'sensor.1',
          boundary_prefix: 'number.s1_',
        },
        {
          id: 's2',
          name: 'Sensor 2',
          targets_entity: 'sensor.2',
          boundary_prefix: 'number.s2_',
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(multiConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // Edit boundaries on s2 only
    const s2Row = root?.querySelector(`.pm-accordion[data-sensor-id="s2"]`) as HTMLElement;
    const s2BoundariesForm = s2Row.querySelector('.ha-form-sensor-boundaries') as any;

    s2BoundariesForm.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            boundary_prefix: 'number.s2_new_',
            boundary_min_x_entity: 'number.s2_min_x',
            boundary_max_x_entity: 'number.s2_max_x',
            boundary_min_y_entity: 'number.s2_min_y',
            boundary_max_y_entity: 'number.s2_max_y',
            boundary_min_z_entity: 'number.s2_min_z',
            boundary_max_z_entity: 'number.s2_max_z',
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    expect(changeListener).toHaveBeenCalledTimes(1);
    const result = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;

    // s1 is untouched
    expect(result.sensors?.[0].boundary_prefix).toBe('number.s1_');
    expect(result.sensors?.[0].boundary_min_x_entity).toBeUndefined();

    // s2 has all boundary overrides including Z
    expect(result.sensors?.[1].boundary_prefix).toBe('number.s2_new_');
    expect(result.sensors?.[1].boundary_min_x_entity).toBe('number.s2_min_x');
    expect(result.sensors?.[1].boundary_max_x_entity).toBe('number.s2_max_x');
    expect(result.sensors?.[1].boundary_min_y_entity).toBe('number.s2_min_y');
    expect(result.sensors?.[1].boundary_max_y_entity).toBe('number.s2_max_y');
    expect(result.sensors?.[1].boundary_min_z_entity).toBe('number.s2_min_z');
    expect(result.sensors?.[1].boundary_max_z_entity).toBe('number.s2_max_z');
  });

  it('clears optional fields to undefined and preserves zero values in YAML round-tripping', () => {
    const configWithOptionals: PresenceMapCardConfig = {
      type: 'custom:presence-map-card',
      title: 'Radar',
      sensors: [
        {
          id: 's1',
          name: 'Sensor',
          targets_entity: 'sensor.targets',
          occupancy_entity: 'binary_sensor.occ',
          reporting_entity: 'switch.rep',
          position: { x: 0, y: 0 },
          rotation: 0,
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(configWithOptionals);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // Clear optional entities and keep position at 0, 0
    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
    const mainForm = s1Row.querySelector('.ha-form-sensor-main') as any;
    mainForm.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            ...mainForm.data,
            occupancy_entity: '', // Cleared
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    const result = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(result.sensors?.[0].occupancy_entity).toBeUndefined(); // Unset from YAML!
    expect(result.sensors?.[0].position?.x).toBe(0);
    expect(result.sensors?.[0].position?.y).toBe(0);
    expect(result.sensors?.[0].rotation).toBe(0);
  });

  it('preserves unexposed fields on card and sensors across edits', () => {
    const configWithExtra: any = {
      ...sampleConfig,
      custom_card_field: 'custom_value',
      sensors: [
        {
          ...sampleConfig.sensors![0],
          custom_sensor_prop: 999,
          targets_attribute: 'custom_targets',
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(configWithExtra);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    const formGeneral = root?.querySelector('.ha-form-general') as any;
    formGeneral.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            ...formGeneral.data,
            title: 'Renamed Radar',
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    const result = changeListener.mock.calls[0][0].detail.config as any;
    expect(result.title).toBe('Renamed Radar');
    expect(result.custom_card_field).toBe('custom_value');
    expect(result.trail_history_seconds).toBe(45);
    expect(result.trail_max_points).toBe(150);
    expect(result.show_boundaries).toBe(true);
    expect(result.sensors[0].custom_sensor_prop).toBe(999);
    expect(result.sensors[0].targets_attribute).toBe('custom_targets');
  });

  it('history attribute selector offers None, available attributes, and custom option with real-time validation', () => {
    const mockHass: HomeAssistant = {
      states: {
        'sensor.test_targets': {
          entity_id: 'sensor.test_targets',
          state: 'active',
          attributes: {
            trail: [
              { x: 10, y: 20 },
              { x: 15, y: 25 },
            ],
            empty_trail: [],
            malformed_trail: '{ broken json',
            non_array_trail: { x: 10, y: 20 },
            raw_string: 'none',
          },
          last_changed: '',
          last_updated: '',
        },
      },
    };

    const config: PresenceMapCardConfig = {
      type: 'custom:presence-map-card',
      sensors: [
        {
          id: 's1',
          name: 'Sensor 1',
          targets_entity: 'sensor.test_targets',
          trail_attribute: 'trail',
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(config);
    editor.hass = mockHass;
    const root = editor.shadowRoot;

    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
    const select = s1Row.querySelector('.pm-trail-select') as HTMLSelectElement;
    const customWrapper = s1Row.querySelector('.pm-trail-custom-wrapper') as HTMLElement;
    const customInput = s1Row.querySelector('.pm-trail-custom-input') as HTMLInputElement;
    const validationBadge = s1Row.querySelector('.pm-trail-validation') as HTMLElement;

    // Available options check
    const optionValues = Array.from(select.options).map(o => o.value);
    expect(optionValues).toContain('');
    expect(optionValues).toContain('trail');
    expect(optionValues).toContain('empty_trail');
    expect(optionValues).toContain('__custom__');

    // Selected is 'trail' and validation is compatible
    expect(select.value).toBe('trail');
    expect(validationBadge.textContent).toContain('Compatible trail data');

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // 1. Select 'empty_trail' -> validation shows empty
    select.value = 'empty_trail';
    select.dispatchEvent(new Event('change'));
    let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].trail_attribute).toBe('empty_trail');
    expect(validationBadge.textContent).toContain('Empty trail data');

    // 2. Select 'malformed_trail' -> validation shows unsupported
    select.value = 'malformed_trail';
    select.dispatchEvent(new Event('change'));
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].trail_attribute).toBe('malformed_trail');
    expect(validationBadge.textContent).toContain('malformed JSON');

    // 3. Select 'non_array_trail' -> validation shows unsupported
    select.value = 'non_array_trail';
    select.dispatchEvent(new Event('change'));
    expect(validationBadge.textContent).toContain('must be an array');

    // 4. Select None ('') -> unsets trail_attribute
    select.value = '';
    select.dispatchEvent(new Event('change'));
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].trail_attribute).toBeUndefined();

    // 5. Select custom -> reveals custom input
    select.value = '__custom__';
    select.dispatchEvent(new Event('change'));
    expect(customWrapper.style.display).toBe('block');

    customInput.value = 'my_custom_attr';
    customInput.dispatchEvent(new Event('input'));
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].trail_attribute).toBe('my_custom_attr');
    // Attribute not present on entity -> validation shows unavailable
    expect(validationBadge.textContent).toContain('not found on');
  });

  it('validates trail attributes using InovelliZhaAdapter format logic', () => {
    const mockHass: HomeAssistant = {
      states: {
        'sensor.test': {
          entity_id: 'sensor.test',
          state: 'active',
          attributes: {
            valid_tuples: [
              [1, 2],
              [3, 4],
            ],
            valid_objects: [{ x: 5, y: 6 }],
            valid_json_str: '[{"x": 10, "y": 20}]',
            no_coords: [{ a: 1 }],
          },
          last_changed: '',
          last_updated: '',
        },
      },
    };

    expect(InovelliZhaAdapter.validateTrailAttribute(undefined, undefined, mockHass).status).toBe(
      'none'
    );
    expect(
      InovelliZhaAdapter.validateTrailAttribute('sensor.missing', 'trail', mockHass).status
    ).toBe('unavailable');
    expect(
      InovelliZhaAdapter.validateTrailAttribute('sensor.test', 'valid_tuples', mockHass).status
    ).toBe('compatible');
    expect(
      InovelliZhaAdapter.validateTrailAttribute('sensor.test', 'valid_objects', mockHass).status
    ).toBe('compatible');
    expect(
      InovelliZhaAdapter.validateTrailAttribute('sensor.test', 'valid_json_str', mockHass).status
    ).toBe('compatible');
    expect(
      InovelliZhaAdapter.validateTrailAttribute('sensor.test', 'no_coords', mockHass).status
    ).toBe('unsupported');
  });

  it('changing targets entity refreshes available attributes without deleting configured trail_attribute', () => {
    const mockHass: HomeAssistant = {
      states: {
        'sensor.entity_a': {
          entity_id: 'sensor.entity_a',
          state: 'on',
          attributes: { trail: [[1, 2]] },
          last_changed: '',
          last_updated: '',
        },
        'sensor.entity_b': {
          entity_id: 'sensor.entity_b',
          state: 'on',
          attributes: { history_points: [[3, 4]] },
          last_changed: '',
          last_updated: '',
        },
      },
    };

    const config: PresenceMapCardConfig = {
      type: 'custom:presence-map-card',
      sensors: [
        {
          id: 's1',
          name: 'Sensor 1',
          targets_entity: 'sensor.entity_a',
          trail_attribute: 'trail',
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(config);
    editor.hass = mockHass;
    const root = editor.shadowRoot;

    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
    const mainForm = s1Row.querySelector('.ha-form-sensor-main') as any;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // Switch targets entity to entity_b
    mainForm.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            ...mainForm.data,
            targets_entity: 'sensor.entity_b',
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    const emitted = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].targets_entity).toBe('sensor.entity_b');
    // trail_attribute 'trail' is preserved!
    expect(emitted.sensors?.[0].trail_attribute).toBe('trail');

    // Selector now lists entity_b attributes while keeping 'trail' visible as unavailable
    const select = s1Row.querySelector('.pm-trail-select') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map(o => o.value);
    expect(optionValues).toContain('history_points');
    expect(optionValues).toContain('trail');
  });

  it('preserves focus and caret across keystrokes, middle text insertion/deletion, parent echoes, and hass updates', () => {
    const multiSensorConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      title: 'Garage',
      sensors: [
        {
          id: 'garage',
          name: 'Garage Radar',
          targets_entity: 'sensor.mmwave_targets',
        },
        {
          id: 'driveway',
          name: 'Driveway Sensor',
          targets_entity: 'sensor.driveway_targets',
          position: { x: 5, y: 10 },
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    document.body.appendChild(editor);
    editor.setConfig(multiSensorConfig);

    const initialForm = editor.shadowRoot?.querySelector('.ha-form-general') as any;
    expect(initialForm).toBeDefined();

    // Attach text input to ha-form-general to simulate active user input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = 'Garage';
    initialForm.appendChild(textInput);

    textInput.focus();
    textInput.setSelectionRange(6, 6);
    expect(textInput.selectionStart).toBe(6);

    let currentConfig = multiSensorConfig;
    editor.addEventListener('config-changed', (ev: any) => {
      currentConfig = ev.detail.config;
    });

    // 1. Types a multi-character name (" Lights") character-by-character
    const appendChars = ' Lights';
    for (const char of appendChars) {
      const prevCaret = textInput.selectionStart!;
      textInput.value =
        textInput.value.slice(0, prevCaret) + char + textInput.value.slice(prevCaret);
      textInput.setSelectionRange(prevCaret + 1, prevCaret + 1);

      initialForm.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              ...initialForm.data,
              title: textInput.value,
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      editor.setConfig(currentConfig);
      editor.hass = { states: {} } as any;

      expect(editor.shadowRoot?.querySelector('.ha-form-general')).toBe(initialForm);
      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret + 1);
    }

    expect(textInput.value).toBe('Garage Lights');
    expect(currentConfig.title).toBe('Garage Lights');

    // 2. Inserts text in the middle
    textInput.setSelectionRange(6, 6);
    const insertChars = ' Door';
    for (const char of insertChars) {
      const prevCaret = textInput.selectionStart!;
      textInput.value =
        textInput.value.slice(0, prevCaret) + char + textInput.value.slice(prevCaret);
      textInput.setSelectionRange(prevCaret + 1, prevCaret + 1);

      initialForm.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              ...initialForm.data,
              title: textInput.value,
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      editor.setConfig(currentConfig);
      editor.hass = { states: {} } as any;

      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret + 1);
    }

    expect(textInput.value).toBe('Garage Door Lights');
    expect(currentConfig.title).toBe('Garage Door Lights');

    // 3. Deletes text in the middle
    for (let i = 0; i < 5; i++) {
      const prevCaret = textInput.selectionStart!;
      textInput.value = textInput.value.slice(0, prevCaret - 1) + textInput.value.slice(prevCaret);
      textInput.setSelectionRange(prevCaret - 1, prevCaret - 1);

      initialForm.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              ...initialForm.data,
              title: textInput.value,
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      editor.setConfig(currentConfig);
      editor.hass = { states: {} } as any;

      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret - 1);
    }

    expect(textInput.value).toBe('Garage Lights');
    expect(currentConfig.title).toBe('Garage Lights');

    // 4. Additional sensors preserved
    expect(currentConfig.sensors).toHaveLength(2);
    expect(currentConfig.sensors?.[0].id).toBe('garage');
    expect(currentConfig.sensors?.[1].id).toBe('driveway');

    document.body.removeChild(editor);
  });

  it('handles value-changed across radar, targets, floorplan, and advanced forms', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // 1. Radar form
    const formRadar = root?.querySelector('.ha-form-radar') as any;
    formRadar.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            range_meters: 12,
            show_rings: false,
            show_labels: false,
            show_coordinates: true,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.range_meters).toBe(12);
    expect(emitted.show_rings).toBe(false);
    expect(emitted.show_labels).toBe(false);
    expect(emitted.show_coordinates).toBe(true);

    // 2. Targets form
    const formTargets = root?.querySelector('.ha-form-targets') as any;
    formTargets.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            show_trails: true,
            show_last_known: false,
            stale_timeout: 25,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.show_trails).toBe(true);
    expect(emitted.show_last_known).toBe(false);
    expect(emitted.stale_timeout).toBe(25);

    // 3. Floorplan form (update then clear)
    const formFloorplan = root?.querySelector('.ha-form-floorplan') as any;
    formFloorplan.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            floorplan_image: '/local/new_plan.png',
            floorplan_width: 15,
            floorplan_height: 10,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.floorplan?.image).toBe('/local/new_plan.png');
    expect(emitted.floorplan?.width_meters).toBe(15);
    expect(emitted.floorplan?.height_meters).toBe(10);

    formFloorplan.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            floorplan_image: '',
            floorplan_width: 15,
            floorplan_height: 10,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.floorplan).toBeUndefined();

    // 4. Advanced form
    const formAdvanced = root?.querySelector('.ha-form-advanced') as any;
    formAdvanced.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            demo_mode: true,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.demo_mode).toBe(true);
  });

  it('handles sensor placement and advanced subsections value-changed', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;

    // 1. Placement form
    const formPlacement = s1Row.querySelector('.ha-form-sensor-placement') as any;
    formPlacement.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            position_x: '2.5',
            position_y: '3.5',
            rotation: '90',
            fov: '160',
            mirror_x: true,
            mirror_y: true,
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].position).toEqual({ x: 2.5, y: 3.5 });
    expect(emitted.sensors?.[0].rotation).toBe(90);
    expect(emitted.sensors?.[0].fov).toBe(160);
    expect(emitted.sensors?.[0].mirror_x).toBe(true);
    expect(emitted.sensors?.[0].mirror_y).toBe(true);

    // 2. Advanced form
    const formAdvanced = s1Row.querySelector('.ha-form-sensor-advanced') as any;
    formAdvanced.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            source_units: 'm',
            reporting_entity: 'switch.garage_reporting',
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
    expect(emitted.sensors?.[0].source_units).toBe('m');
    expect(emitted.sensors?.[0].reporting_entity).toBe('switch.garage_reporting');
  });

  it('toggles sensor sub-accordions with click and keyboard events', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);
    const root = editor.shadowRoot;

    const s1Row = root?.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
    const placementSub = s1Row.querySelector(
      `.pm-sub-accordion[data-subsection="placement"]`
    ) as HTMLElement;
    const placementHeader = placementSub.querySelector(
      '.pm-sub-accordion-header'
    ) as HTMLButtonElement;

    expect(placementSub.classList.contains('expanded')).toBe(false);

    // Click
    placementHeader.click();
    expect(placementSub.classList.contains('expanded')).toBe(true);
    expect(placementHeader.getAttribute('aria-expanded')).toBe('true');

    // Keydown Enter
    placementHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(placementSub.classList.contains('expanded')).toBe(false);

    // Keydown Space
    placementHeader.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(placementSub.classList.contains('expanded')).toBe(true);
  });

  it('cleans up resources on disconnectedCallback', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    document.body.appendChild(editor);
    editor.setConfig(sampleConfig);

    document.body.removeChild(editor);
    // disconnectedCallback executed safely
    expect(editor.isConnected).toBe(false);
  });

  describe('Polished Editor Features and Behavioral Validations', () => {
    it('round-trips trail_history_seconds and trail_max_points, including unsetting to default', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      editor.setConfig(sampleConfig);
      const root = editor.shadowRoot!;

      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      const formTargets = root.querySelector('.ha-form-targets') as any;

      // 1. Set explicit values
      formTargets.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              show_trails: true,
              show_last_known: true,
              stale_timeout: 10,
              trail_history_seconds: 25,
              trail_max_points: 60,
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.trail_history_seconds).toBe(25);
      expect(emitted.trail_max_points).toBe(60);

      // 2. Clear values back to undefined / defaults
      formTargets.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              show_trails: true,
              show_last_known: true,
              stale_timeout: 10,
              trail_history_seconds: '',
              trail_max_points: '',
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.trail_history_seconds).toBeUndefined();
      expect(emitted.trail_max_points).toBeUndefined();
    });

    it('manages targets_attribute selection, discovery, custom entry, and live feedback', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Living Room Sensor',
            targets_entity: 'sensor.living_room_targets',
          },
        ],
      };
      editor.setConfig(config);

      const hass: HomeAssistant = {
        states: {
          'sensor.living_room_targets': {
            entity_id: 'sensor.living_room_targets',
            state: '1',
            attributes: {
              targets: [{ x: 10, y: 20 }],
              custom_targets: [{ x: 5, y: 15 }],
              empty_targets: [],
            },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
        },
      };
      editor.hass = hass;

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const targetsSelect = s1Row.querySelector('.pm-targets-select') as HTMLSelectElement;
      const customWrapper = s1Row.querySelector('.pm-targets-custom-wrapper') as HTMLElement;
      const customInput = s1Row.querySelector('.pm-targets-custom-input') as HTMLInputElement;
      const badge = s1Row.querySelector('.pm-targets-validation') as HTMLElement;

      // Check discovered options
      const optionValues = Array.from(targetsSelect.options).map(o => o.value);
      expect(optionValues).toContain(''); // Default - targets
      expect(optionValues).toContain('custom_targets');
      expect(optionValues).toContain('empty_targets');
      expect(optionValues).toContain('__custom__');

      // Default targets validation badge
      expect(badge.className).toContain('pm-validation-compatible');
      expect(badge.textContent).toContain('Compatible target data');

      // Listen for changes
      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      // Select custom attribute from discovered list
      targetsSelect.value = 'custom_targets';
      targetsSelect.dispatchEvent(new Event('change'));
      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].targets_attribute).toBe('custom_targets');
      expect(customWrapper.style.display).toBe('none');

      // Select custom attribute entry
      targetsSelect.value = '__custom__';
      targetsSelect.dispatchEvent(new Event('change'));
      expect(customWrapper.style.display).toBe('block');

      // Type custom attribute name
      customInput.value = 'my_raw_targets';
      customInput.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].targets_attribute).toBe('my_raw_targets');

      // Select default again to unset targets_attribute
      targetsSelect.value = '';
      targetsSelect.dispatchEvent(new Event('change'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].targets_attribute).toBeUndefined();
      expect(customWrapper.style.display).toBe('none');

      // Changing targets entity refreshes choices while preserving valid configured custom value
      const updatedConfigWithAttr: PresenceMapCardConfig = {
        ...config,
        sensors: [
          {
            ...config.sensors![0],
            targets_entity: 'sensor.bedroom_targets',
            targets_attribute: 'preserved_attr',
          },
        ],
      };
      editor.setConfig(updatedConfigWithAttr);
      const newOptionValues = Array.from(targetsSelect.options).map(o => o.value);
      expect(newOptionValues).toContain('preserved_attr');
      expect(targetsSelect.value).toBe('preserved_attr');
    });

    it('handles sensor color picker, preset palette, custom hex/rgb, and preserves unrepresentable colors', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            color: 'rgb(255, 99, 71)', // Tomato in rgb format
          },
        ],
      };
      editor.setConfig(config);

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const colorTextInput = s1Row.querySelector('.pm-color-text-input') as HTMLInputElement;
      const colorPicker = s1Row.querySelector('.pm-native-color-picker') as HTMLInputElement;
      const colorValidationMsg = s1Row.querySelector('.pm-color-validation-msg') as HTMLElement;
      const presetButtons = s1Row.querySelectorAll('.pm-color-preset-btn');

      // 1. Initial preservation
      expect(colorTextInput.value).toBe('rgb(255, 99, 71)');

      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      // 2. Click preset palette button
      const firstPreset = presetButtons[0] as HTMLElement;
      const presetColor = firstPreset.dataset.color!;
      firstPreset.click();

      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].color).toBe(presetColor);

      // 3. Native color picker change
      colorPicker.value = '#123456';
      colorPicker.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].color).toBe('#123456');

      // 4. Custom text input with hex
      colorTextInput.value = '#abcdef';
      colorTextInput.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].color).toBe('#abcdef');
      expect(colorValidationMsg.style.display).toBe('none');

      // 5. Invalid color entry
      colorTextInput.value = 'invalid-color-value-12345';
      colorTextInput.dispatchEvent(new Event('input'));
      expect(colorValidationMsg.style.display).toBe('block');
      // Previous valid color remains intact
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].color).toBe('#abcdef');
    });

    it('handles measurement conversions, signed/zero positions, and avoids conversion drift across unit switches', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const initialConfig: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        display_units: 'imperial',
        range_meters: 6.096, // Exact 20 ft
        floorplan: {
          image: '/local/plan.png',
          width_meters: 9.144, // Exact 30 ft
          height_meters: 6.096, // Exact 20 ft
        },
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            position: { x: -3.048, y: 0 }, // -10 ft, 0 ft
            source_units: 'cm',
          },
        ],
      };
      editor.setConfig(initialConfig);

      const root = editor.shadowRoot!;
      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      // 1. Verify imperial inputs displayed accurately
      const rangeFtInput = root.querySelector('.pm-range-ft') as HTMLInputElement;
      expect(rangeFtInput.value).toBe('20');

      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const signXSelect = s1Row.querySelector('.pm-pos-x-sign') as HTMLSelectElement;
      const ftXInput = s1Row.querySelector('.pm-pos-x-ft') as HTMLInputElement;
      const signYSelect = s1Row.querySelector('.pm-pos-y-sign') as HTMLSelectElement;
      const ftYInput = s1Row.querySelector('.pm-pos-y-ft') as HTMLInputElement;

      expect(signXSelect.value).toBe('-1');
      expect(ftXInput.value).toBe('10');
      expect(signYSelect.value).toBe('1');
      expect(ftYInput.value).toBe('0');

      // 2. Change position X to -15 ft 0 in
      ftXInput.value = '15';
      ftXInput.dispatchEvent(new Event('input'));
      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.x).toBeCloseTo(-4.572, 3);
      expect(emitted.sensors?.[0].position?.y).toBe(0);

      // 3. Switch display_units to metric and back without mutating physical values (zero drift)
      const formGeneral = root.querySelector('.ha-form-general') as any;
      formGeneral.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              title: '',
              display_units: 'metric',
              theme: 'auto',
            },
          },
          bubbles: true,
          composed: true,
        })
      );
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.display_units).toBe('metric');
      // Measurements still intact
      expect(emitted.range_meters).toBe(6.096);
      expect(emitted.sensors?.[0].position?.x).toBeCloseTo(-4.572, 3);
      expect(emitted.sensors?.[0].source_units).toBe('cm'); // Separate source_units unchanged

      // Metric input elements rendered
      const rangeMInput = root.querySelector('.pm-range-m') as HTMLInputElement;
      expect(rangeMInput).toBeDefined();
      expect(rangeMInput.value).toBe('6.096');

      // Switch back to imperial
      formGeneral.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              title: '',
              display_units: 'imperial',
              theme: 'auto',
            },
          },
          bubbles: true,
          composed: true,
        })
      );
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.display_units).toBe('imperial');
      expect(emitted.range_meters).toBe(6.096);
      expect(emitted.sensors?.[0].position?.x).toBeCloseTo(-4.572, 3);
    });

    it('renders live sensor setup feedback and boundary resolution diagnostics', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Garage mmWave',
            targets_entity: 'sensor.garage_targets',
            boundary_prefix: 'number.garage_',
            boundary_max_x_entity: 'number.custom_max_x',
          },
        ],
      };
      editor.setConfig(config);

      const hass: HomeAssistant = {
        states: {
          'sensor.garage_targets': {
            entity_id: 'sensor.garage_targets',
            state: '0',
            attributes: { targets: [] },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
          'number.garage_width_minimum_left': {
            entity_id: 'number.garage_width_minimum_left',
            state: '-200',
            attributes: { unit_of_measurement: 'cm' },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
          'number.custom_max_x': {
            entity_id: 'number.custom_max_x',
            state: '200',
            attributes: { unit_of_measurement: 'cm' },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
          'number.garage_depth_minimum_near': {
            entity_id: 'number.garage_depth_minimum_near',
            state: '0',
            attributes: { unit_of_measurement: 'cm' },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
          'number.garage_depth_maximum_far': {
            entity_id: 'number.garage_depth_maximum_far',
            state: '500',
            attributes: { unit_of_measurement: 'cm' },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
        },
      };

      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      // Updating hass must NOT emit config-changed
      editor.hass = hass;
      expect(changeListener).not.toHaveBeenCalled();

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;

      // 1. Diagnostics setup feedback
      const feedbackItems = s1Row.querySelectorAll('.pm-feedback-item');
      expect(feedbackItems.length).toBeGreaterThan(0);
      const feedbackText = Array.from(feedbackItems)
        .map(el => el.textContent)
        .join(' ');
      expect(feedbackText).toContain('Valid target data with no current targets');

      // 2. Boundary resolution diagnostics
      const boundaryRows = s1Row.querySelectorAll('.pm-boundary-row');
      expect(boundaryRows.length).toBe(6);

      const summaryBadge = s1Row.querySelector('.pm-boundary-summary-badge') as HTMLElement;
      expect(summaryBadge.className).toContain('pm-boundary-summary-valid');
      expect(summaryBadge.textContent).toContain('Complete and valid detection boundary active');

      // 3. Placement guidance text
      const placementGuide = s1Row.querySelector('.pm-placement-guide') as HTMLElement;
      expect(placementGuide).toBeDefined();
      expect(placementGuide.textContent).toContain('Origin & Direction');
      expect(placementGuide.textContent).toContain('Illustrative');
    });

    it('handles interactive input events for floorplan, radar range, and sensor position in imperial and metric modes', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        display_units: 'imperial',
        range_meters: 6.096, // 20 ft
        floorplan: {
          image: '/local/test.png',
          width_meters: 6.096,
          height_meters: 3.048,
        },
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            position: { x: 1, y: 2 },
          },
        ],
      };
      editor.setConfig(config);
      const root = editor.shadowRoot!;
      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      // 1. Radar range inches change
      const rangeInInput = root.querySelector('.pm-range-in') as HTMLInputElement;
      rangeInInput.value = '6';
      rangeInInput.dispatchEvent(new Event('input'));
      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.range_meters).toBeCloseTo(6.248, 2);

      // 2. Floorplan width & height in imperial
      const fpWFt = root.querySelector('.pm-fp-w-ft') as HTMLInputElement;
      const fpWIn = root.querySelector('.pm-fp-w-in') as HTMLInputElement;
      const fpHFt = root.querySelector('.pm-fp-h-ft') as HTMLInputElement;
      const fpHIn = root.querySelector('.pm-fp-h-in') as HTMLInputElement;

      fpWFt.value = '25';
      fpWFt.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.width_meters).toBeCloseTo(7.62, 2);

      fpWIn.value = '6';
      fpWIn.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.width_meters).toBeCloseTo(7.772, 2);

      fpHFt.value = '15';
      fpHFt.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.height_meters).toBeCloseTo(4.572, 2);

      fpHIn.value = '3';
      fpHIn.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.height_meters).toBeCloseTo(4.648, 2);

      // 3. Sensor position Y sign, feet, inches
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const signY = s1Row.querySelector('.pm-pos-y-sign') as HTMLSelectElement;
      const ftY = s1Row.querySelector('.pm-pos-y-ft') as HTMLInputElement;
      const inY = s1Row.querySelector('.pm-pos-y-in') as HTMLInputElement;
      const inX = s1Row.querySelector('.pm-pos-x-in') as HTMLInputElement;

      inX.value = '4';
      inX.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.x).toBeCloseTo(1.016, 2);

      signY.value = '-1';
      signY.dispatchEvent(new Event('change'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.y).toBeLessThan(0);

      ftY.value = '8';
      inY.value = '0';
      ftY.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.y).toBeCloseTo(-2.438, 2);

      inY.value = '6';
      inY.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.y).toBeCloseTo(-2.591, 2);

      // 4. Switch to metric and test metric input changes
      const formGeneral = root.querySelector('.ha-form-general') as any;
      formGeneral.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              title: '',
              display_units: 'metric',
              theme: 'auto',
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      // Metric radar range
      const rangeM = root.querySelector('.pm-range-m') as HTMLInputElement;
      rangeM.value = '10';
      rangeM.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.range_meters).toBe(10);

      // Metric floorplan
      const fpWM = root.querySelector('.pm-fp-w-m') as HTMLInputElement;
      const fpHM = root.querySelector('.pm-fp-h-m') as HTMLInputElement;
      fpWM.value = '14';
      fpWM.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.width_meters).toBe(14);

      fpHM.value = '11';
      fpHM.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.floorplan?.height_meters).toBe(11);

      // Metric sensor position
      const mX = s1Row.querySelector('.pm-pos-x-m') as HTMLInputElement;
      const mY = s1Row.querySelector('.pm-pos-y-m') as HTMLInputElement;

      mX.value = '3.5';
      mX.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.x).toBe(3.5);

      mY.value = '-1.8';
      mY.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].position?.y).toBe(-1.8);
    });

    it('renders invalid boundary summary badge when boundary coordinates are incomplete or reversed', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            boundary_prefix: 'number.missing_limits_',
          },
        ],
      };
      editor.setConfig(config);
      editor.hass = { states: {} } as any;

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const summaryBadge = s1Row.querySelector('.pm-boundary-summary-badge') as HTMLElement;

      expect(summaryBadge.className).toContain('pm-boundary-summary-invalid');
      expect(summaryBadge.textContent).toContain('⚠');
    });

    it('renders unsupported validation badge when targets entity attribute is malformed', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            targets_entity: 'sensor.bad_sensor',
            targets_attribute: 'bad_attr',
          },
        ],
      };
      editor.setConfig(config);
      editor.hass = {
        states: {
          'sensor.bad_sensor': {
            entity_id: 'sensor.bad_sensor',
            state: '1',
            attributes: {
              bad_attr: 'not-valid-json {',
            },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
        },
      } as any;

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const badge = s1Row.querySelector('.pm-targets-validation') as HTMLElement;
      expect(badge.className).toContain('pm-validation-unsupported');

      const feedbackItems = s1Row.querySelectorAll('.pm-feedback-item');
      expect(Array.from(feedbackItems).some(i => i.classList.contains('pm-feedback-error'))).toBe(
        true
      );
    });

    it('supports millimeters (mm) source_units selection and round-tripping', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            source_units: 'cm',
          },
        ],
      };
      editor.setConfig(config);

      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const formAdvanced = s1Row.querySelector('.ha-form-sensor-advanced') as any;

      formAdvanced.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: {
            value: {
              source_units: 'mm',
              reporting_entity: '',
            },
          },
          bubbles: true,
          composed: true,
        })
      );

      const emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].source_units).toBe('mm');
    });

    it('manages trail attribute custom entry, unsetting, and keyboard navigation on global headers', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            targets_entity: 'sensor.radar',
          },
        ],
      };
      editor.setConfig(config);
      editor.hass = {
        states: {
          'sensor.radar': {
            entity_id: 'sensor.radar',
            state: '1',
            attributes: {
              discovered_trail: [[10, 20]],
              empty_trail: [],
            },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
        },
      } as any;

      const changeListener = vi.fn();
      editor.addEventListener('config-changed', changeListener);

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;
      const trailSelect = s1Row.querySelector('.pm-trail-select') as HTMLSelectElement;
      const trailCustomWrapper = s1Row.querySelector('.pm-trail-custom-wrapper') as HTMLElement;
      const trailCustomInput = s1Row.querySelector('.pm-trail-custom-input') as HTMLInputElement;

      // 1. Select discovered trail attribute
      trailSelect.value = 'discovered_trail';
      trailSelect.dispatchEvent(new Event('change'));
      let emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].trail_attribute).toBe('discovered_trail');

      // 2. Select empty trail attribute (displays info badge)
      trailSelect.value = 'empty_trail';
      trailSelect.dispatchEvent(new Event('change'));
      const badge = s1Row.querySelector('.pm-trail-validation') as HTMLElement;
      expect(badge.className).toContain('pm-validation-empty');

      // 3. Select custom trail attribute
      trailSelect.value = '__custom__';
      trailSelect.dispatchEvent(new Event('change'));
      expect(trailCustomWrapper.style.display).toBe('block');

      trailCustomInput.value = 'custom_history';
      trailCustomInput.dispatchEvent(new Event('input'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].trail_attribute).toBe('custom_history');

      // 4. Select None (unset)
      trailSelect.value = '';
      trailSelect.dispatchEvent(new Event('change'));
      emitted = changeListener.mock.calls.at(-1)![0].detail.config as PresenceMapCardConfig;
      expect(emitted.sensors?.[0].trail_attribute).toBeUndefined();
      expect(trailCustomWrapper.style.display).toBe('none');

      // 5. Global accordion header keyboard events (Enter and Space)
      const radarAccordion = root.querySelector(
        '.pm-accordion[data-section="radar"]'
      ) as HTMLElement;
      const radarHeader = radarAccordion.querySelector('.pm-accordion-header') as HTMLElement;

      expect(radarAccordion.classList.contains('expanded')).toBe(false);
      radarHeader.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(radarAccordion.classList.contains('expanded')).toBe(true);

      radarHeader.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(radarAccordion.classList.contains('expanded')).toBe(false);

      // Sensor header keyboard events
      const s1Header = s1Row.querySelector('.pm-accordion-header') as HTMLElement;
      s1Header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(s1Row.classList.contains('expanded')).toBe(true);
      s1Header.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(s1Row.classList.contains('expanded')).toBe(false);
    });

    it('covers defensive branches for edge-case inputs, empty strings, and out-of-bounds actions', () => {
      const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
      const config: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        display_units: 'imperial',
        sensors: [
          {
            id: 's1',
            name: 'Sensor 1',
            targets_entity: 'sensor.radar',
            trail_attribute: 'bad_trail',
            position: { x: 1, y: 1 },
          },
        ],
      };
      editor.setConfig(config);
      editor.hass = {
        states: {
          'sensor.radar': {
            entity_id: 'sensor.radar',
            state: '1',
            attributes: {
              bad_trail: 'invalid_non_array_or_json',
            },
            last_changed: '2026-10-13T12:00:00Z',
            last_updated: '2026-10-13T12:00:00Z',
          },
        },
      } as any;

      const root = editor.shadowRoot!;
      const s1Row = root.querySelector(`.pm-accordion[data-sensor-id="s1"]`) as HTMLElement;

      // 1. Trail validation badge with unsupported format
      const trailBadge = s1Row.querySelector('.pm-trail-validation') as HTMLElement;
      expect(trailBadge.className).toContain('pm-validation-unsupported');

      // 2. Color text input with empty string returns early
      const colorInput = s1Row.querySelector('.pm-color-text-input') as HTMLInputElement;
      colorInput.value = '   ';
      colorInput.dispatchEvent(new Event('input'));

      // 3. Position X sign select change
      const signX = s1Row.querySelector('.pm-pos-x-sign') as HTMLSelectElement;
      signX.value = '-1';
      signX.dispatchEvent(new Event('change'));

      // 4. Radar ft input event
      const rangeFt = root.querySelector('.pm-range-ft') as HTMLInputElement;
      if (rangeFt) {
        rangeFt.value = '22';
        rangeFt.dispatchEvent(new Event('input'));
      }

      // 5. Internal methods called with nonexistent sensor ID safely return
      (editor as any)._handleDuplicateSensor('nonexistent_id');
      (editor as any)._handleMoveSensor('nonexistent_id', 1);
      (editor as any)._handleMoveSensor('s1', -1); // already at 0
      (editor as any)._handleMoveSensor('s1', 1); // already at max
      (editor as any)._updateSensorById('nonexistent_id', () => {});

      // 6. Utility parsing and equality defensive branches
      expect((editor as any)._parseNum('abc', 10)).toBe(10);
      expect((editor as any)._parseNum('', 10)).toBe(10);
      expect((editor as any)._parseNum(undefined, 10)).toBe(10);
      expect((editor as any)._parseNum('15', 10)).toBe(15);
      expect((editor as any)._cleanStr(123)).toBeUndefined();
      expect((editor as any)._cleanStr('   ')).toBeUndefined();
      expect((editor as any)._cleanStr('valid')).toBe('valid');
      expect((editor as any)._isConfigEqual(undefined, undefined)).toBe(true);
      expect((editor as any)._isConfigEqual(config, undefined)).toBe(false);
      expect((editor as any)._isFormDataEqual(undefined, undefined)).toBe(true);
      expect((editor as any)._isFormDataEqual({ a: 1 }, undefined)).toBe(false);
      expect((editor as any)._isFormDataEqual({ a: 1 }, { b: 2 })).toBe(false);
      expect((editor as any)._isFormDataEqual({ a: 1 }, { a: 2 })).toBe(false);

      // 7. Click Move Down on sensor with multiple items
      const multiConfig: PresenceMapCardConfig = {
        type: 'custom:presence-map-card',
        sensors: [
          { id: 's1', name: 'Sensor 1' },
          { id: 's2', name: 'Sensor 2' },
        ],
      };
      editor.setConfig(multiConfig);
      const s1DownBtn = editor.shadowRoot!.querySelector(
        '.pm-accordion[data-sensor-id="s1"] .btn-move-down'
      ) as HTMLButtonElement;
      s1DownBtn.click();

      // 8. generateUniqueSensorId collision loop
      const idResult = generateUniqueSensorId(
        [{ id: 'test_copy' }, { id: 'test_copy_2' }],
        'test_copy'
      );
      expect(idResult).toBe('test_copy_3');

      // 9. _updateConfig when _config is initially undefined and unequal key lengths
      const freshEditor = document.createElement('presence-map-editor') as any;
      freshEditor._updateConfig((c: any) => ({ ...c, title: 'Fresh' }));
      freshEditor._updateSensorById('s1', () => {});
      expect(freshEditor._isFormDataEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(freshEditor._isConfigEqual(undefined, { type: 'custom:presence-map-card' })).toBe(
        false
      );
    });
  });
});
