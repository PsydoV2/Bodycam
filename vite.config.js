import { defineConfig, loadEnv } from 'vite';

// Erzeugt robots.txt + sitemap.xml im Build — an derselben VITE_SITE_URL
// wie die %VITE_SITE_URL%-Platzhalter in index.html (Canonical/OG/JSON-LD,
// siehe .env). Ein Wert für alles, damit ein Domain-/Subdomain-Wechsel
// (z. B. bei einer Übernahme durch Reissad) nicht an mehreren Stellen
// gepflegt werden muss. Läuft nur im Build (generateBundle), nicht im Dev-
// Server — robots.txt/sitemap ohne feste Domain sind lokal ohnehin sinnlos.
function seoFiles() {
  let siteUrl = '';
  return {
    name: 'seo-files',
    configResolved(config) {
      siteUrl = (loadEnv(config.mode, process.cwd(), '').VITE_SITE_URL || '').replace(/\/+$/, '');
    },
    // order: 'post' — läuft nach Vites eigenem HTML-Asset-Resolver, der
    // sonst href="/" (leere VITE_SITE_URL) als Dateipfad zum Projektroot
    // läse und mit EISDIR abbricht (siehe index.html-Kommentar). So bleibt
    // ein Canonical-Link auch ohne gesetzte Domain build-sicher.
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [{ tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' }];
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`,
      });
      // Eine Sitemap ohne absolute Domain ist laut Spec ungültig (<loc>
      // muss absolut sein) — ohne gesetzte VITE_SITE_URL lassen wir sie
      // ganz weg, statt eine kaputte Datei auszuliefern.
      if (siteUrl) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n  </url>\n</urlset>\n`,
        });
      }
    },
  };
}

// Single-Page-Setup — index.html ist die einzige Seite. Legal Notice und
// Personal Data verlinken auf die Originalseiten von reissad.com statt
// eigene (unvollständige) Fassungen zu pflegen.
export default defineConfig({
  plugins: [seoFiles()],
});
