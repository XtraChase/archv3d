// Writes peer_options.json (the ICE servers the signalling server hands to the browser and to Unreal).
// With servers/turn.env present, asks Cloudflare TURN for short-lived credentials; otherwise STUN only.
// Run by start_experience.bat before the signalling server starts:  node servers/turn_refresh.mjs
// and by servers/gateway.mjs every day with --keep-on-error (a failed refresh keeps the current, still valid file).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, 'turn.env');
const outFile = join(here, 'peer_options.json');

// The gateway refreshes daily and the signalling server reloads the file, so this only has to outlast one missed refresh.
// Cloudflare accepts 48 h; 7 days is rejected as invalid.
const TTL_SECONDS = 48 * 3600;
const keepOnError = process.argv.includes('--keep-on-error');

const stunOnly = {
  iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
};

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function cloudflareIceServers({ TURN_KEY_ID, TURN_KEY_API_TOKEN }) {
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_SECONDS })
    }
  );
  if (!response.ok) throw new Error(`Cloudflare TURN returned ${response.status}: ${await response.text()}`);
  const { iceServers } = await response.json();
  // Browsers block port 53, and a TURN URL on it only adds a timeout.
  return iceServers.map((server) => ({
    ...server,
    urls: [server.urls].flat().filter((url) => !/:53(\?|$)/.test(url))
  }));
}

let options = stunOnly;
if (existsSync(envFile)) {
  try {
    const env = readEnv(envFile);
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) throw new Error('turn.env needs TURN_KEY_ID and TURN_KEY_API_TOKEN');
    options = { iceServers: await cloudflareIceServers(env) };
    const urls = options.iceServers.flatMap((server) => server.urls);
    console.log(`TURN credentials valid for ${TTL_SECONDS / 3600} h: ${urls.join(', ')}`);
  } catch (error) {
    if (keepOnError && existsSync(outFile)) {
      console.error(`TURN refresh failed, keeping the current credentials. ${error.message}`);
      process.exit(1);
    }
    console.error(`TURN setup failed, falling back to STUN only. ${error.message}`);
  }
} else {
  console.log('No servers/turn.env, using STUN only (some networks will not connect).');
}
// Write then rename, so the signalling server never reloads a half-written file.
writeFileSync(`${outFile}.tmp`, JSON.stringify(options, null, 2) + '\n');
renameSync(`${outFile}.tmp`, outFile);
