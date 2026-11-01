// Visitor insights for the desktop app, privacy first:
// - No cookies or other storage in the visitor's browser, so no consent banner is needed (ePrivacy/GDPR, UK PECR, CCPA).
// - No IP addresses stored. A visitor is a hash of a daily random salt + IP + user agent: it counts unique visitors per
//   day, can't be linked across days, and the salt is deleted the next day, so the hash can't be reversed.
// - Location (country, region, city) and the network's organization come from Cloudflare's request metadata. A
//   company network shows as the company; home connections show as their internet provider.
// - The site sends nothing when the browser signals an opt-out (Global Privacy Control or Do Not Track).
// - Events are deleted after 13 months (daily cron). Contact leads stay until deleted from the app.
// Shared D1 database with the contact Worker, which adds a lead row for every message.
import type { Env } from './http';

const EVENT_TYPES = new Set(['pageview', 'project', 'experience_open', 'experience_session', 'contact_open', 'contact_sent']);
const RETENTION_DAYS = 395;
// Crawlers, link previews, monitors and scripts: not people.
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\//i;

let schemaReady = false;

/** Creates the tables on first use (idempotent), so a fresh database needs no migration step. */
export async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL, day TEXT NOT NULL, type TEXT NOT NULL, path TEXT, ref TEXT, detail TEXT,
      visitor TEXT, country TEXT, region TEXT, city TEXT, org TEXT, asn INTEGER, device TEXT, browser TEXT, os TEXT)`),
    db.prepare('CREATE INDEX IF NOT EXISTS events_day ON events(day)'),
    db.prepare('CREATE INDEX IF NOT EXISTS events_ts ON events(ts)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, name TEXT, email TEXT, topic TEXT, message TEXT,
      org TEXT, city TEXT, region TEXT, country TEXT)`),
    db.prepare('CREATE TABLE IF NOT EXISTS salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, ts INTEGER NOT NULL)')
  ]);
  schemaReady = true;
}

const today = () => new Date().toISOString().slice(0, 10);

async function dailySalt(db: D1Database, day: string) {
  const row = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>();
  if (row) return row.salt;
  const salt = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, salt).run();
  return ((await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>())?.salt) ?? salt;
}

async function visitorHash(db: D1Database, day: string, ip: string, ua: string) {
  const salt = await dailySalt(db, day);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${ip}|${ua}`));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function device(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}
function browser(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}
function os(ua: string) {
  if (/Windows/.test(ua)) return 'Windows';
  if (/iPhone|iPad|iOS/.test(ua)) return 'iOS';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null);

/** Only the referring site's host: full referrer URLs can carry personal data in paths and query strings. */
function refHost(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return /(^|\.)archv3d\.(com|pages\.dev)$/.test(host) ? null : host;
  } catch {
    return null;
  }
}

/** POST /e from the site: one event. Always answers 204 so the page never waits or learns anything. */
export async function ingest(request: Request, env: Env) {
  const ua = request.headers.get('User-Agent') ?? '';
  if (!env.DB || !ua || BOT.test(ua) || request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return;
  }
  const type = typeof body.type === 'string' && EVENT_TYPES.has(body.type) ? body.type : null;
  if (!type) return;
  const path = clip(body.path, 200);
  if (path !== null && !path.startsWith('/')) return;
  await ensureSchema(env.DB);
  const day = today();
  const cf = (request.cf ?? {}) as { country?: string; region?: string; city?: string; asOrganization?: string; asn?: number };
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  await env.DB.prepare(
    `INSERT INTO events (ts, day, type, path, ref, detail, visitor, country, region, city, org, asn, device, browser, os)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      Date.now(), day, type, path, refHost(body.ref), clip(body.detail, 120), await visitorHash(env.DB, day, ip, ua),
      cf.country ?? null, cf.region ?? null, cf.city ?? null, cf.asOrganization ?? null, cf.asn ?? null,
      device(ua), browser(ua), os(ua)
    )
    .run();
}

/** Daily cron: forget old events and every salt but today's (which makes older visitor hashes unlinkable). */
export async function cleanup(env: Env) {
  if (!env.DB) return;
  await ensureSchema(env.DB);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(Date.now() - RETENTION_DAYS * 86400000),
    env.DB.prepare('DELETE FROM salts WHERE day < ?').bind(today())
  ]);
}

const all = async <T>(statement: D1PreparedStatement) => (await statement.all<T>()).results;

