// Settings shared by the landing page (index.html) and the experience (explore.html), from public/config.js.

/** A level visitors can pick. The id must match AArchVizPlayerController::Levels in Unreal. */
export interface LevelConfig {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Card image on the landing page, relative to the site root. */
  image?: string;
  /** Optional srcset for the card image, e.g. 'levels/studio-640.webp 640w, levels/studio.webp 1280w'. */
  imageSrcset?: string;
}

export interface SiteConfig {
  signallingUrl?: string;
  maxStreamResolution?: string;
  title?: string;
  subtitle?: string;
  levels?: LevelConfig[];
  /** Contact form endpoint (the contact Worker, contact/ in the repo). */
  contactUrl?: string;
  /** Wake/status service for the on-demand cloud VM (the control Worker, control/ in the repo). */
  controlUrl?: string;
}

declare global {
  interface Window {
    ARCHVIZ_CONFIG?: SiteConfig;
    archvizStats?: Record<string, string | number>;
  }
}

export const settings: SiteConfig = window.ARCHVIZ_CONFIG ?? {};
export const urlParams = new URLSearchParams(location.search);
export const signallingUrl = urlParams.get('ss') ?? settings.signallingUrl ?? `ws://${location.hostname}:80`;

export const levels: LevelConfig[] = settings.levels?.length
  ? settings.levels
  : [{ id: 'studio', title: settings.title ?? 'Movie Studio', subtitle: settings.subtitle }];

export function findLevel(id: string | null | undefined) {
  return levels.find((level) => level.id === id);
}

/** The gateway's waiting-line socket (servers/gateway.mjs), on the same host as signalling. */
export const queueUrl = (() => {
  const url = new URL(signallingUrl);
  url.pathname = '/queue';
  url.search = '';
  return url.href;
})();

/**
 * State of the on-demand cloud VM from the wake service, asked only when the stream itself can't be reached.
 * 'off' when waking is switched off, the service isn't configured, or it can't be reached.
 */
export type CloudStatus = 'off' | 'asleep' | 'starting' | 'running';

// ?control=<url> overrides it, like ?ss for signalling (testing).
const controlUrl = urlParams.get('control') ?? settings.controlUrl;

export async function cloudStatus(): Promise<CloudStatus> {
  if (!controlUrl) return 'off';
  try {
    const response = await fetch(new URL('status', controlUrl), { signal: AbortSignal.timeout(6000) });
    const { status } = (await response.json()) as { status?: string };
    return status === 'asleep' || status === 'starting' || status === 'running' ? status : 'off';
  } catch {
    return 'off';
  }
}

// ---- Visit insights (privacy page: #/privacy) --------------------------------------------------------
// One small event per page or action to the control Worker (control/src/insights.ts): no cookies, nothing stored in
// the browser, no IP addresses kept. Nothing is sent when the browser signals an opt-out (Global Privacy Control or
// Do Not Track), when this device opted out on the privacy page, or off the public site (e.g. the local copy).

export type TrackedEvent = 'pageview' | 'project' | 'experience_open' | 'experience_session' | 'contact_open' | 'contact_sent';

/** localStorage key set by "Don't count my visits" on the privacy page (the visitor's own choice, honored locally). */
export const OPT_OUT_KEY = 'archv3d-no-insights';

export function trackingAllowed() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === '1') return false;
  if (!/(^|\.)archv3d\.(com|pages\.dev)$/.test(location.hostname)) return false;
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return false;
  } catch {
    // Storage blocked: nothing stored, so no opt-out either.
  }
  return true;
}

let referrerSent = false;

export function track(type: TrackedEvent, { path, detail }: { path?: string; detail?: string } = {}) {
  if (!controlUrl || !trackingAllowed()) return;
  // Where the visitor came from, once per page load (the Worker keeps only the referring site's name).
  const ref = referrerSent ? undefined : document.referrer || undefined;
  referrerSent = true;
  const body = JSON.stringify({ type, path, detail, ref });
  try {
    // text/plain: a beacon without a CORS preflight; the Worker reads the JSON regardless.
    navigator.sendBeacon(new URL('e', controlUrl).href, new Blob([body], { type: 'text/plain' }));
  } catch {
    // Never let insights break the page.
  }
}

/** Asks the wake service to start the cloud VM; it only acts when the VM is asleep. */
export async function wakeCloud(): Promise<CloudStatus> {
  if (!controlUrl) return 'off';
  try {
    const response = await fetch(new URL('wake', controlUrl), { method: 'POST', keepalive: true });
    const { status } = (await response.json()) as { status?: string };
    return status === 'asleep' || status === 'starting' || status === 'running' ? status : 'off';
  } catch {
    return 'off';
  }
}

/**
 * Link to the experience for a level, keeping diagnostic parameters (ss, stats, maxres, control). With wake, the experience
 * page wakes the cloud VM and joins the line by itself once it's up.
 */
export function levelUrl(id: string, { wake = false } = {}) {
  const url = new URL('explore.html', location.href);
  url.search = '';
  for (const name of ['ss', 'stats', 'maxres', 'control']) {
    const value = urlParams.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }
  url.searchParams.set('level', id);
  if (wake) url.searchParams.set('wake', '1');
  return url.href;
}
