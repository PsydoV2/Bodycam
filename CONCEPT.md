# Bodycam — Redesign-Konzept

Inoffizielles Fan-/Portfolio-Projekt zur Website von [Bodycam](https://store.steampowered.com/app/2406770/Bodycam/) (Reissad Studio). Dieses Dokument ist die gemeinsame Referenz für alle, die daran arbeiten (Mensch oder Agent) — es beschreibt die Vision, nicht die Implementierung. Tech-Stack-Entscheidungen kommen bewusst erst nach diesem Dokument.

Original-Website zum Vergleich: https://reissad.com/

---

## 1. Leitidee

> Die Website verhält sich wie eine laufende Bodycam-Aufnahme — nicht wie eine Werbeseite über eine.

Das Original-Reissad.com ist ein sauberes, aber generisches Framer-Template. Es zeigt Bodycam-Footage, *ist* aber selbst keine Bodycam-Erfahrung. Der Unterschied ist der ganze Punkt dieses Redesigns.

Alles, was gebaut wird, sollte an dieser Frage gemessen werden: **Fühlt sich das an wie ein Auszug aus einer echten Aufnahme, oder wie eine Website, die Aufnahmen zeigt?**

### Nicht-Ziele
- Kein generisches "AI-Gaming-Landingpage"-Layout (Cards mit Schatten, Gradient-Wischer, ALL-CAPS-Eyebrows über jeder Section)
- Kein Feature-Overkill — lieber ein starker, konsequent durchgezogener Signature-Moment als zehn halbe Effekte
- Keine Holzhammer-Militär-Ästhetik (Tarnmuster, Stacheldraht-Rahmen) — das Spiel ist roh und dokumentarisch, nicht "Call of Duty Recruiting Page"

---

## 2. Design-Tokens

### Farbe
Abgeleitet direkt aus dem Bildmaterial (verbrannter Wald, Sandfarben Trainingsgelände, Rost/Blut-Akzente), nicht aus einem generischen Gaming-Preset.

| Rolle | Hex | Verwendung |
|---|---|---|
| Basis (fast schwarz) | `#08090a` | Seitenhintergrund |
| Oberfläche | `#111311` | Cards, Panels |
| Text primär | `#f2efe6` | Headlines |
| Text sekundär | `#b9b6ab` | Fließtext |
| Text gedämpft | `#7c7a70` | Meta/HUD-Nebentext |
| Akzent (REC/Warnung) | `#e2453f` | Einziger Farbakzent — REC-Punkt, Primary-CTA, kritische Marker |
| Sand/Erde | `#a9906a` | Sekundäre Flächen, dokumentarische Wärme (Trainingsgelände-Holz) |
| Rand/Linie | `rgba(228,225,214,0.3)` | Hairline-Borders |

**Regel:** Ein einziger Farbakzent (Rot). Alles andere ist Graustufen/Sand. Keine zweite "Pop"-Farbe — Disziplin ist hier Teil der Ästhetik.

### Typografie
- **Display/Headlines:** Inter (500), sentence case, keine All-Caps-Headlines
- **HUD/Meta/Labels:** JetBrains Mono — für alles, was wie "Systemtext" wirken soll (Timestamps, Kamera-IDs, Sektor-Tags)
- **Fließtext:** Inter (400), Zeilenlänge < 70 Zeichen

Die Mono-Schrift ist kein generisches "Tech-Label"-Gimmick hier — sie hat eine diegetische Begründung (HUD-Overlay einer echten Kamera), das rechtfertigt die Verwendung.

### Layout
- Linksbündig, große Ruhe-Flächen. Kein zentrierter Hero-Text.
- Volle Bildbreite für alle Screenshots/Clips — nichts wird in kleine Cards gequetscht
- Großzügiger Negativraum zwischen Sections (kein dichtes Grid)

---

## 3. Signature-Elemente

Das ist der Teil, in den die Boldness fließt — der Rest bleibt bewusst ruhig.

### 3.1 Der Aufnahme-Rand (wichtigstes Element)
Jede große Bildfläche (Hero-Video, Gallery, ggf. Sections) bekommt den charakteristischen Fisheye-Vignette-Rand mit leichtem Farbversatz an den Ecken — inspiriert vom tatsächlichen In-Game-Effekt (tritt im Spiel situativ bei Sprint/Explosion auf, siehe `assets/screenshots/`). Umgesetzt per CSS `box-shadow`/`radial-gradient`, kein WebGL nötig.

Ein funktionierender Prototyp dieses Effekts liegt in `prototype.html` (Hero-Sektion) — als Referenzimplementierung, nicht als finaler Code.

### 3.2 HUD-Layer
Durchgehendes, dezentes Overlay: REC-Punkt (pulsierend), Timestamp, Kamera-ID/Sektor-Tag, Akku-Stand. Wandert leicht mit dem Content mit (z. B. Sektor-Tag ändert sich pro Section: `CAM_03 // FOREST SECTOR`, `CAM_03 // TRAINING GROUND`, etc.) — das erzählt nebenbei, dass man durch verschiedene Einsätze/Locations scrollt.

### 3.3 Film-Grain
Sehr dezentes Noise-Overlay (~5% Opacity) über der ganzen Seite, nicht nur über Videos — sorgt dafür, dass sich auch reine Textflächen nicht "sauber digital" anfühlen.

### 3.4 Der 3D-/Wow-Moment
Du wolltest explizit ein 3D-Element mit Wow-Effekt. Drei Optionen, **aber nur eine davon umsetzen** (Restraint-Prinzip — ein starker Moment schlägt drei halbe):

**Option A — Waffen-Inspect im Hero (empfohlen, guter Aufwand/Wirkung-Bezug)**
Ein einzelnes, hochwertig beleuchtetes 3D-Modell (z. B. die Shotgun aus Bild 4) liegt/schwebt am unteren Bildrand des Heros, reagiert leicht auf Mausbewegung (Parallax-Tilt), spielt beim Laden eine kurze "Waffen-Check"-Animation (wie im Spiel: Patrone einlegen, siehe hochgeladenes Bild). Three.js + ein GLB-Modell, kein Vollbild-3D nötig.

**Option B — Scroll-getriebene Kamera-Fahrt durch eine 3D-Szene**
Beim Scrollen bewegt sich eine simple 3D-Umgebung (verbrannter Wald, low-poly/stilisiert reicht) wie eine Kamerafahrt mit an. Hoher Wow-Faktor, aber deutlich mehr Aufwand (Szene bauen, Performance-Tuning) und Risiko, dass es ruckelt/nicht zum rohen Fotorealismus-Look passt, wenn die 3D-Assets nicht gut genug sind.

**Option C — Interaktives Case-File/Diorama**
Kleine 3D-Szene (z. B. Trainingsgelände als Diorama), die man frei drehen kann, mit Hotspots zu den Modi. Eher ein Gimmick in einer Nebensektion als Hero-Moment.

→ **Empfehlung: Option A.** Größter Wow-Effekt pro Aufwand, thematisch am direktesten am Spiel (die Waffe *ist* das Interface im Spiel), lässt sich isoliert bauen und testen, ohne den Rest der Seite zu blockieren.

---

## 4. Bewegung & Interaktion

- **Ein** orchestrierter Lade-Moment: kurzer "Signal wird aufgebaut"-Flackereffekt beim ersten Laden, dann stabilisiert sich das Bild — statt Fade-in-Slide-up auf jedem Element
- Beim Wechsel zwischen großen Sections: kurzer Static/Interferenz-Frame (wie Kanalwechsel), sparsam eingesetzt, nicht bei jedem Scroll-Tick
- Cursor als dezentes Fadenkreuz nur im Hero-Bereich (nicht seitenweit — nervt sonst)
- Ansonsten: ruhig. Hover-States dezent, keine Animation, die nicht etwas erklärt oder bestätigt

---

## 5. Seitenstruktur & Inhalte

Empfehlung: **eine durchgehende Single-Page** (Begründung: konsequenter "Einsatzprotokoll"-Scroll-Flow, einfacher zu teilen, besser fürs Portfolio). Unterseiten (z. B. echte News-Seite) sind eine mögliche spätere Erweiterung, kein Startpunkt.

| Section | Inhalt | Ton |
|---|---|---|
| **Hero** | Video-Loop + HUD + Headline + CTA (Play now / Watch trailer) | Direkter Einstieg, keine Erklärung nötig |
| **The lens** | Warum Bodycam anders aussieht/spielt sich — Kernaussage aus der Originalseite als Basis, aber als kurze Log-artige Einträge statt Fließtext-Block | Sachlich, kurz |
| **Modes** | Deathmatch, Gun Game, TDM, Body Bomb, Hardpoint, Zombies — als Einsatzbericht-Kacheln, nicht als generische Icon-Grid | Knapp, funktional |
| **Environments / Gallery** | Screenshots + Clips großformatig, jeweils mit Fake-Timestamp/Sektor-Tag versehen — Wald, Urban-Verfall, Trainingsgelände als visuelle Reise | Atmosphärisch |
| **Studio** | Die Reissad-Story (zwei französische Devs, 17 & 20) — bewusster Stilbruch: ruhiger, weniger HUD, mehr Raum. Kontrast macht diese Section besonders | Persönlich, warm |
| **Community/Footer** | Discord, Steam, Social Links, Newsletter | Knapp |

**Zu den Texten:** Für die tatsächlichen Copy-Texte (Feature-Beschreibungen, Studio-Absatz etc.) direkt von reissad.com übernehmen bzw. adaptieren, wie besprochen — das Original-Wording ist bereits eingeführt und akkurat. Dieses Konzeptdokument beschreibt nur Ton und Struktur, nicht den Wortlaut.

---

## 6. Asset-Inventar

**Screenshots** (`assets/screenshots/`, aus dem Chat-Upload):
1. Wald, Zielen mit Schrotflinte, Rauch — kein sichtbarer Fisheye-Effekt
2. Wald, Fisheye+CA-Rand sichtbar (Sprint-Zustand), zwei Teammitglieder im Vordergrund
3. Urbaner Innenraum, Graffiti, warmes Licht — kein Fisheye
4. Trainingsgelände, Nachladen mit Patrone in Nahaufnahme — kein Fisheye, aber sehr fotogen (Hand/Waffen-Detail)

**Gameplay-Clips** (`assets/clips/`, 1080p/30fps H.264):
1. `213035` — 17s, urbaner Verfall, Waffe im Vordergrund, ruhige Bewegung
2. `213157` — 20s, verbrannter Wald, deutlicher Fisheye/CA-Rand, Teammitglieder sichtbar → **aktuell im Hero-Prototyp verwendet**
3. `213312` — 10s, Wald mit Achterbahn-Silhouette im Hintergrund, kühle Farbgebung, Blutlache
4. `213626` — 28s, Wald durch Astwerk gefilmt, Rauchwolke/Explosion im Hintergrund, starker Fisheye

Alle vier Clips enthalten Originalton — für Web-Einbindung wird stummgeschaltet (Autoplay-Policy der Browser erlaubt ohnehin kein Audio-Autoplay).

---

## 7. Tech-Stack — offene Entscheidung

Bewusst noch nicht festgelegt. Eckpunkte, die die Wahl beeinflussen sollten:

- **Reines HTML/CSS/JS:** am schnellsten für den Hero-Prototyp-Ansatz, kein Build-Step, gut wenn die Seite überschaubar bleibt (Single-Page)
- **Astro:** wenn mehrere Unterseiten/Content-Collections absehbar sind (z. B. echte News-Sektion später) — bleibt trotzdem statisch/leichtgewichtig
- **React:** nur sinnvoll, wenn viel State/Interaktivität dazukommt (z. B. Option B/C aus 3.4 mit komplexerer 3D-Szene) — für eine primär visuelle Single-Page eher Overhead
- **3D:** in jedem Fall Three.js (ggf. über react-three-fiber, falls React gewählt wird)

→ Empfehlung: mit reinem HTML/CSS/JS + Three.js für den 3D-Moment starten (wie im Prototyp), auf Astro wechseln, falls der Umfang wächst.

---

## 8. Referenz-Prototyp

`prototype.html` zeigt den Hero-Ansatz bereits umgesetzt: Video-Loop, HUD-Overlay, Vignette/CA-Rand, Grain, Typografie. Als Ausgangspunkt für weitere Sections verwenden, nicht als fertigen Code kopieren — Selektoren/Struktur sind noch Wegwerf-Qualität.

---

## 9. Leitfrage für jede weitere Entscheidung

Bei jeder neuen Section, jedem neuen Effekt: **Trägt das zum "das ist eine laufende Aufnahme"-Gefühl bei, oder ist es nur Dekoration, die zufällig auch bei jeder anderen Gaming-Seite funktionieren würde?** Wenn Zweiteres — raus damit.
