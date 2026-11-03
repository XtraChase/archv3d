// Public entry point of the experience (behind the Cloudflare tunnel): one viewer at a time, everyone else waits in line.
//   /queue       WebSocket. Visitors join the line here and get a one-time ticket when it's their turn.
//   /?ticket=..  WebSocket. Signalling, forwarded to the Pixel Streaming signalling server only for the current ticket.
//   /api/...     Blocked (the signalling server's REST API stays private; the gateway uses it to see if the game is up).
//   anything else is the page itself, forwarded to the signalling server's web server.
// Also refreshes the TURN credentials every day; the signalling server reloads peer_options.json when it changes.
// With --game it launches the packaged game and restarts it when it crashes or stops streaming.
// With --idle_shutdown_minutes (cloud VM only) it powers the machine off when nobody has used it for that long.
// Run by start_experience.bat:  node servers/gateway.mjs --port 80 --upstream 8080 --game <exe> --streamer_port 8888
import http from 'node:http';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { appendFile, existsSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : fallback;
}

const PORT = Number(arg('port', 80));
const UPSTREAM = Number(arg('upstream', 8080));

// A session can be cut short only while someone is waiting: after this long, with a warning first.
let SESSION_SECONDS = Number(arg('session_minutes', 10)) * 60;
// No mouse/touch/keyboard input for this long ends the session (shorter while someone is waiting).
let IDLE_SECONDS_WAITING = Number(arg('idle_minutes_waiting', 3)) * 60;
let IDLE_SECONDS_ALONE = Number(arg('idle_minutes_alone', 15)) * 60;
// Warning shown before the session ends for either reason.
const WARNING_SECONDS = 60;
// Time a called visitor has to connect before the turn passes to the next one.
const CLAIM_SECONDS = 30;
const TURN_REFRESH_HOURS = 24;

// Cloud VM only: power the machine off after this many minutes with nobody streaming or in line, so an on-demand VM
// stops billing (0 = never; start_experience.bat never passes it, the desktop must not shut down).
let IDLE_SHUTDOWN_MINUTES = Number(arg('idle_shutdown_minutes', 0));
// Cloud VM: these four limits are also read from the instance's tags (see Cloud settings below), so they can be changed live.
const IMDS_SETTINGS = process.argv.includes('--imds_settings');

// Game watchdog (only with --game).
const GAME = arg('game', '');
const STREAMER_PORT = Number(arg('streamer_port', 8888));
// The game touches Saved/heartbeat.txt every couple of seconds while its game thread runs. A hung game still looks
// connected to the signalling server, so a heartbeat that stops for this long gets the game killed and restarted.
const HEARTBEAT_FILE = GAME ? join(dirname(GAME), 'Movie_Studio', 'Saved', 'heartbeat.txt') : '';
const HEARTBEAT_STALE_SECONDS = 45;
const WINDOWED = process.argv.includes('--windowed');
// A running game that hasn't been registered as a streamer for this long is treated as hung and restarted.
const HANG_SECONDS = 180;
// Crash loop guard: after this many launches within LAUNCH_WINDOW_MINUTES, pause for PAUSE_MINUTES.
const MAX_LAUNCHES = 5;
const LAUNCH_WINDOW_MINUTES = 15;
const PAUSE_MINUTES = 10;

// --game_args "<args>": extra command-line arguments for the game (cloud VM experiments, set through instance
// metadata by cloud\stream-session.ps1, e.g. "-nosound").
const GAME_ARGS = arg('game_args', '').split(/\s+/).filter(Boolean);
// Boot warm-up (game argument -ArchVizWarmup): the game switches the lights on and visits every camera point before
// anyone watches, then writes Saved/warmup.done. Until then the game doesn't count as online, so no visitor gets a turn
// (on the cloud the first lights-on with a viewer connected deadlocked the game). If the file never appears (an older
// build, a stuck warm-up) the game is let through after WARMUP_TIMEOUT_SECONDS.
const WARMUP_ENABLED = GAME_ARGS.includes('-ArchVizWarmup');
const WARMUP_FILE = GAME ? join(dirname(GAME), 'Movie_Studio', 'Saved', 'warmup.done') : '';
const WARMUP_TIMEOUT_SECONDS = 120;
// When the game was last launched (or the gateway started and may have adopted a running game).
let gameLaunchedAt = Date.now();
let warmupLogged = false;
function warmedUp() {
  if (!WARMUP_ENABLED || !WARMUP_FILE) return true;
  const done = existsSync(WARMUP_FILE);
  const timedOut = Date.now() - gameLaunchedAt > WARMUP_TIMEOUT_SECONDS * 1000;
  if ((done || timedOut) && !warmupLogged) {
    warmupLogged = true;
    log(done ? 'game warm-up finished' : `game warm-up not finished after ${WARMUP_TIMEOUT_SECONDS} s, letting visitors in anyway`);
  }
  return done || timedOut;
}
// --log_file (cloud VM): also append to a file, which the cloud scripts upload for debugging.
const LOG_FILE = arg('log_file', '');
const log = (...parts) => {
  const line = [new Date().toISOString(), ...parts].join(' ');
  console.log(line);
  if (LOG_FILE) appendFile(LOG_FILE, line + '\n', () => {});
};

