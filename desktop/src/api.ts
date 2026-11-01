// What electron/preload.cjs exposes as window.archv3d, and the shapes the main process and the control Worker return.

export type OverallKey = 'available' | 'busy' | 'starting' | 'asleep' | 'off' | 'unknown';
export type CloudState = 'off' | 'asleep' | 'starting' | 'running' | 'error';

export interface Instance {
  id: string;
  state: string;
  wake: 'on' | 'off';
  type: string;
  launchTime: string | null;
}

export interface Status {
  checkedAt: number;
  site: { up: boolean; ms: number | null; code?: number; error?: string };
  stream: { reachable: boolean; online?: boolean; busy?: boolean; waiting?: number };
  cloud: { status: CloudState; instance: Instance | null; source?: 'admin' | 'public'; error?: string };
  local: { game: boolean; tunnel: boolean; running: boolean };
  servedBy: 'cloud' | 'local' | 'unknown' | null;
  overall: { key: OverallKey; label: string };
}

export type ActionName = 'cloudOn' | 'cloudOff' | 'localStart' | 'localStop';
export interface ActionEvent {
  name: ActionName;
  state: 'running' | 'done' | 'error';
  label: string;
  error?: string;
}

export type OrgKind = 'organization' | 'provider' | 'unknown';

export interface Insights {
  days: number;
  generatedAt: number;
  totals: {
    pageviews: number | null;
    visitors: number | null;
    projectViews: number | null;
    experienceOpens: number | null;
    experienceSessions: number | null;
    contactOpens: number | null;
    contactsSent: number | null;
  } | null;
  daily: { day: string; pageviews: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  projects: { project: string; views: number }[];
  referrers: { ref: string; visitors: number }[];
  places: { country: string | null; region: string | null; city: string | null; visitors: number }[];
  orgs: {
    org: string;
    asn: number | null;
    visitors: number;
    events: number;
    experienceOpens: number;
    contactsSent: number;
    lastSeen: number;
    cities: string | null;
    kind: OrgKind;
  }[];
  devices: { device: string | null; visitors: number }[];
  visits: {
    day: string;
    visitor: string;
    firstTs: number;
    lastTs: number;
    org: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    ref: string | null;
    events: number;
    projects: string | null;
    experiences: string | null;
    sessions: number;
    contacted: number;
    kind: OrgKind;
  }[];
  leads: Lead[];
}

export interface Lead {
  id: number;
  ts: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  org: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface Costs {
  monthToDate: number;
  currency: string;
  byService: { service: string; amount: number }[];
  from: string;
  to: string;
  cachedAt: number;
}

export interface Settings {
  siteUrl: string;
  queueUrl: string;
  controlUrl: string;
  projectDir: string;
  notifyLeads: boolean;
  notifyOrganizations: boolean;
  startWithWindows: boolean;
  hasAdminToken: boolean;
}

export interface Api {
  getStatus(): Promise<Status | null>;
  refreshStatus(): Promise<Status | null>;
  runAction(name: ActionName): Promise<void>;
  getInsights(days: number): Promise<Insights>;
  getCosts(fresh?: boolean): Promise<Costs>;
  deleteLead(id: number): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(changes: Partial<Settings> & { adminToken?: string }): Promise<Settings>;
  generateToken(): Promise<string>;
  testToken(): Promise<{ ok: boolean; error?: string }>;
  openExternal(url: string): Promise<void>;
  onStatus(callback: (status: Status) => void): () => void;
  onAction(callback: (event: ActionEvent) => void): () => void;
  onNavigate(callback: (tab: string) => void): () => void;
}

declare global {
  interface Window {
    archv3d: Api;
  }
}

export const api = window.archv3d;

/** Electron wraps errors thrown in the main process: "Error invoking remote method 'x': Error: message". */
export function errorText(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
