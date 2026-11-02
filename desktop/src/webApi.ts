// The phone app: the same screens as the desktop app, talking to the control Worker straight from the browser (the page
// is served by that Worker, so no CORS). It stands in for window.archv3d, which the desktop app gets from Electron's main
// process (electron/backend.cjs); the status logic here mirrors that file. No PC controls and no background notifications.
import providers from '../shared/providers.json';
import type { ActionEvent, ActionName, Api, Costs, Insights, OrgKind, Settings, Status } from './api';

const STORE = 'archv3d-control';
const DEFAULTS = {
  siteUrl: 'https://archv3d.com/',
  queueUrl: 'wss://stream.archv3d.com/queue',
  // The page is served by the control Worker, so it asks the address it was loaded from.
  controlUrl: `${location.origin}/`,
  adminToken: ''
};
type Stored = typeof DEFAULTS;

function load(): Stored {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config: Stored) {
  try {
    // Only what differs from the defaults, so a moved address or a new default isn't held back by an old copy.
    const changed = Object.fromEntries(Object.entries(config).filter(([key, value]) => value !== DEFAULTS[key as keyof Stored]));
    localStorage.setItem(STORE, JSON.stringify(changed));
    if (localStorage.getItem(STORE) === null) throw new Error('empty');
  } catch {
    throw new Error("This browser won't keep settings (private mode or blocked site data).");
  }
}

// Setup from the desktop app's QR code: the link carries the token after the #, which a browser never sends to a server.
// It's saved and removed from the address bar at once.
function takeSetupToken() {
  const match = /[#&]setup=([^&]+)/.exec(location.hash);
  if (!match) return false;
  try {
    save({ ...load(), adminToken: decodeURIComponent(match[1]).trim() });
  } catch {
    // Settings shows that no token is saved.
  }
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

// ---- Control Worker ------------------------------------------------------------------------------------

async function controlFetch(route: string, { method = 'GET', body, admin = true }: { method?: string; body?: unknown; admin?: boolean } = {}) {
  const config = load();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (admin) {
    if (!config.adminToken) throw new Error('No admin token yet: add it in Settings.');
    headers.Authorization = `Bearer ${config.adminToken}`;
  }
  const base = config.controlUrl.endsWith('/') ? config.controlUrl : `${config.controlUrl}/`;
  const response = await fetch(new URL(route, base), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000)
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("The admin token on this phone doesn't match ADMIN_TOKEN in Cloudflare (Settings).");
  if (response.status === 503 && admin && /^admin not configured/.test(data.error ?? '')) {
    throw new Error("ADMIN_TOKEN isn't set on the control Worker in Cloudflare yet.");
  }
  if (!response.ok) throw new Error(data.error || `${route}: HTTP ${response.status}`);
  return data;
}

// ---- Status --------------------------------------------------------------------------------------------

async function siteStatus(url: string): Promise<Status['site']> {
  const started = performance.now();
  try {
    // Another origin: the answer can't be read, only that the site replied.
    await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return { up: true, ms: Math.round(performance.now() - started) };
  } catch {
    return { up: false, ms: null, error: 'No answer' };
  }
}

/** The gateway's waiting-line socket, read once: what visitors see. Unreachable = nothing is streaming. */
function streamStatus(url: string): Promise<Status['stream']> {
  return new Promise((resolve) => {
    let done = false;
    let socket: WebSocket | undefined;
    const finish = (result: Status['stream']) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => finish({ reachable: false }), 8000);
    try {
      socket = new WebSocket(url);
    } catch {
      finish({ reachable: false });
      return;
    }
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'queue') finish({ reachable: true, online: message.online, busy: message.busy, waiting: message.waiting });
      } catch {}
    };
    socket.onerror = () => finish({ reachable: false });
    socket.onclose = () => finish({ reachable: false });
  });
}

async function cloudStatus(): Promise<Status['cloud']> {
  try {
    if (load().adminToken) return { ...(await controlFetch('admin/cloud')), source: 'admin' };
    const { status } = await controlFetch('status', { admin: false });
    return { status, instance: null, source: 'public' };
  } catch (error) {
    return { status: 'error', instance: null, error: (error as Error).message };
  }
}

function overall(stream: Status['stream'], cloud: Status['cloud']): Status['overall'] {
  if (stream.reachable) {
    if (!stream.online) return { key: 'starting', label: 'Starting up' };
    return stream.busy ? { key: 'busy', label: stream.waiting ? `In use · ${stream.waiting} waiting` : 'In use' } : { key: 'available', label: 'Available' };
  }
  if (cloud.status === 'asleep') return { key: 'asleep', label: 'Asleep · wakes on request' };
  if (cloud.status === 'starting' || cloud.status === 'running') return { key: 'starting', label: 'Cloud starting' };
  return { key: 'off', label: 'Unavailable' };
}

