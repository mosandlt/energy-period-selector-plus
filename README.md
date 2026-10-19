# Energy Period Selector Plus

[![ko-fi support](https://img.shields.io/badge/support-me-ff5e5b?style=flat-square&logo=ko-fi)](https://ko-fi.com/flixlix)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/flixlix/energy-period-selector-plus?style=flat-square)
![GitHub all releases](https://img.shields.io/github/downloads/flixlix/energy-period-selector-plus/total?style=flat-square)
![commit_activity](https://img.shields.io/github/commit-activity/y/flixlix/energy-period-selector-plus?color=brightgreen&label=Commits&style=flat-square)

![Hero Image](https://github.com/flixlix/energy-period-selector-plus/assets/61006057/93068f68-b989-4ff1-95bf-52f6e394c85f)
<img width="1244" alt="New Hero Image" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/b5064161-b8dd-4fa5-865a-5815635d3cbb">


## Goal

The main goal of this card is to expand the functionality and customizability of the official [Energy Date Picker Card](https://www.home-assistant.io/dashboards/energy/#energy-date-picker) from Home Assistant.

The goal is to deliver a card that fits in the overall design of the Energy Dashboard, while providing more features.

## Features & Bugfixes

- UI Editor
- Change style or hide Compare Button.
- Use Background to fit other cards.
- Choose which Periods are shown.
- Make Compare work.

## Install

### HACS (recommended)

This card is direclty available in [HACS](https://hacs.xyz/) (Home Assistant Community Store).
_HACS is a third party community store and is not included in Home Assistant out of the box._
To install this:

- Go to HACS
- Click on `Frontend`
- Search for `Energy Period Selector Plus`
- Install via UI

<details>  <summary>Manual Install</summary>

1. Download and copy `energy-period-selector-plus.js` from the [latest release](https://github.com/flixlix/energy-period-selector-plus/releases/latest) into your `config/www` directory.

2. Add the resource reference as decribed below.

### Add resource reference

If you configure Dashboards via YAML, add a reference to `energy-period-selector-plus.js` inside your `configuration.yaml`:

```yaml
resources:
  - url: /local/energy-period-selector-plus.js
    type: module
```

Else, if you prefer the graphical editor, use the menu to add the resource:

1. Make sure, advanced mode is enabled in your user profile (click on your user name to get there)
2. Navigate to Settings -> Dashboards
3. Click three dot icon
4. Select Resources
5. Hit (+ ADD RESOURCE) icon
6. Enter URL `/local/energy-period-selector-plus.js` and select type "JavaScript Module".
   (Use `/hacsfiles/energy-period-selector-plus/energy-period-selector-plus.js` and select "JavaScript Module" for HACS install if HACS didn't do it already)
 
</details>
   
## Using the card

To configure this card, only the type is required. Place it alongside a standard Home Assistant energy card on the same dashboard page. The standard card creates the shared Energy collection; this card only uses an existing collection and remains hidden until one is available.

Use `compare_mode: previous` (default) or `compare_mode: yoy` to compare with the previous period or previous year. Older HA versions retain their boolean comparison behavior. Set `compare_button_type: text` or `icon` to show the comparison button.

For a named collection, set the same `collection_key` on this card and the standard energy card. It must begin with `energy_`. The lookup checks that key first, then the dashboard collection (`_energy_${hass.panelUrl}`), then the legacy `_energy` collection.


In addition to that, I developed a UI Editor, making it even easier to change the card according to your preferences. 🥳

The UI Editor looks like this:

<img width="1049" alt="Bildschirmfoto 2023-05-20 um 22 01 46" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/4f12ecd5-e1b5-4362-994c-228fa0fffdd5">



### Options

#### Card options

| Name                | Type      |   Default    | Description                                                                                                                                                                  |
|---------------------| --------- |:------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type                | `string`  | **required** | `custom:energy-period-selector-plus`. |
| card_background     | `boolean`  | false | If set to `true`, a card will be added to the background of the card. |
| title | `string` | undefined | If set, a title will be added to the card. |
| today_button_type        | `boolean`  | true | If set to `true`, a button will be added to select today. |
| prev_next_buttons   | `boolean`  | true | If set to `true`, buttons will be added to control the previous and next period. |
| compare_button_type      | `string`  | undefined | If set, a button will be added to toggle the compare mode. Supported values are `icon` and `text`. |
| compare_mode | `string` | `previous` | Comparison mode: `previous` or `yoy`. |
| collection_key | `string` | undefined | Shared collection key, beginning with `energy_`. |
| period_buttons | `array` | undefined | If set, only buttons inside this array will be displayed. Supported values are `day`, `week`, `month`, `year`, `custom` and `billing` (requires `billing_cycle_day`). Order of your array will be applied. |
| custom_period_label | `string` | undefined | If set, the label of the custom period button will be changed to this value. Otherwise will be synced to your HA language (If not, consider submitting a PR, adding your language to the localize function.) |
| default_period | `string` | undefined | Select `day`, `week`, `month`, `year` or `billing` once after the first valid collection update, only if it still shows today as a single day. Existing selections and later user choices are preserved. `billing` requires `billing_cycle_day`. |
| billing_cycle_day | `integer` | undefined | Start day of each billing period (1–28). Adds a Billing button automatically when `period_buttons` is omitted; with an explicit list, include `billing` to show it. |
| billing_period_label | `string` | localized | Override the Billing button label, similarly to `custom_period_label`. |
| start_date_entity | `string` | undefined | Sync the collection start to an `input_datetime.*` entity. Writes are debounced by 500 ms and only changed boundaries are sent. |
| end_date_entity | `string` | undefined | Sync the collection end to an `input_datetime.*` entity. Date-only helpers receive `date`; helpers with `has_time: true` receive a local `datetime`. Service failures are logged to the browser console. |

Billing periods run from the configured day at local midnight through one millisecond before the same day in the following month. Selecting Billing uses the period containing today. Previous/next move one billing month. Dates use the browser's local time zone.

The card waits for HA's date and toggle components before rendering, with a five-second fallback if loading fails or takes too long. Narrow cards (up to 480 px) wrap labels and controls, including inside desktop dashboards.

### Troubleshooting

- If period buttons are missing after an update, hard-reload the dashboard to clear cached frontend resources (Ctrl+Shift+R, or Cmd+Shift+R on macOS).
- If you use `energy-flow-card-plus`, check its own documentation and configuration for the `energy_date_selection` option; that card may need its own option enabled to follow the selected range.

### Example Configurations

<img width="1322" alt="Basic Configuration" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/7834de56-6096-45d0-9373-781c6f56f77b">

```yaml
type: custom:energy-period-selector-plus
card_background: true
```
<hr/>
<img width="1322" alt="No previous or next controls" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/38238f3f-f0d7-46f6-a33b-984e16707210">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: No Previous or Next Controls
prev_next_buttons: false
```
<hr/>
<img width="1231" alt="No today button" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/1a26100d-5ccf-4713-9646-f52b392039cd">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: No Today Button
today_button_type: false
```
<hr/>
<img width="1219" alt="Text compare button" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/8dc6d530-9771-47c8-b291-fd41229e4916">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: Text Compare Button
compare_button_type: text
```
<hr/>
<img width="1301" alt="Icon compare button" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/780e7460-4380-4288-8376-033629725501">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: Icon Compare Button
compare_button_type: icon
```
<hr/>
<img width="1071" alt="No week button" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/49cafcfa-daa0-4ae1-973a-71a88402bbd8">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: No Week Button
period_buttons:
  - day
  - month
  - year
```

<hr/>
<img width="1071" alt="Custom period picker" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/164c3318-e0e6-4cf6-a7e1-9efed26d5ecb">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: Custom Period Picker
period_buttons:
  - day
  - week
  - month
  - year
  - custom
```

<hr/>
<img width="1071" alt="Custom period label" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/ee007bd1-ee01-4356-be33-98318fe371e1">

```yaml
type: custom:energy-period-selector-plus
card_background: true
title: Custom Period Picker
period_buttons:
  - day
  - week
  - month
  - year
  - custom
custom_period_label: </|\>
```


<hr/>

#### Real world Demo

<img width="1071" alt="Custom period label" src="https://github.com/flixlix/energy-period-selector-plus/assets/61006057/b01a6be8-4d68-4e6e-8593-985bdf253afb">




