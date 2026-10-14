# PresenceMap Architecture

`presence-map-card` is designed as a modular, framework-independent custom element for Home Assistant. It processes live coordinate detections from one or more presence sensors (such as Inovelli Blue mmWave switches or LD2410 devices) and renders them onto an interactive radar display or scaled floor plan.

```
                           +------------------------+
                           |  Home Assistant (hass) |
                           +-----------+------------+
                                       |
                                       v
                    +------------------------------------+
                    |        presence-map-card           |
                    |  (CustomElement, Shadow DOM, SVG)  |
                    +-----------------+------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+        +-------------------+        +--------------------+
| Inovelli / HA    |        | Freshness & Trail |        | Coordinate Engine  |
| Source Adapters  |        | Manager           |        | & Unit Conversion  |
+------------------+        +-------------------+        +--------------------+
         |                            |                            |
         +----------------------------+----------------------------+
                                      |
                                      v
                         +-------------------------+
                         |      SVG Renderer       |
                         | - Range Rings / Radar   |
                         | - Floor-Plan Alignment  |
                         | - Detection Boundaries  |
                         | - Active Targets/Trails |
                         +-------------------------+
```

## Module Breakdown

### 1. Configuration & Validation (`src/config.ts`, `src/types.ts`)

- Validates user-provided Lovelace YAML configuration against expected schemas.
- Sets sensible defaults for display units (`metric` vs `imperial`), theme (`auto`, `light`, `dark`), radar range, and sensor geometry.
- Produces safe fallback states when optional properties are omitted.

### 2. Data-Source Adapters (`src/adapters/`)

- Isolates device-specific parsing from rendering logic.
- `InovelliZhaAdapter`:
  - Parses `targets` attributes (e.g. `[{"x": -85, "y": 102, "z": -6, "dop": 100, "target_id": 1}]`).
  - Converts sensor native units (`cm`) into world coordinates.
  - Checks state of optional occupancy binary sensors (`binary_sensor.*`) and reporting switch toggles (`switch.*`).
  - Clears detections when occupancy is `off` or reporting switch is disabled.
  - Extracts boundary numbers from linked entities (`number.*`) or configured static values.
  - Gracefully handles missing, empty, or malformed attributes.

### 3. Coordinate Transformation Engine (`src/coords/`)

- Mathematical transforms from sensor-relative coordinates to world/floorplan canvas space:
  1. **Mirroring**: Handles X and Y axis flipping for inverted or wall-mounted sensor orientations.
  2. **Rotation**: Applies 2D planar rotation matrix around sensor pivot:
     $$x' = x \cos(\theta) - y \sin(\theta)$$
     $$y' = x \sin(\theta) + y \cos(\theta)$$
  3. **Translation**: Offsets transformed coordinates by sensor origin $(x_0, y_0)$.
  4. **Scaling & Aspect Ratio**: Fits floorplan or radar grid to card dimensions while preserving true aspect ratios.
- Converts between metric (centimeters, meters) and imperial (inches, feet).

### 4. Freshness & Trail Management (`src/freshness/`)

- Scopes target identities by sensor (`${sensorId}:${targetId}`) to prevent cross-device target collisions.
- Evaluates target timestamps against a configurable staleness timeout.
- Records bounded breadcrumb trails with timestamped coordinates.
- Periodically prunes expired trails and stale targets using a memory-safe ticker that cleans up on DOM disconnect.

### 5. SVG Renderer (`src/rendering/`)

- Pure, declarative SVG rendering with responsive `viewBox` coordinates:
  - Concentric radar distance rings with unit labels.
  - Optional floor-plan background image with aspect ratio preservation.
  - Illustrated field-of-view (FOV) coverage cones.
  - Configured detection boundary boxes/zones.
  - Live targets with speed/direction Doppler indicators.
  - Fading historical movement trails.

### 6. Visual Editor (`src/editor/`)

- Custom element `presence-map-editor` providing full multi-sensor configuration in Lovelace.
- **Expandable Organization**: Global settings partitioned into collapsible accordion sections collapsed by default (General, Radar Display, Targets & Trails, Floor Plan, Sensors, and Advanced).
- **Full Sensor List Editing**: Dynamic management of the `sensors` array supporting Add, Duplicate, Remove, and Move Up/Down reordering with list boundary controls and stable unique sensor identity tracking (`id`).
- **Trail Controls**: Direct configuration of `trail_history_seconds` and `trail_max_points` (per-target point cap) with default and unset behavior.
- **Color Controls**: Composite color control combining a native color picker, curated preset palette, and custom text input supporting hex, rgb, hsl, or CSS color names with validation and preservation of unrepresentable values.
- **Unit-Aware Measurement Inputs**: Real-time dual feet/inches inputs with sign selector for sensor coordinates, floor-plan dimensions, and radar range when `display_units: imperial` is active; stored continuously in standard YAML meters with zero conversion drift across unit switches.
- **Live Diagnostics & Resolution Status**: Read-only sensor setup feedback diagnosing entity availability, reporting switch state, occupancy state, and room clear states; boundary resolution table detailing explicit vs prefix fallback, values, units, and complete X/Y boundary readiness.
- **Informed Targets & Trail Selectors**: Dynamic attribute inspection of the selected targets entity with real-time format validation feedback (compatible data, empty room, unsupported format, or unavailable) for both targets and trail coordinates.
- **Placement Guidance**: Integrated orientation guidance derived directly from the mathematical coordinate transforms (radar center vs floor-plan top-left origins, sensor position vs relative target coordinates, clockwise rotation, and illustrative FOV cone).
- **Reliability & State Preservation**: Preserves unexposed configuration fields, unsets cleared optional overrides, preserves numeric zero coordinates, and maintains input focus, caret position, and accordion states across configuration echoes and state updates.
- Fires standard `config-changed` custom events on edit.
