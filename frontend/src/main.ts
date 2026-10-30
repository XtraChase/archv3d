import { Config, PixelStreaming, Flags, Logger, NumericParameters, TextParameters } from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.8';
import { findLevel, levels, levelUrl, queueUrl, settings, signallingUrl, urlParams } from './site';
import './styles.css';

// ---- Types shared with AArchVizPlayerController -------------------------------------------

type NavMode = 'orbit' | 'walk';

interface CameraInfo {
  id: string;
  name: string;
  category: string;
  mode: NavMode;
}

interface VariantSetInfo {
  set: string;
  options: string[];
}

interface CatalogMessage {
  event: 'catalog';
  /** Id of the open level (config.js levels[].id), empty if Unreal doesn't list it. */
  level?: string;
  cameras: CameraInfo[];
  variants: VariantSetInfo[];
  /** Ultra Dynamic Weather preset names; empty when the level has no weather system. */
  weather?: string[];
  /** 'uds' = Ultra Dynamic Sky (full 24 h), 'sunsky' = SunPosition sky (daylight only). */
  sky?: 'uds' | 'sunsky' | '';
  hasSun: boolean;
  hasLights: boolean;
}

interface StateMessage {
  event: 'state';
  mode: NavMode;
  camera: string;
  hour: number;
  weather?: string;
  lights: boolean;
}

/** Unreal is opening another level; a catalog follows once it has loaded. */
interface LoadingMessage {
  event: 'loading';
  level: string;
}

type UEMessage = CatalogMessage | StateMessage | LoadingMessage;

// ---- Helpers ------------------------------------------------------------------------------

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(document.querySelectorAll(selector)) as T[];

// The level picked on the landing page (?level=<id>); the first one when missing or unknown.
let currentLevel = findLevel(urlParams.get('level')) ?? levels[0];

// Stream resolution cap: the library requests the stage size x ViewportResScale, so shrink that scale
// whenever the stage is larger than the cap (long/short sides, so portrait screens get the rotated box).
const [maxLongSide, maxShortSide] = (urlParams.get('maxres') ?? settings.maxStreamResolution ?? '1920x1080')
  .split('x')
  .map(Number)
  .sort((a, b) => b - a);

function streamScaleFor(width: number, height: number) {
  const scale = Math.min(1, maxLongSide / Math.max(width, height), maxShortSide / Math.min(width, height));
  return Number.isFinite(scale) ? Math.max(0.1, scale) : 1;
}

function setStatus(text: string, isError = false) {
  const status = $('#status');
  status.textContent = text;
  status.classList.toggle('error', isError);
}

let hintTimer = 0;
function showHint(text: string) {
  const hint = $('#hint');
  hint.textContent = text;
  hint.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => hint.classList.remove('show'), 3500);
}

function formatHour(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
}

// ---- Pixel Streaming ----------------------------------------------------------------------

Logger.InitLogging(1, false);

const config = new Config({
  useUrlParams: true,
  initialSettings: {
    ss: signallingUrl,
    AutoConnect: false,
    AutoPlayVideo: true,
    StartVideoMuted: true,
    HoveringMouse: true,
    FakeMouseWithTouches: true,
    MatchViewportRes: true,
    WaitForStreamer: true,
    // Each session needs a fresh ticket from the queue, so the library must not reconnect on its own.
    MaxReconnectAttempts: 0,
    SuppressBrowserKeys: false
  }
});
config.setFlagEnabled(Flags.HoveringMouseMode, true);

// Registered before the PixelStreaming instance so it runs ahead of the library's own resize handler.
const stage = $('#stage');
const updateStreamScale = () =>
  config.setNumericSetting(NumericParameters.ViewportResScale, streamScaleFor(stage.clientWidth, stage.clientHeight));
updateStreamScale();
window.addEventListener('resize', updateStreamScale, true);

const stream = new PixelStreaming(config, { videoElementParent: stage });

function send(message: Record<string, unknown>) {
  stream.emitUIInteraction(message);
}

stream.addResponseEventListener('archviz', (response: string) => {
  let message: UEMessage;
  try {
    message = JSON.parse(response);
  } catch {
    return;
  }
  if (message.event === 'catalog') applyCatalog(message);
  else if (message.event === 'state') applyState(message);
  else if (message.event === 'loading') showLoading(message.level);
});

