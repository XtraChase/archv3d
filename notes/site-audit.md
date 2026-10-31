# archv3d.com: site audit and optimizations

Audit date: 2026-10-31. Branch: `site-optimizations`.

The live site was crawled in Chromium on desktop (1440×900) and mobile (390×844), with response headers checked and
findings traced to the code in `frontend/`. Items marked **Done** are fixed on this branch. Items marked **Follow-up**
need a decision, content or account access; they're explained in [`site-audit-follow-ups.md`](site-audit-follow-ups.md).

## Results

The original and new builds were both served with `wrangler pages dev`, which is Cloudflare Pages' own emulator and
applies `_headers` and `404.html`. Lighthouse 12, mobile results are the median of 3 runs.

| | Before | After |
|---|---|---|
| Mobile performance | 80–81 | **96–98** |
| Mobile first contentful paint | 2.7–2.8 s | **1.5–1.8 s** |
| Mobile largest contentful paint | 3.9–4.1 s | **2.2–2.5 s** |
| Desktop performance | 98 | **100** |
| Desktop CLS | 0.036 | **0** |
| SEO | 92 (robots.txt invalid, 27 errors) | **100** |
| Accessibility | 100 | 100 |
| Mobile page weight | 771 KiB | **669 KiB** |
| Third-party hosts before first paint | 2 (Google Fonts) | **0** |

On the live site, Lighthouse scored 95 / 100 / 100 / 92 on mobile, because Cloudflare's edge compression helps there.

The new build also passed a 37-check Playwright test with the build served under the real `https://archv3d.com`
hostname. It found no CSP violations and no console errors on the home page, the project pages or the experience page.
Screenshots before and after are pixel-identical: the self-hosted fonts render exactly like Google's.

Best Practices went from 96 to 93 locally only because of the new report-only CSP. On localhost, `config.js` points
the stream at `ws://127.0.0.1`, which the production policy doesn't list. Under the real hostname there are no
violations.

## What was already good

- No console errors and no failed requests. About 85 KB of compressed code, split per page.
- Hashed assets cached for a year and marked immutable. Brotli over HTTP/2 and HTTP/3.
- WebP portfolio images, lazy-loaded images, videos with `preload="none"` and posters, YouTube loaded only on click.
- Visible keyboard focus, `prefers-reduced-motion` support, focus returned to the opener when a dialog closes.
- Contact form with labels, `autocomplete`, length limits, a honeypot and a minimum fill time.
- The experience cards show live availability from the gateway and the control Worker.

## 1. SEO and discoverability

| # | Finding | Status |
|---|---|---|
| 1.1 | `robots.txt`, `sitemap.xml`, `favicon.ico` and any unknown path returned the home page HTML with status 200. Search engines saw an invalid robots file, there was no favicon, and missing pages never returned 404. | **Done.** Added `public/robots.txt`, `public/sitemap.xml`, favicons and `public/404.html`. Pages now answers 404 for unknown paths. |
| 1.2 | No Open Graph or Twitter tags, so shared links had no image or summary card. | **Done.** Added `og:*` tags (image: the Movie Studio render, 1280×720) and `twitter:card` in `index.html`. |
| 1.3 | No canonical URL. | **Done.** Added `<link rel="canonical" href="https://archv3d.com/">`. |
| 1.4 | No structured data. | **Done.** Added JSON-LD `WebSite` and `Person` markup (name, job title, Bozeman MT, areas of expertise). Adding your profile links as `sameAs` is a follow-up. |
| 1.5 | Every project page kept the home page's meta description. | **Done.** `App.tsx` now sets the description and `og:title`/`og:description` per route: the first paragraph (cut to about 160 characters), or the project's disciplines when it has none. |
| 1.6 | Project pages are hash routes (`#/work/<slug>`), so search engines index one page only. | **Follow-up.** Fixing this needs pre-rendered pages, an architecture choice. |
| 1.7 | A web search for "archv3d.com" returned nothing from the domain. | **Follow-up.** Submit the sitemap in Google Search Console. |
| 1.8 | Two projects (Madison Ridge, My Work In Revit) have no description; Jaguar Grill has one line. | **Follow-up.** Needs your writing. |

