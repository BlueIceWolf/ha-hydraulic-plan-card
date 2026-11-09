# Abnahmeprotokoll – Hydraulic Plan Card (09.11.2026)

**Status: NICHT FREIGEGEBEN.** Dieses Protokoll ist eine ehrliche Soll-Ist-Prüfung der 29 Kriterien aus der vollständigen Entwicklerspezifikation vom 09.11.2026. Grüne Tests allein sind keine Freigabe für `main`. Prüfstände beziehen sich auf `refactor/finish-unified-hydraulics-20261109`.

## Nachgewiesene Korrekturen im Zweig

- Die komplette vorhandene Playwright-Suite wird in Chromium und Firefox ausgeführt; `playwright.config.mjs` schließt zusätzliche `*.spec.mjs` nicht mehr aus.
- Der JavaScript-Syntaxfehler durch doppelte `nativeSvg`-Deklaration im Browserharness ist beseitigt.
- Layout- und Anlagen-Testharnesses stellen die originalen Wärmepumpen-Galeriekonstanten bereit.
- `HPC_FREE.normalize` und `HPC_MIGRATION.check` unterstützen existierende gemischtschreibweise IDs konsistent; unbekannte Plan-Metadaten werden übernommen.
- `HPC_NETWORK.flowStates` begrenzt Pumpenwirkung an Speichern/Erzeugern und berücksichtigt nicht verfügbare Fremdpumpen. Separate WW-Lade- und Heizkreise unterdrücken einander nicht.
- Die früher fest gezeichneten Heizkreis-Sammel- und Steigleitungen wurden für den integrierten Plan deaktiviert. Stattdessen werden ihre Vor- und Rücklaufpfade aus dem gemeinsamen Rohr-Router gespeist. Der Router berücksichtigt inzwischen die Bauteilgrenzen beim Umfahren.\n- Der installierbare `dist/ha-hydraulic-plan-card.js` stimmt nach der Nachsynchronisierung wieder mit den sechs Quellmodulen überein; HACS, Syntax sowie Chromium- und Firefox-Tests liefen für Commit `9a2a897` erfolgreich.\n- README sowie die Anleitungen für Kessel und Komponenten wurden auf Deutsch neu gefasst; ein englischer Einstieg ist ergänzt.

## Einzelprüfung der 29 ursprünglichen Abnahmekriterien

**Legende:** *Testabdeckung* = eine automatisierte Prüfung existiert, aber eine vollständige Freigabe ist nicht nachgewiesen. *Teilweise* = Funktionsprüfung oder Implementierung noch unvollständig. *Offen* = der entscheidende Nachweis fehlt.

