// POST / with JSON {name, email, topic, message, website, openedAt} from the contact form on archv3d.com.
// Emails it to the binding's destination address with Reply-To set to the visitor. `website` is a honeypot field
// (hidden from people, filled by bots) and `openedAt` rejects forms sent faster than a person could type.
import { EmailMessage } from 'cloudflare:email';

interface Env {
  CONTACT_EMAIL: { send(message: EmailMessage): Promise<void> };
  FROM_ADDRESS: string;
  /** The insights database shared with the control Worker: each message is also kept as a lead for the desktop app. */
  DB?: D1Database;
}

/** Keeps the message as a lead (the visitor sent it to be contacted; the privacy page says so). Never blocks sending. */
async function saveLead(env: Env, request: Request, fields: { name: string; email: string; topic: string; message: string }) {
  if (!env.DB) return;
  const cf = (request.cf ?? {}) as { country?: string; region?: string; city?: string; asOrganization?: string };
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, name TEXT, email TEXT, topic TEXT, message TEXT,
        org TEXT, city TEXT, region TEXT, country TEXT)`
    ).run();
    await env.DB.prepare(
      'INSERT INTO leads (ts, name, email, topic, message, org, city, region, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(Date.now(), fields.name, fields.email, fields.topic, fields.message,
        cf.asOrganization ?? null, cf.city ?? null, cf.region ?? null, cf.country ?? null)
      .run();
  } catch (error) {
    console.error(`saving the lead failed: ${(error as Error).message}`);
  }
}

const TOPICS = ['Project inquiry', 'Architectural visualization', 'Live experience feedback', 'Other'];
const MIN_FILL_MS = 3000;

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

/** One header line's value: no line breaks (header injection), trimmed. */
const headerValue = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

/** RFC 2047 encoding for header text that isn't plain ASCII. */
function encodeHeader(value: string) {
  const clean = headerValue(value);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  const bytes = new TextEncoder().encode(clean);
  return `=?UTF-8?B?${btoa(String.fromCharCode(...bytes))}?=`;
}

function buildMessage(env: Env, to: string, fields: { name: string; email: string; topic: string; message: string }) {
  const subject = `archv3d.com · ${fields.topic} from ${fields.name}`;
  const body = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Topic: ${fields.topic}`,
    '',
    fields.message,
    '',
    '-- ',
    'Sent from the contact form on archv3d.com. Reply to this email to answer.'
  ].join('\r\n');
  const bodyBase64 = btoa(String.fromCharCode(...new TextEncoder().encode(body))).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${encodeHeader('archv3d contact form')} <${env.FROM_ADDRESS}>`,
    `To: <${to}>`,
    `Reply-To: ${encodeHeader(fields.name)} <${headerValue(fields.email)}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@archv3d.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    bodyBase64
  ].join('\r\n');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin'
        }
      });
    }
    if (request.method !== 'POST') return reply({ error: 'Not found' }, 404, origin);
    if (!origin) return reply({ error: 'Forbidden' }, 403, null);

    let input: Record<string, unknown>;
    try {
      input = await request.json();
    } catch {
      return reply({ error: 'Invalid request.' }, 400, origin);
    }
    const text = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '');
    const name = text('name');
    const email = text('email');
    const topic = TOPICS.includes(text('topic')) ? text('topic') : 'Other';
    const message = text('message');
    const openedAt = Number(input.openedAt);

    // Bots: answer as if it worked so they don't retry.
    if (text('website') || !openedAt || Date.now() - openedAt < MIN_FILL_MS) return reply({ ok: true }, 200, origin);

    if (!name || name.length > 100) return reply({ error: 'Please enter your name.' }, 400, origin);
    if (email.length > 200 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      return reply({ error: 'Please enter a valid email address.' }, 400, origin);
    }
    if (message.length < 10 || message.length > 5000) {
      return reply({ error: 'Please write a message between 10 and 5,000 characters.' }, 400, origin);
    }

    // The binding fixes the destination; the To header must match it.
    const to = 'james.chase.richards@gmail.com';
    try {
      await env.CONTACT_EMAIL.send(new EmailMessage(env.FROM_ADDRESS, to, buildMessage(env, to, { name, email, topic, message })));
    } catch (error) {
      console.error('send failed', error);
      await saveLead(env, request, { name, email, topic, message });
      return reply({ error: 'The message could not be sent right now.' }, 502, origin);
    }
    await saveLead(env, request, { name, email, topic, message });
    return reply({ ok: true }, 200, origin);
  }
};