## 2. Performance

| # | Finding | Status |
|---|---|---|
| 2.1 | Google Fonts blocked rendering: a stylesheet from `fonts.googleapis.com`, then font files from `fonts.gstatic.com`, before first paint. | **Done.** Fonts are self-hosted from `@fontsource/inter` and `@fontsource/instrument-serif` (Latin subsets, only the five faces used). The three faces on the first screen are preloaded by a small plugin in `vite.config.ts`, and they get the one-year immutable cache of `/assets/`. |
| 2.2 | `assetsInlineLimit: 100000` would have turned the self-hosted fonts into base64 inside the CSS that blocks rendering. | **Done.** Fonts are never inlined; other assets keep the 100 KB limit. |
| 2.3 | `config.js` was a blocking script in `<head>` with `no-cache`, so every view waited on a revalidation before parsing went on. | **Done.** `<script defer>` in `index.html` and `explore.html`. It still runs before the module scripts, which read `window.ARCHVIZ_CONFIG`. |
| 2.4 | Experience card images were 193 KB and 224 KB JPEGs shown at 564px, cached for only 4 hours. | **Done.** Added `levels/<id>.webp` (1280px, 113–142 KB) and `levels/<id>-640.webp` (26–38 KB), wired through a new `imageSrcset` field in `config.js`. Added a 7-day cache rule for `/levels/*` in `_headers`. The JPEGs stay as the link-preview image. |
| 2.5 | Every cover was a single 960px file. The full-width "Forever Reaching Out" card stretched it to 1160px, so it looked soft, and high-density phones got less detail than they could show. | **Done.** Six projects get a `coverLarge` (1600px, cut from the matching 1920px gallery original), used through `srcset`, with `sizes` computed from the grid layout in `HomePage.tsx`. |
| 2.6 | Jaguar Grill and the 80 Level cover have no high-resolution original in the repo; the 80 Level cover is 500×500. | **Follow-up.** Needs source files. |
| 2.7 | Links to `explore.html?level=…` get a 308 redirect to `/explore?level=…` on Pages. | **Follow-up.** About 50–150 ms, but the local signalling server and Netcade need `.html`. |
| 2.8 | Cover images have no `width`/`height`. | **No change needed.** Cards have fixed CSS heights (aspect ratio on mobile), so there's no layout shift. Desktop CLS measured 0 after the font change. |

## 3. Accessibility

