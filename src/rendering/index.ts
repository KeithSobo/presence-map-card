import {
  PresenceMapCardConfig,
  Target,
  TrailPoint,
  DisplayUnits,
  DetectionBoundary,
} from '../types';
import { formatDistance, transformBoundaryBox } from '../coords';

export interface RenderContext {
  config: PresenceMapCardConfig;
  targets: Target[];
  trails: Map<string, TrailPoint[]>;
  boundaries: Map<string, DetectionBoundary>;
  isDark: boolean;
  demoMode?: boolean;
}

export function renderSvg(ctx: RenderContext): string {
  const { config, targets, trails, boundaries, isDark, demoMode } = ctx;
  const isFloorplan = Boolean(config.floorplan?.image);
  const units: DisplayUnits = config.display_units || 'metric';

  const width = 800;
  const height = isFloorplan ? 600 : 700;

  // Theme-aware color variables
  const bgColor = isDark ? '#1a1c1e' : '#f8f9fa';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
  const textColor = isDark ? '#e0e0e0' : '#424242';
  const secondaryTextColor = isDark ? '#9e9e9e' : '#757575';
  const ringColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)';
  const boundaryBorderColor = '#ff5722';
  const boundaryFillColor = isDark ? 'rgba(255, 87, 34, 0.15)' : 'rgba(255, 87, 34, 0.1)';

  // Scale and projection setup
  let projectX: (worldX: number) => number;
  let projectY: (worldY: number) => number;
  let scalePxPerMeter: number;
  let originX = width / 2;
  let originY = height / 2;

  if (isFloorplan && config.floorplan) {
    const fpW = config.floorplan.width_meters || 10;
    const fpH = config.floorplan.height_meters || 8;
    const scaleX = width / fpW;
    const scaleY = height / fpH;
    scalePxPerMeter = Math.min(scaleX, scaleY);

    projectX = (wx: number) => wx * scaleX;
    projectY = (wy: number) => wy * scaleY;
  } else {
    // Radar mode centered
    const maxRange = config.range_meters || 6;
    // Position radar origin toward center-bottom for standard 120-deg forward sensors, or center
    const hasSingleForwardSensor =
      config.sensors?.length === 1 && (config.sensors[0].fov || 120) <= 180;
    originX = width / 2;
    originY = hasSingleForwardSensor ? height * 0.85 : height / 2;

    const availableRadius = hasSingleForwardSensor
      ? Math.min(width / 2.2, height * 0.75)
      : Math.min(width, height) / 2.2;

    scalePxPerMeter = availableRadius / maxRange;

    projectX = (wx: number) => originX + wx * scalePxPerMeter;
    projectY = (wy: number) => originY - wy * scalePxPerMeter;
  }

  const svgParts: string[] = [];

  // SVG Header & definitions
  svgParts.push(`
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="presence-map-svg" width="100%" height="100%">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="2 2" />
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${bgColor}" rx="8" />
  `);

  // Floor-plan image layer
  if (isFloorplan && config.floorplan?.image) {
    svgParts.push(`
      <image href="${config.floorplan.image}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" opacity="${isDark ? '0.75' : '0.85'}" />
    `);
  } else {
    // Subtle grid background for radar mode
    svgParts.push(`
      <rect width="${width}" height="${height}" fill="url(#radarGrid)" opacity="0.6" />
    `);
  }

  // Range rings (in radar mode or optional in floorplan mode)
  if (config.show_rings !== false && !isFloorplan) {
    const range = config.range_meters || 6;
    const ringStep = range <= 4 ? 1 : range <= 8 ? 2 : 3;

    // Center crosshairs
    svgParts.push(`
      <line x1="${originX - 15}" y1="${originY}" x2="${originX + 15}" y2="${originY}" stroke="${secondaryTextColor}" stroke-width="1.5" />
      <line x1="${originX}" y1="${originY - 15}" x2="${originX}" y2="${originY + 15}" stroke="${secondaryTextColor}" stroke-width="1.5" />
    `);

    for (let r = ringStep; r <= range; r += ringStep) {
      const radiusPx = r * scalePxPerMeter;
      const labelText = formatDistance(r, units);

      svgParts.push(`
        <circle cx="${originX}" cy="${originY}" r="${radiusPx}" fill="none" stroke="${ringColor}" stroke-width="1" stroke-dasharray="4 4" />
        <text x="${originX + 6}" y="${originY - radiusPx + 14}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, sans-serif" font-weight="500">${labelText}</text>
      `);
    }
  }

  // Sensor FOV Cones and Markers
  const sensors = config.sensors || [];
  sensors.forEach(sensor => {
    const sensorColor = sensor.color || '#03a9f4';
    const sPosX = isFloorplan ? (sensor.position?.x ?? 0) : 0;
    const sPosY = isFloorplan ? (sensor.position?.y ?? 0) : 0;
    const px = projectX(sPosX);
    const py = projectY(sPosY);

    const fov = sensor.fov || 120;
    const sensorRange = sensor.max_distance || config.range_meters || 6;
    const radiusPx = sensorRange * scalePxPerMeter;
    const rotDeg = sensor.rotation || 0;

    // FOV cone sector path
    if (fov < 360 && radiusPx > 0) {
      const halfFov = fov / 2;
      // In SVG canvas, angle 0 is facing up (negative Y in radar mode, or negative Y in floorplan)
      const startAngleDeg = rotDeg - halfFov;
      const endAngleDeg = rotDeg + halfFov;

      const toCanvasRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
      const x1 = px + radiusPx * Math.cos(toCanvasRad(startAngleDeg));
      const y1 = py + radiusPx * Math.sin(toCanvasRad(startAngleDeg));
      const x2 = px + radiusPx * Math.cos(toCanvasRad(endAngleDeg));
      const y2 = py + radiusPx * Math.sin(toCanvasRad(endAngleDeg));
      const largeArc = fov > 180 ? 1 : 0;

      svgParts.push(`
        <path d="M ${px} ${py} L ${x1} ${y1} A ${radiusPx} ${radiusPx} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${sensorColor}" fill-opacity="${isDark ? '0.08' : '0.05'}"
              stroke="${sensorColor}" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="2 2" />
      `);
    }

    // Sensor Marker icon (triangle pointing in rotation direction)
    const markerAngleRad = ((rotDeg - 90) * Math.PI) / 180;
    const markerSize = 10;
    const tipX = px + markerSize * 1.4 * Math.cos(markerAngleRad);
    const tipY = py + markerSize * 1.4 * Math.sin(markerAngleRad);
    const leftX = px + markerSize * Math.cos(markerAngleRad + 2.3);
    const leftY = py + markerSize * Math.sin(markerAngleRad + 2.3);
    const rightX = px + markerSize * Math.cos(markerAngleRad - 2.3);
    const rightY = py + markerSize * Math.sin(markerAngleRad - 2.3);

    svgParts.push(`
      <polygon points="${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}" fill="${sensorColor}" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="${px}" cy="${py}" r="3" fill="#ffffff" />
    `);

    if (config.show_labels !== false && sensor.name) {
      svgParts.push(`
        <text x="${px}" y="${py + 18}" text-anchor="middle" fill="${secondaryTextColor}" font-size="10" font-family="system-ui, sans-serif" font-weight="600">${sensor.name}</text>
      `);
    }

    // Render Detection Boundaries if configured and enabled
    if (config.show_boundaries !== false) {
      const boundary = boundaries.get(sensor.id);
      if (boundary) {
        const corners = transformBoundaryBox(boundary, {
          position: sensor.position,
          rotation: sensor.rotation,
          mirrorX: sensor.mirror_x,
          mirrorY: sensor.mirror_y,
          sourceUnits: sensor.source_units,
        });

        const pointsAttr = corners.map(pt => `${projectX(pt.x)},${projectY(pt.y)}`).join(' ');
        svgParts.push(`
          <polygon points="${pointsAttr}" fill="${boundaryFillColor}" stroke="${boundaryBorderColor}" stroke-width="1.5" stroke-dasharray="4 3" />
        `);
      }
    }
  });

  // Trails Layer
  if (config.show_trails !== false) {
    for (const [scopedId, trailList] of trails.entries()) {
      if (trailList.length < 2) continue;

      const target = targets.find(t => t.scopedId === scopedId);
      const color = target ? target.sensorColor : '#03a9f4';

      for (let i = 0; i < trailList.length - 1; i++) {
        const p1 = trailList[i];
        const p2 = trailList[i + 1];
        const progress = (i + 1) / trailList.length;
        const opacity = (progress * 0.6).toFixed(2);
        const strokeWidth = (progress * 3 + 1).toFixed(1);

        svgParts.push(`
          <line x1="${projectX(p1.worldX)}" y1="${projectY(p1.worldY)}"
                x2="${projectX(p2.worldX)}" y2="${projectY(p2.worldY)}"
                stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" stroke-linecap="round" />
        `);
      }
    }
  }

  // Active Targets Layer
  for (const target of targets) {
    const tx = projectX(target.worldX);
    const ty = projectY(target.worldY);
    const color = target.sensorColor || '#03a9f4';
    const isStale = target.isStale;

    const fillOpacity = isStale ? '0.35' : '0.9';
    const strokeColor = isStale ? secondaryTextColor : '#ffffff';

    svgParts.push(`
      <g class="presence-target" data-target-id="${target.scopedId}">
        <!-- Pulse ring for active targets -->
        ${
          !isStale
            ? `<circle cx="${tx}" cy="${ty}" r="15" fill="${color}" fill-opacity="0.25" filter="url(#glow)">
                 <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                 <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
               </circle>`
            : ''
        }

        <!-- Center Target Dot -->
        <circle cx="${tx}" cy="${ty}" r="7" fill="${color}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="2" />
    `);

    // Doppler indicator arrow (if dop available and moving)
    if (target.dop !== undefined && Math.abs(target.dop) > 5 && !isStale) {
      const isApproaching = target.dop > 0;
      const arrowLength = 12;
      // Direction toward or away from sensor
      const arrowDy = isApproaching ? arrowLength : -arrowLength;
      svgParts.push(`
        <path d="M ${tx} ${ty - arrowDy} L ${tx - 4} ${ty - arrowDy + (isApproaching ? -4 : 4)} M ${tx} ${ty - arrowDy} L ${tx + 4} ${ty - arrowDy + (isApproaching ? -4 : 4)}"
              stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      `);
    }

    // Target Label (e.g. "T1")
    if (config.show_labels !== false) {
      const labelText = `T${target.rawTargetId}`;
      svgParts.push(`
        <rect x="${tx + 9}" y="${ty - 16}" width="${labelText.length * 8 + 6}" height="14" rx="3" fill="${isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)'}" />
        <text x="${tx + 12}" y="${ty - 5}" fill="${textColor}" font-size="10" font-family="system-ui, sans-serif" font-weight="700">${labelText}</text>
      `);
    }

    svgParts.push(`</g>`);
  }

  // Demo Mode Badge
  if (demoMode) {
    svgParts.push(`
      <g class="demo-badge">
        <rect x="${width - 190}" y="12" width="178" height="26" rx="13" fill="#ff9800" fill-opacity="0.9" />
        <text x="${width - 101}" y="29" text-anchor="middle" fill="#ffffff" font-size="11" font-family="system-ui, sans-serif" font-weight="bold">
          DEMO (Simulated Data)
        </text>
      </g>
    `);
  }

  // Active target count footer
  const activeCount = targets.filter(t => !t.isStale).length;
  svgParts.push(`
    <g class="status-footer">
      <text x="14" y="${height - 12}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, sans-serif">
        ${activeCount} active target${activeCount === 1 ? '' : 's'}
      </text>
    </g>
  `);

  svgParts.push(`</svg>`);

  return svgParts.join('');
}