// ---- Queue state ----------------------------------------------------------------------------

/** @type {Set<import('ws').WebSocket>} every open /queue socket */
const visitors = new Set();
/** @type {import('ws').WebSocket[]} visitors waiting, first in line first */
const line = [];
/** The visitor who holds the stream, or null. */
let session = null;
// Whether the game is registered with the signalling server.
let online = false;
// The level the game was launched into ('studio' | 'house'). Switching level inside a running game while it streams
// hung it (the video capture is torn down mid-flight), so a visitor who wants the other level gets the game restarted
// directly into it instead, before their turn starts.
const LEVEL_MAPS = { studio: '/Game/Main', house: '/Game/Levels/AsBuilt_WP' };
let gameLevel = 'studio';
// Set while the game is being restarted into another level: no turns are given out until it is back.
let switching = false;
let pendingLevel = '';

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

/**
 * Sessions have no time cap (a joiner never ends the current session), so there is no honest upper bound on the wait:
 * 0 hides the estimate on the page.
 */
function waitUpperBound() {
  return 0;
}

function broadcast() {
  for (const ws of visitors) {
    const position = line.indexOf(ws) + 1;
    send(ws, {
      type: 'queue',
      online,
      busy: session !== null,
      waiting: line.length,
      position,
      // Visitors not in line yet are told what joining now would mean.
      waitSeconds: waitUpperBound(position || line.length + 1),
      active: session?.ws === ws
    });
  }
}

/** Calls the next visitor in line if the stream is free. */
function needsLevelChange(ws) {
  return !!GAME && !!ws.level && !!LEVEL_MAPS[ws.level] && ws.level !== gameLevel;
}

/** Restarts the game into `level`; the watchdog relaunches it (launchGame uses pendingLevel). */
function switchGameTo(level) {
  if (switching) return;
  log(`restarting the game into the ${level} level (it was in ${gameLevel})`);
  switching = true;
  pendingLevel = level;
  online = false;
  execFile('taskkill', ['/im', basename(GAME), '/f'], () => {});
}

function advance() {
  if (!session && online && !switching && line.length > 0 && needsLevelChange(line[0])) {
    switchGameTo(line[0].level);
    broadcast();
    return;
  }
  if (!session && online && !switching && line.length > 0) {
    const ws = line.shift();
    session = {
      ws,
      id: ws.visitorId,
      ticket: randomUUID(),
      signalling: null,
      startedAt: 0,
      lastActive: 0,
      deadline: 0,
      warned: '',
      claimTimer: setTimeout(() => endSession('claim'), CLAIM_SECONDS * 1000)
    };
    log(`turn -> ${session.id} (${line.length} still waiting)`);
    send(ws, { type: 'turn', ticket: session.ticket, seconds: CLAIM_SECONDS });
  }
  broadcast();
}

function endSession(reason) {
  if (!session) return;
  const { ws, id, signalling, claimTimer } = session;
  session = null;
  clearTimeout(claimTimer);
  log(`session ${id} ended: ${reason}`);
  send(ws, { type: 'ended', reason });
  // Let the 'ended' message arrive first so the page can explain why the stream stopped.
  if (signalling) setTimeout(() => signalling.destroy(), 500);
  advance();
}

