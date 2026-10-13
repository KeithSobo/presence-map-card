import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../src/presence-map-card';
import { PresenceMapCard } from '../src/presence-map-card';
import { HomeAssistant } from '../src/types';

describe('PresenceMapCard Web Component Lifecycle and HA Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is registered in customElements registry', () => {
    const elClass = customElements.get('presence-map-card');
    expect(elClass).toBeDefined();
  });

  it('registers in window.customCards array', () => {
    expect(window.customCards).toBeDefined();
    const entry = window.customCards?.find(c => c.type === 'presence-map-card');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('PresenceMap');
  });

  it('provides static getStubConfig and getConfigElement', () => {
    const stub = PresenceMapCard.getStubConfig();
    expect(stub.type).toBe('custom:presence-map-card');
    expect(stub.sensors).toBeDefined();

    const editorEl = PresenceMapCard.getConfigElement();
    expect(editorEl.tagName.toLowerCase()).toBe('presence-map-editor');
  });

  it('throws error when setConfig receives invalid configuration without sensors or demo mode', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    expect(() => card.setConfig({ type: 'custom:presence-map-card', sensors: [] })).toThrow(
      /Configuration error/
    );
  });

  it('renders card when setConfig receives valid config', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    card.setConfig({
      type: 'custom:presence-map-card',
      title: 'Living Room Radar',
      sensors: [
        {
          id: 's1',
          name: 'Living Room',
          targets_entity: 'sensor.living_room_targets',
        },
      ],
    });

    const root = card.shadowRoot;
    expect(root).toBeDefined();
    expect(root?.innerHTML).toContain('Living Room Radar');
    expect(root?.innerHTML).toContain('presence-map-svg');
  });

  it('updates target data when monitored Home Assistant entities change', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    card.setConfig({
      type: 'custom:presence-map-card',
      sensors: [
        {
          id: 's1',
          name: 'Radar',
          targets_entity: 'sensor.radar_targets',
        },
      ],
    });

    const currentIso = new Date().toISOString();
    const mockHass: HomeAssistant = {
      states: {
        'sensor.radar_targets': {
          entity_id: 'sensor.radar_targets',
          state: '1',
          attributes: {
            targets: [{ x: 50, y: 150, dop: 20, target_id: 1 }],
          },
          last_changed: currentIso,
          last_updated: currentIso,
        },
      },
    };

    card.hass = mockHass;

    const root = card.shadowRoot;
    expect(root?.innerHTML).toContain('presence-target');
    expect(root?.innerHTML).toContain('T1');
  });

  it('skips redundant re-renders when unrelated entities change in hass', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    card.setConfig({
      type: 'custom:presence-map-card',
      sensors: [
        {
          id: 's1',
          name: 'Radar',
          targets_entity: 'sensor.radar_targets',
        },
      ],
    });

    const currentIso = new Date().toISOString();
    const mockHass: HomeAssistant = {
      states: {
        'sensor.radar_targets': {
          entity_id: 'sensor.radar_targets',
          state: '1',
          attributes: { targets: [{ x: 50, y: 150, target_id: 1 }] },
          last_changed: currentIso,
          last_updated: currentIso,
        },
      },
    };

    card.hass = mockHass;

    // Spy on internal render
    const renderSpy = vi.spyOn(card as any, '_render');

    // Send update where unrelated entity changes
    const updatedHass: HomeAssistant = {
      states: {
        ...mockHass.states,
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: {},
          last_changed: currentIso,
          last_updated: currentIso,
        },
      },
    };

    card.hass = updatedHass;
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('detects dark mode across various themes and settings', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;

    // Explicit light theme
    card.setConfig({ type: 'custom:presence-map-card', demo_mode: true, theme: 'light' });
    expect((card as any)._isDarkMode()).toBe(false);

    // Explicit dark theme
    card.setConfig({ type: 'custom:presence-map-card', demo_mode: true, theme: 'dark' });
    expect((card as any)._isDarkMode()).toBe(true);

    // Auto theme with hass.darkMode = true
    card.setConfig({ type: 'custom:presence-map-card', demo_mode: true, theme: 'auto' });
    card.hass = { states: {}, darkMode: true };
    expect((card as any)._isDarkMode()).toBe(true);

    // Auto theme with selectedTheme dark mode
    card.hass = {
      states: {},
      darkMode: false,
      selectedTheme: 'custom_dark',
      themes: {
        themes: {
          custom_dark: { modes: { dark: true } },
        },
      },
    };
    expect((card as any)._isDarkMode()).toBe(true);
  });

  it('cleans up interval timer and resize observer on disconnectedCallback', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    card.setConfig({
      type: 'custom:presence-map-card',
      demo_mode: true,
    });

    document.body.appendChild(card);
    expect((card as any)._timer).toBeDefined();

    document.body.removeChild(card);
    expect((card as any)._timer).toBeUndefined();
  });

  it('runs demo simulation ticker in demo mode', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    card.setConfig({
      type: 'custom:presence-map-card',
      demo_mode: true,
    });

    document.body.appendChild(card);

    vi.advanceTimersByTime(2000);

    const root = card.shadowRoot;
    expect(root?.innerHTML).toContain('DEMO (Simulated Data)');
    expect(root?.innerHTML).toContain('presence-target');

    document.body.removeChild(card);
  });

  it('returns valid card size estimate', () => {
    const card = document.createElement('presence-map-card') as PresenceMapCard;
    expect(card.getCardSize()).toBeGreaterThanOrEqual(4);
  });
});