| # | Finding | Status |
|---|---|---|
| 3.1 | Gallery images without a caption had `alt=""`, invisible to screen readers and image search. The lightbox had the same problem. | **Done.** They fall back to "Project title, image 2 of 6". The "View full size" buttons say which image they open. |
| 3.2 | Videos had no accessible name; the YouTube iframe was titled just "Video". | **Done.** Labelled "Project title, video" (the YouTube iframe's title and play button too). |
| 3.3 | Experience cards read as one run-together link: "Available Now01Movie StudioProduction campus…". | **Done.** Plain names such as "Movie Studio: Enter experience" or "Movie Studio: Join the line". The status badge still announces changes. |
| 3.4 | `explore.html` set `maximum-scale=1.0, user-scalable=no`, blocking zoom (WCAG 1.4.4). | **Done.** Zoom is allowed. `#stage` has `touch-action: none`, so gestures on the stream still steer the camera, and the page has `touch-action: manipulation` (no double-tap delay). Test on a real phone; see the follow-ups. |
| 3.5 | Card covers have `alt=""`. | **No change needed.** The title is already the link text, so an empty alt is correct there. |
| 3.6 | Small gold kickers (12px) and 60%-opacity muted text. | **Follow-up (optional).** Lighthouse shows no contrast failures; this is about readability. |

## 4. Security headers (`frontend/public/_headers`)

| # | Finding | Status |
|---|---|---|
| 4.1 | No HSTS. | **Done.** `Strict-Transport-Security: max-age=31536000`. Adding `includeSubDomains`/`preload` is a follow-up. |
| 4.2 | No clickjacking protection. | **Done.** `X-Frame-Options: SAMEORIGIN` (Netcade runs its own uploaded copy, so it isn't affected). |
| 4.3 | No Permissions-Policy. | **Done.** Camera, microphone, geolocation, payment and USB are off. |
| 4.4 | No Content Security Policy. | **Done, report-only.** It covers the Workers, `stream.archv3d.com` (https and wss), Cloudflare analytics and youtube-nocookie. No violations in testing; switch it to enforcing after one real stream session (follow-up). |
| 4.5 | `Access-Control-Allow-Origin: *` on every response, including the HTML. | **Done.** Removed with `! Access-Control-Allow-Origin`. |

## 5. Branding and polish

| # | Finding | Status |
|---|---|---|
| 5.1 | No favicon, touch icon or web manifest. | **Done.** Gold diamond on the site background, matching the header mark: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, 192/512 icons, `site.webmanifest`. |
| 5.2 | `explore.html` had no description or icon. | **Done.** |
| 5.3 | The About text is generic résumé language. | **Follow-up.** A draft is in the follow-ups file. |
| 5.4 | The hero is text only, with a large empty right half on desktop. | **Follow-up.** Design and content choice. |
| 5.5 | The Gmail address is in the footer as plain text. | **Follow-up.** |
| 5.6 | No links to ArtStation, LinkedIn, YouTube or the 80 Level article. | **Follow-up.** Needs your URLs. |
| 5.7 | `www.archv3d.com` didn't resolve from the test environment. | **Follow-up.** Check DNS and redirects. |

## 6. Copy and spelling

All visible text was checked: the home page, every project page, image and video labels, the contact form and the
experience page, plus the interface strings in the code. A spell checker found no misspelled words; everything it
flagged was a brand, a proper noun or an industry term (Revit, Bozeman, tileable…). Reading the text turned up four
errors:

| # | Where | Was | Now | Status |
|---|---|---|---|---|
| 6.1 | As-Built Residence card subtitle (`public/config.js`) | "Two-**storey** family home" | "Two-**story** family home" | **Done.** "Storey" is the British spelling; the rest of the site uses American English. |
| 6.2 | Mars Colony Outer Rim description (`projects.json`) | "Life on **mars**" | "Life on **Mars**" | **Done.** |
| 6.3 | 80 Level Interview description (`projects.json`) | "my **mars** colony environment" | "my **Mars** colony environment" | **Done.** |
| 6.4 | Springtime In The West description (`projects.json`) | "once the snow melts and **Spring** has finally come" | "…and **spring** has finally come" | **Done.** Seasons aren't capitalized mid-sentence. |
| 6.5 | Hero headline (`HomePage.tsx`) | "Architecture you can *walk through.*" | "Architecture in *Motion*" | **Done** (requested). The browser tab title stays "archv3d · Chase Richards". |

These project descriptions were carried over from the old ArtStation portfolio, so the ArtStation copies probably
have the same errors.

## Files changed

- `frontend/index.html`: head tags (canonical, Open Graph, JSON-LD, icons); Google Fonts removed; `config.js` deferred.
- `frontend/explore.html`: zoom allowed, description and icons, `config.js` deferred.
- `frontend/vite.config.ts`: font preload plugin; fonts excluded from inlining.
- `frontend/src/home/main.tsx`: self-hosted font imports.
- `frontend/src/home/App.tsx`: per-route title, description and Open Graph tags.
- `frontend/src/home/HomePage.tsx`: `srcset`/`sizes` for experience and portfolio cards; experience card labels.
- `frontend/src/home/ProjectPage.tsx`, `Lightbox.tsx`: alt text and labels for images and videos.
- `frontend/src/home/projects.ts`, `src/site.ts`, `src/data/projects.json`, `public/config.js`: the `coverLarge` and `imageSrcset` fields.
- `frontend/src/styles.css`: `touch-action` on the stream page.
- `frontend/public/`: `_headers`, `404.html`, `robots.txt`, `sitemap.xml`, icons, manifest, new WebP images.
- `frontend/package.json`, `package-lock.json`: `@fontsource/inter`, `@fontsource/instrument-serif`.
- `README.md`, `PLAN.md`: documentation.
- Copy: `src/home/HomePage.tsx` (headline), `public/config.js` and `src/data/projects.json` (spelling).
