// archv3d Control, main process: settings, status checks, cloud/local stream actions and the control Worker's admin
// API (control/src/index.ts). The renderer reaches all of this through preload.cjs.
const { app, safeStorage } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ---- Settings (userData/config.json; the admin token encrypted with Windows DPAPI via safeStorage) -------------

const DEFAULTS = {
  siteUrl: 'https://archv3d.com/',
  queueUrl: 'wss://stream.archv3d.com/queue',
  controlUrl: 'https://archv3d-control.james-chase-richards.workers.dev/',
  // Holds start_experience.bat / stop_experience.bat for the stream on this PC.
  projectDir: 'D:\\Unreal Projects\\Movie_Studio\\ArchVizWeb',
  notifyLeads: true,
  notifyOrganizations: true,
  startWithWindows: false,
  adminToken: '', // encrypted, base64
  seenLeadId: 0,
  seenOrganizations: []
};

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function readConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(configPath(), 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

function adminToken(config = readConfig()) {
  if (!config.adminToken) return '';
  try {
    return safeStorage.decryptString(Buffer.from(config.adminToken, 'base64'));
  } catch {
    return '';
  }
}

/** Settings for the renderer: never the token itself, only whether one is set. */
function publicSettings() {
  const { adminToken: _token, seenLeadId: _lead, seenOrganizations: _orgs, ...rest } = readConfig();
  return { ...rest, hasAdminToken: Boolean(adminToken()) };
}

function saveSettings(changes) {
  const config = readConfig();
  for (const key of ['siteUrl', 'queueUrl', 'controlUrl', 'projectDir', 'notifyLeads', 'notifyOrganizations', 'startWithWindows']) {
    if (key in changes) config[key] = changes[key];
  }
  if (typeof changes.adminToken === 'string') {
    const token = changes.adminToken.trim();
    config.adminToken = token ? safeStorage.encryptString(token).toString('base64') : '';
  }
  writeConfig(config);
  app.setLoginItemSettings({ openAtLogin: Boolean(config.startWithWindows), args: ['--hidden'] });
  return publicSettings();
}

function generateToken() {
  return require('node:crypto').randomBytes(32).toString('hex');
}

function rememberSeen(leadId, organizations) {
  const config = readConfig();
  config.seenLeadId = Math.max(config.seenLeadId, leadId);
  config.seenOrganizations = [...new Set([...config.seenOrganizations, ...organizations])].slice(-2000);
  writeConfig(config);
}

// ---- Control Worker ----------------------------------------------------------------------------------

async function controlFetch(route, { method = 'GET', body, admin = true } = {}) {
  const config = readConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (admin) {
    const token = adminToken(config);
    if (!token) throw new Error('No admin token yet: add it in Settings.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(new URL(route, config.controlUrl), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000)
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("The admin token on this PC doesn't match ADMIN_TOKEN in Cloudflare (Settings).");
  if (response.status === 503 && admin) throw new Error('ADMIN_TOKEN isn\'t set on the control Worker in Cloudflare yet (Settings).');
  if (!response.ok) throw new Error(data.error || `${route}: HTTP ${response.status}`);
  return data;
}

// ---- Status ------------------------------------------------------------------------------------------

async function siteStatus(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000), cache: 'no-store' });
    return { up: response.ok, ms: Date.now() - started, code: response.status };
  } catch (error) {
    return { up: false, ms: null, error: error.message };
  }
}

/** The gateway's waiting-line socket, read once: what visitors see. Unreachable = nothing is streaming. */
function streamStatus(url) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      resolve(result);
    };
    const socket = new WebSocket(url);
    const timer = setTimeout(() => finish({ reachable: false }), 8000);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'queue') {
          finish({ reachable: true, online: message.online, busy: message.busy, waiting: message.waiting });
        }
      } catch {}
    };
    socket.onerror = () => finish({ reachable: false });
    socket.onclose = () => finish({ reachable: false });
  });
}

/** Processes of the stream on this PC (start_experience.bat): the game and the Cloudflare tunnel. */
function localStatus() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true }, (error, stdout) => {
      const names = error ? [] : stdout.split(/\r?\n/).map((line) => line.split('","')[0].replace(/^"/, '').toLowerCase());
      const game = names.includes('movie_studio.exe');
      const tunnel = names.includes('cloudflared.exe');
      resolve({ game, tunnel, running: game || tunnel });
    });
  });
}

async function cloudStatus() {
  try {
    if (adminToken()) return { ...(await controlFetch('admin/cloud')), source: 'admin' };
    const { status } = await controlFetch('status', { admin: false });
    return { status, instance: null, source: 'public' };
  } catch (error) {
    return { status: 'error', instance: null, error: error.message };
  }
}

