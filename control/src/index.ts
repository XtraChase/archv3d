// Control service for archv3d.com: wakes the on-demand AWS instance, records cookieless visitor events, and serves the
// desktop app (archv3d Control).
//
// Public, from the site:
//   GET  /status   {status: 'off' | 'asleep' | 'starting' | 'running'}
//     off       waking disabled (instance tag archv3d-wake != on) or not configured
//     asleep    allowed, instance stopped; POST /wake starts it
//     starting  instance booting (the stream comes up a few minutes later on stream.archv3d.com)
//     running   instance up; the page then talks to the gateway itself
//   POST /wake     starts the instance when it is asleep. It powers itself off when idle.
//   POST /e        one visitor event (see insights.ts); always 204
// Desktop app (Authorization: Bearer ADMIN_TOKEN):
//   GET  /admin/cloud                    instance id, state, wake tag, type, launch time, and the cloud settings
//   POST /admin/cloud/settings {...}     idle power-off, session length and idle disconnect minutes (instance tags)
//   POST /admin/cloud {action: on|off}   on: allow waking and start; off: disallow waking and stop
//   GET  /admin/pc                       the PC's state (reported by the desktop app), pending command, last result
//   POST /admin/pc/command {action}      start|stop the stream on the PC (the desktop app runs it); 409 when it's offline
//   POST /admin/pc/poll {state, result}  the desktop app's poll: reports state, returns the pending command
//   GET  /admin/insights?days=30         visitors, pages, places, organizations, leads
//   POST /admin/leads/delete {id}        removes a contact lead
//   GET  /admin/costs[?fresh=1]          AWS month-to-date cost by service (cached 6 h)
import { findInstance, hasAwsKey, monthToDateCosts, readSettings, SETTING_FIELDS, setTags, setWake, startInstance, stopInstance, type CloudSettings, type Instance } from './aws';
import { allowedOrigin, isAdmin, preflight, reply, type Env } from './http';
import { cached, cleanup, deleteLead, ingest, summary } from './insights';
import { PcOffline, pcStatus, poll, sendCommand, stopPcIfRunning, type PcAction } from './pc';

type Status = 'off' | 'asleep' | 'starting' | 'running';

// Status is polled by every open page; a few seconds of caching per isolate keeps AWS calls low.
let cachedStatus: { status: Status; at: number } | null = null;

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
  if (!fresh && cachedStatus && Date.now() - cachedStatus.at < 5000) return { status: cachedStatus.status, instance: null };
  const instance = await findInstance(env);
  const status = toStatus(instance);
  cachedStatus = { status, at: Date.now() };
  return { status, instance };
}