/** Ends sessions that ran out of time or went idle, warning the viewer a minute before. */
function checkSession() {
  if (!session?.signalling) return;
  const now = Date.now();
  // Someone else joining the line never shortens or ends the current session: it ends only when its own viewer leaves
  // or goes idle for IDLE_SECONDS_ALONE (no time cap, and no shorter idle limit while others wait).
  const deadline = session.lastActive + IDLE_SECONDS_ALONE * 1000;
  const reason = 'idle';
  session.deadline = 0;

  if (now >= deadline) {
    endSession(reason);
  } else if (deadline - now <= WARNING_SECONDS * 1000) {
    if (session.warned !== reason) {
      session.warned = reason;
      send(session.ws, { type: 'ending', reason, seconds: Math.round((deadline - now) / 1000) });
    }
  } else if (session.warned) {
    // Activity (or an emptied line) took the session out of its warning period.
    session.warned = '';
    send(session.ws, { type: 'ending', reason, seconds: 0 });
  }
}
setInterval(checkSession, 1000);

// ---- Is the game streaming? -----------------------------------------------------------------

// ---- Is a player really in the game? --------------------------------------------------------
// The signalling server lists the viewers it has connected to the streamer. That list is compared with the gateway's
// own idea of who holds the stream, so a stale record can't lock everyone out ("in use" with nobody there):
//  - a session whose viewer is not in the game for PLAYER_ABSENT_SECONDS is ended, so the next visitor is let in;
//  - a viewer the gateway has no session for (it holds the single slot, --max_players 1) is disconnected after
//    GHOST_SECONDS, when it came through the gateway.
const PLAYER_ABSENT_SECONDS = 12;
const GHOST_SECONDS = 8;
/** Proxied signalling sockets (the browser side), so a stale viewer can be disconnected. */
const signallingSockets = new Set();
let absentSince = 0;
let ghostSince = 0;

function checkPlayers(players) {
  const now = Date.now();

  if (session?.signalling && online && players === 0) {
    absentSince ||= now;
    if (now - absentSince > PLAYER_ABSENT_SECONDS * 1000) {
      log(`session ${session.id}: the signalling server shows no viewer in the game, ending it so the next visitor can join`);
      absentSince = 0;
      endSession('absent');
    }
  } else {
    absentSince = 0;
  }

  if (players > 0 && !session?.signalling) {
    ghostSince ||= now;
    if (now - ghostSince > GHOST_SECONDS * 1000) {
      log(`${players} viewer(s) in the game but no session holds the stream: disconnecting ${signallingSockets.size} stale connection(s)`);
      ghostSince = 0;
      for (const socket of signallingSockets) socket.destroy();
    }
  } else {
    ghostSince = 0;
  }
}

async function checkOnline() {
  let streaming = false;
  // Viewers connected to the streamer, or null when the signalling server could not be asked.
  let players = null;
  try {
    const response = await fetch(`http://127.0.0.1:${UPSTREAM}/api/streamers`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const streamers = await response.json();
      // A streamer counts once it has identified itself (streaming), not just connected.
      streaming = streamers.some((streamer) => streamer.streaming) && warmedUp();
      players = streamers.reduce((total, streamer) => total + (streamer.subscribers?.length ?? 0), 0);
    }
  } catch {
    streaming = false;
  }
  if (streaming !== online) {
    online = streaming;
    log(online ? 'game online' : 'game offline');
    if (!online && session) {
      // The game went away mid-session (crash or restart): the viewer goes back to the front of the line.
      const { ws } = session;
      endSession('restart');
      if (ws.readyState === ws.OPEN && !line.includes(ws)) line.unshift(ws);
    }
    advance();
  }
  if (players !== null) checkPlayers(players);
  // A visitor may have been waiting for the game to come back (after a level restart): give the turn now.
  if (!session && online && !switching && line.length > 0) advance();
}
setInterval(checkOnline, 3000);
void checkOnline();

// ---- Game watchdog ----------------------------------------------------------------------------
// Polls for the game process (so a restarted gateway adopts a game that is already running), relaunches it when it
// has exited, and kills it when it has been running without streaming for HANG_SECONDS.

const gameImage = basename(GAME);
let launches = [];
let pausedUntil = 0;
let gameSeen = false;
// Heartbeat bookkeeping: only a game that has beaten since it was launched or adopted can be declared hung (an older
// build without the heartbeat never beats, and must not be killed).
let beatMtime = 0;
let beatChangedAt = Date.now();
let beatSeen = false;
// Last time the game was streaming or was (re)launched.
let lastHealthy = Date.now();

