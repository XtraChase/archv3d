// Public entry point of the experience (behind the Cloudflare tunnel): one viewer at a time, everyone else waits in line.
//   /queue       WebSocket. Visitors join the line here and get a one-time ticket when it's their turn.
//   /?ticket=..  WebSocket. Signalling, forwarded to the Pixel Streaming signalling server only for the current ticket.
//   /api/...     Blocked (the signalling server's REST API stays private; the gateway uses it to see if the game is up).
//   anything else is the page itself, forwarded to the signalling server's web server.
// Also refreshes the TURN credentials every day; the signalling server reloads peer_options.json when it changes.
// With --game it launches the packaged game and restarts it when it crashes or stops streaming.
// Run by start_experience.bat:  node servers/gateway.mjs --port 80 --upstream 8080 --game <exe> --streamer_port 8888
import http from 'node:http';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
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
const SESSION_SECONDS = Number(arg('session_minutes', 10)) * 60;
// No mouse/touch/keyboard input for this long ends the session (shorter while someone is waiting).
const IDLE_SECONDS_WAITING = Number(arg('idle_minutes_waiting', 3)) * 60;
const IDLE_SECONDS_ALONE = Number(arg('idle_minutes_alone', 15)) * 60;
// Warning shown before the session ends for either reason.
const WARNING_SECONDS = 60;
// Time a called visitor has to connect before the turn passes to the next one.
const CLAIM_SECONDS = 30;
const TURN_REFRESH_HOURS = 24;

// Game watchdog (only with --game).
const GAME = arg('game', '');
const STREAMER_PORT = Number(arg('streamer_port', 8888));
const WINDOWED = process.argv.includes('--windowed');
// A running game that hasn't been registered as a streamer for this long is treated as hung and restarted.
const HANG_SECONDS = 180;
// Crash loop guard: after this many launches within LAUNCH_WINDOW_MINUTES, pause for PAUSE_MINUTES.
const MAX_LAUNCHES = 5;
const LAUNCH_WINDOW_MINUTES = 15;
const PAUSE_MINUTES = 10;

const log = (...parts) => console.log(new Date().toISOString(), ...parts);

// ---- Queue state ----------------------------------------------------------------------------

/** @type {Set<import('ws').WebSocket>} every open /queue socket */
const visitors = new Set();
/** @type {import('ws').WebSocket[]} visitors waiting, first in line first */
const line = [];
/** The visitor who holds the stream, or null. */
let session = null;
// Whether the game is registered with the signalling server.
let online = false;

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function broadcast() {
  for (const ws of visitors) {
    send(ws, {
      type: 'queue',
      online,
      busy: session !== null,
      waiting: line.length,
      position: line.indexOf(ws) + 1,
      active: session?.ws === ws
    });
  }
}

/** Calls the next visitor in line if the stream is free. */
function advance() {
  if (!session && online && line.length > 0) {
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
  const idleLimit = line.length > 0 ? IDLE_SECONDS_WAITING : IDLE_SECONDS_ALONE;
  let deadline = session.lastActive + idleLimit * 1000;
  let reason = 'idle';
  if (line.length > 0) {
    // Someone is waiting: the session ends after SESSION_SECONDS, but never without a full warning.
    session.deadline ||= Math.max(session.startedAt + SESSION_SECONDS * 1000, now + WARNING_SECONDS * 1000);
    if (session.deadline < deadline) {
      deadline = session.deadline;
      reason = 'time';
    }
  } else {
    session.deadline = 0;
  }

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

async function checkOnline() {
  let streaming = false;
  try {
    const response = await fetch(`http://127.0.0.1:${UPSTREAM}/api/streamers`, { signal: AbortSignal.timeout(3000) });
    // A streamer counts once it has identified itself (streaming), not just connected.
    streaming = response.ok && (await response.json()).some((streamer) => streamer.streaming);
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
  const args = [
    '/Game/Main',
    WINDOWED ? '-Windowed' : '-RenderOffscreen',
    '-ResX=1920',
    '-ResY=1080',
    '-ForceRes',
    // No error dialogs: a message box (e.g. after a GPU hang) would block the game instead of letting it exit.
    '-unattended',
    `-PixelStreamingConnectionURL=ws://127.0.0.1:${STREAMER_PORT}`
  ];
  // Detached, so the game keeps running if the gateway's window is closed (stop_experience.bat stops both).
  spawn(GAME, args, { detached: true, stdio: 'ignore' }).unref();
  launches.push(Date.now());
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
      line.push(ws);
      log(`${ws.visitorId} joined the line (${line.length} waiting)`);
      advance();
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