async function admin(request: Request, env: Env, pathname: string, url: URL) {
  if (!env.ADMIN_TOKEN) return reply({ error: 'admin not configured (Worker secret ADMIN_TOKEN)' }, 503);
  if (!(await isAdmin(request, env))) return reply({ error: 'unauthorized' }, 401);

  if (pathname === '/admin/cloud/settings' && request.method === 'POST') {
    if (!hasAwsKey(env)) return reply({ error: 'AWS key not configured' }, 503);
    const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof CloudSettings, unknown>>;
    const tags: Record<string, string> = {};
    for (const [key, field] of Object.entries(SETTING_FIELDS)) {
      const value = body[key as keyof CloudSettings];
      if (value === undefined) continue;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < field.min || value > field.max) {
        return reply({ error: `${key} must be a whole number from ${field.min} to ${field.max}` }, 400);
      }
      tags[field.tag] = String(value);
    }
    if (Object.keys(tags).length === 0) return reply({ error: 'no settings given' }, 400);
    const instance = await findInstance(env);
    if (!instance) return reply({ error: `no instance named ${env.INSTANCE_NAME}` }, 404);
    await setTags(env, instance.id, tags);
    console.log(`admin cloud settings ${JSON.stringify(tags)} (${instance.id})`);
    return reply({ ok: true, settings: readSettings({ ...instance.tags, ...tags }) }, 200);
  }

  if (pathname === '/admin/cloud') {
    if (!hasAwsKey(env)) return reply({ error: 'AWS key not configured' }, 503);
    if (request.method === 'GET') {
      const instance = await findInstance(env);
      return reply({ instance, status: toStatus(instance), settings: readSettings(instance?.tags) }, 200);
    }
    const { action } = (await request.json().catch(() => ({}))) as { action?: string };
    const instance = await findInstance(env);
    if (!instance) return reply({ error: `no instance named ${env.INSTANCE_NAME}` }, 404);
    if (action === 'on') {
      await setWake(env, instance.id, true);
      if (instance.state === 'stopped') await startInstance(env, instance.id);
      // The stream on the PC shares the tunnel: have the desktop app stop it.
      if (env.DB) await stopPcIfRunning(env).catch((error) => console.error(`stop PC failed: ${error.message}`));
    } else if (action === 'off') {
      await setWake(env, instance.id, false);
      if (instance.state === 'running' || instance.state === 'pending') await stopInstance(env, instance.id);
    } else {
      return reply({ error: 'action must be on or off' }, 400);
    }
    cachedStatus = null;
    console.log(`admin cloud ${action} (${instance.id}, was ${instance.state})`);
    return reply({ ok: true }, 200);
  }

  if (!env.DB) return reply({ error: 'database not configured (D1 binding DB)' }, 503);
  if (pathname === '/admin/pc' && request.method === 'GET') return reply(await pcStatus(env), 200);
  if (pathname === '/admin/pc/command' && request.method === 'POST') {
    const { action } = (await request.json().catch(() => ({}))) as { action?: string };
    if (action !== 'start' && action !== 'stop') return reply({ error: 'action must be start or stop' }, 400);
    try {
      await sendCommand(env, action as PcAction);
    } catch (error) {
      if (error instanceof PcOffline) return reply({ error: error.message }, 409);
      throw error;
    }
    console.log(`admin pc ${action}`);
    return reply({ ok: true }, 200);
  }
  if (pathname === '/admin/pc/poll' && request.method === 'POST') {
    return reply(await poll(env, (await request.json().catch(() => ({}))) as Parameters<typeof poll>[1]), 200);
  }
  if (pathname === '/admin/insights' && request.method === 'GET') {
    const days = Math.min(400, Math.max(1, Number(url.searchParams.get('days')) || 30));
    return reply(await summary(env, days), 200);
  }
  if (pathname === '/admin/leads/delete' && request.method === 'POST') {
    const { id } = (await request.json().catch(() => ({}))) as { id?: number };
    if (!Number.isInteger(id)) return reply({ error: 'id required' }, 400);
    await deleteLead(env, id!);
    return reply({ ok: true }, 200);
  }
  if (pathname === '/admin/costs' && request.method === 'GET') {
    if (!hasAwsKey(env)) return reply({ error: 'AWS key not configured' }, 503);
    const fresh = url.searchParams.get('fresh') === '1';
    return reply(await cached(env, 'aws-costs', 6 * 3600000, () => monthToDateCosts(env), fresh), 200);
  }
  return reply({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = allowedOrigin(request.headers.get('Origin'));
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') return preflight(origin);

    try {
      if (pathname.startsWith('/admin/')) return await admin(request, env, pathname, url);

      if (pathname === '/e' && request.method === 'POST') {
        // Only from the site; recorded after the reply so the page never waits on the database.
        if (origin) {
          const text = await request.text();
          ctx.waitUntil(ingest(request, env, text).catch((error) => console.error(`/e failed: ${error.message}`)));
        }
        return new Response(null, { status: 204, headers: origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {} });
      }

      if (!hasAwsKey(env)) return reply({ status: 'off', reason: 'not configured' }, 200, origin);

      if (pathname === '/status' && request.method === 'GET') {
        return reply({ status: (await readStatus(env)).status }, 200, origin);
      }
      if (pathname === '/wake' && request.method === 'POST') {
        if (!origin) return reply({ error: 'Forbidden' }, 403);
        const { status, instance } = await readStatus(env, true);
        if (status !== 'asleep' || !instance) return reply({ status }, status === 'off' ? 409 : 200, origin);
        // An instance that is still stopping can't start yet; the page retries.
        if (instance.state !== 'stopped') return reply({ status }, 200, origin);
        await startInstance(env, instance.id);
        cachedStatus = { status: 'starting', at: Date.now() };
        console.log(`woke ${instance.id}`);
        return reply({ status: 'starting' }, 202, origin);
      }
      return reply({ error: 'Not found' }, 404, origin);
    } catch (error) {
      // The message on its own line: the dashboard's event list shows only stack traces for Error objects.
      console.error(`${pathname} failed: ${(error as Error).message}`);
      return reply({ status: 'error', error: 'Could not reach the cloud machine.' }, 502, origin);
    }
  },

  async scheduled(_event: ScheduledController, env: Env) {
    await cleanup(env);
  }
};
