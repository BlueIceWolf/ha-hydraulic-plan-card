# Heating generators — model and limitations

## Generators

`generator_type: heat_pump` retains the upstream heat-pump layout. A boiler may be mapped with `boiler_state`, `boiler_flow`, etc., and its type can be selected with `boiler_type`.

`generator_type: wood_gasifier | oil | pellet | gas | electric` replaces the left heat-source illustration with a boiler and uses the mapped `boiler_*` entities. For boiler-only systems set `preset: none`, unless a deliberate heat-pump hybrid configuration is required.

`boiler_name` overrides the displayed boiler label. The editor presents the recognized Home Assistant entity kinds; it does not automatically invent missing values.

## Measurements and hydraulics

- `boiler_state` supports an on/off entity, power-like numeric state, or known running text. An unknown state is **not** evidence of firing. Without a state entity, positive `boiler_power` or `boiler_heater` is used.
- `boiler_pump` should map a true boiler loading pump. **If mapped and off, the boiler branch is not animated as circulating**. If absent, the historical upstream approximation follows the burner status. It is not a flow measurement.
- `boiler_mixer` represents a 0–100% mixing valve position. The drawing shows the sensor position only. Actual direction depends on valve construction, ports and pipe connections.
- `boiler_return` and `boiler_flow` are actual temperature sensors; they must not be used to infer missing temperatures.
- `boiler_exhaust`, `boiler_o2`, `boiler_fan`, `boiler_heater`, `boiler_hours`, `boiler_burner_starts` and `boiler_fuel_level` are optional. Their readings appear in the details drawer when available.
- Use separate `buffer_heater` or `buffer_heater_top/middle/bottom` entities for immersion heaters installed in a buffer. These features already exist in the upstream card.

## Deliberate non-features in the alpha

No fully editable pipe topology, no automatic boiler integration presets, no hardware actuation, no safety-critical logic, no inferred energy/flow readings, and no true simulation of hydraulic flow. The current drawing is a **live schematic** of a constrained topology. Boiler status, pump status and heating circuit states must be assessed separately.
