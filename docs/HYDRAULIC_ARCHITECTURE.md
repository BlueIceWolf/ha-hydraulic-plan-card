# Hydraulikarchitektur (Entwicklungsstand)

Diese Architektur erweitert die ursprüngliche **Heat Pump Hydraulic Card** und ersetzt **nicht** deren SVG-Stil, Piktogramme, Wärmepumpenauswahl oder Heizkreisdarstellung. Die Karte ist weiterhin eine Testversion und keine stabile HACS-Freigabe.

## Verantwortung der Module

| Modul | Aufgabe |
| --- | --- |
| `src/flexible-plan.js` | Komponententypen, Anschlussports, eindeutige IDs, Normalisierung und Anlegen von Leitungen |
| `src/hydraulic-network.js` | Zentrale Topologie, Puffersortierung, physische Rohrsegmente, gemeinsames Routing und Aktivierung der Flusszweige |
| `src/integrated-extension.js` | Ordnet die Komponenten ohne benutzergesteuerte Koordinaten an und zeichnet sie innerhalb **des originalen SVGs** |
| `src/flexible-ui.js` | Original-Karteneditor, Entitätsauswahl, Komponenten, Anschlüsse und Bestätigung der Migration |
| `src/migration.js` | Nichtdestruktive Übernahme, Versionierung, Validierung, Warnungen und Wiederherstellung |
| `src/ems-esp-detection.js` | Optionale, bestätigungspflichtige Geräteerkennung über bereits vorhandene Home-Assistant-Informationen |

### Editorzustände

Der Editor unterscheidet neue Karten, gültige Komponentenpläne, klassische Kartenkonfigurationen und unvollständige Pläne. Eine leere, unversionierte Stub-Konfiguration bleibt im Einrichtungsassistenten und wird nicht als migrierte Anlage gespeichert. Erst wenn der Nutzer den leeren Plan ausdrücklich startet oder Komponenten hinzufügt, wird er als Komponentenplan versioniert. Klassische Konfigurationen bleiben im Originaleditor, bis der Nutzer die Übernahme bestätigt; ungültige Pläne werden im Komponenteneditor mit Migrationshinweisen zur Korrektur angeboten.

Der installierbare HACS-Build liegt weiterhin in `dist/ha-hydraulic-plan-card.js`. Der ursprüngliche Build-, Installations- und Releasepfad bleibt erhalten.

## Hydraulische Topologie

Jede Verbindung identifiziert ein Quellbauteil mit **ausgehendem Port** und ein Zielbauteil mit **eingehendem Port**. Zu den tatsächlichen Wasseranschlüssen gehören unter anderem `flow`, `return`, `top_in`, `top_out`, `bottom_in`, `bottom_out`, `coil_in` und `coil_out`. Der Partikelabscheider und das Brennstoffsilo gehören nicht zum Wasserkreis; sie sind dem Kessel bzw. seinem Abgas- oder Brennstoffweg zugeordnet.

`HPC_NETWORK.graph(plan)` löst Komponenten und Verbindungen als gerichteten Graphen auf. `orderedBuffers(plan)` sortiert Pufferspeicher ausschließlich über die ausdrücklich verbundenen oberen Vorlaufanschlüsse. Rücklaufleitungen dürfen die Speicherreihenfolge nicht umkehren. Unvollständige Konfigurationen erzeugen keine neuen Heizungsanschlüsse.

### Positionierung

- Primäre Wärmeerzeuger bleiben auf dem ursprünglichen linken Anschlussbereich. Weitere Erzeuger werden in dessen Erweiterungsbereich ergänzt.
- Der erste Pufferspeicher bleibt im originalen SVG. Zusätzliche Pufferspeicher werden automatisch geordnet und auf separaten Anschlusspositionen ergänzt.
- Warmwasserspeicher bleiben oberhalb des Puffers in der Speicherzone, auch wenn ihre Heizwendel aus einem Puffer geladen wird. Direkt geladene erste Speicher behalten die originale SVG-Position; weitere Speicher werden kompakt daneben angeordnet.
- Eine konfigurierte Ladepumpe oder ein Umschaltventil steht direkt vor dem Coil-Eingang in der Speicherzone und ist kein separater großer Bedienkasten.
- Heizkreise behalten die originalen Heizflächen und Mischerpiktogramme.

