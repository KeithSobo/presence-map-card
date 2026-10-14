# PresenceMap Card

[![CI](https://github.com/KeithSobo/presence-map-card/actions/workflows/ci.yml/badge.svg)](https://github.com/KeithSobo/presence-map-card/actions/workflows/ci.yml)
[![HACS](https://github.com/KeithSobo/presence-map-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/KeithSobo/presence-map-card/actions/workflows/hacs.yml)

A standalone Home Assistant custom card for visualizing real-time mmWave presence sensors, radar range rings, live target locations, movement trails, and floor-plan overlays.

Supports single or multiple presence sensors on a shared drawing surface.

---

## Features

- **Multi-Sensor Shared Canvas**: Plot one or multiple mmWave presence sensors on the same radar view or floor plan.
- **Independent Sensor Placement**: Each sensor supports custom Cartesian position (`x`, `y`), rotation angle, horizontal/vertical mirroring (`mirror_x`, `mirror_y`), field-of-view angle, and custom target colors.
- **Radar & Floor-Plan Views**: Switch between a clean polar/Cartesian radar view with distance rings or overlay directly onto a room/house floor-plan image.
- **Live Targets & Movement Trails**: Displays active tracked targets with Doppler direction indicators and fading historical trails.
- **Detection Boundaries**: Visualizes configured detection boundaries and zones (such as Inovelli Blue mmWave or LD2410 boundaries).
- **Staleness Management**: Automatically marks targets stale or removes them when reports cease or when linked occupancy sensors clear.
- **Units & Themes**: Supports Metric (meters/centimeters) and Imperial (feet/inches) displays with automatic Home Assistant light/dark theme adaptation and manual theme overrides.
- **Visual Editor**: Integrated card configuration editor supporting Home Assistant UI forms.
- **Demo Mode**: Built-in simulated scenario mode for live testing without physical hardware.

---

## Installation

### Method 1: HACS (Custom Repository)

> [!NOTE]
> **Important Distinction**: HACS compatibility means this repository adheres to HACS packaging standards for distribution as a custom repository. It does **not** mean the card is pre-indexed in the default official HACS store. You must add it as a Custom Repository until submitted to the default store.

1. In Home Assistant, open **HACS** &rarr; **Frontend**.
2. Click the three dots menu (top right) and select **Custom repositories**.
3. In the **Repository** field, enter:
   ```
   https://github.com/KeithSobo/presence-map-card
   ```
4. In the **Category** dropdown, select **Dashboard** (or **Lovelace**).
5. Click **Add**, then find **PresenceMap** in the list and click **Download**.
6. Refresh your browser (or clear cache).

### Method 2: Manual Installation

1. Download `presence-map-card.js` from the [Releases](https://github.com/KeithSobo/presence-map-card/releases) page.
2. Copy `presence-map-card.js` into your Home Assistant directory under:
   ```
   /config/www/community/presence-map-card/presence-map-card.js
   ```
   _(Create the `community/presence-map-card` folder inside `/config/www/` if it does not already exist, matching the HACS directory structure)._
3. In Home Assistant, navigate to **Settings** &rarr; **Dashboards** &rarr; **Resources** (top right three dots).
4. Click **Add Resource**:
   - URL: `/local/community/presence-map-card/presence-map-card.js?v=2026.10.1.1`
   - Resource type: `JavaScript Module`
5. Refresh your browser (or hard-refresh cache).

---

## Sensor Requirements & Data Format

The card expects target data provided by an entity attribute (typically `targets`) formatted as an array of JSON objects.

### Known Working Sensor: Inovelli Blue mmWave Switch

When using an Inovelli Blue mmWave switch with ZHA (or Zigbee2MQTT) and a template sensor, the switch reports target locations relative to itself in centimeters:

```json
[{ "x": -85, "y": 102, "z": -6, "dop": 100, "target_id": 1 }]
```

- `x`: Horizontal distance in centimeters relative to switch (negative = left, positive = right).
- `y`: Distance perpendicular to switch face in centimeters (positive = forward).
- `z`: Vertical height offset (optional).
- `dop`: Doppler movement / speed indicator (positive = approaching, negative = moving away).
- `target_id`: Identifier assigned by the sensor chip.

### Supported Attributes & Entities

| Configuration Key   | Description                                          | Example                          |
| :------------------ | :--------------------------------------------------- | :------------------------------- |
| `targets_entity`    | Sensor with target coordinate attribute (Required)   | `sensor.garage_mmwave_targets`   |
| `targets_attribute` | Attribute key holding the array (Default: `targets`) | `targets`                        |
| `trail_attribute`   | Sensor attribute holding retained trail points       | `trail`                          |
| `occupancy_entity`  | Binary sensor indicating presence (Optional)         | `binary_sensor.garage_occupancy` |
| `reporting_entity`  | Switch or boolean controlling reporting (Optional)   | `switch.garage_mmwave_reporting` |
| `boundary_prefix`   | Entity prefix for detection zone numbers (Optional)  | `number.garage_lights_mmwave_`   |
| `show_last_known`   | Retain and display last-known coordinates when clear | `true` (Default: `true`)         |

---

## Configuration Examples

### Inovelli Blue ZHA Radar (Garage Example)

Complete configuration for an Inovelli Blue mmWave switch using ZHA:

- `occupancy_entity`: (`binary_sensor.garage_lights_occupancy`) indicates occupied vs clear. When clear (`off`), live target styling ends immediately and last-known positions are retained and displayed as hollow gray markers with original report age.
- `reporting_entity`: (`switch.garage_lights_mmwave_target_info_report`) indicates whether coordinate reporting is enabled on the mmWave switch.
- `trail_attribute`: (`trail`) reads source-provided retained trail coordinates from `sensor.mmwave_targets.attributes.trail` and displays them as sequence-faded dots even when occupancy is clear.
- `boundary_prefix`: (`number.garage_lights_mmwave_`) discovers and tracks all 6 Inovelli boundary slider entities (`width_minimum_left`, `width_maximum_right`, `depth_minimum_near`, `depth_maximum_far`, `height_minimum_floor`, `height_maximum_ceiling`).

```yaml
type: custom:presence-map-card
title: Garage Presence
display_units: imperial
theme: light
stale_timeout: 10
range_meters: 6
show_rings: true
show_trails: true
show_labels: true
show_boundaries: false
show_coordinates: true
show_last_known: true
demo_mode: false
sensors:
  - id: garage
    name: Garage
    targets_entity: sensor.mmwave_targets
    occupancy_entity: binary_sensor.garage_lights_occupancy
    reporting_entity: switch.garage_lights_mmwave_target_info_report
    boundary_prefix: number.garage_lights_mmwave_
    trail_attribute: trail
    source_units: cm
    color: '#0284C7'
    fov: 120
    position:
      x: 0
      y: 0
    rotation: 0
    mirror_x: false
    mirror_y: false
```

### Generic Single Sensor Radar View

```yaml
type: custom:presence-map-card
title: Office Radar
display_units: metric # or imperial
theme: auto
stale_timeout: 10
range_meters: 6
show_rings: true
show_trails: true
sensors:
  - id: office_desk
    name: Desk Sensor
    targets_entity: sensor.office_mmwave_targets
    occupancy_entity: binary_sensor.office_occupancy
    reporting_entity: switch.office_radar_reporting
    source_units: cm
    color: '#03a9f4'
    fov: 120
    position:
      x: 0
      y: 0
    rotation: 0
    mirror_x: false
    mirror_y: false
```

### Multi-Sensor Shared Floor Plan

```yaml
type: custom:presence-map-card
title: Ground Floor Presence
display_units: imperial
floorplan:
  image: /local/floorplans/main_floor.png
  width_meters: 12.0
  height_meters: 9.0
show_trails: true
trail_history_seconds: 15
stale_timeout: 8
sensors:
  - id: living_room
    name: Living Room Switch
    targets_entity: sensor.living_room_mmwave_targets
    occupancy_entity: binary_sensor.living_room_occupancy
    source_units: cm
    color: '#4caf50'
    position:
      x: 3.5
      y: 2.1
    rotation: 90
    mirror_x: false
    mirror_y: false

  - id: kitchen
    name: Kitchen Island Sensor
    targets_entity: sensor.kitchen_mmwave_targets
    occupancy_entity: binary_sensor.kitchen_occupancy
    source_units: cm
    color: '#ff9800'
    position:
      x: 8.2
      y: 5.4
    rotation: 180
    mirror_x: false
    mirror_y: false
```

---

## Visual Configuration Editor

The card includes an integrated visual configuration editor supporting comprehensive card-level and per-sensor customization without requiring direct YAML manipulation:

### 1. Collapsible Global Sections

- **General**: Title, display units (metric / imperial), and theme override (automatic, light, dark).
- **Radar Display**: Radar range radius (in meters or feet/inches based on display units), distance rings, target labels, and coordinate displays.
- **Targets & Trails**: Movement trail visibility, stale target expiration timeout, retention of last-known positions when clear, trail duration (`trail_history_seconds`), and maximum trail points per target (`trail_max_points`).
- **Floor Plan**: Floor-plan background image path/URL and world dimensions (width and height in meters or feet/inches based on display units).
- **Sensors**: Multi-sensor list editor and sensor creation toolbar.
- **Advanced**: Interactive demo mode simulator.

### 2. Multi-Sensor List Management

- **Individual Sensor Cards**: Every sensor in your configuration is represented in a dedicated expandable row displaying its name, configured color swatch, and targets entity summary.
- **Sensor Reordering & Lifecycle**: Move up, move down, duplicate, and remove controls with boundary disabling and stable, unique sensor identity tracking (`id`).
- **Subsections per Sensor**:
  - **Main**: Name, targets entity (with attribute selector), and optional occupancy binary sensor.
  - **Color**: Native color picker, quick-select preset palette, and custom text input supporting hex, rgb, hsl, or CSS color names with validation and preservation of unrepresentable values.
  - **Placement**: Cartesian mounting coordinates $(X, Y)$ in metric meters or imperial feet/inches (with sign selector), rotation angle (0°–359° clockwise), horizontal/vertical mirroring, illustrative field-of-view cone angle, and placement guidance explanations.
  - **Boundaries**: Entity prefix discovery, explicit boundary entity overrides (`min_x`, `max_x`, `min_y`, `max_y`, `min_z`, `max_z`), and live resolution diagnostics status table with explicit vs prefix resolution badges, current values, units, and complete X/Y boundary availability.
  - **Advanced**: Sensor source length units (`mm`, `cm`, `m`, `in`, `ft`), optional target reporting switch detection, and targets attribute selector.
  - **Trail Source**: Informed history attribute selector.

### 3. Setup Feedback & Informed Attribute Selectors

- **Read-Only Setup Feedback**: Displays concise diagnostics inside each sensor's expanded settings based on current Home Assistant entity state (e.g. valid target detections, room clear with 0 targets, targets attribute missing/malformed, reporting switch off, or occupancy clear). An empty room is treated as a valid state rather than an error.
- **Targets Attribute Selector**: Located under each sensor's **Advanced** subsection. Defaults to "Default — targets" (which unsets `targets_attribute` for runtime fallback), discovers available attributes from the selected targets entity, supports custom attribute names, and provides real-time validation badges.
- **History Attribute Selector**: Located in each sensor's **Trail source** subsection. Inspects the attributes of the selected targets entity with real-time format validation feedback (compatible trail data, empty data, unsupported format, or unavailable) and fallback custom attribute name entry.
- **Unit-Aware Measurement Inputs**: When `display_units: imperial` is selected, radar range, floor-plan dimensions, and sensor position X/Y are presented in feet and inches (`[ ft ] ft  [ in ] in` with a `[ + / - ]` sign selector for sensor coordinates). Values are stored in standard meter YAML fields without rounding drift across unit toggles. Source units (`source_units`) remain strictly separate as they describe incoming device coordinates.

---

## Floor-Plan Calibration Guide

When overlaying presence targets onto a floor plan:

1. **Measure Real Room Dimensions**: Measure the real-world width and height of the area represented by your floor plan image in meters (or feet).
2. **Set Floor-Plan Canvas Size**: Enter `floorplan.width_meters` and `floorplan.height_meters`. The card preserves the natural aspect ratio of your image and scales coordinates to match.
3. **Calibrate Sensor Origin**: Set `position.x` and `position.y` to the sensor's mounting location in meters measured from the top-left corner $(0,0)$ of the floor plan.
4. **Calibrate Rotation**: mmWave sensors face outward from their mounting plate. Enter the rotation angle in degrees clockwise from facing upward (0° = facing top, 90° = facing right, 180° = facing down, 270° = facing left).
5. **Adjust Mirroring**: If left/right movement appears flipped due to inverted mounting, toggle `mirror_x: true`.

---

## Important Architectural Notes

### 1. Cross-Sensor Target Identity

Each mmWave sensor device assigns target IDs (`1`, `2`, `3`) locally on its own radar processor. Target identities are strictly scoped per sensor (`sensor_id:target_id`). The card **does not** attempt to fuse identities or de-duplicate targets across overlapping sensor zones, as local mmWave sensors cannot uniquely fingerprint individual people.

### 2. Zigbee Radio Traffic vs. Rendering Frequency

Target coordinate reports generate Zigbee mesh radio traffic when the sensor broadcasts updates. **Lowering the card's rendering frequency or closing the dashboard does NOT reduce Zigbee radio traffic**. Sensor reporting frequency is determined entirely by the device firmware and your Zigbee reporting configuration.

### 3. Home Assistant Recorder Database Impact

High-frequency mmWave coordinate updates can bloat your Home Assistant database if recorded continuously. You may optionally exclude your raw targets sensor from the recorder.

> [!WARNING]
> Do not replace your entire recorder configuration. Carefully merge recorder exclusions into your existing `configuration.yaml` without removing database URLs or retention settings:

```yaml
recorder:
  exclude:
    entities:
      - sensor.office_mmwave_targets
      - sensor.living_room_mmwave_targets
```

---

## Local Demo Mode

Want to preview the card before connecting real sensors? Set `demo_mode: true`:

```yaml
type: custom:presence-map-card
title: PresenceMap Demo
demo_mode: true
```

The card will simulate realistic moving targets across multiple virtual sensors, complete with Doppler velocity, fading trails, and radar rings.

---

## License

This project is open source and available under the [MIT License](file:///c:/Users/keith/Downloads/ha/presence-map-card/LICENSE).

Copyright (c) 2026 Keith Sobolewski, Daryl Peddle.
