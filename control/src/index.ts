// Wake/status service for the on-demand AWS instance (aws/ in the repo).
// GET  /status  {status: 'off' | 'asleep' | 'starting' | 'running'}
//   off       waking disabled (instance tag archv3d-wake != on, set by the desktop Stop shortcut) or not configured
//   asleep    allowed, instance stopped; POST /wake starts it
//   starting  instance booting (the stream comes up a few minutes later on stream.archv3d.com)
//   running   instance up; the page then talks to the gateway itself
// POST /wake    starts the instance when it is asleep. It powers itself off when idle (gateway --idle_shutdown_minutes).
import { AwsClient } from 'aws4fetch';

interface Env {
  AWS_REGION: string;
  /** Name tag of the instance (its id changes if it is recreated). */
  INSTANCE_NAME: string;
  /** Access key of an IAM user that may only describe instances and start this one (Worker secrets). */
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
}

type Status = 'off' | 'asleep' | 'starting' | 'running';

interface Instance {
  id: string;
  state: string;
  wake: string;
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

// ---- EC2 (query API, signed with SigV4) ------------------------------------------------------------

// The configured region, or us-west-2 when it's missing or not a region name (a dashboard secret named AWS_REGION
// once replaced it, and deleting that secret removed the setting until the next deploy from the repo).
const region = (env: Env) => (/^[a-z]{2}(-[a-z]+)+-\d$/.test(env.AWS_REGION ?? '') ? env.AWS_REGION : 'us-west-2');

async function ec2(env: Env, params: Record<string, string>) {
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!.trim(),
    service: 'ec2',
    region: region(env)
  });
  const url = new URL(`https://ec2.${region(env)}.amazonaws.com/`);
  url.search = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const response = await client.fetch(url.href);
  const text = await response.text();
  if (!response.ok) throw new Error(`EC2 ${params.Action} ${response.status}: ${text.slice(0, 400)}`);
  return text;
}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? '';

async function findInstance(env: Env): Promise<Instance | null> {
  const xml = await ec2(env, {
    Action: 'DescribeInstances',
    'Filter.1.Name': 'tag:Name',
    'Filter.1.Value.1': env.INSTANCE_NAME,
    'Filter.2.Name': 'instance-state-name',
    'Filter.2.Value.1': 'pending',
    'Filter.2.Value.2': 'running',
    'Filter.2.Value.3': 'stopping',
    'Filter.2.Value.4': 'stopped'
  });
  const item = xml.match(/<instancesSet>\s*<item>([\s\S]*?)<\/instancesSet>/)?.[1];
  if (!item) return null;
  const state = item.match(/<instanceState>([\s\S]*?)<\/instanceState>/)?.[1] ?? '';
  const wake = item.match(/<item>\s*<key>archv3d-wake<\/key>\s*<value>([^<]*)<\/value>/)?.[1] ?? '';
  return { id: tag(item, 'instanceId'), state: tag(state, 'name'), wake };
}

// Status is polled by every open page; a few seconds of caching per isolate keeps API calls low.
let cached: { status: Status; at: number } | null = null;

function toStatus(instance: Instance | null): Status {
  if (!instance || instance.wake !== 'on') return 'off';
  switch (instance.state) {
    case 'running':
      return 'running';
    case 'pending':
      return 'starting';
    default:
      // stopped, stopping
      return 'asleep';
  }
}

async function readStatus(env: Env, fresh = false) {
  if (!fresh && cached && Date.now() - cached.at < 5000) return { status: cached.status, instance: null };
  const instance = await findInstance(env);
  const status = toStatus(instance);
  cached = { status, at: Date.now() };
  return { status, instance };
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

    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      return reply({ status: 'off', reason: 'not configured' }, 200, origin);
    }

    try {
      if (pathname === '/status' && request.method === 'GET') {
        return reply({ status: (await readStatus(env)).status }, 200, origin);
      }
      if (pathname === '/wake' && request.method === 'POST') {
        if (!origin) return reply({ error: 'Forbidden' }, 403, null);
        const { status, instance } = await readStatus(env, true);
        if (status !== 'asleep' || !instance) return reply({ status }, status === 'off' ? 409 : 200, origin);
        // An instance that is still stopping can't start yet; the page retries.
        if (instance.state !== 'stopped') return reply({ status }, 200, origin);
        await ec2(env, { Action: 'StartInstances', 'InstanceId.1': instance.id });
        cached = { status: 'starting', at: Date.now() };
        console.log(`woke ${instance.id}`);
        return reply({ status: 'starting' }, 202, origin);
      }
      return reply({ error: 'Not found' }, 404, origin);
    } catch (error) {
      // The message on its own line: the dashboard's event list shows only stack traces for Error objects.
      console.error(`${pathname} failed: ${(error as Error).message}`);
      return reply({ status: 'error', error: 'Could not reach the cloud machine.' }, 502, origin);
    }
  }
};
