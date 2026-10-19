# Changelog

## 0.3.0

- Compatible with Home Assistant Core 2026.10: the card now only uses the energy collection that HA's own energy cards create (looked up by `collection_key`, `energy_<panelUrl>` or the legacy `_energy`). The outdated bundled data loader was removed, so the card can no longer break other energy cards.
- Compare modes `previous` and `yoy` (`compare_mode`), still supporting the old boolean compare of older HA versions.
- `collection_key` option; a collection that appears late is detected automatically.
- Date inputs are parsed as local dates (no UTC day shift), single-day ranges are valid, start/end are validated.
- Uses `ha-button` when available (fallback to `mwc-button`); robust loading of the date components.
- Build fixed for current toolchains (rollup-plugin-typescript2 include pattern); `serveopts` typo fixed; unit tests for the collection lookup.
- Known limitation: dates are computed in the browser time zone, so with HA's "server" time zone setting and a browser in a different zone, period boundaries can be shifted.
