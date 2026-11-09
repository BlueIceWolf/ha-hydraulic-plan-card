# Wärmeerzeuger und Kessel / Heating generators

[Zur deutschen Anleitung](../README.md) · [English guide](README.en.md)

Die Hydraulic Plan Card zeigt vorhandene Heizungsdaten in Home Assistant an. Sie kommuniziert nicht selbst mit dem Kessel und ersetzt weder dessen Regelung noch eine fachliche Prüfung der Anlage.

## Kessel in einer klassischen Kartenkonfiguration

Mit `generator_type` wird das Gerät links im bekannten Hydraulikschema ausgewählt:

| Einstellung | Gerät |
| --- | --- |
| `heat_pump` | Wärmepumpe |
| `wood_gasifier` | Holzvergaser |
| `oil` | Ölkessel |
| `gas` | Gaskessel |
| `pellet` | Pelletkessel |
| `electric` | Elektrokessel |

Ein zusätzlicher Kessel bei einer Wärmepumpe lässt sich über `boiler_type` und `boiler_name` benennen. Für reine Kesselanlagen ist `preset: none` normalerweise die passende Ausgangsbasis. Die tatsächlich benötigten Entitäten werden manuell zugeordnet.

```yaml
type: custom:hydraulic-plan-card
title: Heizung
preset: none
generator_type: wood_gasifier
power_sources: manual
buffer: true
entities:
  boiler_state: binary_sensor.kessel_in_betrieb
  boiler_flow: sensor.kessel_vorlauf
  boiler_return: sensor.kessel_ruecklauf
  boiler_exhaust: sensor.kessel_abgas
  boiler_pump: switch.kesselladepumpe
  buffer_top: sensor.puffer_oben
  buffer_bottom: sensor.puffer_unten
```

Die Sensoren im Beispiel existieren nicht automatisch. Bitte die eigenen Entitäten aus Home Assistant einsetzen.

## Welche Messwerte werden verwendet?

| Feld | Bedeutung |
| --- | --- |
| `boiler_state` | Brenner- oder Betriebsstatus |
| `boiler_power` | angezeigte Kesselleistung |
| `boiler_flow` / `boiler_return` | Vorlauf- und Rücklauftemperatur |
| `boiler_exhaust` | Abgastemperatur |
| `boiler_o2` | Restsauerstoff |
| `boiler_fan` | Gebläsezustand oder -drehzahl |
| `boiler_pump` | Zustand der Kesselladepumpe |
| `boiler_mixer` | Mischerposition beziehungsweise Rücklaufanhebung |
| `boiler_heater` | elektrische Zusatzheizung |
| `boiler_hours` / `boiler_burner_starts` | Betriebsstunden und Brennerstarts |
| `boiler_fuel_level` | Vorratsanzeige, sofern vorhanden |

Es dürfen Felder fehlen. Nicht gemessene Temperaturen, Leistungswerte oder Volumenströme werden nicht als echte Messwerte ausgegeben.

Eine ausgeschaltete, ausdrücklich zugeordnete Ladepumpe sperrt die Flussanimation ihres Zweigs. Ein angezeigter Pumpenbetrieb ist aber kein Nachweis für tatsächlichen Durchfluss. Auch aus einer Mischerstellung von 0 oder 100 Prozent folgt keine sichere Durchflusssperre.

## ETA und EMS-ESP

Bei unterstützten ETA-eHACK-, HACK- und HACK-VR-Geräten kann der Editor passende Entitäten aus Home Assistant erkennen und zur Übernahme anbieten. Der Partikelabscheider gehört zum Abgasweg des Hackschnitzelkessels, nicht zum Heizwasser; ein Brennstofflager wird ebenfalls als Zubehör des Kessels dargestellt.

Auch bei EMS-ESP können bekannte Kesseldaten vorgeschlagen werden. Der Brennerstatus `burngas` ist dabei **kein** zuverlässiger Hinweis auf den Brennstoff. Die Erkennung berücksichtigt weitere Geräteinformationen, beispielsweise ein passendes Kesselmodell oder das Signal des Ölvorwärmers. Falls das nicht eindeutig ist, muss die Heizungsart selbst gewählt werden.

Eine Erkennung verändert keine Heizungsregelung und übernimmt Daten erst nach Bestätigung.

### EMS-ESP-Heizkreise

EMS-ESP veröffentlicht Heizkreise oft unter `thermostat_hc1`, `mixer_hc1` usw. – nicht als Teil der Kessel-Entitäten. Der Karteneditor erkennt diese Geräte jetzt gesondert und bietet beispielsweise **Heizkreis 1** und **Heizkreis 2** zum Übernehmen an. Die Zuordnung erfolgt erst nach Bestätigung.

Bekannte Vorlauf-, Rücklauf-, Pumpen- und Mischerwerte werden zugeordnet, soweit Home Assistant passende Entitäten bereitstellt. Eine Raumtemperatur oder der Raum-Sollwert `seltemp` ist **keine Vorlauftemperatur** und wird deshalb nicht als solche übernommen. Bereits selbst eingestellte Sensoren und Namen bleiben erhalten.

Die Karte kennt dadurch die Heizkreise, aber noch nicht deren tatsächliche Verrohrung. Vorlauf und Rücklauf müssen entsprechend der realen Anlage verbunden werden. Falls keine Heizkreise angeboten werden, bitte in Home Assistant unter **Einstellungen → Geräte & Dienste → MQTT → EMS-ESP** prüfen, ob die Thermostat- und Mischerwerte veröffentlicht werden. Mehr zur MQTT-Struktur steht in der [EMS-ESP-Dokumentation](https://emsesp.org/de/MQTT).


## Erweiterter Komponentenplan

Der neue Editor kann weitere Wärmeerzeuger, Pumpen, Speicher und Anschlüsse in einem gemeinsamen Plan aufnehmen. Die alte Darstellung bleibt Grundlage. Diese Funktionen sind in der Alpha-Phase und bei komplexen Verschaltungen noch nicht vollständig abgenommen.

Details stehen in [Komponenten und Rohrverbindungen](FREE_PLAN.md) und im [Prüfstand des Entwicklungszweigs](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/blob/refactor/finish-unified-hydraulics-20261109/docs/ACCEPTANCE-2026-11-09.md).

---

## English notes

For the classic card layout, choose a `generator_type` from the table above, then map real Home Assistant entities under `entities`. An extra boiler can use `boiler_type` and `boiler_name`. ETA and EMS-ESP discovery suggests available entity mappings but never imports them without confirmation.

Pump states help the card decide which pipes to animate; they are not measured water flow. Complex custom pipe routing is still being developed and tested. This card is a read-only display, not a controller or safety device.
