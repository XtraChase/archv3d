// GET  /status  {status: 'off' | 'asleep' | 'starting' | 'running'}
//   off       waking disabled (VM label archv3d-wake != on, set by the desktop Stop shortcut) or not configured
//   asleep    allowed, VM stopped; POST /wake starts it
//   starting  VM booting (the stream comes up a few minutes later on stream.archv3d.com)
//   running   VM up; the page then talks to the gateway itself
// POST /wake    starts the VM when it is asleep. The VM powers itself off when idle (gateway --idle_shutdown_minutes).

interface Env {
  GCP_PROJECT: string;
  GCP_ZONE: string;
  GCP_INSTANCE: string;
  /** Service account JSON key (Worker secret). */
  GCP_SA_KEY?: string;
}

type Status = 'off' | 'asleep' | 'starting' | 'running';

interface Instance {
  status: string;
  labels?: Record<string, string>;
}

function allowedOrigin(origin: string | null) {
  if (!origin) return null;
  try {
    const { protocol, hostname } = new URL(origin);
    const ok =
      hostname === 'archv3d.com' ||
      hostname.endsWith('.archv3d.com') ||
      hostname === 'archv3d.pages.dev' ||
      hostname.endsWith('.archv3d.pages.dev') ||
      (protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(hostname));
    return ok ? origin : null;
  } catch {
    return null;
  }
}

function reply(body: object, status: number, origin: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

// ---- Google auth: service account JWT -> OAuth access token, cached per isolate -------------------

let token: { value: string; expires: number } | null = null;

const base64url = (data: ArrayBuffer | string) =>
  btoa(typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data)))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

async function accessToken(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.expires > now + 60) return token.value;
  const key = JSON.parse(env.GCP_SA_KEY!) as { client_email: string; private_key: string };
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/compute',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  );
  const der = Uint8Array.from(atob(key.private_key.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
    'sign'
  ]);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signingKey, new TextEncoder().encode(`${header}.${claims}`));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`
    })
  });
  if (!response.ok) throw new Error(`token ${response.status}: ${await response.text()}`);
  const result = (await response.json()) as { access_token: string; expires_in: number };
  token = { value: result.access_token, expires: now + result.expires_in };
  return token.value;
}

// ---- Compute Engine ---------------------------------------------------------------------------

const instanceUrl = (env: Env) =>
  `https://compute.googleapis.com/compute/v1/projects/${env.GCP_PROJECT}/zones/${env.GCP_ZONE}/instances/${env.GCP_INSTANCE}`;

async function compute(env: Env, path: string, method = 'GET') {
  const response = await fetch(instanceUrl(env) + path, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(env)}` }
  });
  if (!response.ok) throw new Error(`compute ${method} ${path || '/'} ${response.status}: ${await response.text()}`);
  return response.json();
}

// Status is polled by every open page; a few seconds of caching per isolate keeps API calls low.
let cached: { status: Status; at: number } | null = null;

function toStatus(instance: Instance): Status {
  if (instance.labels?.['archv3d-wake'] !== 'on') return 'off';
  switch (instance.status) {
    case 'RUNNING':
      return 'running';
    case 'PROVISIONING':
    case 'STAGING':
    case 'REPAIRING':
      return 'starting';
    default:
      // TERMINATED, STOPPING, SUSPENDING, SUSPENDED
      return 'asleep';
  }
}

async function readStatus(env: Env, fresh = false): Promise<Status> {
  if (!fresh && cached && Date.now() - cached.at < 5000) return cached.status;
  const status = toStatus((await compute(env, '')) as Instance);
  cached = { status, at: Date.now() };
  return status;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request.headers.get('Origin'));
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin'
        }
      });
    }

    if (!env.GCP_SA_KEY) return reply({ status: 'off', reason: 'not configured' }, 200, origin);

    try {
      if (pathname === '/status' && request.method === 'GET') {
        return reply({ status: await readStatus(env) }, 200, origin);
      }
      if (pathname === '/wake' && request.method === 'POST') {
        if (!origin) return reply({ error: 'Forbidden' }, 403, null);
        const status = await readStatus(env, true);
        if (status !== 'asleep') return reply({ status }, status === 'off' ? 409 : 200, origin);
        // A VM that is still STOPPING can't start yet; the page retries.
        await compute(env, '/start', 'POST');
        cached = { status: 'starting', at: Date.now() };
        console.log('woke the VM');
        return reply({ status: 'starting' }, 202, origin);
      }
      return reply({ error: 'Not found' }, 404, origin);
    } catch (error) {
      console.error(error);
      return reply({ status: 'error', error: 'Could not reach the cloud machine.' }, 502, origin);
    }
  }
};
