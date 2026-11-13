# Hydraulic Plan Card

A clear heating-system overview for Home Assistant, from the heat pump to individual heating circuits.

Based on [Sturmi77's Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card), with support for more heat sources and flexible system layouts.

## Features

- **Heat sources:** heat pumps, oil and gas boilers, pellet boilers, wood gasifiers and wood-chip boilers
- **Tanks:** buffer and hot-water tanks, including multiple tanks
- **Heating circuits:** radiators, underfloor heating, pumps and mixing valves
- **Connections:** charging pumps, diverter valves and return-temperature mixing
- **Live view:** temperatures, operating states and animated pipes

Set up the diagram in the visual editor. For supported integrations, the card can suggest existing entities, including through the original card's heat-pump presets. You choose which mappings to import.

## Installation

1. Add `https://github.com/BlueIceWolf/ha-hydraulic-plan-card` to **HACS** as a custom **Dashboard** repository.
2. Install **Hydraulic Plan Card** and reload Home Assistant in your browser.
3. Add a new card:

```yaml
type: custom:hydraulic-plan-card
```

Use the editor to add your equipment, connect it according to the real pipework and assign Home Assistant entities.

**Manual install:** Copy the [JavaScript file](../dist/ha-hydraulic-plan-card.js) to `/config/www/` and register `/local/ha-hydraulic-plan-card.js` as a dashboard JavaScript module.

## Good to know

Pipe colours follow the mapped temperatures. Animated dots indicate **flow inferred from sensor and pump states**; they are not a direct flow measurement. This card is a display, not a controller or safety device.

**Alpha version:** Some system layouts are not fully tested. Back up your card configuration before updating.

## Feedback

Found a display issue? [Open an issue](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/issues) with a screenshot, card version and, if possible, an anonymised configuration.

More details: [Components and connections](FREE_PLAN.md) · [Equipment and readings](BOILERS.md) · [Deutsch](../README.md)

## Credits

Based on the [Heat Pump Hydraulic Card by Sturmi77](https://github.com/Sturmi77/heatpump-hydraulic-card). Continued under the [MIT license](../LICENSE); not an official part of the original project.