function isGameRunning() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/fi', `IMAGENAME eq ${gameImage}`, '/nh'], (error, stdout) =>
      resolve(!error && stdout.toLowerCase().includes(gameImage.toLowerCase()))
    );
  });
}

function launchGame() {
  if (pendingLevel) {
    gameLevel = pendingLevel;
    pendingLevel = '';
  }
  // Only a restart for a level change is intentional; crashes and hangs count towards the crash-loop guard.
  const intentional = switching;
  switching = false;
  const args = [
    LEVEL_MAPS[gameLevel] || '/Game/Main',
    WINDOWED ? '-Windowed' : '-RenderOffscreen',
    '-ResX=1920',
    '-ResY=1080',
    '-ForceRes',
    // No error dialogs: a message box (e.g. after a GPU hang) would block the game instead of letting it exit.
    '-unattended',
    // Silent on this PC's speakers (Windows volume mixer); the stream still carries the game's audio.
    '-ArchVizMuteLocalAudio',
    `-PixelStreamingConnectionURL=ws://127.0.0.1:${STREAMER_PORT}`,
    ...GAME_ARGS
  ];
  log(`launching the game in the ${gameLevel} level`);
  if (GAME_ARGS.length) log(`launching the game with extra arguments: ${GAME_ARGS.join(' ')}`);
  // Detached, so the game keeps running if the gateway's window is closed (stop_experience.bat stops both).
  // A new launch warms up again: forget the last one's marker.
  if (WARMUP_FILE) rmSync(WARMUP_FILE, { force: true });
  warmupLogged = false;
  gameLaunchedAt = Date.now();
  spawn(GAME, args, { detached: true, stdio: 'ignore' }).unref();
  beatSeen = false;
  beatChangedAt = Date.now();
  if (!intentional) launches.push(Date.now());
  lastHealthy = Date.now();
}

let watching = false;
async function watchGame() {
  if (watching) return;
  watching = true;
  try {
    const running = await isGameRunning();
    const now = Date.now();
    if (online) lastHealthy = now;
    if (running && HEARTBEAT_FILE) {
      let mtime = 0;
      try {
        mtime = statSync(HEARTBEAT_FILE).mtimeMs;
      } catch {
        // No heartbeat file yet.
      }
      if (mtime !== beatMtime) {
        if (beatMtime !== 0) beatSeen = true;
        beatMtime = mtime;
        beatChangedAt = now;
      } else if (beatSeen && now - beatChangedAt > HEARTBEAT_STALE_SECONDS * 1000) {
        log(`game heartbeat stopped ${HEARTBEAT_STALE_SECONDS} s ago (hung), killing it`);
        execFile('taskkill', ['/im', gameImage, '/f'], () => {});
        beatSeen = false;
        beatChangedAt = now;
        return;
      }
    }
    if (!running) {
      if (now < pausedUntil) return;
      launches = launches.filter((time) => now - time < LAUNCH_WINDOW_MINUTES * 60000);
      if (launches.length >= MAX_LAUNCHES) {
        pausedUntil = now + PAUSE_MINUTES * 60000;
        log(`game started ${launches.length} times in ${LAUNCH_WINDOW_MINUTES} min, waiting ${PAUSE_MINUTES} min before the next try`);
        return;
      }
      log(gameSeen ? 'game exited, restarting it' : 'starting the game');
      launchGame();
    } else if (now - lastHealthy > HANG_SECONDS * 1000) {
      log(`game running but not streaming for ${HANG_SECONDS} s, killing it`);
      execFile('taskkill', ['/im', gameImage, '/f'], () => {});
      lastHealthy = now;
    }
    gameSeen = running || gameSeen;
  } finally {
    watching = false;
  }
}
if (GAME) {
  // First check after the signalling server has had a few seconds to open its ports.
  setInterval(watchGame, 5000);
}

// ---- Idle shutdown (cloud VM) ------------------------------------------------------------------
// Counts from startup, so a VM woken by a visitor who never joins the line still powers off.

