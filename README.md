# Bodycam — Fan Redesign

An unofficial fan/portfolio redesign of the website for **[Bodycam](https://store.steampowered.com/app/2406770/Bodycam/)**, the body-camera-perspective tactical shooter by [Reissad Studio](https://reissad.com/). The whole page is framed as a body-cam recording you scrub through by scrolling — tracking-bar glitches, frame-hold artifacts, a boot sequence, and a HUD that reacts to how fast you spin the reel.

**Live:** [bodycam.sfalter.de](https://bodycam.sfalter.de/)

> This project is not affiliated with Reissad Studio. *Bodycam* and all related assets belong to their respective owners.

## Highlights

- **Scroll-as-tape-transport** — scroll velocity drives a WebGL shader (chromatic aberration, tracking bars, frame-hold) instead of just scrolling the page, plus a scrub-linked REC timecode and cursor.
- **Boot sequence** — "ACQUIRING SIGNAL" splash with a focus-pull into the hero, skippable by click.
- **Full-page atmosphere layer** — a single WebGL canvas renders grain/vignette/sensor noise site-wide, with a CSS fallback when WebGL isn't available.
- **HUD overlay** — live REC timecode, battery readout, and a sector tag that tracks whatever section is centered in the viewport.
- **Opt-in audio** — Web Audio only ever starts after an explicit click on the HUD audio chip; a confirmation tick on interactive rows and a transport motor while dragging the gallery reel.
- **Draggable environment gallery**, scroll-reveal content sections, an accordion for game modes, and a "signal end" bookend in the footer with a session summary.
- **Reduced-motion respected** everywhere — animation confirms/explains, it doesn't gate content. All copy lives in static HTML, so the page reads fine with JavaScript off.
- **SEO-ready**: canonical link, Open Graph/Twitter cards, JSON-LD structured data, `robots.txt` and `sitemap.xml` are generated at build time (see [Configuration](#configuration)).

## Tech stack

- [Vite](https://vitejs.dev/) — build tooling, no framework. Plain HTML/CSS/JS.
- [GSAP](https://gsap.com/) + [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) — scroll-driven choreography.
- [Lenis](https://lenis.darkroom.engineering/) — smooth scroll, feeds the scrub-velocity engine.
- Hand-written WebGL shaders for the scrub/overlay/gallery-reel effects — no 3D library.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build      # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
index.html              single page — all sections, copy and meta tags live here
vite.config.js           build config + the SEO file generator (robots.txt, sitemap.xml, canonical)
src/
  main.js                wires up all motion modules on load
  motion/                one module per effect (scroll engine, shaders, boot, cursor, sound, …)
  styles/                one stylesheet per section/feature, tokens.css as the base
public/
  clips/, screenshots/    delivered media (compressed, poster images included)
raw/
  clips/                  uncompressed source footage for the media pipeline
CONCEPT.md                design notes and rationale — historical, not always in sync with the current build
```

## Configuration

The site's public URL is a single constant, `SITE_URL` in `vite.config.js`. It drives:

- the canonical `<link>` tag,
- `og:url` / `og:image` / `twitter:image` and the JSON-LD blocks in `index.html`,
- the generated `robots.txt` and `sitemap.xml`.

Change it in one place if the site ever moves to a different domain.

## Disclaimer

Fan/portfolio project. Not affiliated with, endorsed by, or built by Reissad Studio. All *Bodycam* trademarks, screenshots and footage belong to their respective owners.
