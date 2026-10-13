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
   /config/www/presence-map-card.js
   ```
3. In Home Assistant, navigate to **Settings** &rarr; **Dashboards** &rarr; **Resources** (top right three dots).
4. Click **Add Resource**:
   - URL: `/local/presence-map-card.js`
   - Resource type: `JavaScript Module`
5. Refresh your browser.

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
| `occupancy_entity`  | Binary sensor indicating presence (Optional)         | `binary_sensor.garage_occupancy` |
| `reporting_entity`  | Switch or boolean controlling reporting (Optional)   | `switch.garage_mmwave_reporting` |
| `boundary_prefix`   | Entity prefix for detection zone numbers (Optional)  | `number.garage_lights_mmwave_`   |

---

## Configuration Examples

### Single Sensor Radar View

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
