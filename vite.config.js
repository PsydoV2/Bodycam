import { defineConfig } from 'vite';
import { resolve } from 'path';

// Multi-page Vanilla-Setup — index.html ist die eigentliche Seite,
// die Legal-Seiten sind bewusst separate, simple HTML-Dateien ohne
// HUD/Reveal-JS (siehe legal.css/legal.js).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        legalNotice: resolve(import.meta.dirname, 'legal-notice.html'),
        personalData: resolve(import.meta.dirname, 'personal-data.html'),
      },
    },
  },
});