/** GET /admin/insights?days=30: everything the desktop app's Visitors and Leads views show. */
export async function summary(env: Env, days: number) {
  const db = env.DB!;
  await ensureSchema(db);
  const since = Date.now() - days * 86400000;
  const q = (sql: string) => db.prepare(sql).bind(since);
  const [totals, daily, pages, projects, referrers, places, orgs, devices, visits, leads] = await Promise.all([
    q(`SELECT
         SUM(type = 'pageview') AS pageviews,
         COUNT(DISTINCT day || visitor) AS visitors,
         SUM(type = 'project') AS projectViews,
         SUM(type = 'experience_open') AS experienceOpens,
         SUM(type = 'experience_session') AS experienceSessions,
         SUM(type = 'contact_open') AS contactOpens,
         SUM(type = 'contact_sent') AS contactsSent
       FROM events WHERE ts >= ?`).first(),
    all(q(`SELECT day, SUM(type = 'pageview') AS pageviews, COUNT(DISTINCT visitor) AS visitors
           FROM events WHERE ts >= ? GROUP BY day ORDER BY day`)),
    all(q(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT day || visitor) AS visitors
           FROM events WHERE ts >= ? AND type = 'pageview' GROUP BY path ORDER BY views DESC LIMIT 20`)),
    all(q(`SELECT detail AS project, COUNT(*) AS views FROM events WHERE ts >= ? AND type = 'project'
           GROUP BY detail ORDER BY views DESC LIMIT 20`)),
    all(q(`SELECT ref, COUNT(DISTINCT day || visitor) AS visitors FROM events WHERE ts >= ? AND ref IS NOT NULL
           GROUP BY ref ORDER BY visitors DESC LIMIT 20`)),
    all(q(`SELECT country, region, city, COUNT(DISTINCT day || visitor) AS visitors FROM events WHERE ts >= ?
           GROUP BY country, region, city ORDER BY visitors DESC LIMIT 30`)),
    all(q(`SELECT org, asn, COUNT(DISTINCT day || visitor) AS visitors, COUNT(*) AS events,
             SUM(type = 'experience_open') AS experienceOpens, SUM(type = 'contact_sent') AS contactsSent,
             MAX(ts) AS lastSeen, GROUP_CONCAT(DISTINCT city) AS cities
           FROM events WHERE ts >= ? AND org IS NOT NULL GROUP BY org, asn ORDER BY lastSeen DESC LIMIT 100`)),
    all(q(`SELECT device, COUNT(DISTINCT day || visitor) AS visitors FROM events WHERE ts >= ?
           GROUP BY device ORDER BY visitors DESC`)),
    all(q(`SELECT day, visitor, MIN(ts) AS firstTs, MAX(ts) AS lastTs, MAX(org) AS org, MAX(city) AS city,
             MAX(region) AS region, MAX(country) AS country, MAX(device) AS device, MAX(browser) AS browser,
             MAX(os) AS os, MAX(ref) AS ref, COUNT(*) AS events,
             GROUP_CONCAT(DISTINCT CASE WHEN type = 'project' THEN detail END) AS projects,
             GROUP_CONCAT(DISTINCT CASE WHEN type IN ('experience_open', 'experience_session') THEN detail END) AS experiences,
             SUM(type = 'experience_session') AS sessions, SUM(type = 'contact_sent') AS contacted
           FROM events WHERE ts >= ? GROUP BY day, visitor ORDER BY lastTs DESC LIMIT 200`)),
    all(q(`SELECT id, ts, name, email, topic, message, org, city, region, country FROM leads WHERE ts >= ?
           ORDER BY ts DESC LIMIT 200`))
  ]);
  return { days, generatedAt: Date.now(), totals, daily, pages, projects, referrers, places, orgs, devices, visits, leads };
}

export async function deleteLead(env: Env, id: number) {
  await ensureSchema(env.DB!);
  await env.DB!.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
}

/** A small key/value cache in D1 (Cost Explorer costs $0.01 per call). */
export async function cached<T>(env: Env, key: string, maxAgeMs: number, load: () => Promise<T>, fresh = false) {
  const db = env.DB!;
  await ensureSchema(db);
  if (!fresh) {
    const row = await db.prepare('SELECT value, ts FROM cache WHERE key = ?').bind(key).first<{ value: string; ts: number }>();
    if (row && Date.now() - row.ts < maxAgeMs) return { ...(JSON.parse(row.value) as T), cachedAt: row.ts };
  }
  const value = await load();
  const ts = Date.now();
  await db.prepare('INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?, ?, ?)').bind(key, JSON.stringify(value), ts).run();
  return { ...value, cachedAt: ts };
}
