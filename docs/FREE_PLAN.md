# Komponenten und Rohrverbindungen / Integrated hydraulic plan

[Zur Übersicht](../README.md) · [English guide](README.en.md)

Neben der klassischen Wärmepumpenansicht gibt es einen erweiterten Komponentenplan. Er ist dafür gedacht, auch eine Heizung mit mehreren Wärmeerzeugern, Pufferspeichern, Ladepumpen und Heizkreisen übersichtlich abzubilden.

Die Zeichnung bleibt **eine gemeinsame Karte**. Es gibt keine zweite Grafik, zwischen der man hin- und herschalten muss. Bauteile werden automatisch angeordnet; Positionen in Pixeln müssen nicht eingetragen werden.

## Eine Anlage einrichten

1. **Wärmeerzeuger wählen:** beispielsweise eine Wärmepumpe, einen Holzvergaser oder einen Ölkessel.
2. **Speicher und Heizkreise ergänzen:** nur die Bauteile, die tatsächlich vorhanden sind.
3. **Anschlüsse verbinden:** Vorlauf mit Vorlauf, Rücklauf mit Rücklauf und bei Warmwasser den Weg zur Heizwendel beachten.
4. **Sensoren zuordnen:** Temperaturen, Betriebszustände, Ladepumpen und gegebenenfalls gemessene Volumenströme.
5. **Zeichnung prüfen:** Vor allem bei Mischern, Umschaltventilen und mehreren Puffern muss die Darstellung zur realen Anlage passen.

Wärmeerzeuger erscheinen links, Pufferspeicher im mittleren Bereich und Verbraucher rechts. Ein Warmwasserspeicher, der über eine Ladepumpe vom Puffer versorgt wird, gehört zu den Verbrauchern. Die Pumpe wird als kleines Symbol **direkt in der Leitung** dargestellt.

## Puffer und Heizkreise

Bei mehreren Puffern ist die Anschlussreihenfolge entscheidend. Die Funktion **Puffer in Reihe verbinden** legt die zugehörigen Vorlauf- und Rücklaufverbindungen an. Eine reale Parallelschaltung darf nicht als Reihenschaltung eingetragen werden.

Heizkreise können direkt oder gemischt ausgeführt werden. Die ursprünglichen Heizkörper- und Mischerbilder werden beibehalten. Zugeordnete Pumpen und Mischer bestimmen die sichtbaren Betriebszustände, ersetzen aber keine Messung des hydraulischen Durchflusses.

Jeder Puffer kann mehrere Temperaturfühler erhalten. Für zusätzliche Fühler lässt sich die Einbauhöhe hinterlegen; daraus entsteht eine Temperaturverteilung. Fehlen Messwerte, werden keine Temperaturen dazwischen erfunden.

## Wann bewegt sich das Wasser im Bild?

Die Karte arbeitet mit den Zuständen, die Home Assistant liefert. Dazu zählen die Pumpenmeldung und – falls vorhanden – ein gemessener Volumenstrom an der jeweiligen Leitung.

- Eine gemessene Null bedeutet: Für diese Leitung wird kein Fluss angezeigt.
- Eine zugeordnete, ausgeschaltete Ladepumpe hält ihren Ladezweig an, einschließlich Rücklauf.
- Ein unabhängiger Heizkreis darf dadurch nicht ebenfalls ausgeschaltet wirken.
- Ein Umschaltventil benötigt seine tatsächliche Zuordnung der Anschlüsse und Stellungen.
- Mischerpositionen von 0 % oder 100 % bedeuten nicht automatisch, dass ein Ventil geschlossen ist.

Die Animation ist eine **plausible Zustandsanzeige**, keine Berechnung der Druckverluste oder Wassermengen. Gerade bei verzweigten Anlagen können unvollständige Sensoren oder Anschlüsse zu einer unvollständigen Darstellung führen.

## Beispiel: Warmwasser aus dem Puffer laden

Dieses Beispiel zeigt einen Puffer, eine Ladepumpe und die Heizwendel eines Warmwasserspeichers. Es ist ein **Ausschnitt aus dem Komponentenplan**, kein vollständiges Hydraulikschema. Weitere Leitungen und Bauteile müssen passend zur eigenen Anlage ergänzt werden.

```yaml
type: custom:hydraulic-plan-card
preset: none
hpc_schema_version: 3
plan:
  components:
    - id: puffer_1
      type: buffer
      name: Pufferspeicher
      sensors:
        top: sensor.puffer_oben
        bottom: sensor.puffer_unten
    - id: ww_pumpe
      type: pump
      name: Ladepumpe
      sensors:
        state: switch.ww_ladepumpe
    - id: ww_1
      type: dhw_tank
      name: Warmwasserspeicher
      options:
        connection_style: branch
      sensors:
        top: sensor.ww_oben
  connections:
    - id: ww_vl1
      from: puffer_1
      from_port: top_out
      to: ww_pumpe
      to_port: in
    - id: ww_vl2
      from: ww_pumpe
      from_port: out
      to: ww_1
      to_port: coil_in
    - id: ww_rl
      from: ww_1
      from_port: coil_out
      to: puffer_1
      to_port: bottom_in
```

Im Alltag ist der Karteneditor der einfachere Weg. YAML ist hilfreich, wenn man seine Anlage sichern, vergleichen oder einen Fehler melden möchte.

## Ältere Karten übernehmen

Der erweiterte Plan verwendet derzeit das Schema `hpc_schema_version: 3`. Frühere Komponentenpläne können geprüft und bei eindeutiger Zuordnung übernommen werden; der ursprüngliche Stand wird als Migrationssicherung erhalten. Ist eine Verbindung nicht eindeutig, soll der Editor darauf hinweisen, statt Rohre zu erraten oder Sensoren zu löschen.

**Vor jedem Alpha-Update** bitte die Karten-YAML sichern. Für die Wiederherstellung in der Karte gibt es eine eigene Funktion, sie ersetzt aber kein Home-Assistant-Backup.

## Stand der Entwicklung

Die Verbindung der alten Heizkreiszeichnung mit der neuen Rohrführung sowie die Animation in komplizierten Anlagentopologien sind noch Gegenstand der Tests. Auch die Migration sämtlicher älterer Varianten ist nicht vollständig belegt.

Die offenen und geprüften Punkte sind im [Abnahmeprotokoll](https://github.com/BlueIceWolf/ha-hydraulic-plan-card/blob/refactor/finish-unified-hydraulics-20261109/docs/ACCEPTANCE-2026-11-09.md) nachvollziehbar aufgelistet.

---

## In English

The integrated editor lets you add real heat generators, buffers, circuits, pumps and port-to-port connections to the familiar original schematic. Layout is automatic; you never need to provide component coordinates.

Put heat sources on the left, buffers in the middle and loads on the right. A buffer-fed hot-water coil is shown as a load with its pump directly in the pipe. Only connect ports that exist in your actual installation.

Pipe animation is inferred conservatively from mapped pumps and flow sensors. A pump command is not proof of water flow. This alpha does not provide a physical flow solver, and some complex routing or migration cases remain open. Back up your YAML before updating.
