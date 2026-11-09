# Hydraulic Plan Card

![Hydraulic Plan Card](https://raw.githubusercontent.com/BlueIceWolf/ha-hydraulic-plan-card/main/docs/marketplace-icon.svg)

**Ein Hydraulikschema für deine Heizung in Home Assistant.** Wärmepumpe, Öl- oder Holzkessel, Pufferspeicher, Warmwasser und Heizkreise – mit den Messwerten, die deine Anlage tatsächlich liefert.

[English version](docs/README.en.md) · [Installation](#installation) · [Einrichtung](#einrichtung) · [Entwicklungsstand](#entwicklungsstand)

Die Karte baut auf der [Heat Pump Hydraulic Card von Sturmi77](https://github.com/Sturmi77/heatpump-hydraulic-card) auf. Die bekannte Darstellung der Wärmepumpe, die Heizkörper und die Mischer bleiben erhalten. Dazu kommen weitere Wärmeerzeuger und die Möglichkeit, auch umfangreichere Heizungsanlagen abzubilden.

> **Noch in Entwicklung:** Die aktuelle Version auf `main` ist `0.2.0-alpha.6`. Die erweiterte Rohrführung und die Übernahme älterer Konfigurationen werden auf einem separaten Zweig überarbeitet. Bitte sichere deine Kartenkonfiguration, bevor du eine Testversion installierst.

## Was kann die Karte?

- **Wärmeerzeuger:** Wärmepumpen, Holzvergaser, Öl-, Gas-, Pellet- und Elektrokessel sowie ETA-Hackschnitzelkessel.
- **Speicher:** Pufferspeicher, mehrere Speicher in Reihe und Warmwasserspeicher. Mehrere Temperaturfühler können die Temperaturschichtung sichtbar machen.
- **Heizkreise:** direkte und gemischte Heizkreise mit der vertrauten Heizkörper- und Mischerdarstellung.
- **Anlagenteile:** Ladepumpen, Heizstäbe, Umschaltventile, Rücklaufanhebung und passende Zusatzsymbole, etwa für Brennstofflager und Partikelabscheider.
- **Livewerte:** Temperaturen, Pumpenzustände, Kesselbetrieb und weitere vorhandene Home-Assistant-Sensoren.
- **Flexible Einrichtung:** Bauteile und ihre Verbindungen im Karteneditor anlegen, ohne Positionen auf einer Zeichenfläche festlegen zu müssen.

Nicht jede Kombination ist bereits abschließend getestet. Insbesondere komplexe gemeinsame Vor- und Rücklaufleitungen gehören noch zur laufenden Überarbeitung.

## Installation

**Über HACS**

1. HACS in Home Assistant öffnen.
2. Unter den benutzerdefinierten Repositories `https://github.com/BlueIceWolf/ha-hydraulic-plan-card` hinzufügen und als **Dashboard** eintragen.
3. Hydraulic Plan Card installieren.
4. Home Assistant im Browser neu laden und im Dashboard eine neue Karte hinzufügen.

**Manuell**

Die Datei [`dist/ha-hydraulic-plan-card.js`](dist/ha-hydraulic-plan-card.js) nach `/config/www/` kopieren und in Home Assistant unter den Dashboard-Ressourcen als JavaScript-Modul eintragen. Die URL lautet dann `/local/ha-hydraulic-plan-card.js`.

Die kleinste mögliche Kartenkonfiguration:

```yaml
type: custom:hydraulic-plan-card
```

Die Hydraulic Plan Card hat einen eigenen Kartentyp. Du kannst sie deshalb neben der ursprünglichen Heat Pump Hydraulic Card verwenden.

## Einrichtung

Öffne den Karteneditor und beginne mit den Teilen, die wirklich verbaut sind. Wähle zuerst den Wärmeerzeuger, anschließend die Speicher und Heizkreise. Weise danach die passenden Home-Assistant-Entitäten zu.

Für eine realistische Darstellung ist vor allem wichtig, **wie die Bauteile verbunden sind**. Ein Warmwasserspeicher kann beispielsweise direkt über ein Umschaltventil geladen werden oder über eine eigene Ladepumpe aus dem Pufferspeicher. Das sind unterschiedliche hydraulische Wege und sollten auch unterschiedlich eingetragen werden.

Die Karte ordnet die Komponenten selbstständig an. Bei größeren Anlagen lässt sich die Zeichnung verschieben beziehungsweise scrollen; eine Vollbildansicht ist vorhanden.

Ein einfaches Beispiel für eine Holzheizung:

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
  boiler_pump: switch.kesselladepumpe
  buffer_top: sensor.puffer_oben
  buffer_middle: sensor.puffer_mitte
  buffer_bottom: sensor.puffer_unten
```

Die Entitäten sind Beispiele. Ersetze sie durch die Namen aus deiner eigenen Home-Assistant-Installation. Du kannst die Zuordnung auch vollständig im Karteneditor vornehmen.

Weitere Hinweise: [Komponenten und Anschlüsse](docs/FREE_PLAN.md) · [Kessel und Messwerte](docs/BOILERS.md).

## Was bedeuten die bewegten Leitungen?

Die Animation zeigt an, **wo nach den zugeordneten Zuständen eine Zirkulation zu erwarten ist**. Dafür nutzt die Karte beispielsweise Pumpenmeldungen und vorhandene Volumenstromsensoren.

Ist eine zugeordnete Ladepumpe ausdrücklich ausgeschaltet, soll ihr Ladezweig nicht weiter animiert werden – weder im Vorlauf noch im Rücklauf. Ein gemessener Volumenstrom von null hat Vorrang vor einer bloßen Pumpenmeldung. Ohne ausreichende Daten bleibt die Animation bewusst aus.

Das ist keine Messung des tatsächlichen Durchflusses und keine hydraulische Simulation. Auch ein Mischer auf 0 oder 100 Prozent bedeutet nicht zwangsläufig, dass kein Wasser fließt. Die Karte ist eine **Anzeige**, keine Heizungsregelung und keine Sicherheitseinrichtung.

## Geräte automatisch erkennen

Bei unterstützten Geräten kann der Editor bereits vorhandene Entitäten aus Home Assistant zur Übernahme vorschlagen, unter anderem bei passenden **ETA-Hackschnitzelkesseln** und **EMS-ESP-Kesseln**. Die Vorschläge müssen bestätigt werden; die Karte fügt nicht eigenmächtig einen Kessel hinzu.

Ob ein EMS-ESP-Gerät mit Öl oder Gas arbeitet, lässt sich nicht immer sicher aus einer einzelnen Entität ableiten. Im Zweifel wählst du den Kesseltyp selbst. Manuelle Sensorzuordnungen bleiben wichtig.

## Vor einem Update

Gerade beim Wechsel auf eine neuere Testversion lohnt es sich, die YAML-Konfiguration der Karte zu kopieren oder ein Home-Assistant-Backup anzulegen.

Der neuere Komponentenplan arbeitet mit einer versionierten Konfiguration. Der Editor prüft ältere Pläne und kann die ursprüngliche Fassung sichern. Unklare Anschlüsse oder nicht eindeutig übernehmbare Bauteile sollen nicht stillschweigend umgebaut werden. Trotzdem ersetzt das keinen eigenen Sicherungsstand.

## Entwicklungsstand

Der Umbau findet im Zweig [`refactor/finish-unified-hydraulics-20261109`](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/tree/refactor/finish-unified-hydraulics-20261109) statt. Der dazugehörige [Pull Request #21](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/pull/21) ist **noch nicht freigegeben**.

Offen sind insbesondere die endgültig gemeinsame Rohrführung zwischen ursprünglicher und erweiterter Darstellung, die sichere Bewertung komplexer Flusswege, vollständige visuelle Vergleichstests und zusätzliche Tests mit älteren realen Kartenkonfigurationen.

Der genaue Prüfstand mit allen 29 Abnahmepunkten steht im [Abnahmeprotokoll](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/blob/refactor/finish-unified-hydraulics-20261109/docs/ACCEPTANCE-2026-11-09.md). Die [Architekturdokumentation](docs/HYDRAULIC_ARCHITECTURE.md) richtet sich an Mitentwickler.

### Fehler melden oder mitentwickeln

Wenn bei deiner Anlage Leitungen doppelt erscheinen, Anschlüsse fehlen oder eine Pumpe die falschen Rohre animiert, eröffne bitte ein [Issue](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/issues). Besonders hilfreich sind:

- die betroffenen Bauteile und deren tatsächliche Verbindung,
- ein Screenshot der Karte,
- die verwendete Kartenversion,
- eine anonymisierte Konfiguration ohne persönliche oder geheime Daten,
- der erwartete und der tatsächliche Zustand.

Für die lokalen Prüfungen werden Node.js ab Version 22 und Playwright verwendet:

```bash
npm ci
npm run syntax
npm run test
```

## Herkunft und Lizenz

Grundlage ist die [Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card) von **Sturmi77**. Vielen Dank für die ursprüngliche Karte und ihre Darstellung. Dieses Projekt führt sie unter der [MIT-Lizenz](LICENSE) weiter und ist kein offizieller Teil des Originalprojekts.
