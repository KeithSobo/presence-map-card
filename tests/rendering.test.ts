import { describe, it, expect } from 'vitest';
import { renderSvg } from '../src/rendering';
import { PresenceMapCardConfig, Target, TrailPoint, DetectionBoundary } from '../src/types';

describe('SVG Radar and Floor-Plan Rendering Engine', () => {
  const radarConfig: PresenceMapCardConfig = {
    type: 'custom:presence-map-card',
    range_meters: 6,
    show_rings: true,
    show_labels: true,
    show_trails: true,
    show_boundaries: true,
    sensors: [
      {
        id: 's1',
        name: 'Office Sensor',
        targets_entity: 'sensor.office_targets',
        source_units: 'cm',
        color: '#03a9f4',
        fov: 120,
        position: { x: 0, y: 0 },
        rotation: 0,
      },
    ],
  };

  const sampleTargets: Target[] = [
    {
      scopedId: 's1:1',
      sensorId: 's1',
      sensorColor: '#03a9f4',
      rawTargetId: 1,
      x: 0.5,
      y: 2.0,
      worldX: 0.5,
      worldY: 2.0,
      dop: 40, // moving towards sensor
      timestamp: Date.now(),
      isStale: false,
    },
  ];

  it('renders radar view with distance rings, labels, and sensor cone', () => {
    const svg = renderSvg({
      config: radarConfig,
      targets: sampleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: false,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('class="presence-map-svg"');
    expect(svg).toContain('<circle');
    expect(svg).toContain('2.0 m');
    expect(svg).toContain('<path');
    expect(svg).toContain('Office Sensor');
    expect(svg).toContain('T1');
    expect(svg).toContain('presence-target');
  });

  it('renders multi-sensor radar surface with multiple FOVs and names', () => {
    const multiConfig: PresenceMapCardConfig = {
      ...radarConfig,
      sensors: [
        ...radarConfig.sensors!,
        {
          id: 's2',
          name: 'Hallway Sensor',
          targets_entity: 'sensor.hallway_targets',
          color: '#4caf50',
          fov: 360, // 360 deg sensor has no sector arc
          position: { x: 2, y: 1 },
          rotation: 90,
        },
      ],
    };

    const svg = renderSvg({
      config: multiConfig,
      targets: sampleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: true,
    });

    expect(svg).toContain('Office Sensor');
    expect(svg).toContain('Hallway Sensor');
  });

  it('renders floor-plan view with background image layer and correct aspect ratio', () => {
    const fpConfig: PresenceMapCardConfig = {
      ...radarConfig,
      floorplan: {
        image: '/local/ground_floor.png',
        width_meters: 10,
        height_meters: 8,
      },
    };

    const svg = renderSvg({
      config: fpConfig,
      targets: sampleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: true,
    });

    expect(svg).toContain('<image href="/local/ground_floor.png"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it('renders movement trails when present', () => {
    const trails = new Map<string, TrailPoint[]>([
      [
        's1:1',
        [
          { worldX: 0.0, worldY: 1.0, timestamp: 1000 },
          { worldX: 0.2, worldY: 1.5, timestamp: 2000 },
          { worldX: 0.5, worldY: 2.0, timestamp: 3000 },
        ],
      ],
    ]);

    const svg = renderSvg({
      config: radarConfig,
      targets: sampleTargets,
      trails,
      boundaries: new Map(),
      isDark: false,
    });

    expect(svg).toContain('<line');
    expect(svg).toContain('stroke-opacity');
  });

  it('renders detection boundaries when configured', () => {
    const boundaries = new Map<string, DetectionBoundary>([
      [
        's1',
        {
          minX: -100,
          maxX: 100,
          minY: 50,
          maxY: 300,
        },
      ],
    ]);

    const svg = renderSvg({
      config: radarConfig,
      targets: sampleTargets,
      trails: new Map(),
      boundaries,
      isDark: true,
    });

    expect(svg).toContain('<polygon');
    expect(svg).toContain('stroke-dasharray="4 3"');
  });

  it('renders receding Doppler arrow and stale target styling', () => {
    const recedingAndStaleTargets: Target[] = [
      {
        scopedId: 's1:1',
        sensorId: 's1',
        sensorColor: '#03a9f4',
        rawTargetId: 1,
        x: 0,
        y: 1.5,
        worldX: 0,
        worldY: 1.5,
        dop: -50, // receding
        timestamp: Date.now(),
        isStale: false,
      },
      {
        scopedId: 's1:2',
        sensorId: 's1',
        sensorColor: '#03a9f4',
        rawTargetId: 2,
        x: 1,
        y: 2,
        worldX: 1,
        worldY: 2,
        timestamp: Date.now() - 20000,
        isStale: true, // stale
      },
    ];

    const svg = renderSvg({
      config: radarConfig,
      targets: recedingAndStaleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: false,
    });

    expect(svg).toContain('presence-target');
    expect(svg).toContain('T1');
    expect(svg).toContain('T2');
    expect(svg).toContain('1 active target');
  });

  it('supports hiding rings, labels, boundaries, and trails', () => {
    const cleanConfig: PresenceMapCardConfig = {
      ...radarConfig,
      show_rings: false,
      show_labels: false,
      show_boundaries: false,
      show_trails: false,
    };

    const svg = renderSvg({
      config: cleanConfig,
      targets: sampleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: false,
    });

    expect(svg).not.toContain('2.0 m');
    expect(svg).not.toContain('Office Sensor');
    expect(svg).not.toContain('T1');
  });

  it('renders clearly labeled demo mode badge when demoMode is active', () => {
    const svg = renderSvg({
      config: { ...radarConfig, demo_mode: true },
      targets: sampleTargets,
      trails: new Map(),
      boundaries: new Map(),
      isDark: false,
      demoMode: true,
    });

    expect(svg).toContain('DEMO (Simulated Data)');
  });

  it('renders coordinate labels and imperial feet/inches distance rings', () => {
    const imperialConfig: PresenceMapCardConfig = {
      ...radarConfig,
      display_units: 'imperial',
      show_coordinates: true,
    };

    const targetWithZ: Target = {
      scopedId: 's1:1',
      sensorId: 's1',
      sensorColor: '#03a9f4',
      rawTargetId: 1,
      sourceX: -85,
      sourceY: 102,
      sourceZ: -6,
      x: -0.85,
      y: 1.02,
      z: -0.06,
      worldX: -0.85,
      worldY: 1.02,
      timestamp: Date.now(),
      isStale: false,
      boundaryStatus: 'unverified',
    };

    const targetWithoutZ: Target = {
      scopedId: 's1:2',
      sensorId: 's1',
      sensorColor: '#03a9f4',
      rawTargetId: 2,
      sourceX: 50,
      sourceY: 150,
      x: 0.5,
      y: 1.5,
      worldX: 0.5,
      worldY: 1.5,
      timestamp: Date.now(),
      isStale: true,
      ageSeconds: 14,
      boundaryStatus: 'inside',
    };

    const svg = renderSvg({
      config: imperialConfig,
      targets: [targetWithZ, targetWithoutZ],
      trails: new Map(),
      boundaries: new Map(),
      isDark: true,
    });

    // Imperial distance rings formatting (feet & inches)
    expect(svg).toContain('6\' 7"');
    // Coordinates display
    expect(svg).toContain('x:-85 y:102 z:-6');
    expect(svg).toContain('x:50 y:150');
    // Stale age badge
    expect(svg).toContain('(stale 14s)');
    // Unverified boundary status stroke-dasharray
    expect(svg).toContain('stroke-dasharray="3 2"');
  });
});
