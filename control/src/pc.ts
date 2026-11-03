// The link to the streaming PC, for starting and stopping the stream on it from the phone. The PC can't be reached from
// outside, so the desktop app calls POST /admin/pc/poll every few seconds: it reports what runs on the PC and gets back
// the pending command, if any, then reports the command's result in a later poll. State is kept in the D1 cache table.
import type { Env } from './http';
import { ensureSchema } from './insights';

export interface PcState {
  game: boolean;
  tunnel: boolean;
  running: boolean;
}
export type PcAction = 'start' | 'stop';
interface Command {
  id: string;
  action: PcAction;
  ts: number;
  claimed: boolean;
}
export interface PcResult {
  id: string;
  action: PcAction;
  ok: boolean;
  error?: string;
  ts: number;
}

/** The desktop app polls every 10 s: a report older than this means it isn't running. */
const ONLINE_MS = 45000;
/** A command nobody picked up in this time is dropped, so a PC switched on later doesn't suddenly start the stream. */
const COMMAND_MS = 120000;

const db = (env: Env) => env.DB!;

async function read<T>(env: Env, key: string): Promise<{ value: T; ts: number } | null> {
  await ensureSchema(db(env));
  const row = await db(env).prepare('SELECT value, ts FROM cache WHERE key = ?').bind(key).first<{ value: string; ts: number }>();
  return row ? { value: JSON.parse(row.value) as T, ts: row.ts } : null;
}

async function write(env: Env, key: string, value: unknown) {
  await ensureSchema(db(env));
  await db(env)
    .prepare('INSERT INTO cache (key, value, ts) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, ts = excluded.ts')
    .bind(key, JSON.stringify(value), Date.now())
    .run();
}

const remove = (env: Env, key: string) => db(env).prepare('DELETE FROM cache WHERE key = ?').bind(key).run();

export async function pcStatus(env: Env) {
  const [state, command, result] = await Promise.all([
    read<PcState>(env, 'pc-state'),
    read<Command>(env, 'pc-command'),
    read<PcResult>(env, 'pc-result')
  ]);
  const online = Boolean(state && Date.now() - state.ts < ONLINE_MS);
  const pending = command && Date.now() - command.value.ts < COMMAND_MS ? command.value.action : null;
  return { online, state: online ? state!.value : null, pending, last: result?.value ?? null };
}

/** Queues a start or stop for the PC. Fails when the desktop app isn't connected. */
export async function sendCommand(env: Env, action: PcAction) {
  if (!(await pcStatus(env)).online) throw new PcOffline();
  await write(env, 'pc-command', { id: crypto.randomUUID(), action, ts: Date.now(), claimed: false } satisfies Command);
}

export class PcOffline extends Error {
  constructor() {
    super("The PC isn't connected: open archv3d Control on it.");
  }
}

/** The cloud and the PC share the Cloudflare tunnel: turning the cloud on stops a stream that runs on the PC. */
export async function stopPcIfRunning(env: Env) {
  const status = await pcStatus(env);
  if (status.online && status.state?.running && status.pending !== 'stop') await sendCommand(env, 'stop');
}

/** The desktop app's poll: its state and the result of the last command in; the next command out. */
export async function poll(env: Env, body: { state?: PcState; result?: { id?: string; ok?: boolean; error?: string } }) {
  if (body.state) {
    const { game, tunnel, running } = body.state;
    await write(env, 'pc-state', { game: Boolean(game), tunnel: Boolean(tunnel), running: Boolean(running) } satisfies PcState);
  }
  const command = await read<Command>(env, 'pc-command');
  if (body.result?.id && command?.value.id === body.result.id) {
    await write(env, 'pc-result', {
      id: command.value.id,
      action: command.value.action,
      ok: Boolean(body.result.ok),
      error: body.result.error?.slice(0, 300),
      ts: Date.now()
    } satisfies PcResult);
    await remove(env, 'pc-command');
    return { command: null };
  }
  if (!command || command.value.claimed) return { command: null };
  if (Date.now() - command.value.ts >= COMMAND_MS) {
    await remove(env, 'pc-command');
    return { command: null };
  }
  await write(env, 'pc-command', { ...command.value, claimed: true, ts: command.value.ts });
  return { command: { id: command.value.id, action: command.value.action } };
}
