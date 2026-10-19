# Changelog

## 0.4.0

- Fix missing period buttons after reload by loading HA's date controls and waiting for toggle, date and navigation components before rendering, with a five-second timeout (#46, #49, #56).
- Add `default_period` to select a starting period once per card instance, while preserving existing collection selections and subsequent user choices.
- Add debounced, change-only `start_date_entity` / `end_date_entity` synchronization to `input_datetime` helpers, supporting local date and datetime values (#24, #55, #57).
- Add billing periods with `billing_cycle_day` (1–28), an optional `billing_period_label`, and monthly navigation (#17).
- Wrap labels, period buttons and date inputs in narrow cards, including cards on desktop dashboards (#32).
- Expose the new options in the visual editor and document configuration, component loading and troubleshooting.

## 0.3.0

- Compatible with Home Assistant Core 2026.10: the card now only uses the energy collection that HA's own energy cards create (looked up by `collection_key`, `energy_<panelUrl>` or the legacy `_energy`). The outdated bundled data loader was removed, so the card can no longer break other energy cards.
- Compare modes `previous` and `yoy` (`compare_mode`), still supporting the old boolean compare of older HA versions.
- `collection_key` option; a collection that appears late is detected automatically.
- Date inputs are parsed as local dates (no UTC day shift), single-day ranges are valid, start/end are validated.
- Uses `ha-button` when available (fallback to `mwc-button`); robust loading of the date components.
- Build fixed for current toolchains (rollup-plugin-typescript2 include pattern); `serveopts` typo fixed; unit tests for the collection lookup.
- Known limitation: dates are computed in the browser time zone, so with HA's "server" time zone setting and a browser in a different zone, period boundaries can be shifted.
