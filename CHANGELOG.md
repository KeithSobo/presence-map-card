# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to CalVer / [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v2026.10.1

### Added

- Initial release of **PresenceMap** (`presence-map-card`).
- Standalone Home Assistant custom card for multi-sensor mmWave presence radar and floor-plan visualizations.
- Modular architecture: configuration validator, data source adapters, coordinate transformation engine, freshness & trail manager, SVG renderer, and visual configuration editor.
- Inovelli Blue ZHA mmWave target parser with support for `targets` attributes, occupancy entities, reporting-switch toggles, and detection boundary entities.
- Shared canvas supporting multiple sensors with independent position, rotation, mirror (X/Y), color, and field of view.
- Distance range rings with metric (meters/cm) and imperial (feet/inches) display unit conversions.
- Floor-plan background image overlay support with aspect-ratio preservation and scale calibration.
- Bounded time-based target trail history rendered with fading opacity.
- Stale target detection and background timer invalidation when sensor reports stop or occupancy clears.
- Home Assistant theme integration with auto light/dark detection and manual theme overrides.
- Visual card editor with collapsible accordion sections (General, Radar Display, Targets & Trails, Floor Plan, Sensors, Advanced) and multi-sensor list management (add, duplicate, remove, reorder).
- Visual editor trail controls for configuring trail duration (`trail_history_seconds`) and per-target historical points limit (`trail_max_points`).
- Informed `targets_attribute` selector with live entity attribute discovery, custom attribute entry, and real-time validation badges.
- Accessible sensor color control combining a native color picker, preset palette swatches, and custom CSS color entry preserving unrepresentable values.
- Unit-aware measurement inputs allowing dual feet/inches entry with sign selectors when imperial units are selected, maintaining zero conversion drift in stored YAML meters.
- Read-only sensor setup diagnostics displaying real-time entity readiness, reporting switch status, occupancy state, and room-clear detection.
- Boundary detection limit diagnostics displaying resolved entity sources (explicit vs prefix fallback), current values, units, and boundary completeness.
- Integrated coordinate placement guidance derived from math transforms (origin conventions, target offsets, clockwise rotation, and illustrative FOV).
- Support for millimeter (`mm`) sensor source length units across configuration and coordinate conversion logic.
- Standalone interactive local demo simulation mode for quick preview and verification.
- Unit and browser rendering test suite with an 80%+ test coverage gate.
- CI and GitHub release automation with HACS compliance metadata.
