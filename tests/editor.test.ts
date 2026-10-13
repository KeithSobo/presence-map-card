import { describe, it, expect, vi } from 'vitest';
import '../src/editor/presence-map-editor';
import { PresenceMapEditor } from '../src/editor/presence-map-editor';
import { PresenceMapCardConfig, HomeAssistant } from '../src/types';

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
    show_boundaries: true,
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

  it('populates form data on setConfig', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);

    const root = editor.shadowRoot;
    expect(root).toBeDefined();
    const form = root?.querySelector('ha-form') as any;
    expect(form).toBeDefined();
    expect(form.data).toBeDefined();
    expect(form.data.title).toBe('Test Radar');
    expect(form.data.display_units).toBe('imperial');
    expect(form.data.theme).toBe('dark');
    expect(form.data.range_meters).toBe(8);
    expect(form.data.sensor_targets_entity).toBe('sensor.inovelli_targets');
    expect(form.data.sensor_color).toBe('#ff9800');
    expect(form.data.sensor_fov).toBe(140);
    expect(form.data.sensor_rotation).toBe(45);
    expect(form.data.sensor_mirror_x).toBe(true);
  });

  it('handles empty config or missing primary sensor gracefully', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig({ type: 'custom:presence-map-card', demo_mode: true });

    const form = editor.shadowRoot?.querySelector('ha-form') as any;
    expect(form.data.title).toBe('');
    expect(form.data.sensor_targets_entity).toBe('');
  });

  it('assigns hass object to ha-form', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);

    const mockHass: HomeAssistant = {
      states: {},
    };
    editor.hass = mockHass;

    const form = editor.shadowRoot?.querySelector('ha-form') as any;
    expect(form.hass).toBe(mockHass);
  });

  it('emits config-changed event when ha-form fires value-changed', () => {
    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(sampleConfig);

    const form = editor.shadowRoot?.querySelector('ha-form') as any;
    expect(form).toBeDefined();

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    // Simulate ha-form value-changed event with floorplan cleared and metric units
    const updatedFormData = {
      ...form.data,
      title: 'Renamed Radar',
      display_units: 'metric',
      theme: 'light',
      range_meters: 10,
      floorplan_image: '', // Cleared image
      sensor_targets_entity: 'sensor.new_targets',
      sensor_source_units: 'm',
      sensor_fov: 90,
      sensor_rotation: 180,
      sensor_mirror_y: true,
    };

    form.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: updatedFormData },
        bubbles: true,
        composed: true,
      })
    );

    expect(changeListener).toHaveBeenCalledTimes(1);
    const emittedConfig = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(emittedConfig.title).toBe('Renamed Radar');
    expect(emittedConfig.display_units).toBe('metric');
    expect(emittedConfig.theme).toBe('light');
    expect(emittedConfig.range_meters).toBe(10);
    expect(emittedConfig.floorplan).toBeUndefined(); // Floorplan cleared
    expect(emittedConfig.sensors?.[0].targets_entity).toBe('sensor.new_targets');
    expect(emittedConfig.sensors?.[0].source_units).toBe('m');
    expect(emittedConfig.sensors?.[0].fov).toBe(90);
    expect(emittedConfig.sensors?.[0].rotation).toBe(180);
    expect(emittedConfig.sensors?.[0].mirror_y).toBe(true);
  });

  it('preserves additional sensors and explicit boundary overrides without dropping them', () => {
    const multiSensorConfig: PresenceMapCardConfig = {
      ...sampleConfig,
      trail_history_seconds: 45,
      trail_max_points: 150,
      sensors: [
        {
          id: 's1',
          name: 'Sensor 1',
          targets_entity: 'sensor.target1',
          boundary_min_x_entity: 'number.custom_min_x',
          boundary_max_x_entity: 'number.custom_max_x',
          boundary_min_y_entity: 'number.custom_min_y',
          boundary_max_y_entity: 'number.custom_max_y',
          boundary_min_z_entity: 'number.custom_min_z',
          boundary_max_z_entity: 'number.custom_max_z',
        },
        {
          id: 's2',
          name: 'Sensor 2 (Additional)',
          targets_entity: 'sensor.target2',
          position: { x: 2, y: 1 },
          color: '#e91e63',
        },
      ],
    };

    const editor = document.createElement('presence-map-editor') as PresenceMapEditor;
    editor.setConfig(multiSensorConfig);

    const form = editor.shadowRoot?.querySelector('ha-form') as any;
    expect(form.data.sensor_boundary_min_x_entity).toBe('number.custom_min_x');
    expect(form.data.sensor_boundary_max_x_entity).toBe('number.custom_max_x');
    expect(form.data.sensor_boundary_min_y_entity).toBe('number.custom_min_y');
    expect(form.data.sensor_boundary_max_y_entity).toBe('number.custom_max_y');
    expect(form.data.sensor_boundary_min_z_entity).toBe('number.custom_min_z');
    expect(form.data.sensor_boundary_max_z_entity).toBe('number.custom_max_z');

    const changeListener = vi.fn();
    editor.addEventListener('config-changed', changeListener);

    form.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: {
          value: {
            ...form.data,
            title: 'Updated Multi-Sensor Radar',
            sensor_boundary_min_x_entity: 'number.overridden_min_x',
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    expect(changeListener).toHaveBeenCalledTimes(1);
    const resultConfig = changeListener.mock.calls[0][0].detail.config as PresenceMapCardConfig;
    expect(resultConfig.title).toBe('Updated Multi-Sensor Radar');
    expect(resultConfig.trail_history_seconds).toBe(45);
    expect(resultConfig.trail_max_points).toBe(150);
    expect(resultConfig.sensors).toHaveLength(2);
    expect(resultConfig.sensors?.[0].boundary_min_x_entity).toBe('number.overridden_min_x');
    expect(resultConfig.sensors?.[0].boundary_max_x_entity).toBe('number.custom_max_x');
    expect(resultConfig.sensors?.[1].id).toBe('s2');
    expect(resultConfig.sensors?.[1].name).toBe('Sensor 2 (Additional)');
    expect(resultConfig.sensors?.[1].position).toEqual({ x: 2, y: 1 });
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

    const initialForm = editor.shadowRoot?.querySelector('ha-form') as any;
    expect(initialForm).toBeDefined();

    // Attach a real text input element to ha-form to simulate active user input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = 'Garage';
    initialForm.appendChild(textInput);

    textInput.focus();
    textInput.setSelectionRange(6, 6); // Caret at end of "Garage"
    expect(textInput.selectionStart).toBe(6);
    expect(textInput.selectionEnd).toBe(6);

    let currentConfig = multiSensorConfig;
    editor.addEventListener('config-changed', (ev: any) => {
      currentConfig = ev.detail.config;
    });

    // 1. Types a complete multi-character name (" Lights") character-by-character without refocusing
    const appendChars = ' Lights';
    for (const char of appendChars) {
      const prevCaret = textInput.selectionStart!;
      textInput.value =
        textInput.value.slice(0, prevCaret) + char + textInput.value.slice(prevCaret);
      textInput.setSelectionRange(prevCaret + 1, prevCaret + 1);

      // ha-form emits value-changed
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

      // Parent Lovelace editor echoes the updated configuration back to setConfig
      editor.setConfig(currentConfig);

      // Concurrently, Home Assistant emits unrelated entity state updates to editor.hass
      editor.hass = {
        states: {
          'sensor.outdoor_temperature': {
            entity_id: 'sensor.outdoor_temperature',
            state: '72',
            attributes: {},
            last_changed: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        },
      } as any;

      // Verify DOM identity of ha-form is completely preserved (not wiped or remounted)
      const currentForm = editor.shadowRoot?.querySelector('ha-form');
      expect(currentForm).toBe(initialForm);

      // Verify input remains in DOM and retained focus & caret position
      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret + 1);
      expect(textInput.selectionEnd).toBe(prevCaret + 1);
    }

    expect(textInput.value).toBe('Garage Lights');
    expect(currentConfig.title).toBe('Garage Lights');

    // 2. Inserts text in the middle of an existing value:
    // Move caret to index 6 (between "Garage" and " Lights")
    textInput.setSelectionRange(6, 6);
    expect(textInput.selectionStart).toBe(6);

    // Insert " Door" in the middle
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

      expect(editor.shadowRoot?.querySelector('ha-form')).toBe(initialForm);
      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret + 1);
      expect(textInput.selectionEnd).toBe(prevCaret + 1);
    }

    expect(textInput.value).toBe('Garage Door Lights');
    expect(currentConfig.title).toBe('Garage Door Lights');
    expect(textInput.selectionStart).toBe(11);

    // 3. Deletes text in the middle of existing value:
    // Delete " Door" (5 characters) backwards from index 11
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

      expect(editor.shadowRoot?.querySelector('ha-form')).toBe(initialForm);
      expect(textInput.isConnected).toBe(true);
      expect(textInput.selectionStart).toBe(prevCaret - 1);
      expect(textInput.selectionEnd).toBe(prevCaret - 1);
    }

    expect(textInput.value).toBe('Garage Lights');
    expect(textInput.selectionStart).toBe(6);

    // 4. Confirms the resulting configuration saves correctly
    expect(currentConfig.title).toBe('Garage Lights');

    // 5. Confirms additional sensor configurations are preserved
    expect(currentConfig.sensors).toHaveLength(2);
    expect(currentConfig.sensors?.[0].id).toBe('garage');
    expect(currentConfig.sensors?.[1].id).toBe('driveway');
    expect(currentConfig.sensors?.[1].name).toBe('Driveway Sensor');
    expect(currentConfig.sensors?.[1].position).toEqual({ x: 5, y: 10 });

    document.body.removeChild(editor);
  });
});
