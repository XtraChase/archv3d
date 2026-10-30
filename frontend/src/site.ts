// Settings shared by the landing page (index.html) and the experience (explore.html), from public/config.js.

/** A level visitors can pick. The id must match AArchVizPlayerController::Levels in Unreal. */
export interface LevelConfig {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Card image on the landing page, relative to the site root. */
  image?: string;
}

export interface SiteConfig {
  signallingUrl?: string;
  maxStreamResolution?: string;
  title?: string;
  subtitle?: string;
  levels?: LevelConfig[];
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

/** Link to the experience for a level, keeping diagnostic parameters (ss, stats, maxres). */
export function levelUrl(id: string) {
  const url = new URL('explore.html', location.href);
  url.search = '';
  for (const name of ['ss', 'stats', 'maxres']) {
    const value = urlParams.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }
  url.searchParams.set('level', id);
  return url.href;
}
