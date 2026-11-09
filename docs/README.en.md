# Hydraulic Plan Card — English guide

[Deutsch / main README](../README.md)

Hydraulic Plan Card brings a live heating-system diagram into Home Assistant. It builds on [Sturmi77's Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card), keeping the familiar heat-pump, radiator and mixer artwork while adding boilers, buffer tanks, pumps and other parts of the system.

**Release status:** `main` still provides the test build `0.2.0-alpha.6`, not a stable release. The shared routing and migration changes are integrated, but the complete hydraulic and visual acceptance is still open.

## What you can show

The card supports heat pumps; wood gasifiers; oil, gas, pellet, electric and supported ETA wood-chip boilers; buffer and hot-water tanks; direct and mixed heating circuits; pumps; valves; and temperature sensors. A buffer can display temperature layers from multiple sensors. The component editor lets you choose the actual parts and their connections without manually positioning them.

Compatibility depends on the data available in your Home Assistant installation. Device discovery for supported ETA and EMS-ESP systems only suggests mappings from existing Home Assistant entities; you must confirm before anything is added.

## Install

In **HACS**, add `https://github.com/BlueIceWolf/ha-hydraulic-plan-card` as a custom **Dashboard** repository, install the card and reload your Home Assistant browser.

For manual installation, copy [the JavaScript bundle](../dist/ha-hydraulic-plan-card.js) to `/config/www/` and register `/local/ha-hydraulic-plan-card.js` as a JavaScript module in dashboard resources.

Add the card with:

```yaml
type: custom:hydraulic-plan-card
```

Open the editor, choose your heat generator, add tanks and circuits, connect them according to the actual installation, then map the relevant sensors.

## Reading the diagram

Pipe animations represent plausible circulation inferred from mapped pump states or flow sensors. **They do not measure flow.** A measured zero flow or a mapped pump that is off should stop animation in its own branch, but advanced multi-branch topology is still under development. Mixer percentages do not by themselves prove that a valve is closed.

The card is a read-only visualisation, not a hydraulic simulator or safety controller. Do not rely on it for service or safety decisions.

## Updates, testing and feedback

Before upgrading an existing card, back up its YAML or your Home Assistant configuration. The newer component editor includes versioned migration and restoration safeguards; unusual old installations still need manual checking.

Open acceptance checks, including complex plants, visual references and older configurations, are tracked in [issue #20](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/issues/20) and the [acceptance report](ACCEPTANCE-2026-11-09.md).

If you spot duplicate pipes, incorrect return connections or animations in the wrong circuit, please [open an issue](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/issues). A diagram screenshot, anonymised configuration, card version and explanation of the real pipework are useful.

Developers can run `npm ci`, `npm run build`, `npm run syntax` and `npm run test`. The build regenerates the installable bundle from the source modules. See the [hydraulic architecture notes](HYDRAULIC_ARCHITECTURE.md) and [boiler notes](BOILERS.md).

Based on the MIT-licensed Heat Pump Hydraulic Card by Sturmi77. [License](../LICENSE).
