// archv3d Control: desktop app for archv3d.com. Window + system tray (closing the window keeps it running in the tray),
// status polling, cloud/local stream controls, visitor insights and lead notifications. See backend.cjs.
const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } = require('electron');
const path = require('node:path');
const backend = require('./backend.cjs');

const STATUS_EVERY_MS = 15000;
const INSIGHTS_EVERY_MS = 5 * 60000;
const ICONS = path.join(__dirname, '..', 'build', 'tray');

let win = null;
let tray = null;
let quitting = false;
let lastStatus = null;
let busy = false; // an action is running

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}
app.setAppUserModelId('com.archv3d.control');

function showWindow() {
  if (!win) createWindow();
  win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: '#0f1013',
    title: 'archv3d Control',
    icon: path.join(ICONS, 'app.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true }
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) win.show();
  });
  // Closing hides to the tray; Quit (tray menu) really exits.
  win.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    win.hide();
    const config = backend.readConfig();
    if (!config.trayHintShown) {
      tray?.displayBalloon({ title: 'archv3d Control is still running', content: 'It keeps watching your site from the tray. Right-click the icon to quit.' });
      backend.writeConfig({ ...config, trayHintShown: true });
    }
  });
  // Links (mailto:, the website) open outside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---- Tray ----------------------------------------------------------------------------------------------

function trayIcon(key) {
  const file = path.join(ICONS, `tray-${['available', 'busy', 'starting', 'asleep', 'off'].includes(key) ? key : 'unknown'}.png`);
  return nativeImage.createFromPath(file);
}

function updateTray() {
  if (!tray) return;
  const status = lastStatus;
  const key = status?.overall.key ?? 'unknown';
  tray.setImage(trayIcon(key));
  const served = status?.servedBy === 'cloud' ? ' (cloud)' : status?.servedBy === 'local' ? ' (this PC)' : '';
  tray.setToolTip(`archv3d: ${status ? status.overall.label + served : 'checking…'}${busy ? ' · working…' : ''}`);
  const cloudAllowed = status?.cloud.instance ? status.cloud.instance.wake === 'on' : status?.cloud.status && status.cloud.status !== 'off';
  const localRunning = Boolean(status?.local.running);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open archv3d Control', click: showWindow },
      { label: status ? `Stream: ${status.overall.label}${served}` : 'Stream: checking…', enabled: false },
      { type: 'separator' },
      cloudAllowed
        ? { label: 'Turn the cloud stream off', enabled: !busy, click: () => runAction('cloudOff') }
        : { label: 'Turn the cloud stream on', enabled: !busy, click: () => runAction('cloudOn') },
      localRunning
        ? { label: 'Stop the stream on this PC', enabled: !busy, click: () => runAction('localStop') }
        : { label: 'Start the stream on this PC', enabled: !busy, click: () => runAction('localStart') },
      { type: 'separator' },
      { label: 'Open archv3d.com', click: () => shell.openExternal(backend.readConfig().siteUrl) },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ])
  );
}

// ---- Polling, actions, notifications ---------------------------------------------------------------------

async function refreshStatus() {
  try {
    lastStatus = await backend.getStatus();
    win?.webContents.send('status', lastStatus);
  } catch (error) {
    console.error('status failed', error);
  }
  updateTray();
  return lastStatus;
}

const ACTION_LABELS = {
  cloudOn: 'Turning the cloud stream on',
  cloudOff: 'Turning the cloud stream off',
  localStart: 'Starting the stream on this PC',
  localStop: 'Stopping the stream on this PC'
};

async function runAction(name) {
  if (busy) throw new Error('Another action is still running.');
  busy = true;
  updateTray();
  win?.webContents.send('action', { name, state: 'running', label: ACTION_LABELS[name] });
  try {
    await backend[name]();
    win?.webContents.send('action', { name, state: 'done', label: ACTION_LABELS[name] });
  } catch (error) {
    win?.webContents.send('action', { name, state: 'error', label: ACTION_LABELS[name], error: error.message });
    throw error;
  } finally {
    busy = false;
    // The stream takes a while to change state; look again soon, then on the normal cadence.
    setTimeout(refreshStatus, 3000);
    setTimeout(refreshStatus, 15000);
  }
}

/** New contact leads and new organization visits, as Windows notifications. */
async function checkForNews() {
  const config = backend.readConfig();
  if (!config.notifyLeads && !config.notifyOrganizations) return;
  let data;
  try {
    data = await backend.getInsights(7);
  } catch {
    return; // no token yet, or offline
  }
  const freshLeads = (data.leads ?? []).filter((lead) => lead.id > config.seenLeadId);
  const orgs = (data.orgs ?? []).filter((row) => row.kind === 'organization');
  const freshOrgs = orgs.filter((row) => !config.seenOrganizations.includes(row.org));
  const firstRun = config.seenLeadId === 0 && config.seenOrganizations.length === 0;
  if (!firstRun && Notification.isSupported()) {
    if (config.notifyLeads) {
      for (const lead of freshLeads.slice(0, 3)) {
        const note = new Notification({ title: `New contact: ${lead.name}`, body: `${lead.topic} · ${lead.email}\n${(lead.message ?? '').slice(0, 120)}` });
        note.on('click', () => { showWindow(); win?.webContents.send('navigate', 'leads'); });
        note.show();
      }
    }
    if (config.notifyOrganizations) {
      for (const row of freshOrgs.slice(0, 3)) {
        const note = new Notification({ title: `Visitor from ${row.org}`, body: [row.cities, `${row.events} actions`].filter(Boolean).join(' · ') });
        note.on('click', () => { showWindow(); win?.webContents.send('navigate', 'visitors'); });
        note.show();
      }
    }
  }
  backend.rememberSeen(Math.max(0, ...(data.leads ?? []).map((lead) => lead.id)), orgs.map((row) => row.org));
}

// ---- IPC -----------------------------------------------------------------------------------------------

ipcMain.handle('status:get', () => lastStatus ?? refreshStatus());
ipcMain.handle('status:refresh', () => refreshStatus());
ipcMain.handle('action:run', (_event, name) => {
  if (!ACTION_LABELS[name]) throw new Error(`unknown action ${name}`);
  return runAction(name);
});
ipcMain.handle('insights:get', (_event, days) => backend.getInsights(Math.min(400, Math.max(1, Number(days) || 30))));
ipcMain.handle('costs:get', (_event, fresh) => backend.getCosts(Boolean(fresh)));
ipcMain.handle('leads:delete', (_event, id) => backend.deleteLead(Number(id)));
ipcMain.handle('settings:get', () => backend.publicSettings());
ipcMain.handle('settings:save', async (_event, changes) => {
  const settings = backend.saveSettings(changes ?? {});
  refreshStatus();
  return settings;
});
ipcMain.handle('settings:generateToken', () => backend.generateToken());
ipcMain.handle('open:external', (_event, url) => {
  if (/^(https?:|mailto:)/.test(url)) shell.openExternal(url);
});

// ---- Startup -------------------------------------------------------------------------------------------

app.whenReady().then(() => {
  tray = new Tray(trayIcon('unknown'));
  tray.on('click', showWindow);
  updateTray();
  createWindow();
  refreshStatus();
  setInterval(refreshStatus, STATUS_EVERY_MS);
  setTimeout(checkForNews, 10000);
  setInterval(checkForNews, INSIGHTS_EVERY_MS);
});

// Keep running in the tray when the window is closed.
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  quitting = true;
});
