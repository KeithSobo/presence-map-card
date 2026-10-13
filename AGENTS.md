# Development and Maintenance Rules (AGENTS.md)

This document establishes the architectural principles, development conventions, testing standards, and maintenance rules for the **PresenceMap** custom Home Assistant card.

## Project Identity & Scope

- **Repository**: `https://github.com/KeithSobo/presence-map-card`
- **Custom Card Element**: `presence-map-card` (configured in Lovelace as `type: custom:presence-map-card`)
- **Display Name**: `PresenceMap`
- **Purpose**: Render real-time multi-sensor mmWave presence radar and floor-plan visualizations with live targets, bounded trails, detection boundaries, and sensor calibrations.
- **Independence**: This project is independent of Pillar and Foundry. Do not pull in Foundry or Pillar branding, URLs, or external dependencies without explicit requirement.

---

## Architecture & Code Organization

All source code lives in `src/` organized into decoupled, single-responsibility modules:

1. `src/types.ts`
   - Strict TypeScript interfaces for card configuration, sensor specs, Home Assistant entity states, parsed targets, trails, coordinate transforms, and themes.
2. `src/config.ts`
   - Configuration schema validation, defaults normalization, and stub config generation.
3. `src/adapters/`
   - Data-source parsing and state extraction.
   - Initial adapter: `InovelliZhaAdapter` handling Inovelli Blue mmWave quirks, target arrays, occupancy clearing, reporting switches, and boundary prefixes.
   - Device-specific parsing is kept strictly isolated from rendering.
4. `src/coords/`
   - Mathematical coordinate transformations (translation, rotation, mirroring, scale factor conversion, and unit conversions between mm, cm, m, in, ft).
5. `src/freshness/`
   - Target identity scoping (`${sensorId}:${targetId}`), timestamp freshness validation, stale target timeout expiration, bounded history trails, and memory leak prevention.
6. `src/rendering/`
   - Crisp SVG rendering pipeline: radar range rings, field of view (FOV) coverage cones, detection boundary boxes/zones, floor-plan background scaling and aspect ratio preservation, live target dots with doppler indicators, and faded historical trails.
7. `src/editor/`
   - Visual configuration editor (`presence-map-editor.ts`) implementing Home Assistant standard `ha-form` schema and event emission.
8. `src/demo/`
   - High-fidelity simulated radar targets and multi-sensor demo scenarios for local testing and visual verification.
9. `src/presence-map-card.ts`
   - Web component registration (`customElements.define('presence-map-card', PresenceMapCard)`), Lovelace card lifecycle hooks (`setConfig`, `hass`, `getCardSize`, `getConfigElement`, `getStubConfig`), custom card picker registration (`window.customCards`), responsive ResizeObserver, and interval timer cleanup.

---

## Core Operational Rules

1. **Strict TypeScript & Zero Build Warnings**:
   - `tsconfig.json` enforces `strict: true` with strict null checks, no implicit any, and no unused parameters.
   - Always run `npm run typecheck`, `npm run lint`, and `npm run format` before committing.
2. **Device Isolation & Multi-Sensor Scoping**:
   - Target IDs must be scoped by sensor (`${sensorId}:${targetId}`). Never cross-link or de-duplicate targets across sensors, as different sensors operate independently.
   - Units from source data must be explicit (e.g. `cm` for Inovelli mmWave targets).
3. **Target Freshness & Staleness Guarantees**:
   - If an occupancy sensor transitions to `off`, active targets for that sensor must immediately be marked cleared/stale.
   - Never present stale target coordinates as live detections.
   - Active timer intervals must periodically prune expired targets even when Home Assistant entities stop emitting state changes.
4. **Lifecycle & Resource Cleanup**:
   - In `disconnectedCallback()`, all timers (`setInterval`, `setTimeout`), event listeners, and `ResizeObserver` instances must be cleaned up to avoid memory leaks.
5. **Testing & Coverage Gate**:
   - The test suite uses Vitest with `happy-dom`.
   - Maintain a minimum of **80% coverage** across statements, branches, functions, and lines in handwritten logic.
   - Tests must be behavioral and cover real edge cases (unavailable entities, malformed target JSON, overlapping sensors, boundary transforms, coordinate math, stale data transitions, trail bounds, and editor round-tripping).
6. **Licensing**:
   - The project license choice must be confirmed by Keith Sobo and Daryl Prischak before tagging a public production release.
