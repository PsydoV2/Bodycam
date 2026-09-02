# Bodycam — Redesign-Konzept

Inoffizielles Fan-/Portfolio-Projekt zur Website von [Bodycam](https://store.steampowered.com/app/2406770/Bodycam/) (Reissad Studio). Dieses Dokument ist die gemeinsame Referenz für alle, die daran arbeiten (Mensch oder Agent) — es beschreibt die Vision, nicht die Implementierung.

Original-Website zum Vergleich: https://reissad.com/

**Versionshinweis:** Diese Fassung ersetzt die erste Konzeptversion vollständig. Grund steht in §0.

---

## 0. Warum Version 1 nicht reicht

Der aktuelle Live-Stand (siehe `index.html`) setzt die Grundidee korrekt um, aber zu vorsichtig: Video-Loop, CSS-Vignette, HUD-Text oben drüber, Listen faden beim Scrollen sanft ein. Das Ergebnis ist eine gute, stilvolle Gaming-Landingpage — aber keine, die jemanden zum Stoppen bringt. Der HUD-Layer ist Dekoration, keine Mechanik: nichts auf der Seite reagiert bisher *spezifisch* darauf, dass man angeblich eine Aufnahme ansieht. Man scrollt hier genauso wie auf jeder anderen Seite auch.

Diese Überarbeitung hebt den Anspruch von „stilvolle Landingpage" auf „hält neben Awwwards-Site-of-the-Day-Arbeit stand". Konkret heißt das: **jede Section muss etwas tun, das nur mit genau diesem Konzept so funktioniert** — nicht nur gut aussehen. Details in §2.

---

## 1. Leitidee (geschärft)

> Du bedienst keine Website über eine Bodycam-Aufnahme. Du scrubbst durch eine.

Die alte Leitidee ("die Website verhält sich wie eine laufende Aufnahme") war richtig, aber in v1 nur eine visuelle Hülle: Vignette + HUD-Text über einer sonst ganz normalen Fade-in-Seite. Ab jetzt ist die Aufnahme-Metapher ein Mechanismus, kein Kostüm: **die Scroll-Position ist der Timecode, die Scroll-Geschwindigkeit ist die Bandgeschwindigkeit.** Scrollt man schnell, spult die Aufnahme sichtbar vor — Tracking-Störungen, Rauschen, Kanalrauschen im Ton, der HUD-Zähler springt statt zu ticken. Hält man an, steht das Bild sofort wieder ruhig und scharf. Es soll keinen Moment geben, an dem man vergisst, dass man ein Band abspielt und keine Website liest.

Diese eine mechanische Wahrheit trägt den Rest des Konzepts (§4) und ersetzt drei vorher lose nebeneinanderstehende Ideen aus v1 (Vignette, Grain, Kanalwechsel-Static) durch ein einziges System mit einer Ursache.

### Nicht-Ziele
- Kein generisches "AI-Gaming-Landingpage"-Layout (Cards mit Schatten, Gradient-Wischer, ALL-CAPS-Eyebrows über jeder Section)
- Keine Holzhammer-Militär-Ästhetik (Tarnmuster, Stacheldraht-Rahmen) — das Spiel ist roh und dokumentarisch, nicht "Call of Duty Recruiting Page"
- **Kein rotierendes 3D-Waffenmodell im Hero.** Das ist die erwartbare Antwort jeder Shooter-Website (CoD, Valorant, Battlefield — alle machen das). Es lenkt vom eigentlichen Kern ab, statt ihn zu tragen. Begründung der bewussten Entscheidung dagegen: §4.3.
- Keine Animation, die feuert, ohne dass Scroll-/Scrub-Geschwindigkeit etwas damit zu tun hat. Jede Bewegung muss sich auf den Timecode zurückführen lassen — sonst ist es nur ein weiterer isolierter Effekt (siehe Leitfrage, §11).
- Kein Sound, der ohne explizite Aktion läuft. Opt-in, jederzeit sichtbar an-/ausschaltbar über einen HUD-Chip, niemals automatisch hörbar.

---

## 2. Ambitionsniveau — der Maßstab

Der Test für jede Entscheidung ab hier: Würde das auf Awwwards/FWA als Site of the Day bestehen, oder würde ein Juror denken "nettes dunkles Gaming-Theme, kenn ich"? Drei konkrete Signale trennen die beiden Ebenen:

1. **Bewegung hängt an einem echten Mechanismus**, nicht nur an Scroll-Position. Element beim Scrollen einblenden ist Parallax — das kann jede Seite. Element reagiert auf *wie schnell* gescrollt wird, weil das im fiktiven System (Bandgeschwindigkeit) eine Bedeutung hat — das kann nur diese Seite.
2. **Es gibt einen Moment, den man so nirgendwo sonst sieht** — nicht "auch hübsch gemacht", sondern "wie haben die das gebaut". Auf dieser Seite ist das der Scrub-Mechanismus (§4.1) und die Filmrolle-Gallery (§6).
3. **Die ruhigen Passagen sind genauso bewusst gestaltet wie die lauten.** Durchgehende Intensität ermüdet und wirkt billig; Kontrast macht den lauten Moment erst glaubwürdig. Deshalb bekommt diese Fassung explizite "unfilmed"-Beats (§3, §6) statt HUD-Overlay auf jeder einzelnen Section.

---

## 3. Design-Tokens

### Farbe
Unverändert aus dem Bildmaterial abgeleitet (verbrannter Wald, Sandfarben Trainingsgelände, Rost/Blut-Akzente) — das war in v1 schon richtig undurchschnittlich und bleibt so.

| Rolle | Hex | Verwendung |
|---|---|---|
| Basis (fast schwarz) | `#08090a` | Seitenhintergrund |
| Oberfläche | `#111311` | Cards, Panels, "unfilmed"-Sections |
| Text primär | `#f2efe6` | Headlines |
| Text sekundär | `#b9b6ab` | Fließtext |
| Text gedämpft | `#7c7a70` | Meta/HUD-Nebentext |
| Akzent (REC/Warnung) | `#d10000` | Einziger Dauer-Farbakzent — REC-Punkt, Primary-CTA, kritische Marker |
| Sand/Erde | `#a9906a` | Sekundäre Flächen, dokumentarische Wärme |
| Rand/Linie | `rgba(228,225,214,0.3)` | Hairline-Borders |
| Glitch warm | `rgba(220,90,40,0.85)` | **Nur** während Scrub-Bursts (§4.1) — CA-Split, warmer Kanal |
| Glitch kalt | `rgba(40,110,220,0.7)` | **Nur** während Scrub-Bursts (§4.1) — CA-Split, kalter Kanal |

**Regel bleibt:** ein einziger Dauer-Akzent (Rot). Die Glitch-Duotone-Paare sind kein zweiter "Pop"-Ton für die Ruhe-UI — sie existieren ausschließlich als Nebenprodukt der Scrub-Mechanik, nie als statisches Dekor. Genau diese Disziplin ist es, die den Effekt glaubwürdig hält statt "Cyberpunk-Filter".

### Typografie
- **Display/Headlines:** Inter (500), sentence case
- **HUD/Meta/Labels/Timecode:** JetBrains Mono — diegetisch begründet (Overlay einer echten Kamera)
- **Fließtext:** Inter (400), Zeilenlänge < 70 Zeichen

**Bewusst geprüft und verworfen:** eine zweite, "charaktervollere" Display-Schrift statt Inter. Inters Neutralität liest sich wie ein System-Overlay, nicht wie eine Marke — das passt besser zu einer Aufnahmegeräte-Optik als eine opinionated Headline-Schrift. Die Persönlichkeit kommt hier nicht aus den Buchstabenformen, sondern daraus, *was der Text tut* (§5: Decode-in, Tape-Counter-Ziffern) — das ist der bewusste Risiko-Punkt dieses Konzepts, nicht die Schriftwahl.

### Layout
- Linksbündig, große Ruhe-Flächen. Kein zentrierter Hero-Text.
- Volle Bildbreite für alle Screenshots/Clips — nichts in kleine Cards gequetscht
- **Neu — Apparat-Lifecycle:** Sections sind entweder *gefilmt* (HUD, Grain/Scrub-Shader, Autofokus-Cursor aktiv) oder bewusst *unfilmed* (kompletter Apparat aus — Studio-Section, siehe §6). Das war in v1 nicht explizit; jetzt ist es eine Regel pro Section, keine Ausnahme.

---

## 4. Signature-System

### 4.1 Der Scrub-Mechanismus (Herzstück)

Ein Fullscreen-WebGL-Shader-Layer (siehe §9 — rohes WebGL, kein Three.js) liegt über allen Video-/Bildflächen der gefilmten Sections. Seine Uniforms werden live aus der Scroll-Geschwindigkeit gespeist (via Lenis/ScrollTrigger, §5):

- **Grain-Intensität** — Baseline ~5 % wie in v1, steigt mit Scrub-Geschwindigkeit
- **Chromatic-Aberration-Spread** — Kanäle laufen bei schnellem Scrub sichtbar auseinander (Glitch-Warm/-Kalt, §3)
- **Horizontale Tracking-Bars** — kurze, harte Störzeilen, wie beim Spulen eines Bandes
- **HUD-Timestamp** — läuft nicht mehr als separate, vom Scroll unabhängige Uhr (das war v1s größte Schwäche: eine Fake-Uhr, die nichts mit der Seite zu tun hat). Er *ist* jetzt die Scroll-Position, gemappt auf einen Timecode, und springt beim schnellen Scrub sichtbar statt zu ticken — wie ein Bandzähler beim Vorspulen.

- **Frame-Hold** (seit dem zweiten Rollout) — ein echtes Band zeigt beim Spulen nicht nur Rauschen, sondern zeilenweise Reste des vorherigen Bilds. Der Shader hält eine zweite Textur, die nur alle paar Frames nachgezogen wird; bei hoher Velocity mischen sich Zeilenbänder aus diesem veralteten Frame horizontal versetzt ins Live-Bild.
- **Das Video spult selbst** — `playbackRate` hängt an derselben Velocity (1× in Ruhe, bis 4× beim Scrub). Artefakte und Bewegung im Bild haben damit dieselbe Ursache; das ist die Leitidee aus §1 ohne Umweg.

Bei Stillstand: sauberes, ruhiges Bild, keine Artefakte — die Disziplin aus v1 bleibt, nur ist der ruhige Zustand jetzt der *Default*, kein Dauerzustand ohne Gegenpol.

**Fallback:** kein WebGL verfügbar oder `prefers-reduced-motion` → statischer CSS-Vignette+Grain-Zustand wie in v1. Der bestehende `prototyp/prototype.html`-Ansatz wird dadurch nicht obsolet, sondern zur offiziellen Fallback-Referenz (§10).

**Präzisierung nach erstem Rollout:** Tracking-Bars sind ein Band-Scrub-Artefakt und bleiben exklusiv den Video-Shadern vorbehalten (Hero, Gallery — dort liegt tatsächlich Aufnahme-Material vor). Der seitenweite Overlay-Layer über Fließtext-Sections (Lens, Modes, Update, ...) zeigt nur die Grain-Baseline, keine Tracking-Bars — über reinem UI/Text sahen sie wie ein Rendering-Fehler aus, nicht wie Teil einer Aufnahme.

Dieser eine Mechanismus ersetzt und vereint drei v1-Ideen, die vorher unabhängig nebeneinanderstanden: Aufnahme-Rand-Vignette, Film-Grain, Kanalwechsel-Static bei Section-Wechseln. Eine Ursache, drei sichtbare Symptome — das ist der Unterschied zwischen einem System und einer Effekt-Sammlung.

### 4.2 Autofokus-Cursor (zweite Ebene, trägt den Mechanismus in die Mikro-Interaktion)

Custom Cursor als Sucherrahmen mit leichtem physischem Nachlauf (lerp statt 1:1-Bewegung — wie eine handgehaltene Kamera, die der Bewegung minimal hinterherzieht). Über interaktiven Elementen schnappt ein Autofokus-Bracket ein, begleitet von einem kurzen Blur-zu-Scharf-Pull. Das ersetzt jeden generischen Hover-Scale-Effekt durch etwas, das nur im Kamera-Kontext Sinn ergibt, und liefert nebenbei die Klick-Affordanz gratis mit.

Deaktiviert außerhalb gefilmter Sections (Studio, §6) und komplett unter reduced-motion (nativer Cursor).

### 4.3 Warum kein 3D-Waffenmodell

v1 diskutierte drei 3D-Optionen und empfahl einen schwebenden, beleuchteten Waffen-Inspect im Hero. Nach Prüfung gegen §2 verworfen: Ein rotierendes/Parallax-Waffenmodell ist die naheliegendste, meisterwartete Antwort jeder Shooter-Website — es beweist Handwerk, aber keine Idee, die spezifisch zu *diesem* Spiel gehört. Der Scrub-Mechanismus (§4.1) dagegen kann nur hier existieren, weil er direkt aus "es ist eine Aufnahme" folgt. Konsequenz: **kein 3D-Geometrie-Objekt auf der Seite**, nur ein Fullscreen-Shader — das spart zusätzlich das komplette Three.js/GLB-Gewicht (§9).

### 4.4 Sound (opt-in, nie automatisch hörbar)

Sehr leises Ambient-Bett (Handschuh-Rascheln/Funkrauschen), an-/ausschaltbar über einen HUD-Chip ("AUDIO", gleiche Optik wie REC/BATT). Rauschen schwillt bei schnellem Scrub kurz an — gleiche Uniform wie §4.1, kein separates System. Autofokus-Snap (§4.2) bekommt ein sehr leises Bestätigungs-Ticken, das Ziehen an der Filmrolle (§6) einen tiefen Transport-Motor, dessen Tonhöhe der Velocity folgt. Ohne explizites Antippen bleibt die Seite stumm — sowohl aus Browser-Policy-Gründen als auch, weil unaufgeforderter Sound auf Landingpages fast immer nervt statt beeindruckt. In "unfilmed"-Sections und nach SIGNAL END ist der Ton aus, wie der Rest des Apparats.

**Umgesetzt** (`src/motion/sound.js`): Der AudioContext entsteht erst beim Klick auf den Chip — vorher existiert kein Audio-Graph, es kann also auch nichts versehentlich hörbar werden.

---

## 5. Motion- & Interaktionssystem

- **Smooth Scroll:** Lenis, Inertia bewusst etwas "schwer" eingestellt — soll sich wie eine schultergetragene Kamera anfühlen, die sich einpendelt, nicht wie schwereloses Scrollen.
- **Chapter-Transitions:** kein separat gescriptetes Effekt-Element mehr (v1: "kurzer Static-Frame beim Section-Wechsel"). Stattdessen: an großen Kapitelgrenzen (Hero→Dispatch, Gallery→Studio) wird gezielt ein kurzer, authored Scrub-Spike ausgelöst — derselbe Mechanismus aus §4.1, nur bewusst getriggert statt nur an echte Scroll-Geschwindigkeit gekoppelt. Ein System, zwei Auslöser.
- **Pin/Scrub pro Section:** "The lens" wird gepinnt, die Log-Einträge blättern wie Seiten einer Akte während des Scrollens durch, statt untereinander wegzufaden. "Environments/Gallery" wird zur horizontalen Filmrolle: vertikales Scrollen übersetzt sich in horizontale Bewegung durch die Clips, per Drag scrubbar — hier ist der Scrub-Mechanismus am buchstäblichsten, weil man wortwörtlich durch aufgenommenes Material spult.
- **Kinetische Typografie:** Decode-/Scramble-in ausschließlich für Headlines auf H1/H2-Ebene (Mono-Font zykelt kurz durch Zeichen, bevor der finale Text steht — wie eine HUD-Anzeige, die eine Caption dekodiert). Explizit **nicht** auf Fließtext, Nav oder Labels — sonst wird aus einem Signature-Moment ein nerviges Dauerflackern.
- **Boot-Sequenz:** "Signal wird aufgebaut" beim ersten Laden — kurzes Rauschen, Tracking-Bars ziehen durch, Bild rastet mit einem Fokus-Pull (unscharf → scharf) ein. Unter 1,5 s, überspringbar, unter reduced-motion entfällt sie komplett zugunsten des sofort stabilen Bilds.
- **Apparat-Lifecycle (Bookend):** die Boot-Sequenz am Anfang und "SIGNAL END" im Footer spiegeln sich — Timestamp friert ein, Grain fällt auf 0, Cursor kehrt zum System-Cursor zurück, Sound (falls an) verstummt. Der Kamera-Apparat ist damit kein Dauerzustand, sondern hat einen sichtbaren Anfang und ein sichtbares Ende, wie eine echte Aufnahme.
- **Reduced-Motion-Vertrag (verbindlich, kein Fallback zweiter Klasse):** kein Shader-Glitch (statischer CSS-Grain), kein Scramble-Text (finaler Text sofort), nativer Scroll statt Lenis, kein Pin/Scrub (Inhalt bleibt vollständig linear lesbar), nativer Cursor. Das Ergebnis ist die gleiche ruhige Optik, die die Studio-Section ohnehin site-wide als bewussten Kontrastpunkt nutzt (§6) — reduced-motion ist also keine Notlösung, sondern der ohnehin vorgesehene ruhige Zustand, dauerhaft aktiv.

---

## 6. Seitenstruktur & Section-Regie

Weiterhin eine durchgehende Single-Page. Jede Zeile jetzt mit explizitem Beat (laut = voller Apparat + Scrub-Intensität, ruhig = bewusste Pause) statt einheitlichem HUD-Dauerzustand:

| Section | Regie | Beat |
|---|---|---|
| **Hero** | Boot-Sequenz (§5), Scrub-Shader aktiv, Autofokus-Cursor, Decode-in-Headline | Laut — Einstieg |
| **Acquire** | Steam-Widget, bewusst *unfilmed* | Ruhig — erste Pause vor Dispatch |
| **Update/Dispatch** | Kommt per authored Scrub-Burst rein (§5); Countdown-Ziffern rollen wie ein mechanischer Bandzähler statt zu wechseln. Nach dem Launch steht der Zähler nicht auf Null, sondern zählt als T-PLUS weiter hoch — ein Bandzähler läuft, solange die Aufnahme läuft | Laut |
| **The lens** | Kein Pin mehr (Korrektur nach Rollout, siehe unten) — ruhiges `[data-reveal]`-Einblenden wie Modes | Ruhig |
| **Modes** | Akkordeon unverändert — bewusst ohne Zusatzbewegung, damit man Zeit hat, Infos zu lesen. Ab 1100px steht rechts ein Preview-Feed: Hover über einer Zeile schaltet auf ein Standbild des Modus, der Wechsel ist ein Kanalwechsel und löst denselben Scrub-Burst aus wie die Kapitelgrenzen (§5) | Ruhig, mit Feed |
| **Environments/Gallery** | Horizontale Filmrolle, Drag-Scrub, höchste Shader-Intensität der Seite | Laut — zweiter Höhepunkt |
| **Studio** | Kompletter Apparat aus: kein Grain, kein HUD, kein Cursor, kein Sound | Stille — größter Kontrast der Seite, macht die lauten Momente erst glaubwürdig |
| **Footer** | Signal-End-Bookend (§5): Timestamp friert, Apparat fährt sichtbar herunter. Dazu ein Session-Log im HUD-Vokabular (gespultes Band, Peak-Scrub, On-Air-Zeit) — rein lokal berechnet | Laut → aus |

**Korrektur nach erstem Rollout — Lens:** die ursprüngliche Pin/Scrub-Choreografie ("Log-Einträge blättern wie Akte-Seiten") stand in keinem Verhältnis zum Inhalt — vier Ein-Satz-Einträge rechtfertigen keine eigene, mehrere hundert Pixel lange Scroll-Strecke. Lehre für §2 (Ambitionsniveau): der Mechanismus muss zum Gewicht des Inhalts passen, nicht nur zum Rest des Systems — dieselbe Zurückhaltung, die Modes schon hatte ("bewusst ohne Zusatzbewegung"), gilt jetzt auch hier.

**Zu den Texten:** wie in v1 — reale Copy-Texte direkt von reissad.com übernehmen/adaptieren, dieses Dokument beschreibt Ton und Struktur, nicht den Wortlaut.

---

## 7. Asset-Inventar

Unverändert gegenüber v1 — weiterhin gültig:

**Screenshots** (`assets/screenshots/`): Wald/Schrotflinte/Rauch (kein Fisheye) · Wald mit sichtbarem Fisheye+CA-Rand (Sprint) · urbaner Innenraum, Graffiti, warmes Licht · Trainingsgelände, Nachladen in Nahaufnahme.

**Gameplay-Clips** — Rohmaterial in `raw/clips/` (1080p/30fps H.264, nicht im Build): `213035` (17s, urban) · `213157` (20s, Wald, deutlicher Fisheye, Basis des Hero-Loops) · `213312` (10s, Wald, Blutlache) · `213626` (28s, Wald, starker Fisheye, Explosion).

**Ausgelieferte Clips** (`public/clips/`, 720p, 8s, WebM VP9 + MP4 H.264, je Clip ein Poster-WebP): `clip-urban` (aus 213035) · `clip-outskirts` (aus 213312) · `clip-explosion` (aus 213626, Segment um den hellsten Frame). Zusammen unter 15 MB statt 75 MB; die Poster laufen bis zum ersten Video-Frame durch denselben Shader. Neue Clips bitte über dieselbe Pipeline ziehen (720p, 8s, beide Container, Poster).

**Social Preview:** `public/og.jpg` (1200×630, aus dem Hero-Screenshot mit den Seitenschriften gesetzt). Die absolute URL kommt aus `VITE_SITE_URL` (`.env.local`).

---

## 8. Qualitäts-Budget & Leitplanken

- **Performance:** 60 fps auf Mid-Range-Hardware als Ziel. WebGL-Layer per Feature-Detection — fehlt Support, greift der CSS-Fallback (§4.1) statt Fehler/Absturz.
- **A11y:** reduced-motion ist ein vollständiger Vertrag (§5), kein nachträglicher Kompromiss. Fokus-Sichtbarkeit bleibt trotz Custom-Cursor erhalten — echter `:focus-visible`-Ring läuft parallel, wird vom Cursor nie ersetzt.
- **Restraint-Checkliste vor jedem neuen Effekt:**
  1. Lässt er sich auf den Scrub-Mechanismus zurückführen (§4.1) — oder ist er ein isoliertes Extra?
  2. Verschwindet er sauber unter reduced-motion, ohne dass Inhalt verloren geht?
  3. Ergibt die Section auch im Fallback-Zustand (kein WebGL, kein Sound) noch Sinn?

---

## 9. Tech-Stack — entschieden

War in v1 bewusst offen. Jetzt final, weil der Umfang (Shader, Scrub-Timelines, Pin-Sections) eine Richtung braucht, um nicht in Ad-hoc-Code zu zerfallen:

- **Vite + Vanilla JS** — kein Framework, die Seite bleibt eine primär visuelle Single-Page ohne nennenswerten App-State
- **Lenis** — Smooth Scroll, Basis für alles Weitere
- **GSAP + ScrollTrigger** — treibt Pin/Scrub-Timelines *und* die Shader-Uniforms aus §4.1
- **Rohes WebGL, keine Render-Bibliothek** — es gibt kein 3D-Geometrie-Objekt mehr zu rendern (§4.3), nur einen Fullscreen-Shader-Quad. Three.js wäre hier reiner Overhead für Features, die nicht gebraucht werden. Ursprünglich war OGL als schlanker Mittelweg vorgesehen; in der Umsetzung hat sich gezeigt, dass zwei Fullscreen-Quads mit je einem Programm (`scrub-shader.js`, `overlay-shader.js`) in ~150 Zeilen direktem WebGL sauberer sind als eine weitere Abhängigkeit — Entscheidung: bleibt so.
- **Web Audio API nativ** — kein zusätzliches Sound-Lib nötig für Loop + Gain-Swell (§4.4)

Damit entfällt auch der v1-Plan für ein GLB-Waffenmodell vollständig (§4.3).

**Umsetzungsreihenfolge** (Risiko/Wirkung-Verhältnis, keine Big-Bang-Migration) — alle Schritte sind umgesetzt:
1. Lenis + Custom-Cursor als Fundament (geringes Risiko, sofort spürbar) ✓
2. Scrub-Shader zuerst nur im Hero beweisen, bevor er seitenweit ausgerollt wird ✓
3. Shader-System auf Chapter-Transitions + Gallery-Filmrolle ausweiten ✓ (Gallery über einen gemeinsamen WebGL-Kontext, `reel-shader.js`)
4. Pin/Scrub für "The lens" — gebaut und wieder entfernt, siehe §6
5. Sound-System zuletzt (reines Polish-Layer, keine Abhängigkeit für den Rest) ✓

**Mobile:** Typografie und Abstände laufen über `clamp()` (`responsive.css`), der Hero über `dvh`. Die Filmrolle steht auf Handys hochkant (4:5), der Shader beschneidet die 16:9-Quellen wie `object-fit: cover` statt sie zu strecken.

---

## 10. Referenz-Prototyp

`prototyp/prototype.html` zeigt weiterhin den v1-Hero-Ansatz (Video-Loop, HUD, CSS-Vignette, Grain, Typografie) — jetzt offiziell als **Fallback-Referenz für §4.1** (kein WebGL/reduced-motion), nicht mehr als Zielbild für den Live-Zustand mit Shader.

`prototyp/prototype-scrub.html` ist der Spike für den Scrub-Shader selbst (§4.1) — Standalone-Seite ohne Build, auf der sich Grain/CA/Tracking-Bars an einem gepinnten Hero beliebig lang an- und abscrubben lassen. Die Produktivfassung in `src/motion/scrub-shader.js` ist daraus generalisiert.

---

## 11. Leitfrage für jede weitere Entscheidung

Nicht mehr nur "fühlt sich das an wie eine laufende Aufnahme" — schärfer:

**Lässt sich der Effekt auf die Scrub-Geschwindigkeit (§4.1) zurückführen, oder ist er nur eine weitere isolierte Animation, die zufällig auch gut aussieht?**

Wenn Zweiteres: entweder in den Scrub-Mechanismus integrieren, oder streichen.
