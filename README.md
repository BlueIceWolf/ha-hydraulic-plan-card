# Hydraulic Plan Card

![Hydraulic Plan Card logo](docs/logo.svg)

**Project description:** *Build and monitor real heating hydraulics in Home Assistant — wood, oil, gas, pellet and heat-pump generators, layered buffer tanks, mixers, electric heaters and live pipe flows.*

An animated heating-system card for **Home Assistant**, based on [Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card) by Sturmi77.

![Reference image: the original Heat Pump Hydraulic Card heat-pump layout](https://raw.githubusercontent.com/Sturmi77/heatpump-hydraulic-card/main/docs/social-preview.png)

*Reference: original heat-pump layout by Sturmi77. Hydraulic Plan Card retains this view and adds boiler variants; the picture does not yet show the boiler extensions.*

> **Development status: 0.2.0-alpha.2.** Experimental free hydraulic-plan editor is available alongside the legacy heat-pump view. Not a stable release. 

## Universal hydraulic plan (new)

Create a free, read-only hydraulic schematic by selecting **Leeren Plan anlegen** when adding a new card. You can place and drag independent components, add named pipe connections, and map Home Assistant sensors to each one. This works **without a heat-pump integration**.

Includes multiple heat sources and tanks, three-way valves/mixers, pumps, electric heaters and up to 24 additional height-positioned temperature sensors per storage vessel. The buffer gradient interpolates **between measured values only** and retains neutral areas with no measurements. The illustration now uses the same subtle Home Assistant palette, pipe and pump design language as the original card.

The editor preserves focused controls when Home Assistant updates sensor states; its form does not restart on every state refresh. The editor includes an illustrative template inspired by the user's system with a Fröling S3 Turbo, three series buffers, oil boiler, hot water tank, heat pump, two mixed circuits and a heating-rod recirculation loop. It is **not a verified as-built piping diagram**.

See [Free hydraulic plan configuration and limitations](docs/FREE_PLAN.md).

## What is supported

- Original heat-pump visualisation, EMS-ESP and other upstream presets, storage gradients, heating circuits, tank heating rods, diagnostics and statistics.
- Primary heat generator: **heat pump**, **wood gasifier**, **oil**, **pellet**, **gas** or **electric boiler**.
- Additional boiler alongside a heat pump, with a configurable name and type.
- Boiler sensors: operating/burner status, thermal power, flow, return, flue gas temperature, residual oxygen, fan, loading pump, mixer position, burner starts, hours, fuel level and electric heater.
- Live boiler pump, mixer, fan and heater indicators. Flow animation is blocked when a mapped loading pump is explicitly off.
- Manual mapping of Home Assistant entities through the card editor or YAML; no cloud service required.

**Limits:** The original fixed heat-pump topology remains available in classic mode. Free-plan connections are manually defined and do not solve hydraulic network physics, mixer routing or hydraulic safety interlocks. A mapped flow-status entity can animate a drawn pipe, but it does not prove physical water flow. Never use the visualisation as a safety or control device.

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
