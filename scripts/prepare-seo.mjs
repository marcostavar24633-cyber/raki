import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';

const { VITE_SITE_URL: siteUrl } = loadEnv('production', process.cwd(), 'VITE_');
if (!siteUrl || !siteUrl.endsWith('/')) {
  throw new Error('VITE_SITE_URL must be the full public site URL and end with a slash.');
}

const parsed = new URL(siteUrl);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
  throw new Error('VITE_SITE_URL must be a valid public HTTP(S) URL without credentials, query, or fragment.');
}

for (const file of ['robots.txt', 'sitemap.xml']) {
  const path = resolve('dist', file);
  const source = await readFile(path, 'utf8');
  if (!source.includes('__SITE_URL__')) {
    throw new Error(`SEO placeholder __SITE_URL__ is missing from dist/${file}.`);
  }
  await writeFile(path, source.replaceAll('__SITE_URL__', siteUrl), 'utf8');
}

console.log(`SEO URLs generated for ${siteUrl}`);
