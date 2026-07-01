# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-30

### Added

- Multi-day all-day events now render as a single connected bar spanning the days they cover within a week row, instead of a separate chip on each day. Events that span a week boundary restart as a new bar on the next row; if too many multi-day events overlap to fit in the fixed slot budget, the extras fall back to normal per-day chips.

## [1.1.0] - 2026-06-30

### Changed

- Date squares now reserve a fixed height for `maxEventsPerDay` event slots, so every square is the same size and the calendar's total height no longer shifts based on how many events land on a given day.
- The overflow indicator moved from a "+N more" row at the bottom of the square to a compact "+N" badge in the top-right corner.

### Added

- `showHeader` config option to show or hide the month-range header bar above the calendar grid.

## [1.0.0] - 2025

### Added

- Initial release