// Stream diagnostics: `?stats=1` shows an overlay; the latest summary is always on window.archvizStats.
const statsOverlay = new URLSearchParams(location.search).has('stats') ? document.createElement('pre') : null;
if (statsOverlay) {
  statsOverlay.id = 'stats';
  document.body.append(statsOverlay);
}
stream.addEventListener('statsReceived', ({ data: { aggregatedStats: stats } }) => {
  const video = stats.inboundVideoStats;
  const pair = stats.candidatePairs.find((candidate) => candidate.selected);
  const summary = {
    codec: (video.codecId && stats.codecs.get(video.codecId)?.mimeType) || '?',
    resolution: `${video.frameWidth ?? 0}x${video.frameHeight ?? 0}`,
    fps: video.framesPerSecond ?? 0,
    mbps: (video.bitrate ?? 0) / 1000,
    rttMs: pair ? Math.round(pair.currentRoundTripTime * 1000) : 0,
    dropped: video.framesDropped ?? 0,
    lost: video.packetsLost
  };
  window.archvizStats = summary;
  if (statsOverlay) {
    statsOverlay.textContent =
      `${summary.codec}  ${summary.resolution}  ${summary.fps} fps\n` +
      `${summary.mbps.toFixed(1)} Mbps  rtt ${summary.rttMs} ms\n` +
      `dropped ${summary.dropped}  lost ${summary.lost}`;
  }
});

stream.addEventListener('webRtcConnecting', () => setStatus('Connecting to the experience…'));
stream.addEventListener('webRtcConnected', () => setStatus('Connected, starting video…'));
// ---- Queue, offline and busy --------------------------------------------------------------
// servers/gateway.mjs lets one visitor stream at a time. Everyone else waits in line on its /queue socket and is
// handed a one-time ticket for the signalling connection when it's their turn. Offline: the gateway can't be
// reached (PC, tunnel or server down) or the game isn't registered with the signalling server.

const OFFLINE_TEXT = 'The experience is offline right now. Please check back later.';
// The gateway is up but the game isn't streaming: it restarts the game on its own.
const RESTARTING_TEXT = 'The experience is restarting, it should be back in a minute.';
// Backstop: the signalling server itself allows one viewer (--max_players 1).
const BUSY_TEXT = 'Someone else is exploring right now. Please try again in a few minutes.';
const ENDED_TEXT: Record<string, string> = {
  time: 'Your time is up, others were waiting. Thanks for exploring!',
  idle: 'Your session ended because there was no activity for a while.',
  claim: 'You missed your turn. Join the line again to explore.'
};

interface QueueMessage {
  type: 'queue';
  online: boolean;
  busy: boolean;
  waiting: number;
  position: number;
  active: boolean;
}
interface TurnMessage {
  type: 'turn';
  ticket: string;
}
interface EndingMessage {
  type: 'ending';
  reason: 'time' | 'idle';
  seconds: number;
}
interface EndedMessage {
  type: 'ended';
  reason: string;
}
type GatewayMessage = QueueMessage | TurnMessage | EndingMessage | EndedMessage;

let queueSocket: WebSocket | null = null;
let queueState: QueueMessage | null = null;
// Whether the gateway has been tried at least once since the page loaded.
let reachedGateway = false;
// Waiting in line / holding the stream (from the turn until the session ends).
let inLine = false;
let inSession = false;
// Between stream.connect() and the library's disconnect event.
let streamOpen = false;
// Set when we know why the next disconnect happens, so it replaces the generic message.
let failureText = '';
// Whether this connection attempt got a streamer list, i.e. the signalling server was reachable.
let reachedServer = false;
// Tab title before "Your turn" replaced it (only when the turn came while the tab was in the background).
let titleBeforeTurn = '';

function sendGateway(message: Record<string, unknown>) {
  if (queueSocket?.readyState === WebSocket.OPEN) queueSocket.send(JSON.stringify(message));
}