let last: Status | null = null;
const statusListeners = new Set<(status: Status) => void>();

async function refresh() {
  const config = load();
  const [site, stream, cloud] = await Promise.all([siteStatus(config.siteUrl), streamStatus(config.queueUrl), cloudStatus()]);
  // The PC's own processes aren't visible from a phone: a stream that isn't the running cloud machine is "unknown".
  const servedBy = stream.reachable ? (cloud.status === 'running' ? 'cloud' : 'unknown') : null;
  last = { checkedAt: Date.now(), site, stream, cloud, local: { game: false, tunnel: false, running: false }, servedBy, overall: overall(stream, cloud) };
  statusListeners.forEach((listener) => last && listener(last));
  return last;
}

// Looks again every 15 s while the app is on screen, and at once when it comes back to the front.
let pollTimer: ReturnType<typeof setInterval> | undefined;
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => !document.hidden && refresh(), 15000);
  document.addEventListener('visibilitychange', () => !document.hidden && refresh());
}

// ---- Actions and insights --------------------------------------------------------------------------------

const ACTION_LABELS: Partial<Record<ActionName, string>> = {
  cloudOn: 'Turning the cloud stream on',
  cloudOff: 'Turning the cloud stream off'
};
const actionListeners = new Set<(event: ActionEvent) => void>();
let busy = false;

async function runAction(name: ActionName) {
  const label = ACTION_LABELS[name];
  if (!label) throw new Error('That can only be done from the PC.');
  if (busy) throw new Error('Another action is still running.');
  busy = true;
  const emit = (event: Omit<ActionEvent, 'name' | 'label'>) => actionListeners.forEach((listener) => listener({ name, label, ...event }));
  emit({ state: 'running' });
  try {
    await controlFetch('admin/cloud', { method: 'POST', body: { action: name === 'cloudOn' ? 'on' : 'off' } });
    emit({ state: 'done' });
  } catch (error) {
    emit({ state: 'error', error: (error as Error).message });
    throw error;
  } finally {
    busy = false;
    // The machine takes a while to change state; look again soon.
    setTimeout(refresh, 3000);
  }
}

const PROVIDER = new RegExp(providers.join('|'), 'i');
const orgKind = (org: string | null): OrgKind => (!org ? 'unknown' : PROVIDER.test(org) ? 'provider' : 'organization');

async function getInsights(days: number): Promise<Insights> {
  const data = await controlFetch(`admin/insights?days=${Math.min(400, Math.max(1, Number(days) || 30))}`);
  for (const row of data.orgs ?? []) row.kind = orgKind(row.org);
  for (const row of data.visits ?? []) row.kind = orgKind(row.org);
  return data;
}

// ---- Settings --------------------------------------------------------------------------------------------

function publicSettings(): Settings {
  const { adminToken, ...rest } = load();
  return { ...rest, projectDir: '', notifyLeads: false, notifyOrganizations: false, startWithWindows: false, hasAdminToken: Boolean(adminToken) };
}

export function createWebApi(): Api {
  takeSetupToken();
  // A code scanned while the app is already open only changes the #: take the token and start over with it.
  addEventListener('hashchange', () => takeSetupToken() && location.reload());
  return {
    getStatus: async () => last ?? refresh(),
    refreshStatus: refresh,
    runAction,
    getInsights,
    getCosts: (fresh) => controlFetch(`admin/costs${fresh ? '?fresh=1' : ''}`) as Promise<Costs>,
    deleteLead: async (id) => {
      await controlFetch('admin/leads/delete', { method: 'POST', body: { id } });
    },
    getSettings: async () => publicSettings(),
    saveSettings: async (changes) => {
      const config = load();
      for (const key of ['siteUrl', 'queueUrl', 'controlUrl'] as const) if (typeof changes[key] === 'string') config[key] = changes[key];
      if (typeof changes.adminToken === 'string') config.adminToken = changes.adminToken.trim();
      save(config);
      refresh();
      return publicSettings();
    },
    generateToken: async () => {
      throw new Error('Tokens are generated in the desktop app.');
    },
    phoneLink: async () => {
      throw new Error('The QR code is shown in the desktop app.');
    },
    testToken: async () => {
      try {
        await controlFetch('admin/cloud');
        return { ok: true };
      } catch (error) {
        return { ok: false, error: (error as Error).message };
      }
    },
    openExternal: async (url) => {
      if (/^(https?:|mailto:)/.test(url)) window.open(url, '_blank', 'noopener');
    },
    onStatus: (callback) => {
      statusListeners.add(callback);
      startPolling();
      return () => statusListeners.delete(callback);
    },
    onAction: (callback) => {
      actionListeners.add(callback);
      return () => actionListeners.delete(callback);
    },
    onNavigate: () => () => {}
  };
}
