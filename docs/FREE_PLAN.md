# Integrated hydraulic schematic

Hydraulic Plan Card uses the original Heat Pump Hydraulic Card SVG as its base. Additional boilers, pumps, valves, buffers and heaters are added to **that same view**. There is no second view.

## Configure your system

In the card editor:

1. Add the kinds of components that exist in your installation.
2. Assign each component's Home Assistant sensors, including the **pump state** where available.
3. Connect named component ports to define the **intended** hydraulic topology.
4. The diagram automatically places components into readable source, storage, pump/valve and heating-circuit areas.

**No X/Y coordinates are required or offered in the editor.** Older cards with x/y values keep their configuration, but those coordinates are ignored by the integrated auto-layout. Additional buffers are placed in their order along the directed series connections. Long drawings scroll horizontally; full screen supports vertical scrolling as well.

## Flow status

Each pipe can optionally map its own `flow_entity`; this overrides any inferred pump-based animation on that pipe. Without a pipe-level signal the diagram uses active pump states from connected pump components, boiler loading pumps or circuit pumps.

A mixer position of 0% or 100% is **not** automatically treated as a closed valve, since 3-way valves can route flow in either end position. Use actual pump, valve-port and flow sensors where possible.

The algorithm is a conservative diagram heuristic, not a hydraulic solver. It does **not** calculate flow rates, mixer port routes, pressure losses, temperature transfer or hydraulic safety interlocks. If no pump/flow status is known, the route is not animated.

## Buffer stratification

Each buffer and domestic hot-water tank can map top, middle and bottom sensors, plus up to 24 other temperature sensors at their actual positions (0% top, 100% bottom). Gradient stops use only valid values with temperature units; missing areas stay neutral. A gradient does **not** represent water level or a measured percent charge.

## Example multi-generator system

The editor includes a sample with Fröling-style wood gasifier, three series buffers, oil boiler and hot-water tank, heat pump, two mixed heating circuits, and a recirculating electric heater/mixer. **The sample is schematic and not a verified as-built installation**. Replace its links and sensors with the real installation before relying on the visualization.

## Safety and maintenance

The card is read-only. It should not actuate valves, interlocks, boilers or emergency systems. Keep the original Heat Pump Hydraulic Card installed while evaluating this alpha, and do not rely on the diagram alone for service decisions.
