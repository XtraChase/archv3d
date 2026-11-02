// After `vite build`: writes a real page for every portfolio project at dist/work/<slug>/index.html, and the sitemap.
// The site navigates with hash routes (#/work/<slug>), which search engines don't index; these pages give each project
// its own address, title, description, link preview and text. Each page holds the app's own HTML for its project,
// rendered here from the build in dist-ssr/ (src/home/server.tsx), which main.tsx hydrates (body[data-project]).
// <base href="../../"> makes every relative URL resolve from the site root.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const SITE = 'https://archv3d.com/';
const dist = resolve('dist');
const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');
const projects = JSON.parse(readFileSync(resolve('src/data/projects.json'), 'utf8')).sort((a, b) =>
  b.published.localeCompare(a.published)
);

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function summarize(project) {
  const first = project.description[0];
  if (!first) return `${project.title}: ${[...project.categories, ...project.mediums].join(', ')} by Chase Richards.`;
  return first.length <= 160 ? first : first.slice(0, 157).replace(/\s+\S*$/, '') + '…';
}

/** Replaces the content="" of the tag matching `pattern` (which must exist in the shell). */
function setContent(html, pattern, value) {
  if (!pattern.test(html)) throw new Error(`prerender: ${pattern} not found in dist/index.html`);
  return html.replace(pattern, (tag) => tag.replace(/content="[^"]*"/, `content="${escape(value)}"`));
}

// The browser the app expects while it renders: public/config.js run as on archv3d.com, and the page's <head> and
// <body> as far as the app reads them during a render.
const shellDescription = /<meta\s+name="description"\s+content="([^"]*)"/.exec(shell)?.[1] ?? '';
const page = { project: '' };
const browser = {
  location: new URL(SITE),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
vm.runInNewContext(readFileSync(resolve('public/config.js'), 'utf8'), { window: browser, location: browser.location });
Object.assign(globalThis, {
  window: browser,
  location: browser.location,
  document: {
    body: { dataset: page },
    querySelector: (selector) => (selector === 'meta[name="description"]' ? { content: shellDescription } : null)
  }
});
const { render } = await import(pathToFileURL(resolve('dist-ssr/server.js')).href);

for (const project of projects) {
  // Phones get the 960px copy of wide pictures (mediaSrcSet in src/home/projects.ts).
  for (const item of project.media) {
    const src = item.type === 'image' ? item.src : item.poster;
    if (src && item.width > 1100 && !existsSync(resolve('public', src.replace(/\.webp$/, '-960.webp')))) {
      throw new Error(`prerender: ${src.replace(/\.webp$/, '-960.webp')} is missing (960px copy for phones)`);
    }
  }
  if (!existsSync(resolve('public/portfolio', project.slug, 'og.jpg'))) {
    throw new Error(`prerender: public/portfolio/${project.slug}/og.jpg is missing (1200x630 JPEG for link previews)`);
  }
  const url = `${SITE}work/${project.slug}/`;
  const title = `${project.title} · Chase Richards`;
  const description = summarize(project);
  // public/portfolio/<slug>/og.jpg: 1200x630 JPEG, the size and format every link-preview scraper takes.
  const image = `${SITE}portfolio/${project.slug}/og.jpg`;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    url,
    image,
    description,
    datePublished: project.published,
    genre: project.categories,
    author: { '@id': `${SITE}#chase` },
    isPartOf: { '@id': `${SITE}#website` }
  };

  let html = shell;
  html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <base href="../../" />');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`);
  html = setContent(html, /<meta\s+name="description"[^>]*>/, description);
  html = setContent(html, /<meta property="og:title"[^>]*>/, title);
  html = setContent(html, /<meta\s+property="og:description"[^>]*>/, description);
  html = setContent(html, /<meta property="og:url"[^>]*>/, url);
  html = setContent(html, /<meta property="og:type"[^>]*>/, 'article');
  html = setContent(html, /<meta property="og:image"[^>]*>/, image);
  html = setContent(html, /<meta property="og:image:alt"[^>]*>/, project.title);
  html = setContent(html, /<meta property="og:image:width"[^>]*>/, '1200');
  html = setContent(html, /<meta property="og:image:height"[^>]*>/, '630');
  html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace(
    '</head>',
    `  <script type="application/ld+json">${JSON.stringify(structured)}</script>\n  </head>`
  );
  html = html.replace('<body class="home">', `<body class="home" data-project="${escape(project.slug)}">`);
  page.project = project.slug;
  html = html.replace('<div id="root"></div>', () => `<div id="root">${render()}</div>`);
  if (!html.includes(`data-project="${project.slug}"`) || !html.includes('<base href="../../" />')) {
    throw new Error(`prerender: shell markup changed, ${project.slug} not written`);
  }

  const folder = resolve(dist, 'work', project.slug);
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, 'index.html'), html);
}

const urls = [SITE, ...projects.map((project) => `${SITE}work/${project.slug}/`)];
writeFileSync(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/prerender.mjs: the home page and one page per portfolio project. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`).join('\n')}
</urlset>
`
);
console.log(`prerender: ${projects.length} project pages and sitemap.xml (${urls.length} URLs)`);
