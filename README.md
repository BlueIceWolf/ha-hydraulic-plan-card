# Hydraulic Plan Card

<img src="docs/logo.svg" alt="Hydraulic Plan Card" width="96" height="96" align="right" />

**Project description:** *Build and monitor real heating hydraulics in Home Assistant — wood, oil, gas, pellet and heat-pump generators, layered buffer tanks, mixers, electric heaters and live pipe flows.*

An animated heating-system card for **Home Assistant**, based on [Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card) by Sturmi77.

![Reference image: the original Heat Pump Hydraulic Card heat-pump layout](https://raw.githubusercontent.com/Sturmi77/heatpump-hydraulic-card/main/docs/social-preview.png)

*Reference: original heat-pump layout by Sturmi77. Hydraulic Plan Card retains this view and adds boiler variants; the picture does not yet show the boiler extensions.*

> **Development status: 0.2.0-alpha.5.** An experimental single-page extension of the original card, not a stable release.

## One hydraulic schematic, automatically arranged

Add the components you own (wood gasifier, oil/pellet/gas boiler, heat pump, up to three or more buffers, hot-water tank, heating circuits, heating elements, mixing valves and pumps). Configure their **connections**, names and Home Assistant sensors. The card places components **automatically** alongside the original heat-pump hydraulic diagram, with no X/Y fields or manual dragging. Buffers connected in series are ordered by their pipe links.

One original SVG schematic is used: extra components extend the existing illustration, rather than launching a separate view. Existing classic heat-pump presets remain available and can coexist with an integrated plan.

### Flow animation

A flow animation is based on an explicitly mapped pipe signal or an **active connected pump** (loading pump, heating-circuit pump, or a pump entity). The card traces connected paths conservatively and does not animate branches with a mapped pump explicitly off. A mixer at **0% or 100%** is not necessarily closed: its percentage **never by itself** disables flow. Without a mapped pump or flow signal, the card cannot know circulation and displays no invented animation. A pump status is not a flow measurement; this remains a read-only visualization, never a hydraulic solver or safety control.

### Layered buffer tanks

Use top/middle/bottom temperature sensors and up to 24 extra sensors at their actual installation heights. Tank colors interpolate only between the available measurements; unmeasured areas remain neutral.

The editor keeps active fields in place when Home Assistant sensors update. Its illustrative multi-generator template is a *conceptual example*, not a verified drawing of any real installation.

[Integrated-plan details and limitations](docs/FREE_PLAN.md).

### Scrolling large heating systems

Complex systems extend the original hydraulic schematic, so the drawing can be wider and taller than the available dashboard area. The **diagram can scroll horizontally**, and normal vertical mouse-wheel, trackpad and touch scrolling continues to the page or the fullscreen card. Fullscreen mode has its own vertical scrollbar. This fixes wheel events being trapped by the diagram on older versions.

## What is supported

- Original heat-pump visualisation, EMS-ESP and other upstream presets, storage gradients, heating circuits, tank heating rods, diagnostics and statistics.
- Primary heat generator: **heat pump**, **wood gasifier**, **oil**, **pellet**, **gas** or **electric boiler**.
- Additional boiler alongside a heat pump, with a configurable name and type.
- Boiler sensors: operating/burner status, thermal power, flow, return, flue gas temperature, residual oxygen, fan, loading pump, mixer position, burner starts, hours, fuel level and electric heater.
- Live boiler pump, mixer, fan and heater indicators. Flow animation is blocked when a mapped loading pump is explicitly off.
- Manual mapping of Home Assistant entities through the card editor or YAML; no cloud service required.

**Limits:** The integrated schematic extends the original topology with manually defined components and links; it does not compute hydraulic physics, valve routing or safety interlocks. A mapped pump/status signal may animate a pipe, but it is not a measured flow rate. Never use this visualization for safety-critical control.

## Installation

Use [HACS](https://www.hacs.xyz/) → Custom repositories → add `https://github.com/BlueIceWolf/ha-hydraulic-plan-card` as a **Dashboard** repository. Download the card and reload the Home Assistant browser. If you install it manually, place `dist/ha-hydraulic-plan-card.js` under `/config/www/` and add it as a JavaScript module dashboard resource.

Add a dashboard card of type:

```yaml
type: custom:hydraulic-plan-card
```

This card uses its **own custom element**, so it can coexist with the original Heat Pump Hydraulic Card. Use separate dashboard entries.

## Example: wood gasifier with buffer and return protection

All entity IDs below are examples—replace them with your actual Home Assistant entities.

```yaml
type: custom:hydraulic-plan-card
title: Holzheizung
preset: none
generator_type: wood_gasifier
power_sources: manual
buffer: true
entities:
  boiler_state: binary_sensor.holzvergaser_brennt
  boiler_flow: sensor.holzvergaser_vorlauf
  boiler_return: sensor.holzvergaser_ruecklauf
  boiler_exhaust: sensor.holzvergaser_abgas
  boiler_o2: sensor.holzvergaser_restsauerstoff
  boiler_fan: sensor.holzvergaser_geblaese
  boiler_pump: switch.kesselladepumpe
  boiler_mixer: sensor.ruecklaufanhebung_position
  boiler_heater: sensor.heizstab_leistung
  buffer_top: sensor.pufferspeicher_oben
  buffer_middle: sensor.pufferspeicher_mitte
  buffer_bottom: sensor.pufferspeicher_unten
  hc_flow: sensor.heizkreis_vorlauf
  hc_return: sensor.heizkreis_ruecklauf
  hc_pump: switch.heizkreispumpe
```

## Example: heat pump and oil boiler

```yaml
type: custom:hydraulic-plan-card
title: Hybridheizung
preset: emsesp
generator_type: heat_pump
boiler_type: oil
boiler_name: Ölkessel
entities:
  boiler_state: binary_sensor.oelbrenner
  boiler_flow: sensor.oelkessel_vorlauf
  boiler_return: sensor.oelkessel_ruecklauf
  boiler_pump: switch.oelkessel_ladepumpe
```

Map an unknown boiler integration manually; a heat-pump preset does **not** imply automatic oil/wood-boiler detection. Existing upstream heat-pump mappings are not removed.

See [Hydraulic model notes](docs/BOILERS.md) for the meaning of the model and supported measurements.

## Development and validation

```bash
npm ci
npm run syntax
npm run test
```

Browser tests use Playwright. No external API or database is needed for the card.

## Attribution and license

Hydraulic Plan Card derives from **Heat Pump Hydraulic Card** by **Sturmi77**, copyright © 2026, distributed under the **MIT License**. The original license notice is included in [LICENSE](LICENSE), and the original source header is retained in the derived JavaScript. Modifications in this repository are separately documented. We are not affiliated with, or endorsed by, the upstream maintainer.
