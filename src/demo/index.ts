import { Target } from '../types';

export interface DemoState {
  t: number;
}

export function createDemoTargets(now: number, stepIndex: number = 0): Target[] {
  // Simulate 2 sensors with moving targets
  const t = now / 1000 + stepIndex * 0.5;

  // Sensor 1: Living room (origin 0,0), target walking back and forth
  const s1x = 1.2 * Math.sin(t * 0.8);
  const s1y = 2.0 + 1.0 * Math.cos(t * 0.5);
  const dop1 = Math.round(-Math.sin(t * 0.5) * 80);

  // Sensor 2: Hallway / Kitchen (positioned at 2.5, 1.5, rotated 90 deg)
  const s2x = 0.8 * Math.cos(t * 0.6);
  const s2y = 1.8 + 0.8 * Math.sin(t * 0.4);
  const dop2 = Math.round(Math.cos(t * 0.4) * 60);

  const targets: Target[] = [
    {
      scopedId: 'demo_sensor_1:1',
      sensorId: 'demo_sensor_1',
      sensorColor: '#0284c7',
      rawTargetId: 1,
      sourceX: Math.round(s1x * 100),
      sourceY: Math.round(s1y * 100),
      x: s1x,
      y: s1y,
      worldX: s1x,
      worldY: s1y,
      dop: dop1,
      timestamp: now,
      isStale: false,
      boundaryStatus: 'inside',
    },
    {
      scopedId: 'demo_sensor_2:1',
      sensorId: 'demo_sensor_2',
      sensorColor: '#10b981',
      rawTargetId: 1,
      sourceX: Math.round(s2x * 100),
      sourceY: Math.round(s2y * 100),
      x: s2x,
      y: s2y,
      // Transformed by sensor 2 placement (x: 2.5, y: 1.5, rot: 90)
      worldX: 2.5 + s2y,
      worldY: 1.5 - s2x,
      dop: dop2,
      timestamp: now,
      isStale: false,
      boundaryStatus: 'inside',
    },
  ];

  return targets;
}