/** What a visitor would see right now, for the tray and the header. */
function overall(stream, cloud, local) {
  if (stream.reachable) {
    if (!stream.online) return { key: 'starting', label: 'Starting up' };
    return stream.busy ? { key: 'busy', label: stream.waiting ? `In use · ${stream.waiting} waiting` : 'In use' } : { key: 'available', label: 'Available' };
  }
  if (local.running) return { key: 'starting', label: 'Starting on this PC' };
  if (cloud.status === 'asleep') return { key: 'asleep', label: 'Asleep · wakes on request' };
  if (cloud.status === 'starting' || cloud.status === 'running') return { key: 'starting', label: 'Cloud starting' };
  return { key: 'off', label: 'Unavailable' };
}

async function getStatus() {
  const config = readConfig();
  const [site, stream, cloud, local] = await Promise.all([
    siteStatus(config.siteUrl),
    streamStatus(config.queueUrl),
    cloudStatus(),
    localStatus()
  ]);
  // Who serves the stream: the cloud while its instance runs, else this PC when its processes run.
  const servedBy = stream.reachable ? (cloud.status === 'running' ? 'cloud' : local.running ? 'local' : 'unknown') : null;
  return { checkedAt: Date.now(), site, stream, cloud, local, servedBy, overall: overall(stream, cloud, local) };
}

// ---- Actions -----------------------------------------------------------------------------------------

function runBatch(file) {
  const dir = readConfig().projectDir;
  const script = path.join(dir, file);
  if (!fs.existsSync(script)) return Promise.reject(new Error(`${script} not found (Settings > Project folder).`));
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', ['/d', '/c', file], { cwd: dir, windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve(output.trim()) : reject(new Error(output.trim() || `${file} exited with ${code}`))));
  });
}

// The cloud and this PC share the Cloudflare tunnel: switching one on switches the other off first.
async function cloudOn() {
  if ((await localStatus()).running) await runBatch('stop_experience.bat');
  await controlFetch('admin/cloud', { method: 'POST', body: { action: 'on' } });
}

async function cloudOff() {
  await controlFetch('admin/cloud', { method: 'POST', body: { action: 'off' } });
}

async function localStart() {
  if (adminToken()) await controlFetch('admin/cloud', { method: 'POST', body: { action: 'off' } });
  await runBatch('start_experience.bat');
}

async function localStop() {
  await runBatch('stop_experience.bat');
}

// ---- Insights ----------------------------------------------------------------------------------------

// Networks that are internet providers, mobile carriers or clouds rather than a visitor's own organization. A visit
// from anything else is often a company, school or agency network: a likely business lead.
const PROVIDER = new RegExp(
  [
    'comcast', 'charter', 'spectrum', 'verizon', 'at&t', '\\batt\\b', 't-mobile', 'tmobile', 'sprint', 'cox ', 'centurylink',
    'lumen', 'frontier', 'windstream', 'mediacom', 'altice', 'optimum', 'suddenlink', 'cable one', 'sparklight', 'wow!',
    'starlink', 'space exploration', 'viasat', 'hughes', 'google', 'amazon', 'microsoft', 'cloudflare', 'digitalocean',
    'linode', 'akamai', 'ovh', 'hetzner', 'oracle', 'apple', 'facebook', 'meta platforms', 'vodafone', 'british tele',
    'deutsche telekom', 'orange', 'telefonica', 'bell canada', 'rogers', 'shaw', 'telus', 'videotron', 'ziply',
    'consolidated', 'brightspeed', 'astound', 'metronet', 'cricket', 'us cellular', 'dish', 'blackfoot', 'vision net',
    '3 rivers', 'mid-rivers', 'nemont', 'triangle', 'zscaler', 'private relay', 'proton', 'nordvpn', 'mullvad', 'm247',
    'datacamp', 'telephone', 'wireless', 'cellular', 'mobile', 'broadband', 'internet', 'cable', 'telecom', 'fiber',
    'communications', 'hosting', 'data center', 'datacenter', 'isp'
  ].join('|'),
  'i'
);

const orgKind = (org) => (!org ? 'unknown' : PROVIDER.test(org) ? 'provider' : 'organization');

async function getInsights(days) {
  const data = await controlFetch(`admin/insights?days=${days}`);
  for (const row of data.orgs ?? []) row.kind = orgKind(row.org);
  for (const row of data.visits ?? []) row.kind = orgKind(row.org);
  return data;
}

module.exports = {
  readConfig,
  writeConfig,
  publicSettings,
  saveSettings,
  generateToken,
  rememberSeen,
  getStatus,
  getInsights,
  getCosts: (fresh) => controlFetch(`admin/costs${fresh ? '?fresh=1' : ''}`),
  deleteLead: (id) => controlFetch('admin/leads/delete', { method: 'POST', body: { id } }),
  cloudOn,
  cloudOff,
  localStart,
  localStop,
  orgKind
};
