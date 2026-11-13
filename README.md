# Hydraulic Plan Card

![Hydraulic Plan Card](https://raw.githubusercontent.com/BlueIceWolf/ha-hydraulic-plan-card/main/docs/marketplace-icon.svg)

**Ein Hydraulikschema für deine Heizung in Home Assistant.** Wärmepumpe, Öl- oder Holzkessel, Pufferspeicher, Warmwasser und Heizkreise – mit den Messwerten, die deine Anlage tatsächlich liefert.

[English version](docs/README.en.md) · [Installation](#installation) · [Einrichtung](#einrichtung) · [Entwicklungsstand](#entwicklungsstand)

Die Karte baut auf der [Heat Pump Hydraulic Card von Sturmi77](https://github.com/Sturmi77/heatpump-hydraulic-card) auf. Die bekannte Darstellung der Wärmepumpe, die Heizkörper und die Mischer bleiben erhalten. Dazu kommen weitere Wärmeerzeuger und die Möglichkeit, auch umfangreichere Heizungsanlagen abzubilden.

> **Noch in Entwicklung:** Aktuelle Entwicklerversion: `v0.2.0-alpha.10`. Die gemeinsame Rohrführung und Migration sind integriert, aber die vollständige hydraulische und visuelle Abnahme ist noch offen. Sichere deine Kartenkonfiguration vor einem Update.

## Was kann die Karte?

- **Wärmeerzeuger:** Wärmepumpen, Holzvergaser, Öl-, Gas-, Pellet- und Elektrokessel sowie ETA-Hackschnitzelkessel.
- **Speicher:** Pufferspeicher, mehrere Speicher in Reihe und Warmwasserspeicher. Mehrere Temperaturfühler können die Temperaturschichtung sichtbar machen.
- **Heizkreise:** direkte und gemischte Heizkreise mit der vertrauten Heizkörper- und Mischerdarstellung.
- **Anlagenteile:** Ladepumpen, Heizstäbe, Umschaltventile, Rücklaufanhebung und passende Zusatzsymbole, etwa für Brennstofflager und Partikelabscheider.
- **Livewerte:** Temperaturen, Pumpenzustände, Kesselbetrieb und weitere vorhandene Home-Assistant-Sensoren.
- **Flexible Einrichtung:** Bauteile und ihre Verbindungen im Karteneditor anlegen, ohne Positionen auf einer Zeichenfläche festlegen zu müssen.

Nicht jede Kombination ist bereits abschließend getestet. Insbesondere komplexe gemeinsame Vor- und Rücklaufleitungen gehören noch zur laufenden Überarbeitung.

## Versionen und Updates

HACS-Versionen erhalten ab `v0.2.0-alpha.10` nachvollziehbare GitHub-Releases
statt der Commit-Kurznummern. Nach einer Änderung an `dist/ha-hydraulic-plan-card.js`
wird eine neue Release-Version nur dann erstellt, wenn zuvor die Versionsnummer
in `package.json` erhöht wurde und das Bundle dieselbe Version enthält.
Das Workflow-Ergebnis unter **Actions → Publish HACS version** zeigt an,
ob die Veröffentlichung erfolgreich war.

**Versionsschema:** `v0.2.0-alpha.10`, `v0.2.0-alpha.11`, ...; eine
stabile `v0.2.0` erst nach vollständiger Abnahme.
Für eine weitere Veröffentlichung: Version in `package.json` erhöhen,
`npm run build` ausführen und beide Dateien gemeinsam committen.

In HACS: **Hydraulic Plan Card → ⋮ → Informationen aktualisieren**,
danach **⋮ → Neu herunterladen** und die gewünschte Version wählen.
Falls ein Browser noch den alten Stand anzeigt: Dashboard hart neu laden.

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

Bei unterstützten Geräten kann der Editor vorhandene Home-Assistant-Entitäten zur Übernahme vorschlagen, unter anderem bei **ETA-Hackschnitzelkesseln** und **EMS-ESP-Geräten**. Eine EMS-ESP-Wärmepumpe kann dabei ausdrücklich ausgewählt werden. Eine Kompatibilitätsliste im Gerätenamen gilt nicht als Nachweis des installierten Modells.

Die Übernahme erfolgt erst nach deiner Bestätigung. Der allgemeine EMS-ESP-Brennerstatus wird nicht als Verdichterstatus behandelt, und thermische Kesselleistung wird nicht als elektrische Wärmepumpenleistung zugeordnet. Öl oder Gas wird nur bei eindeutigen Geräteinformationen vorgeschlagen; andernfalls wählst du den Typ selbst. Manuelle Namen und Sensorzuordnungen bleiben erhalten.

## Vor einem Update

Gerade beim Wechsel auf eine neuere Testversion lohnt es sich, die YAML-Konfiguration der Karte zu kopieren oder ein Home-Assistant-Backup anzulegen.

Der neuere Komponentenplan arbeitet mit einer versionierten Konfiguration. Der Editor prüft ältere Pläne und kann die ursprüngliche Fassung sichern. Unklare Anschlüsse oder nicht eindeutig übernehmbare Bauteile sollen nicht stillschweigend umgebaut werden. Trotzdem ersetzt das keinen eigenen Sicherungsstand.

## Entwicklungsstand

Die gemeinsame Darstellung und die EMS-ESP-Erkennung werden auf `main` weiterentwickelt. Die Karte bleibt eine Testversion: Für komplexe Anlagen, vollständige visuelle Referenzen und alle unterstützten Alt-Konfigurationen ist die Abnahme noch nicht abgeschlossen. Issue [#20](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/issues/20) und das [Abnahmeprotokoll](docs/ACCEPTANCE-2026-11-09.md) führen die offenen Nachweise auf. Die [Architekturdokumentation](docs/HYDRAULIC_ARCHITECTURE.md) richtet sich an Mitentwickler.

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
npm run build
npm run syntax
npm run test
```

`npm run build` erzeugt den installierbaren Bundle aus den Quellmodulen. Die CI prüft, dass der erzeugte Bundle eingecheckt ist.

## Herkunft und Lizenz

Grundlage ist die [Heat Pump Hydraulic Card](https://github.com/Sturmi77/heatpump-hydraulic-card) von **Sturmi77**. Vielen Dank für die ursprüngliche Karte und ihre Darstellung. Dieses Projekt führt sie unter der [MIT-Lizenz](LICENSE) weiter und ist kein offizieller Teil des Originalprojekts.
