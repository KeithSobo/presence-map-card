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
});