let lastUsed = Date.now();
let shuttingDown = false;
if (IDLE_SHUTDOWN_MINUTES > 0 || IMDS_SETTINGS) {
  if (IDLE_SHUTDOWN_MINUTES > 0) log(`idle shutdown: powering off after ${IDLE_SHUTDOWN_MINUTES} min with nobody streaming or waiting`);
  setInterval(() => {
    // Also while the shutdown is switched off, so switching it on starts a full countdown.
    if (session || line.length > 0 || IDLE_SHUTDOWN_MINUTES <= 0) {
      lastUsed = Date.now();
      return;
    }
    if (shuttingDown || Date.now() - lastUsed < IDLE_SHUTDOWN_MINUTES * 60000) return;
    shuttingDown = true;
    log(`idle for ${IDLE_SHUTDOWN_MINUTES} min, shutting the machine down`);
    execFile('shutdown', ['/s', '/t', '0', '/c', 'archv3d: idle, nobody streaming'], (error) => {
      if (error) {
        log(`shutdown failed: ${error.message}`);
        shuttingDown = false;
      }
    });
  }, 30000);
}

// ---- Cloud settings (cloud VM) --------------------------------------------------------------
// The archv3d Control app stores the limits as tags on the instance (through the control Worker); they are read from
// the instance metadata every minute, so a change applies at once, to sessions in progress too. Unset or invalid tags
// keep the launch values. Ranges match control/src/aws.ts.

const imds = 'http://169.254.169.254/latest';
const inRange = (value, min, max, current) => {
  const number = Number(value);
  return value !== '' && Number.isFinite(number) && number >= min && number <= max ? number : current;
};

async function readCloudSettings() {
  const token = await (
    await fetch(`${imds}/api/token`, { method: 'PUT', headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' }, signal: AbortSignal.timeout(3000) })
  ).text();
  const tag = async (name) => {
    const response = await fetch(`${imds}/meta-data/tags/instance/${name}`, {
      headers: { 'X-aws-ec2-metadata-token': token },
      signal: AbortSignal.timeout(3000)
    });
    return response.ok ? (await response.text()).trim() : '';
  };
  const [shutdown, session, alone, waiting] = await Promise.all([
    tag('archv3d-idle-shutdown'),
    tag('archv3d-session-minutes'),
    tag('archv3d-idle-alone'),
    tag('archv3d-idle-waiting')
  ]);
  const before = `${IDLE_SHUTDOWN_MINUTES}/${SESSION_SECONDS}/${IDLE_SECONDS_ALONE}/${IDLE_SECONDS_WAITING}`;
  IDLE_SHUTDOWN_MINUTES = inRange(shutdown, 0, 1440, IDLE_SHUTDOWN_MINUTES);
  SESSION_SECONDS = inRange(session, 1, 120, SESSION_SECONDS / 60) * 60;
  IDLE_SECONDS_ALONE = inRange(alone, 1, 240, IDLE_SECONDS_ALONE / 60) * 60;
  IDLE_SECONDS_WAITING = inRange(waiting, 1, 60, IDLE_SECONDS_WAITING / 60) * 60;
  if (before !== `${IDLE_SHUTDOWN_MINUTES}/${SESSION_SECONDS}/${IDLE_SECONDS_ALONE}/${IDLE_SECONDS_WAITING}`) {
    log(
      `cloud settings: power off after ${IDLE_SHUTDOWN_MINUTES || 'never'} min idle, session ${SESSION_SECONDS / 60} min while others wait, ` +
        `idle disconnect ${IDLE_SECONDS_ALONE / 60} min alone / ${IDLE_SECONDS_WAITING / 60} min with a line`
    );
  }
}

if (IMDS_SETTINGS) {
  const refreshCloudSettings = () => readCloudSettings().catch((error) => log(`cloud settings not read: ${error.message}`));
  refreshCloudSettings();
  setInterval(refreshCloudSettings, 60000);
}

// ---- TURN credentials -----------------------------------------------------------------------

function refreshTurn() {
  execFile(process.execPath, [join(here, 'turn_refresh.mjs'), '--keep-on-error'], (error, stdout, stderr) => {
    log(`TURN refresh: ${(stdout + stderr).trim() || (error ? error.message : 'done')}`);
  });
}
setInterval(refreshTurn, TURN_REFRESH_HOURS * 3600 * 1000);

// ---- Web server -----------------------------------------------------------------------------

const server = http.createServer((request, response) => {
  if (/^\/api(\/|$|\?)/.test(request.url)) {
    response.writeHead(404).end();
    return;
  }
  const upstream = http.request(
    { host: '127.0.0.1', port: UPSTREAM, method: request.method, path: request.url, headers: request.headers },
    (reply) => {
      response.writeHead(reply.statusCode, reply.headers);
      reply.pipe(response);
    }
  );
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  request.pipe(upstream);
});

const queueServer = new WebSocketServer({ noServer: true });

queueServer.on('connection', (ws) => {
  ws.visitorId = randomUUID().slice(0, 8);
  ws.alive = true;
  visitors.add(ws);
  ws.on('pong', () => (ws.alive = true));
  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (message.type === 'join') {
      if (session?.ws === ws || line.includes(ws)) return;
      // The same browser tab joining again (reload, or a page that lost its stream): its earlier place is stale, so
      // drop it instead of making the visitor queue behind themselves until that session times out.
      if (typeof message.level === 'string') ws.level = message.level.slice(0, 32);
      const client = typeof message.client === 'string' ? message.client.slice(0, 64) : '';
      if (client) {
        ws.clientId = client;
        for (let i = line.length - 1; i >= 0; i--) {
          if (line[i] !== ws && line[i].clientId === client) line.splice(i, 1);
        }
        if (session && session.ws !== ws && session.ws.clientId === client) {
          log(`${ws.visitorId} replaces its own earlier session ${session.id}`);
          endSession('replaced');
        }
      }
      line.push(ws);
      log(`${ws.visitorId} joined the line (${line.length} waiting)`);
      advance();
    } else if (message.type === 'level') {
      // The visitor picked another level while streaming: end the session and restart the game into it. They keep
      // their place at the front of the line and the page reconnects when the game is back.
      if (typeof message.level !== 'string') return;
      ws.level = message.level.slice(0, 32);
      if (session?.ws === ws) {
        endSession('switch');
        if (!line.includes(ws)) line.unshift(ws);
        advance();
      }
    } else if (message.type === 'leave') {
      leave(ws, 'left');
    } else if (message.type === 'active' && session?.ws === ws) {
      session.lastActive = Date.now();
    }
  });
  ws.on('close', () => {
    visitors.delete(ws);
    leave(ws, 'closed');
  });
  broadcast();
});