Die Anordnung orientiert sich an echten Verbindungen; vorhandene alte `x`/`y`-Felder werden für die Darstellung ignoriert, aber bei der Normalisierung nicht gelöscht. Der Heizwendel-Rücklauf folgt den tatsächlichen Coil- und Pufferports um Tank und Pufferspeicher zum Verbraucheranschluss des Puffers, statt um die Heizkreiszone herum.

## Rohrsegment-Routing

`HPC_NETWORK.route()` erstellt eine orthogonale Leitung zwischen zwei realen Anschlussports. Die Seite eines Anschlusses stammt aus der Portdefinition des Bauteils: Die Puffer-Vorläufe `top_out` und `mid_out` liegen rechts; der erzeugerseitige Rücklauf `bottom_out` liegt links, während der verbraucherseitige Rücklauf `bottom_in` rechts liegt. Der Heizkreis-Rücklauf `return_out` bleibt links, weil das Original-Heizkörpersymbol dort angeschlossen ist. Die Position und Seite dürfen nicht aus einem vermuteten Standard für alle Bauteile abgeleitet werden.

`mergeRoutes()` zerlegt die geometrischen Leitungswege in horizontale und vertikale Teilstücke, erkennt kollineare Überlappungen und gibt gemeinsame **physische Rohrsegmente einmalig** aus. Vorlauf und Rücklauf bleiben eigene Segmente. Es darf dadurch nicht ein zweiter Strich über einer vorhandenen Sammelleitung liegen.

Die Darstellung nutzt weiterhin die Rohr- und Fluss-CSS-Klassen des Originals. Für die originalen Heizkreise liefert der gemeinsame Router jetzt die externen Vorlauf- und Rücklaufpfade: `_syncNativeCircuitFlow` ersetzt die alten Pfaddaten durch die berechneten Segmente und leert die früheren festen Steig- und Sammelleitungen. Die Heizkörper-, Pumpen- und Mischerzeichnungen bleiben erhalten. Auch die Sonderwege für Heizkreis-Rückläufe und Rücklaufanhebungen müssen die Bauteilgrenzen beim Routing berücksichtigen. Gemeinsame horizontale und vertikale Segmente werden nur einmal gezeichnet. Ob diese Wege in jeder denkbaren Anlagenvariante sauber verlaufen, ist damit **noch nicht visuell nachgewiesen**.

## Hydraulische Temperaturanzeigen

Für Wärmeerzeuger werden Vorlauf- und Rücklaufwerte nur dann zentral an einem Rohr beschriftet, wenn der jeweilige Sensor einen numerischen Messwert liefert und der entsprechende Komponentenport tatsächlich geroutet ist. Die Position wird aus einem Segment des zusammengeführten physischen Rohrwegs berechnet; Komponenten, andere Rohrsegmente und bereits belegte Labelbereiche werden dabei gemieden. Labelidentität ist **Komponenten-ID plus Messwertrolle** (`flow` oder `return`), niemals der formatierte Zahlenwert.

Die zentrale Rohrbeschriftung ist die einzige Anzeige desselben Messpunkts. Das Original-SVG behält seine bestehenden Texte als Fallback: `t-vl` und `t-rl` werden für alle Wärmeerzeuger, `t-boiler-flow` zusätzlich für Kessel nur geleert, wenn das zugehörige zentrale Label tatsächlich erzeugt wurde. So werden auch die vom Original-Kesselrenderer parallel gesetzten VL-/RL-Texte unterdrückt. Fehlende Sensorwerte, ungültige Werte oder nicht angeschlossene Ports behalten dadurch die bisherige Originalanzeige. Die Unterdrückung wird bei wiederholten Hass-Updates erneut angewendet, ohne die Sensorzuordnung oder andere Kesselanzeigen zu verändern.

## Durchfluss

`HPC_NETWORK.flowStates()` ist eine konservative Anzeige von plausibel durchströmten Zweigen:

- **Gemessene Null** am zugeordneten Volumenstromsensor sperrt die Animation, auch wenn eine Pumpe als eingeschaltet gemeldet ist.
- Eine ausdrücklich ausgeschaltete Ladepumpe sperrt den zugehörigen Warmwasserkreis **im Vorlauf und Rücklauf**. Unabhängige Heizkreise bleiben getrennt.
- Eine positiv gemeldete Pumpe oder ein positiv gemeldeter Leitungsfluss erlaubt eine Animation ausschließlich auf den angeschlossenen, nicht gesperrten Segmenten. Ein Pumpenstatus ist **kein gemessener Durchfluss**.
- Ein 3-Wege-Umschaltventil besitzt einen gemeinsamen Anschluss `AB` und zwei Ausgänge `A`, `B`. Die Zuordnung der echten Warmwasserstellung (`dhw_state`) und Heizstellung (`heating_state`) erfolgt im Karteneditor. Ohne gesicherten Ventilstatus werden beide Ausgänge nicht fälschlich animiert; numerische Stellungen wie `0`/`100` werden ohne explizite Zuordnung **nicht** interpretiert.
- Ein Mischerwert von `0 %` oder `100 %` beweist allein **keine Durchflusssperre**.
- Unbekannte Werte führen nicht zur Berechnung erfundener genauer Durchflussmengen.

**Sicherheit:** Dies ist eine ausschließlich lesende Hydraulikvisualisierung, kein physikalischer Hydraulikrechner, kein Ersatz für Messungen, keine Schutzeinrichtung und kein Stellorgan.

## Migration (Schema v3)

Die Konfiguration führt `hpc_schema_version: 3` und bewahrt beim ersten Upgrade `hpc_migration_backup` als unveränderte Sicherung auf.

1. Vor dem Update die Dashboard-Karte als YAML exportieren oder die Home-Assistant-Konfiguration sichern.
2. Einen vorhandenen klassischen Heizungsplan bei Bedarf im Editor bewusst in Komponenten übernehmen. Vorhandene Messwerte und Generatorarten werden behalten; ein unbekannter Leitungsverlauf wird **nicht** erfunden.
3. Eine vorhandene v1/v2-Komponentenkonfiguration wird auf bekannte Anschlussbezeichnungen umgestellt, ohne ihre Quellkonfiguration zu verändern. Mehrdeutige Warmwasser-Heizwendeln, unbekannte Bauteile oder nicht eindeutig migrierbare Felder werden **blockiert und angezeigt**, nicht verworfen.
4. Die erste Ausgangsfassung bleibt in `hpc_migration_backup`. Eine neue, noch leere Stub-Karte wird nicht als Bestandskonfiguration migriert. Der Editor bietet das bewusste Wiederherstellen an; danach unterdrückt `hpc_migration_skip_auto` ein ungewolltes sofortiges Re-Upgrade.
5. Wiederholtes Öffnen/Upgraden einer v3-Konfiguration ändert nichts. Auch Konfigurationen mit einer zukünftigen höheren Schemaversion werden nicht zurückmigriert.

**Beispiel für Pufferladepumpe** (Entitäten entsprechend der eigenen Anlage ersetzen):

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
        volume: sensor.ww_volumenstrom
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

## Tests und verbleibende Grenzen

`npm run check` prüft die Paket-Syntax und Browserregressionen mit Chromium und Firefox. Zusätzliche Tests sind `test/network.html`, `test/migration.html` sowie die vorhandenen `test/hydraulic-plan.html`, `test/topology.html` und `test/selftest.html`. Der GitHub-Workflow führt HACS-Validierung und beide Browser aus.

Der gemeinsame Router verarbeitet inzwischen auch die äußeren Leitungen der originalen Heizkreise. Die ursprüngliche Karte stellt jedoch weiterhin das Grundlayout und die Bauteilzeichnungen bereit; vollständige Unabhängigkeit von allen historischen Geometrieannahmen ist nicht nachgewiesen. Für komplexe Verschaltungen fehlen noch feste Bildreferenzen in mehreren Bildschirmbreiten und Themes sowie eine vollständige Prüfung unvollständiger Verbindungen. Unbekannte Ventil- und Mischervarianten lassen sich nicht zuverlässig allein aus einer Prozentanzeige ableiten. Bei neuen Anlagen die Anschlüsse und Zustands-Entitäten ausdrücklich zuordnen und die Darstellung gegen die wirkliche Verrohrung prüfen.