function connectQueue() {
  const socket = new WebSocket(queueUrl);
  queueSocket = socket;
  const openTimer = window.setTimeout(() => socket.close(), 8000);
  socket.onopen = () => window.clearTimeout(openTimer);
  socket.onmessage = (event) => {
    let message: GatewayMessage;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    onGatewayMessage(message);
  };
  socket.onclose = () => {
    window.clearTimeout(openTimer);
    queueSocket = null;
    queueState = null;
    reachedGateway = true;
    // The gateway forgets visitors whose socket closed, so the place in line is lost too.
    if (inLine) {
      inLine = false;
      failureText = 'Lost the connection to the experience, so you left the line.';
    }
    if (!inSession) renderLobby();
    window.setTimeout(connectQueue, 5000);
  };
}

function onGatewayMessage(message: GatewayMessage) {
  reachedGateway = true;
  if (message.type === 'queue') {
    queueState = message;
    const pill = $('#queue-pill');
    pill.textContent = `${message.waiting} waiting`;
    pill.classList.toggle('hidden', !inSession || message.waiting === 0);
    if (!inSession) renderLobby();
  } else if (message.type === 'turn') {
    inLine = false;
    inSession = true;
    startStream(message.ticket);
  } else if (message.type === 'ending') {
    showNotice(message);
  } else if (message.type === 'ended') {
    inSession = false;
    if (message.reason === 'restart') {
      // The game went away; the gateway put this visitor back at the front of the line.
      inLine = true;
      failureText = '';
    } else {
      failureText = ENDED_TEXT[message.reason] ?? failureText;
    }
    showNotice(null);
    if (streamOpen) stream.disconnect();
    else renderLobby();
  }
}

/** Overlay text and button while not streaming: offline, free, busy, or the visitor's place in line. */
function renderLobby() {
  const start = $<HTMLButtonElement>('#start');
  start.disabled = false;
  $('#queue-pill').classList.add('hidden');
  if (!queueState) {
    start.textContent = 'Try again';
    start.disabled = !reachedGateway;
    setStatus(reachedGateway ? OFFLINE_TEXT : 'Checking availability…', reachedGateway);
    return;
  }
  const { online, busy, waiting, position } = queueState;
  if (inLine) {
    start.textContent = 'Leave the line';
    setStatus(
      online
        ? `You're number ${position} in line (${waiting} waiting). It starts automatically when it's your turn, so keep this page open.`
        : `${RESTARTING_TEXT} You keep your place in line (number ${position}).`,
      !online
    );
    return;
  }
  start.textContent = busy || !online ? 'Join the line' : 'Start experience';
  if (failureText) setStatus(failureText, true);
  else if (!online) setStatus(`${RESTARTING_TEXT} Join the line to get in as soon as it's back.`, true);
  else if (busy) setStatus(`Someone is exploring right now${waiting ? `, ${waiting} waiting in line` : ''}.`);
  else setStatus('');
}

function startStream(ticket: string) {
  const url = new URL(signallingUrl);
  url.searchParams.set('ticket', ticket);
  config.setTextSetting(TextParameters.SignallingServerUrl, url.href);
  if (document.hidden) {
    titleBeforeTurn = document.title;
    document.title = `▶ Your turn · ${titleBeforeTurn}`;
  }
  failureText = '';
  reachedServer = false;
  $<HTMLButtonElement>('#start').disabled = true;
  setStatus("It's your turn! Connecting to the experience…");
  clearConnectTimer();
  connectTimer = window.setTimeout(
    () => setStatus('Still connecting… If this does not finish, your network may be blocking the stream.', true),
    20000
  );
  streamOpen = true;
  stream.connect();
}

// Session ending soon (time limit while others wait, or no input); seconds 0 cancels the warning.
let noticeTimer = 0;
function showNotice(message: EndingMessage | null) {
  const notice = $('#notice');
  window.clearInterval(noticeTimer);
  if (!message || message.seconds <= 0) {
    notice.classList.add('hidden');
    return;
  }
  const endsAt = performance.now() + message.seconds * 1000;
  const render = () => {
    const seconds = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
    notice.textContent =
      message.reason === 'time'
        ? `Others are waiting. Your session ends in ${seconds} s.`
        : `Still there? Your session ends in ${seconds} s unless you move or click.`;
  };
  render();
  notice.classList.remove('hidden');
  noticeTimer = window.setInterval(render, 1000);
}

