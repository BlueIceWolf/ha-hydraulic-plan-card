# Integrated Hydraulic Plan\n\nAdditional equipment is drawn directly in the original Heat Pump Hydraulic Card's SVG. The first generator, first buffer, first domestic hot-water tank and up to six heating circuits retain their original artwork and locations. Only extra equipment is appended to the right; pipes can be connected to existing or added units.\n\nThere is no separate free-plan view. The dashboard shows the complete original card with its extensions, and the editor manages the components.\n\n# Freier Hydraulikplan / Integrated hydraulic schematic

**Status: v0.2.0-alpha.1.** The graphical component editor is experimental. It preserves the classic Heat Pump Hydraulic Card mode if no `plan_mode: free` is selected.

## What you can build

Place multiple independent heat generators (heat pumps, wood gasifiers, oil, gas and pellet boilers), series/parallel buffer tanks, hot-water tanks, heating circuits, pumps, 3-way mixers/valves, electric heaters, and manifold connection points. All parts can be positioned independently, with named ports joined by directed pipe connections.

To start, add `type: custom:hydraulic-plan-card` to a dashboard. The new-card editor opens with **"Leeren Plan anlegen"** and an optional example inspired by a multi-generator family-house installation. The example is illustrative, **not** an as-built drawing.

## Tank temperature stratification

Each buffer/hot-water tank supports `top`, `middle`, and `bottom` temperature sensors for convenience, plus **up to 24 freely positioned additional sensors**. Their installation heights are measured in **percent down from the top** (0 = top, 100 = bottom). Only reported temperature readings contribute color stops. Unknown/unmeasured areas remain neutral, avoiding imaginary heat content. Linear color interpolation between sensor heights is a visualization, not a calibrated energy-storage percentage.

```yaml
type: custom:hydraulic-plan-card
title: Heizungsanlage
plan_mode: free
plan:
  components:
    - id: puffer1
      type: buffer
      name: Puffer 1
      x: 460
      y: 80
      sensors:
        top: sensor.puffer_oben
        middle: sensor.puffer_mitte
        bottom: sensor.puffer_unten
      level_sensors:
        - position: 25
          entity: sensor.puffer_viertel
        - position: 75
          entity: sensor.puffer_dreiviertel
  connections: []
```

The editor automatically offers an entity list for the available sensors. To add extra temperature points use **"Weiteren Fühler hinzufügen"** inside the selected tank.

## Pipe flow versus true hydraulics

A connection defines **from component/port → to component/port**. The arrow is the configured conceptual direction, not an automatic deduction from pump or mixer status. Map an optional `flow_entity` to animate that pipe only when the mapped entity is active; if unmapped, the pipe stays static. You can assign `temperature_entity` to color a pipe by its actual temperature reading.

The card is a **read-only dashboard**, not a hydraulic simulator or heating-system controller. No pump, boiler, safety valve, heating rod or mixer is commanded. The user is responsible for validating port direction, bypass circuits, return protection and safety interlocks against the actual installation.

## License

Derivative of Sturmi77's Heat Pump Hydraulic Card (MIT); original license/copyright notices remain.