| Nr. | Kriterium | Stand | Evidenz oder Restarbeit |
| --- | --- | --- | --- |
| 1 | Originalkarte klar erkennbar | Testabdeckung | Original-SVG und Fixture werden verwendet; keine vollständige visuelle Bildabnahme |
| 2 | Ursprüngliche Funktionen vollständig | Teilweise | Galerien, Typen und Anzeigeoptionen geprüft; vollständige Originalvergleichsmatrix fehlt |
| 3 | Wärmeerzeuger links | Testabdeckung | `test/layout-stress.html`, `test/system-cases.html` |
| 4 | Pufferspeicher zentral | Testabdeckung | Layout- und Netzwerkprüfungen |
| 5 | Verbraucher rechts | Testabdeckung | Layoutprüfungen; Sondertopologien noch nicht vollständig visuell abgenommen |
| 6 | Puffer-WW mit Ladepumpe rechts | Testabdeckung | Browser-Gesamttest prüft Verbraucherposition und Pumpe |
| 7 | Weitere WW-Einbindungen | Teilweise | Umschaltventil und Rücklaufpfade getestet; alle mehrdeutigen Verschaltungen fehlen |
| 8 | Mehrere Pufferspeicher korrekt | Teilweise | Reihenfolge, Reihen-/Parallel-Graph und Layouttests; komplexe Sammelleitungen noch zu prüfen |
| 9 | Direkte/gemischte Heizkreise | Testabdeckung | Editor-Mischer-Auswahl, ursprüngliche Heizkreisgrafik, Graph |
| 10 | Original-Heizkörper und -Mischer | Testabdeckung | SVG-Strukturauswahl gegen Original-Fixure, keine vollständigen Bildreferenzen |
| 11 | Original-Wärmepumpen-/Außengeräteauswahl | Testabdeckung | Browser prüft Herstellerillustrationen und persistierte Auswahl |
| 12 | Holzvergaser-Rücklauf | Teilweise | Rücklaufanhebung und Mischer-Piktogramm getestet; Topologievarianten nicht vollständig |
| 13 | Pellet-/Hackgut-Zusatzpiktogramme | Testabdeckung | Kessel- und Lagersymbole in Browser-Tests |
| 14 | Partikelabscheider korrekt zugeordnet | Testabdeckung | Abgasgerät unabhängig vom Heizwasserkreis getestet |
| 15 | Vorlauf/Rücklauf korrekt | Teilweise | Ports und Richtungen geprüft; nicht jede Netztopologie gegen reale Hydraulik validiert |
| 16 | Keine doppelten gemeinsamen Rohrsegmente | Testabdeckung | Gemeinsam genutzte Rohrsegmente werden zusammengeführt; äußere Original-Heizkreisleitungen beziehen ihre Pfade jetzt ebenfalls aus dem Router. Sondertopologien ohne Bildreferenzen noch nicht freigegeben |
| 17 | Keine offenen oder unnötigen Rohre | Offen | Systematische Prüfung unvollständiger/offener Graphen und aller Layoutvarianten fehlt |
| 18 | Pumpen direkt in Leitungen | Testabdeckung | WW-Ladepumpe und Kessel-/Heizkreispiktogramme im Browser geprüft |
| 19 | Hydraulisch plausible Flussanimation | Teilweise | Pumpengrenzen und Sensorstatus getestet; vollständige geschlossene-Weg-Prüfung fehlt |
| 20 | WW-Pumpe aus: gesamter Ladezweig aus | Testabdeckung | `test/network.html` und Browser-Gesamttest inklusive unabhängiger HK |
| 21 | Keine doppelten Temperaturen/Beschriftungen | Offen | Vollständige SVG-Kollisions- und Textduplikatprüfung fehlt |
| 22 | Vollautomatisches Layout | Teilweise | Kollisionstest und deterministische Sortierung vorhanden; Sonderfälle/Viewport-Referenzen offen |
| 23 | Visueller Editor stabil | Teilweise | HA-Entity-Picker, Reihenfolge und Konfigurationsdialog getestet; keine umfassende Mehrstunden-Interaktion |
| 24 | Keine ungewollten Voll-Reloads | Testabdeckung | Fokus und partielle Editor-Eingaben nach HA-Updates im Browser geprüft |
| 25 | Alle unterstützten Altversionen migriert | Teilweise | Original-/v2-/v3- und Mehrdeutigkeits-Tests; vollständige Bestandsmatrix nicht verfügbar |
| 26 | Keine Entitätszuordnungen verloren | Teilweise | Snapshot, Rollback und Erweiterungsfelder getestet; nicht jede bekannte/unspezifizierte Konfigurationsform |
| 27 | Migrationsprobleme sichtbar | Testabdeckung | `HPC_MIGRATION.check` meldet unbekannte Bauteile/Leitungen und verhindert unsicheres automatisches Umschreiben |
| 28 | Automatische Tests UND visuelle Regression erfolgreich | Offen | Playwright/Netzwerk vorhanden; reproduzierbare Bildreferenzen für A–F und alle Themes/Breiten fehlen |
| 29 | Dokumentation/Beispiele aktualisiert | Teilweise | Deutsche README und deutsche Komponenten-/Kesselhilfen überarbeitet; englischer Einstieg vorhanden. Vollständig getestete Beispielmatrix und Release-Anleitung fehlen noch |

## Freigabesperren

1. **Architektur und Sonderfälle:** Der gemeinsame Router steuert jetzt auch die äußeren Original-Heizkreisleitungen. Die Hauptansicht setzt aber weiterhin Teile des klassischen Layouts ein. Ob alle Sondertopologien ohne doppelte, implizite oder kollidierende Leitungen dargestellt werden, ist noch nicht umfassend belegt.
2. **Hydraulik:** Die Flussinferenz begrenzt fremde Pumpenkreise, weist aber nicht generell nach, dass jede animierte Verbindung Bestandteil eines vollständig geschlossenen Kreislaufs ist. Einige historische Tests arbeiten mit bewusst unvollständigen Rohrgraphen.
3. **Visuelle QA:** Vergleichbare feste Screenshot-Referenzen für die sechs Testanlagen, Bildschirmbreiten und Themes fehlen.
4. **Migration:** Reale alte Kundenkonfigurationen und vollständige v1/v2/v3-Varianten fehlen als Abnahme-Fixtures.
5. **Release:** Bis diese Punkte erledigt sind, bleibt PR #21 ein Entwurf. Keine Versionsfreigabe und kein Merge nach `main`.

## Reproduzierbare Prüfungen

```bash
npm ci
npx playwright install --with-deps chromium firefox
npm run syntax
npm run test:chromium
npm run test:firefox
```

Der GitHub-Workflow prüft HACS separat. Die CI-Ergebnisse gelten nur für den jeweiligen Commit, nicht pauschal für spätere Änderungen.

Dieses Protokoll ist eine technische Checkliste zur vollständigen Abnahme, kein Ersatz für fehlende Implementierungen oder Tests.