// Input during a session tells the gateway the viewer is still there.
let lastActivitySent = 0;
function reportActivity() {
  if (!inSession || performance.now() - lastActivitySent < 5000) return;
  lastActivitySent = performance.now();
  sendGateway({ type: 'active' });
}
for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) {
  window.addEventListener(type, reportActivity, { capture: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && titleBeforeTurn) {
    document.title = titleBeforeTurn;
    titleBeforeTurn = '';
  }
});

stream.addEventListener('streamerListMessage', ({ data: { messageStreamerList } }) => {
  reachedServer = true;
  if (messageStreamerList.ids.length === 0) {
    failureText = OFFLINE_TEXT;
    stream.disconnect();
  }
});
stream.addEventListener('subscribeFailed', () => {
  failureText = BUSY_TEXT;
  stream.disconnect();
});

// Unreal makes the WebRTC offer, so the library never fires webRtcConnecting; time out the wait ourselves.
let connectTimer = 0;
function clearConnectTimer() {
  window.clearTimeout(connectTimer);
  connectTimer = 0;
}

stream.addEventListener('videoInitialized', () => {
  clearConnectTimer();
  $('#overlay').classList.add('hidden');
  $('#ui').classList.remove('hidden');
  $('#queue-pill').classList.toggle('hidden', !queueState?.waiting);
  // Unreal opens the visitor's level first if another one is running.
  send({ cmd: 'hello', level: currentLevel.id });
  showHint('Drag to look around · scroll to zoom · press H for controls');
});
stream.addEventListener('webRtcDisconnected', () => {
  streamOpen = false;
  clearConnectTimer();
  showNotice(null);
  hideLoading();
  $('#ui').classList.add('hidden');
  $('#overlay').classList.remove('hidden');
  if (inSession) {
    // Not ended by the gateway, so the connection dropped; the gateway frees the slot when the socket closes.
    inSession = false;
    failureText ||= reachedServer ? 'Disconnected. The experience stopped or restarted.' : OFFLINE_TEXT;
  }
  renderLobby();
});
stream.addEventListener('playStreamRejected', () => {
  setStatus('Click to start the video.', true);
  $<HTMLButtonElement>('#start').disabled = false;
});

$('#start').addEventListener('click', () => {
  if (inSession) {
    // Only clickable after playStreamRejected: the click lets the video play.
    stream.play();
    return;
  }
  if (inLine) {
    inLine = false;
    sendGateway({ type: 'leave' });
  } else if (queueSocket?.readyState === WebSocket.OPEN) {
    failureText = '';
    inLine = true;
    sendGateway({ type: 'join' });
  } else {
    failureText = OFFLINE_TEXT;
  }
  renderLobby();
});

renderLobby();
connectQueue();

// ---- Catalog and state from Unreal --------------------------------------------------------

let cameras: CameraInfo[] = [];
let activeCategory = '';
let activeCamera = '';
let lightsOn = true;

function applyCatalog(catalog: CatalogMessage) {
  const level = findLevel(catalog.level);
  if (level && level !== currentLevel) {
    currentLevel = level;
    applyBranding();
    history.replaceState(null, '', levelUrl(level.id));
  }
  hideLoading();
  renderLevels();

  cameras = catalog.cameras;
  const categories = [...new Set(cameras.map((camera) => camera.category))];
  if (!categories.includes(activeCategory)) activeCategory = categories[0] ?? '';

  const tabs = $('#view-tabs');
  tabs.replaceChildren(
    ...categories.map((category) => {
      const tab = document.createElement('button');
      tab.textContent = category;
      tab.classList.toggle('active', category === activeCategory);
      tab.addEventListener('click', () => {
        activeCategory = category;
        $$('#view-tabs button').forEach((b) => b.classList.toggle('active', b === tab));
        renderViews();
      });
      return tab;
    })
  );
  tabs.classList.toggle('hidden', categories.length < 2);
  renderViews();

  applySkyCatalog(catalog);
  $('#rail-lights').classList.toggle('hidden', !catalog.hasLights);
  $('#rail-finishes').classList.toggle('hidden', catalog.variants.length === 0);

  $('#variant-groups').replaceChildren(
    ...catalog.variants.map((group) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'variant-group';
      const heading = document.createElement('h3');
      heading.textContent = group.set;
      const swatches = document.createElement('div');
      swatches.className = 'swatches';
      for (const option of group.options) {
        const button = document.createElement('button');
        button.textContent = option;
        button.addEventListener('click', () => {
          swatches.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button));
          send({ cmd: 'variant', set: group.set, option });
        });
        swatches.append(button);
      }
      wrapper.append(heading, swatches);
      return wrapper;
    })
  );
}

