# archv3d.com: follow-ups that couldn't be done in code

These items from [`site-audit.md`](site-audit.md) were left out of the `site-optimizations` branch. Each needs one of
three things: a decision from you, your own content or source files, or access this session doesn't have (Cloudflare,
Google Search Console, DNS, a real phone, the live stream). They're ordered by impact.

## Needs a decision

### 1. Make project pages indexable (high impact for search)
All routes are hash URLs (`#/work/jaguar-grill`). Search engines ignore everything after `#`, so the eight project
pages can't rank or be listed in the sitemap. The comment in `src/home/routing.ts` explains the choice: it works on any
static host, the local signalling server and Netcade's iframe.

**Options:**
- **Pre-rendered pages (recommended):** a build step writes `dist/work/<slug>/index.html` for each project, with the
  real title, description, Open Graph image and the project text in the HTML. Each page loads the same app, which
  redirects to `#/work/<slug>` or reads the path. Hash links keep working everywhere, Pages serves the static files,
  and the sitemap can list them. About a day of work.
- **Switch to path routing** (`/work/<slug>`) with a `_redirects` SPA fallback on Pages. This is simpler on Pages, but
  the local signalling server and the Netcade zip would need rewrite rules too.

### 2. Enforce the Content Security Policy
`_headers` ships the CSP as `Content-Security-Policy-Report-Only`. Tests of the home, project and experience pages
under the real hostname showed no violations, but a full stream session (WebRTC, TURN, the queue socket, waking the
VM) couldn't be run from here. After one real session with the browser console open and no CSP warnings, rename the
header to `Content-Security-Policy`. If you use `?ss=` or `?control=` overrides to other hosts for testing, add those
hosts to `connect-src`.

### 3. HSTS `includeSubDomains` and `preload`
HSTS currently covers `archv3d.com` only. Once you've confirmed every subdomain (`stream.`, `www.`, any others in
Cloudflare DNS) is HTTPS-only, change it to `max-age=31536000; includeSubDomains; preload` and submit the domain at
hstspreload.org. Preloading is hard to undo, so it's your call.

### 4. Avoid the `explore.html` → `/explore` redirect
On Cloudflare Pages every experience link costs a 308 redirect (about 50–150 ms). `levelUrl()` in `src/site.ts`
builds `explore.html` because the local signalling server and the Netcade zip serve the file by that name. A small
fix: use `explore` when `location.hostname` is `archv3d.com` or ends in `.pages.dev`, and `explore.html` everywhere else.
I left it alone because it's a host-specific special case in code you've kept host-neutral.

## Needs your content or source files

### 5. Replace the About summary (`src/home/profile.ts`)
The current text ("Results-driven professional with a proven track record in aligning business strategy…") is
generic résumé language that could describe anyone, and it undersells the work on the page. Here's a draft built only
from facts on the site. Please check it and adjust in your own voice:

> I'm a technical artist and CAD drafter in Bozeman, Montana. I draft buildings in Revit and AutoCAD, from as-built
> homes to outdoor kitchens, and turn them into real-time scenes in Unreal Engine that you can walk through in a
> browser. Before architecture I built game environments: photogrammetry of Montana's old mining towns, a Wild West
> world for *Trail of the Undead*, and a Mars colony featured by 80 Level. I also model products in SolidWorks and
> Maya.

### 6. Write project descriptions
Madison Ridge Hideaway Outdoor Kitchen and My Work In Revit have no description. Jaguar Grill has one line ("Jaguar
grill product design"). Two or three sentences each covering the brief, your role, the tools and the result would
help visitors, link previews and search. They go in the `description` arrays in `src/data/projects.json`. The page's
meta description now uses the first paragraph automatically.

### 7. Higher-resolution covers for two projects
- **80 Level Interview:** the cover is 500×500, shown at up to 467×380 on desktop and wider on high-density phones,
  so it's visibly soft. No larger version of that crop is in the repo.
- **Jaguar Grill:** the 960px cover doesn't match any gallery image, so no 1600px version could be cut.

Export each at 1600px or wider as `portfolio/<slug>/cover-1600.webp`, then add `"coverLarge"` to the project in
`projects.json`; the cards pick it up automatically.

### 8. Add links to your other profiles
Add ArtStation, LinkedIn, YouTube and the 80 Level article to the About section or footer, and as `"sameAs": [...]`
in the `Person` JSON-LD in `index.html`. That ties the site to your existing reputation for search engines. I didn't
guess the URLs.

### 9. A visual hero
On desktop the first screen is a headline and two buttons, with the right half empty. For an archviz studio the first
thing a visitor sees should be the work: a muted looping clip (about 5–10 s, under 2 MB, with a WebP poster) or a still
from the Movie Studio level, on the right or behind the text. You'd need to render or choose the clip. The code is
straightforward once it exists.

### 10. Email address in the footer
`james.chase.richards@gmail.com` is shown as plain text and a `mailto:` link, which scrapers will pick up. Options:
- make the footer link open the existing contact dialog instead;
- show a domain address. The contact Worker already sends as `contact@archv3d.com` through Cloudflare Email Routing,
  so a public `hello@archv3d.com` routed to your Gmail is a small step and looks more professional.

### 11. Typography readability (optional)
Lighthouse finds no contrast failures, but the 12px gold kickers and 60%-opacity body text are thin on the dark
background, especially on phones. Consider 13–14px kickers and about 70% opacity for `--muted`. That's a design call,
so I left it.

## Needs account access or a real device

### 12. Google Search Console and Bing Webmaster Tools
Verify `archv3d.com` (the DNS TXT record is easy through Cloudflare), submit `https://archv3d.com/sitemap.xml`, and
request indexing of the home page. A search for the domain returned no results from it.

### 13. Check `www.archv3d.com`
It didn't resolve from the test environment. Make sure a `www` DNS record exists (proxied) and that a Cloudflare
redirect rule sends `www.archv3d.com/*` to `https://archv3d.com/$1` with a 301. People do type `www`.

### 14. Test the stream page on a real phone
`explore.html` no longer disables pinch zoom (an accessibility requirement). The stream area uses `touch-action: none`
so drags and pinches still go to the camera, and that was checked in mobile emulation. Please run one session on an
iPhone and an Android phone to confirm that orbiting, walking and pinching on the stream feel the same and that the
menus can be zoomed.

### 15. Update the Netcade zip
`public/config.js` changed (WebP card images with `imageSrcset`). If you upload to Netcade, run `npm run package`
again so the zip carries the new config and images.

### 16. Cloudflare dashboard checks
- `README.md` and `PLAN.md` note that the zone's Browser Cache TTL overrode `_headers` for `config.js`. The new
  `/levels/*` rule (7 days) is longer than the zone TTL, so it should apply. After deploying, confirm with
  `curl -I https://archv3d.com/levels/studio.webp`.
- After deploying, check that `curl -I https://archv3d.com/` shows the new security headers and no
  `Access-Control-Allow-Origin`.
