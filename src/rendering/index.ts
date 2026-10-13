import {
  PresenceMapCardConfig,
  Target,
  TrailPoint,
  DisplayUnits,
  DetectionBoundary,
} from '../types';
import { formatDistance, transformBoundaryBox, isValidBoundary } from '../coords';

export interface RenderContext {
  config: PresenceMapCardConfig;
  targets: Target[];
  trails: Map<string, TrailPoint[]>;
  sourceTrails?: Map<string, TrailPoint[]>;
  boundaries: Map<string, DetectionBoundary>;
  isDark: boolean;
  demoMode?: boolean;
  occupancyStatus?: import('../types').OccupancyStatus;
  reportingStatus?: import('../types').ReportingStatus;
  isSourceAvailable?: boolean;
}

export function formatAgeString(ageSeconds?: number): string {
  if (ageSeconds === undefined || ageSeconds < 0) return '';
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export function renderSvg(ctx: RenderContext): string {
  const { config, targets, trails, boundaries, isDark, demoMode } = ctx;
  const isFloorplan = Boolean(config.floorplan?.image);
  const units: DisplayUnits = config.display_units || 'metric';

  const width = 800;
  const height = isFloorplan ? 600 : 700;

  // Theme-aware, high-contrast, fully valid CSS colors
  const bgColor = isDark ? '#111827' : '#f8fafc';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const secondaryTextColor = isDark ? '#94a3b8' : '#475569';
  const ringColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)';
  const boundaryBorderColor = '#0284c7';
  const boundaryFillColor = isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)';

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
    // Grid background for radar mode
    svgParts.push(`
      <rect width="${width}" height="${height}" fill="url(#radarGrid)" opacity="0.6" />
    `);
  }

  // Range rings (in radar mode)
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
        <text x="${originX + 6}" y="${originY - radiusPx + 14}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, -apple-system, sans-serif" font-weight="600">${labelText}</text>
      `);
    }
  }

  // Sensor FOV Cones, Position Markers, and Boundaries
  const sensors = config.sensors || [];
  sensors.forEach(sensor => {
    const sensorColor = sensor.color || '#0284c7';
    const sPosX = isFloorplan ? (sensor.position?.x ?? 0) : 0;
    const sPosY = isFloorplan ? (sensor.position?.y ?? 0) : 0;
    const px = projectX(sPosX);
    const py = projectY(sPosY);

    const fov = sensor.fov || 120;
    const sensorRange = sensor.max_distance || config.range_meters || 6;
    const radiusPx = sensorRange * scalePxPerMeter;
    const rotDeg = sensor.rotation || 0;

    // Illustrative FOV coverage cone (not an absolute limit)
    if (fov < 360 && radiusPx > 0) {
      const halfFov = fov / 2;
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
              fill="${sensorColor}" fill-opacity="${isDark ? '0.07' : '0.04'}"
              stroke="${sensorColor}" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="3 3" />
      `);
    }

    // Render Detection Boundaries if configured and enabled
    if (config.show_boundaries !== false) {
      const boundary = boundaries.get(sensor.id);
      if (boundary && isValidBoundary(boundary)) {
        const corners = transformBoundaryBox(boundary, {
          position: sensor.position,
          rotation: sensor.rotation,
          mirrorX: sensor.mirror_x,
          mirrorY: sensor.mirror_y,
          sourceUnits: sensor.source_units,
        });

        if (corners.length === 4) {
          const pointsAttr = corners.map(pt => `${projectX(pt.x)},${projectY(pt.y)}`).join(' ');
          svgParts.push(`
            <polygon points="${pointsAttr}" fill="${boundaryFillColor}" stroke="${boundaryBorderColor}" stroke-width="1.8" stroke-dasharray="4 3" />
            <text x="${projectX(corners[0].x) + 6}" y="${projectY(corners[0].y) - 6}" fill="${boundaryBorderColor}" font-size="10" font-family="system-ui, sans-serif" font-weight="600">Detection Zone</text>
          `);
        }
      }
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
  });

  // Trails Layer
  if (config.show_trails !== false) {
    // 1. Source-provided historical trail dots (faded by sequence order, untimestamped)
    if (ctx.sourceTrails) {
      for (const [sensorId, pointList] of ctx.sourceTrails.entries()) {
        const sensor = config.sensors?.find(s => s.id === sensorId);
        const color = sensor?.color || '#0284c7';
        const total = pointList.length;
        for (let i = 0; i < total; i++) {
          const pt = pointList[i];
          const progress = total > 1 ? (i + 1) / total : 1;
          const opacity = (0.15 + progress * 0.55).toFixed(2);
          const r = (2.2 + progress * 1.4).toFixed(1);
          svgParts.push(`
            <circle class="source-trail-dot" cx="${projectX(pt.worldX)}" cy="${projectY(pt.worldY)}" r="${r}" fill="${color}" fill-opacity="${opacity}" />
          `);
        }
      }
    }

    // 2. Frontend connected trails (only for sensors without source trails)
    for (const [scopedId, trailList] of trails.entries()) {
      if (trailList.length < 2) continue;
      const sensorId = scopedId.split(':')[0];
      if (ctx.sourceTrails && ctx.sourceTrails.has(sensorId)) {
        continue; // Source trail takes precedence for this sensor
      }

      const target = targets.find(t => t.scopedId === scopedId);
      const color = target ? target.sensorColor : '#0284c7';

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

  // Active, Stale, and Retained Last-Known Targets Layer
  for (const target of targets) {
    const tx = projectX(target.worldX);
    const ty = projectY(target.worldY);
    const isLastKnown = Boolean(target.isLastKnown);
    const isStale = Boolean(target.isStale || isLastKnown);
    const isLive = Boolean(target.isLive && !target.isStale && !isLastKnown);

    // Inside / Outside / Unverified boundary styling
    let dotFillColor = target.sensorColor || '#0284c7';
    let dotStrokeColor = '#ffffff';
    const strokeWidth = '2';
    let strokeDasharray = 'none';

    if (target.boundaryStatus === 'inside') {
      dotFillColor = '#10b981'; // Verified Inside: emerald green
    } else if (target.boundaryStatus === 'outside') {
      dotFillColor = '#f59e0b'; // Outside: amber warning
    } else if (target.boundaryStatus === 'unverified') {
      dotFillColor = target.sensorColor || '#0284c7';
      dotStrokeColor = '#f59e0b';
      strokeDasharray = '3 2';
    }

    if (isLastKnown) {
      // Retained last-known position: gray hollow marker
      dotFillColor = isDark ? 'rgba(75, 85, 99, 0.15)' : 'rgba(156, 163, 175, 0.15)';
      dotStrokeColor = isDark ? '#9ca3af' : '#64748b';
      strokeDasharray = '3 3';
    } else if (isStale) {
      dotFillColor = isDark ? '#4b5563' : '#9ca3af'; // Visibly stale muted color
      dotStrokeColor = isDark ? '#374151' : '#d1d5db';
      strokeDasharray = '2 2';
    }

    const fillOpacity = isLastKnown ? '0.35' : isStale ? '0.5' : '0.95';
    const targetClass = isLastKnown
      ? 'target-last-known target-stale'
      : isStale
        ? 'target-stale'
        : 'target-live';

    svgParts.push(`
      <g class="presence-target ${targetClass}" data-target-id="${target.scopedId}">
        <!-- Pulse ring for active fresh targets -->
        ${
          isLive
            ? `<circle cx="${tx}" cy="${ty}" r="15" fill="${dotFillColor}" fill-opacity="0.25" filter="url(#glow)">
                 <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                 <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
               </circle>`
            : ''
        }

        <!-- Center Target Dot / Marker -->
        <circle cx="${tx}" cy="${ty}" r="7" fill="${dotFillColor}" fill-opacity="${fillOpacity}" stroke="${dotStrokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" />
    `);

    // Doppler indicator chevron (if moving and live)
    if (target.dop !== undefined && Math.abs(target.dop) > 5 && isLive) {
      const isApproaching = target.dop > 0;
      const arrowLength = 12;
      const arrowDy = isApproaching ? arrowLength : -arrowLength;
      svgParts.push(`
        <path d="M ${tx} ${ty - arrowDy} L ${tx - 4} ${ty - arrowDy + (isApproaching ? -4 : 4)} M ${tx} ${ty - arrowDy} L ${tx + 4} ${ty - arrowDy + (isApproaching ? -4 : 4)}"
              stroke="${dotStrokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      `);
    }

    // Target Labels
    if (config.show_labels !== false) {
      let mainLabel = `T${target.rawTargetId}`;
      const ageStr = formatAgeString(target.ageSeconds);
      if (isLastKnown && ageStr) {
        mainLabel += ` (${ageStr})`;
      } else if (isStale && ageStr) {
        mainLabel += ` (stale ${ageStr})`;
      }

      const labelBadgeBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
      const labelBadgeText = textColor;
      const labelBadgeWidth = mainLabel.length * 7 + 10;

      svgParts.push(`
        <rect x="${tx + 9}" y="${ty - 16}" width="${labelBadgeWidth}" height="14" rx="3" fill="${labelBadgeBg}" stroke="${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}" stroke-width="0.5" />
        <text x="${tx + 13}" y="${ty - 5}" fill="${labelBadgeText}" font-size="9" font-family="system-ui, sans-serif" font-weight="700">${mainLabel}</text>
      `);

      // Optional coordinates display (source coordinates e.g. cm)
      if (config.show_coordinates) {
        let coordText = `x:${Math.round(target.sourceX)} y:${Math.round(target.sourceY)}`;
        if (target.sourceZ !== undefined) {
          coordText += ` z:${Math.round(target.sourceZ)}`;
        }
        const coordWidth = coordText.length * 6 + 8;
        svgParts.push(`
          <rect x="${tx + 9}" y="${ty + 1}" width="${coordWidth}" height="12" rx="2" fill="${labelBadgeBg}" />
          <text x="${tx + 13}" y="${ty + 10}" fill="${secondaryTextColor}" font-size="8" font-family="monospace">${coordText}</text>
        `);
      }
    }

    svgParts.push(`</g>`);
  }

  // Demo Mode Badge
  if (demoMode) {
    svgParts.push(`
      <g class="demo-badge">
        <rect x="${width - 190}" y="12" width="178" height="26" rx="13" fill="#f59e0b" fill-opacity="0.9" />
        <text x="${width - 101}" y="29" text-anchor="middle" fill="#ffffff" font-size="11" font-family="system-ui, sans-serif" font-weight="bold">
          DEMO (Simulated Data)
        </text>
      </g>
    `);
  }

  // Meaningful Status Display
  const liveCount = targets.filter(t => t.isLive !== false && !t.isStale && !t.isLastKnown).length;
  let statusText: string;

  if (ctx.isSourceAvailable === false) {
    statusText = 'SOURCE UNAVAILABLE — Waiting for entity';
  } else if (ctx.reportingStatus === 'disabled') {
    statusText =
      targets.length > 0
        ? 'REPORTING DISABLED — showing last reported positions'
        : 'REPORTING DISABLED';
  } else if (ctx.occupancyStatus === 'clear') {
    statusText =
      targets.length > 0 ? 'OCCUPANCY CLEAR — showing last reported positions' : 'OCCUPANCY CLEAR';
  } else if (liveCount > 0) {
    statusText = `LIVE — ${liveCount} active target${liveCount === 1 ? '' : 's'}`;
    const retainedCount = targets.length - liveCount;
    if (retainedCount > 0) {
      statusText += ` (${retainedCount} last known)`;
    }
  } else if (targets.length > 0) {
    const maxAge = targets.reduce(
      (max, t) => (t.ageSeconds !== undefined && t.ageSeconds > max ? t.ageSeconds : max),
      0
    );
    const ageStr = formatAgeString(maxAge);
    statusText = ageStr
      ? `NO RECENT DATA — last report ${ageStr} ago`
      : 'NO RECENT DATA — showing last reported positions';
  } else {
    statusText = 'WAITING FOR TARGET DATA';
  }

  svgParts.push(`
    <g class="status-footer">
      <text x="14" y="${height - 12}" fill="${secondaryTextColor}" font-size="11" font-family="system-ui, sans-serif">
        ${statusText}
      </text>
    </g>
  `);

  svgParts.push(`</svg>`);

  return svgParts.join('');
}