function renderViews() {
  const list = $('#view-list');
  const visible = cameras.filter((camera) => camera.category === activeCategory);
  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No views have been set up yet.';
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...visible.map((camera) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.dataset.id = camera.id;
      button.classList.toggle('active', camera.id === activeCamera);
      const name = document.createElement('span');
      name.textContent = camera.name;
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = camera.mode;
      button.append(name, badge);
      button.addEventListener('click', () => send({ cmd: 'camera', id: camera.id }));
      item.append(button);
      return item;
    })
  );
}

function applyState(state: StateMessage) {
  activeCamera = state.camera;
  $$('#view-list button').forEach((b) => b.classList.toggle('active', b.dataset.id === activeCamera));
  $$('.segmented button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  $('#zoom').classList.toggle('hidden', state.mode !== 'orbit');

  if (!sunDragging) {
    $<HTMLInputElement>('#sun-slider').value = String(state.hour);
    $('#clock').textContent = formatHour(state.hour);
  }
  $$('#weather-grid button').forEach((b) => b.classList.toggle('active', b.dataset.weather === state.weather));

  lightsOn = state.lights;
  $('#rail-lights').classList.toggle('on', lightsOn);
}

// ---- Levels -------------------------------------------------------------------------------

// Level switches take a few seconds while Unreal loads; give up on the overlay if no catalog arrives.
let loadingTimer = 0;
function showLoading(levelId: string) {
  const level = findLevel(levelId);
  $('#loading-text').textContent = `Loading ${level?.title ?? 'project'}…`;
  $('#loading').classList.remove('hidden');
  window.clearTimeout(loadingTimer);
  loadingTimer = window.setTimeout(hideLoading, 60000);
}

function hideLoading() {
  window.clearTimeout(loadingTimer);
  $('#loading').classList.add('hidden');
}

function renderLevels() {
  $('#rail-levels').classList.toggle('hidden', levels.length < 2);
  $('#level-list').replaceChildren(
    ...levels.map((level) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.classList.toggle('active', level === currentLevel);
      const name = document.createElement('span');
      name.textContent = level.title;
      button.append(name);
      if (level.subtitle) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = level.subtitle;
        button.append(badge);
      }
      button.addEventListener('click', () => {
        if (level === currentLevel) return;
        openPanel('');
        showLoading(level.id);
        send({ cmd: 'level', value: level.id });
      });
      item.append(button);
      return item;
    })
  );
}

// ---- Controls -----------------------------------------------------------------------------

