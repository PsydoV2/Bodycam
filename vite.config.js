import { defineConfig } from 'vite';

// Feste Domain statt .env-Variable — an einer Stelle gepflegt, verwendet
// von allen SEO-Bausteinen unten (Canonical, robots.txt, sitemap.xml).
const SITE_URL = 'https://bodycam.sfalter.de';

// Erzeugt robots.txt + sitemap.xml im Build und hängt den Canonical-Link
// an SITE_URL. Läuft nur im Build (generateBundle), nicht im Dev-Server.
function seoFiles() {
  return {
    name: 'seo-files',
    // order: 'post' — läuft nach Vites eigenem HTML-Asset-Resolver, der
    // ein statisches <link rel="canonical" href="..."> im Quelltext sonst
    // als Datei-URL zu resolven versucht.
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [{ tag: 'link', attrs: { rel: 'canonical', href: `${SITE_URL}/` }, injectTo: 'head' }];
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n  </url>\n</urlset>\n`,
      });
    },
  };
}

// Single-Page-Setup — index.html ist die einzige Seite. Legal Notice und
// Personal Data verlinken auf die Originalseiten von reissad.com statt
// eigene (unvollständige) Fassungen zu pflegen.
export default defineConfig({
  plugins: [seoFiles()],
});
