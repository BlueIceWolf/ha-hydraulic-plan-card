# Hydraulic Plan Card

![Hydraulic Plan Card – Projektlogo](https://raw.githubusercontent.com/BlueIceWolf/ha-hydraulic-plan-card/main/docs/marketplace-icon.svg)

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

### Einrichtung wie in der Originalkarte

Bei aktivem Home Assistant verwendet der Komponenten-Editor die **originalen Home-Assistant-Formulare (ha-form)** mit echter Entitätsauswahl, gruppierten Standardfeldern und aufklappbaren weiteren Sensorfeldern. Auch Darstellung, Layout, Animationen, Vollbildansicht, Diagnose und Schnellbedienung lassen sich über die nativen Felder einstellen. Im Browser-Demo ohne Home Assistant bleiben einfache Eingabefelder als Fallback.

**Ein gemeinsames Hydraulikbild:** Die erste Wärmepumpe beziehungsweise der erste Kessel, der erste Pufferspeicher, der erste Warmwasserspeicher und die Heizkreise nutzen weiterhin die ursprüngliche SVG-Zeichnung. Holzvergaser, Öl-, Pellet- und Gaskessel sowie weitere Wärmepumpen werden als zusätzliche, zur bestehenden Darstellung passende Geräte im **selben** SVG ergänzt. Es entstehen keine separaten Karten oder manuell zu positionierenden Bauteile. Die Auswahl enthält dazu eigens gezeichnete Piktogramme; der Ölkessel hat Brenner und Öltropfen als Merkmal, ohne Markenlogos oder fremde Bilddateien.

### ETA Hackschnitzelkessel (eHACK, HACK und HACK VR)

Im Komponenten-Editor unter **Wärmeerzeuger und Kessel** gibt es den eigenen Gerätetyp **ETA Hackschnitzelkessel**. Wählbare Modelle: ETA eHACK, ETA HACK und ETA HACK VR. Der Kessel erhält eine im Stil der Originalkarte selbst gezeichnete SVG-Ansicht mit gelber Front, Display und seitlicher Brennstoff-Förderschnecke. Der Typ kann alleine als primärer Wärmeerzeuger oder zusätzlich zu einer Wärmepumpe, einem Ölkessel oder einem Holzvergaser eingesetzt werden.

**Automatische Erkennung:** Wenn Home Assistant ein ETA eHACK-, HACK- oder HACK-VR-Gerät samt passenden Entitäten bereitstellt, erkennt die Karte das Kesselmodell anhand der Geräteinformationen und schlägt vorhandene Messwerte zur Übernahme vor. Dafür genügen die Gerätedaten aus Home Assistant; **es gibt keine direkte Kommunikation mit dem ETA-Kessel**. Die Übernahme ist immer freiwillig und wird per Schaltfläche bestätigt. Bereits importierte oder manuell mit passenden Entitäten eingerichtete Geräte werden nicht erneut als neu angezeigt. ETA-Pelletkessel werden ausdrücklich nicht als Hackschnitzelkessel eingeordnet.

Die zuordenbaren Messwerte umfassen Betriebsstatus, Vorlauf, Rücklauf, Abgas, Restsauerstoff, Gebläse, Leistung, Kesselladepumpe, Förderschnecke, Entaschung und Brennstoffvorrat. Nicht erkannte Werte können weiterhin manuell zugeordnet werden. Für das vorhandene Grundschema wird bei diesem zusätzlichen Kesseltyp intern der Kessel-Renderer wiederverwendet, dessen bisherige Pellet-Grafik jedoch durch die passende ETA-Zeichnung ersetzt wird. Rohre und Speicher behalten die Optik der Originalkarte.

**Öl- und Gaskessel über EMS-ESP:** Die Auto-Erkennung prüft Gerätebezeichnung und Modell sowie tatsächliche Ölvorwärmer-Signale. Das allgemeine EMS-Signal `burngas` gilt **nicht** als Beleg für einen Gaskessel. Beispielsweise wird ein Buderus Logano GB125 als Ölkessel erkannt. Bei nicht sicher bestimmbaren Geräten muss der richtige Kesseltyp vor dem Import selbst ausgewählt werden. Falsch als Gas hinzugefügte Kessel lassen sich im Editor zu Öl korrigieren, ohne ihre Sensorzuordnung zu verlieren.

## What is supported

- Original heat-pump visualisation, EMS-ESP and other upstream presets, storage gradients, heating circuits, tank heating rods, diagnostics and statistics.
- Primary heat generator: **heat pump**, **wood gasifier**, **oil**, **pellet**, **gas** or **electric boiler**.
- Additional boiler alongside a heat pump, with a configurable name and type.
- Boiler sensors: operating/burner status, thermal power, flow, return, flue gas temperature, residual oxygen, fan, loading pump, mixer position, burner starts, hours, fuel level and electric heater.
- Live boiler pump, mixer, fan and heater indicators. Flow animation is blocked when a mapped loading pump is explicitly off.
- Manual mapping of Home Assistant entities through the card editor or YAML; no cloud service required.

**Limits:** The integrated schematic extends the original topology with manually defined components and links; it does not compute hydraulic physics, valve routing or safety interlocks. A mapped pump/status signal may animate a pipe, but it is not a measured flow rate. Never use this visualization for safety-critical control.

### Logo im Home Assistant Marketplace

Das Projektlogo ist oben als **absoluter Bildlink** eingebunden, damit es auch in der
README-Vorschau von HACS beziehungsweise **Einstellungen → Marketplace** geladen
werden kann. Das kompakte SVG liegt in `docs/marketplace-icon.svg`; das
hochauflösende Original liegt in `docs/logo.svg`.

**Hinweis:** Die Marketplace-**Listenansicht** vergibt ihre Symbole selbst.
Für Dashboard-Karten unterstützt `hacs.json` derzeit kein offizielles
`icon`- oder `logo`-Feld. Das Projektlogo wird daher in der
**Repository-Detailansicht/README**, nicht garantiert als eigenes
Listen-Symbol angezeigt. Das Dashboard-Kartenauswahl-Icon ist unabhängig
davon das konfigurierte `mdi:pipe-valve`-Symbol.

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

### EMS-ESP boiler discovery

The editor detects compatible EMS-ESP devices from already available Home Assistant MQTT Discovery entities (no separate network connection). On a boiler with suitable identifiers it can propose an **oil boiler** (e.g. a Buderus S115U); otherwise it displays a boiler with **unknown fuel**. An EMS bus connection does **not** by itself establish fuel type, and no boiler is silently added. You must choose **Assign detected values** in the editor before the mapping is stored.

Supported short names include `boiler_burngas` (actual burner), `boiler_curflowtemp`, `boiler_rettemp`, `boiler_exhausttemp`, `boiler_heatingpump`, and `boiler_oilpreheat` (fuel detection only). The exact HA entity IDs depend on EMS-ESP's MQTT Discovery naming options. Existing manual assignments take precedence, and the card never sends control commands.

### Pufferspeicher und Rohrverbindungen

Mehrere Pufferspeicher werden automatisch nach ihrer gespeicherten Verbindungstopologie angeordnet. Mit **Puffer in Reihe verbinden** werden die oberen Vorlaufanschlüsse und unteren Rücklaufanschlüsse benachbarter Speicher miteinander verknüpft. Vorhandene Leitungen bleiben unverändert; der Vorgang fügt fehlende Verbindungen hinzu und ist wiederholbar. Der tatsächliche hydraulische Aufbau muss überprüft werden. Eine Parallelschaltung wird nicht eigenständig als Reihenschaltung interpretiert. Ohne explizite Verbindung bleiben die zusätzlichen Rohre im freien Plan unsichtbar.

## Migration und Sicherung

Das Planformat verwendet `hpc_schema_version: 2`. Ältere **gültige** Komponentenpläne
werden beim Öffnen des Editors einmalig und ohne Änderung der bestätigten Topologie
migriert; der originale Stand wird in `hpc_migration_backup` gesichert. Veraltete
Pufferrücklauf-Anschlüsse (`return_in`) werden auf den linken `bottom_in`-Port
überführt. Nicht eindeutig übernehmbare Bauteile, Sensoren oder Verbindungen
**blockieren** eine automatische Migration, statt stillschweigend gelöscht zu werden.

Klassische Konfigurationen werden nur nach bestätigter Übernahme umgestellt.
Bekannte Wärmeerzeuger, Speicher, Heizkreise und Entitäten werden übernommen,
jedoch keine spekulativen Rohre ergänzt. Die bisherigen klassischen Felder
bleiben unverändert erhalten. Unter **Migration & Konfiguration** zeigt der
Editor Prüfhinweise und ermöglicht das Wiederherstellen des ursprünglichen
gesicherten Standes. Die Wiederherstellung verwirft spätere Änderungen.
