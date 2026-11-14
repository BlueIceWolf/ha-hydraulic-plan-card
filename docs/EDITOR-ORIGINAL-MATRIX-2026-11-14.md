# Editor-Migration: Funktionsmatrix und Zwischenstand (14.11.2026)

## Ausgangspunkt

Verglichen wurden der Originaleditor in
`test/fixtures/heatpump-hydraulic-card.js` (insbesondere
`HeatpumpFlowCard._formSchema` und `HeatpumpFlowCardEditor`) und
`HydraulicPlanCardEditor` in `src/flexible-ui.js`.
Dies ist ein **Zwischenstand**, keine Abnahme des vollständigen
Entwicklerauftrags. Die Originalkarte wird nicht zurückgesetzt.

| Originalfunktion / Bereich | Ursprünglicher Ort | Stand vor dieser Änderung | Stand dieses Branches | Weiterer Bedarf |
| --- | --- | --- | --- | --- |
| Integrations-Preset | Erster Eintrag im Originalformular | Im Sammelmenü `original-options` | Wieder direkt unter **Allgemein**, aus dem Originalschema | Auswahl und Erkennung an flexibel zugeordnete Wärmepumpen koppeln |
| Automatische Preset-Entitäten | Original-Entitätsgruppen | Original-Presets werden erkannt; zusätzlich eigenständige EMS-ESP-Erkennung | Unverändert, vorhandene Erkennung nicht ersetzt | Gemeinsame, eindeutige Entitätenzuordnung |
| Geräte-/Herstellerdarstellung | Geräteoptionen und Original-SVG | Flexibler Gerätetyp und Hersteller-SVGs | Unverändert | Originaloptionen ohne doppelte Felder den Gerätebereichen zuordnen |
| Kältekreis-, Leistungs- und Zustandswerte | Entitätsgruppen im Originalformular | Unter `original-options`; neue Werte zusätzlich je Bauteil | Noch unvollständig integriert | In Wärmepumpe einordnen, Überschneidungen vermeiden |
| Weitere Wärmepumpenoptionen | Original „Advanced“ | Im Sammelmenü | Noch im Sammelmenü | Nach Funktion in Allgemein / Wärmepumpe / Speicher / Heizkreis aufteilen |
| Layout, Farben, Steuerung | Originalformular | Teilweise als HA-Form unter Allgemein und zusätzlich im Original-Advanced | Unverändert | Doppelte Felder endgültig vereinheitlichen |
| Puffer und Heizkreise | Originalgrafik plus neue Anlagenstruktur | Flexible Komponenten-Karten, automatische Standardverbindungen | Unverändert | Visuelle, hydraulische Komplettabnahme erforderlich |
| Warmwasser über Ventil | Originales Umschaltventil in der Grafik | Über mehrere voneinander abhängige Dropdowns | Direkte Wahl per **3-Wege-Umschaltventil** und Verbindungsvorschau | Exakte Übereinstimmung der Grafik im Betrieb manuell prüfen |
| Warmwasser über Pumpe / direkt | Neu im flexiblen Anlagenmodell | Gemeinsam mit Ventil im Dropdown | Je ein deutlich beschrifteter Auswahlbutton | Mehrere Quellen und Sonderhydrauliken prüfen |
| Bestehende direkte Pufferverbindung | Neue Hydraulikfunktion | Sicheres Umschalten im Modell, unklar im Editor | Explizite Nachfrage vor Ersatz der konkreten Vorlauf-/Rücklaufverbindung | Manuell bestätigte Spezialhydraulik weiterhin getrennt bearbeiten |
| Speichern und Wiederöffnen | Original `config-changed` | Ein gemeinsames gespeichertes Config-Objekt, Migration vorhanden | Preset-Picker nutzt denselben Speicherpfad; Vorschau- und Auswahlzustand bis zur Bestätigung ungespeichert | Mehrfachwärmeerzeuger und vollständige Migration prüfen |

## Bereits umgesetzt

- Originalen Preset-Selector wieder unter **Allgemein** eingebunden.
  Das ursprüngliche `HeatpumpFlowCard._formSchema` bleibt seine Quelle.
- Doppelte Entdeckungs-Hinweise unterhalb des gesamten Editors entfernt;
  die Vorschläge bleiben im Bereich **Allgemein**.
- Warmwasser-Bedienung in drei verständliche, direkt anklickbare
  Verbindungsarten umgebaut; je nach Auswahl eine kompakte Vorschau
  eingebunden.
- Bei eindeutig nur einem Wärmeerzeuger und einem Pufferspeicher wird
  für einen noch nicht angeschlossenen WW-Speicher die passende
  3-Wege-Hydraulik vorausgewählt – **ohne automatische Änderung des Plans**.
- Der Button zum Erstellen der Warmwasserverbindung greift weiter auf
  `HPC_FREE.connectDhwCharge` beziehungsweise
  `HPC_FREE.connectDhwBufferDiverter` zurück.
- Der Ersatz einer bestehenden direkten Erzeuger-Puffer-Verbindung
  erfordert eine ausdrückliche Bestätigung. Bei inkompatibler Hydraulik
  wird die Änderung abgelehnt statt heimlich verworfen oder überschrieben.
- Browserregressionen für die Auswahl, den 3-Wege-Anschluss,
  Konfigurationsbestand und den Abbruch ergänzt.

## Einschränkungen und nächster Arbeitsschritt

Der bisherige Sammelbereich für originale Kältekreis- und Detailoptionen
ist **noch vorhanden**. Er darf erst verschwinden, wenn jede ursprüngliche
Funktion einen eindeutigen Platz hat. Auch die parallelen originalen
und neuen Entitätenpfade müssen auf einen einzigen Datenverantwortlichen
zusammengeführt werden; ein reines Verschieben des Formulars wäre keine
Lösung. Speziell bei mehreren Wärmepumpen ist bislang keine saubere
1:n-Zuordnung zwischen globalen Originalfeldern und Gerätesensoren bewiesen.

Die vollständige Originalfunktionsmatrix inklusive „funktioniert /
speichert / lädt wieder“, Migrationstest aller Alt-Konfigurationen,
Heizkreis- und Pufferfälle, Browsertests in Home Assistant, grafische
Dreiwegeventil-Abnahme und alle hydraulischen Abnahmekriterien stehen
noch aus. Kein Merge auf `main`, kein HACS-Release und keine Behauptung
der vollständigen Fertigstellung, bevor diese Punkte erledigt sind.