function leave(ws, reason) {
  const index = line.indexOf(ws);
  if (index >= 0) {
    line.splice(index, 1);
    log(`${ws.visitorId} left the line (${line.length} waiting)`);
    broadcast();
  }
  if (session?.ws === ws) endSession(reason);
}

// Pings keep idle sockets open through the tunnel and drop visitors whose connection died.
setInterval(() => {
  for (const ws of visitors) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 25000);

/** Passes a signalling WebSocket through to the signalling server untouched. */
function forwardSignalling(request, socket, head) {
  const upstream = net.connect(UPSTREAM, '127.0.0.1', () => {
    let headers = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
    for (let i = 0; i < request.rawHeaders.length; i += 2) headers += `${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}\r\n`;
    upstream.write(headers + '\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  const close = () => {
    socket.destroy();
    upstream.destroy();
  };
  signallingSockets.add(socket);
  socket.on('close', () => signallingSockets.delete(socket));
  socket.on('close', close).on('error', close);
  upstream.on('close', close).on('error', close);
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://gateway');
  if (url.pathname === '/queue') {
    queueServer.handleUpgrade(request, socket, head, (ws) => queueServer.emit('connection', ws, request));
    return;
  }
  const ticket = url.searchParams.get('ticket');
  if (!session || session.signalling || !ticket || ticket !== session.ticket) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  const current = session;
  clearTimeout(current.claimTimer);
  current.signalling = socket;
  current.startedAt = current.lastActive = Date.now();
  log(`session ${current.id} started`);
  socket.on('close', async () => {
    if (session !== current) return;
    // The signalling server drops viewers when the game disconnects; checkOnline then treats it as a restart.
    await checkOnline();
    if (session === current) endSession('disconnected');
  });
  forwardSignalling(request, socket, head);
});

server.listen(PORT, () =>
  log(
    `gateway on port ${PORT} -> signalling ${UPSTREAM}; session ${SESSION_SECONDS / 60} min while others wait, ` +
      `idle ${IDLE_SECONDS_WAITING / 60}/${IDLE_SECONDS_ALONE / 60} min`
  )
);
