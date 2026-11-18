import { defineConfig } from 'astro/config';
import { SITE_URL, BASE_PATH } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  // Стилі вбудовуються в HTML: без окремих запитів, що блокують перший кадр
  build: { inlineStylesheets: 'always' },
});