function openPanel(name: string) {
  $$('.rail-btn[data-panel]').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
  $$('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== `panel-${name}`));
}

$$('.rail-btn[data-panel]').forEach((button) =>
  button.addEventListener('click', () => {
    const isOpen = button.classList.contains('active');
    openPanel(isOpen ? '' : button.dataset.panel!);
  })
);

$('#rail-lights').addEventListener('click', () => send({ cmd: 'lights', on: !lightsOn }));

$$('.segmented button').forEach((button) =>
  button.addEventListener('click', () => {
    const mode = button.dataset.mode as NavMode;
    send({ cmd: 'mode', value: mode });
    if (mode === 'walk') showHint('Drag to look · WASD to move · double click to walk to a spot');
  })
);

$$('[data-zoom]').forEach((button) =>
  button.addEventListener('click', () => send({ cmd: 'zoom', value: Number(button.dataset.zoom) * 2 }))
);

// Time of day: stream slider changes at most every 60 ms.
let sunDragging = false;
let lastSunSend = 0;
let pendingHour: number | null = null;
const sunSlider = $<HTMLInputElement>('#sun-slider');

function sendHour(hour: number) {
  $('#clock').textContent = formatHour(hour);
  const now = performance.now();
  if (now - lastSunSend > 60) {
    lastSunSend = now;
    pendingHour = null;
    send({ cmd: 'time', hour });
  } else {
    pendingHour = hour;
    setTimeout(() => {
      if (pendingHour !== null) sendHour(pendingHour);
    }, 70);
  }
}

sunSlider.addEventListener('pointerdown', () => (sunDragging = true));
sunSlider.addEventListener('pointerup', () => (sunDragging = false));
sunSlider.addEventListener('input', () => sendHour(Number(sunSlider.value)));

// Ultra Dynamic Sky handles night (moon, stars), so it gets the full day; the SunPosition sky stays in daylight.
const TIME_PRESETS = {
  uds: { min: 0, max: 24, presets: { Sunrise: 6.5, Morning: 9, Noon: 12, Afternoon: 15.5, Sunset: 18, Night: 22 } },
  sunsky: { min: 5, max: 21, presets: { Morning: 7.5, Noon: 12, Afternoon: 17, 'Golden hour': 19.25 } }
};

const WEATHER_ICONS: Record<string, string> = {
  'Clear Skies': '☀️',
  'Partly Cloudy': '⛅',
  Cloudy: '🌥️',
  Overcast: '☁️',
  Foggy: '🌫️',
  'Light Rain': '🌦️',
  Rain: '🌧️',
  Thunderstorm: '⛈️',
  'Light Snow': '🌨️',
  Snow: '❄️',
  Blizzard: '🌬️'
};

function applySkyCatalog(catalog: CatalogMessage) {
  const weather = catalog.weather ?? [];
  $('#rail-sky').classList.toggle('hidden', !catalog.hasSun && weather.length === 0);
  $('#sky-time').classList.toggle('hidden', !catalog.hasSun);
  $('#sky-weather').classList.toggle('hidden', weather.length === 0);

  const range = TIME_PRESETS[catalog.sky === 'uds' ? 'uds' : 'sunsky'];
  sunSlider.min = String(range.min);
  sunSlider.max = String(range.max);
  $('#time-presets').replaceChildren(
    ...Object.entries(range.presets).map(([label, hour]) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', () => {
        sunSlider.value = String(hour);
        sendHour(hour);
      });
      return button;
    })
  );

  $('#weather-grid').replaceChildren(
    ...weather.map((name) => {
      const button = document.createElement('button');
      button.dataset.weather = name;
      const icon = document.createElement('span');
      icon.className = 'weather-icon';
      icon.textContent = WEATHER_ICONS[name] ?? '🌤️';
      const label = document.createElement('span');
      label.textContent = name;
      button.append(icon, label);
      button.addEventListener('click', () => {
        $$('#weather-grid button').forEach((b) => b.classList.toggle('active', b === button));
        send({ cmd: 'weather', value: name });
      });
      return button;
    })
  );
}

// Screenshot: grab the current video frame.
$('#btn-shot').addEventListener('click', () => {
  const video = document.querySelector<HTMLVideoElement>('#stage video');
  if (!video || !video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  const link = document.createElement('a');
  link.download = `${currentLevel.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showHint('Screenshot saved');
});

$('#btn-full').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    showHint('Fullscreen is not available here');
  }
});

const help = $('#help');
const toggleHelp = () => help.classList.toggle('hidden');
$('#btn-help').addEventListener('click', toggleHelp);
$('#help-close').addEventListener('click', toggleHelp);
document.addEventListener('keydown', (event) => {
  if (event.key === 'h' || event.key === 'H') toggleHelp();
  if (event.key === 'Escape') help.classList.add('hidden');
});

// ---- Branding -----------------------------------------------------------------------------

function applyBranding() {
  $('#title').textContent = currentLevel.title;
  $('#brand-title').textContent = currentLevel.title;
  $('#subtitle').textContent = currentLevel.subtitle ?? 'Interactive architectural experience';
  document.title = `${currentLevel.title} · ${settings.title ?? 'Interactive'}`;
}
applyBranding();
renderLevels();
