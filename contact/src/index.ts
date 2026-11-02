// POST / from the contact form on archv3d.com: {name, email, topic, message, website, openedAt, projectType, services,
// budget, timeline} as JSON, or as multipart form data with files (repeated) when there are attachments.
// Emails it to the binding's destination address with Reply-To set to the visitor, attachments included.
// `website` is a honeypot field (hidden from people, filled by bots) and `openedAt` rejects forms sent faster than a
// person could type.
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

// Quote details (the form shows them for project inquiries); anything else sent is dropped.
const PROJECT_TYPES = ['Residential', 'Commercial', 'Interior', 'Outdoor & landscape', 'Product', 'Other'];
const SERVICES = ['CAD drafting', 'BIM / Revit model', 'Still renderings', 'Animated walkthrough', 'Interactive Unreal tour'];
const BUDGETS = ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', 'Over $15,000', 'Not sure yet'];
const TIMELINES = ['As soon as possible', 'Within a month', '1 – 3 months', 'Flexible'];

// Attachments travel inside the email (base64 adds a third), so they're kept well under Email Routing's 25 MiB.
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  dwg: 'application/acad',
  dxf: 'application/dxf',
  rvt: 'application/octet-stream',
  skp: 'application/octet-stream',
  ifc: 'application/octet-stream',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain'
};

interface Attachment {
  name: string;
  type: string;
  data: Uint8Array;
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

/** Base64 of bytes, wrapped at 76 characters as MIME requires. */
function base64Lines(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/.{76}/g, '$&\r\n');
}

/** A file name safe for a MIME header: no quotes, slashes or line breaks; non-ASCII as RFC 2231. */
function fileParameter(name: string) {
  const clean = name.replace(/[\r\n"\\/]+/g, '_').slice(0, 120) || 'attachment';
  return /^[\x20-\x7e]*$/.test(clean) ? `filename="${clean}"` : `filename*=UTF-8''${encodeURIComponent(clean)}`;
}

function buildMessage(
  env: Env,
  to: string,
  fields: { name: string; email: string; topic: string; message: string; details: string[] },
  attachments: Attachment[]
) {
  const subject = `archv3d.com · ${fields.topic} from ${fields.name}`;
  const body = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Topic: ${fields.topic}`,
    ...fields.details,
    ...(attachments.length ? [`Attachments: ${attachments.map((file) => file.name).join(', ')}`] : []),
    '',
    fields.message,
    '',
    '-- ',
    'Sent from the contact form on archv3d.com. Reply to this email to answer.'
  ].join('\r\n');
  const headers = [
    `From: ${encodeHeader('archv3d contact form')} <${env.FROM_ADDRESS}>`,
    `To: <${to}>`,
    `Reply-To: ${encodeHeader(fields.name)} <${headerValue(fields.email)}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@archv3d.com>`,
    'MIME-Version: 1.0'
  ];
  const textPart = ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', base64Lines(new TextEncoder().encode(body))];
  if (!attachments.length) return [...headers, ...textPart].join('\r\n');

  const boundary = `archv3d-${crypto.randomUUID()}`;
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    ...textPart,
    ...attachments.flatMap((file) => [
      `--${boundary}`,
      `Content-Type: ${file.type}`,
      `Content-Disposition: attachment; ${fileParameter(file.name)}`,
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(file.data)
    ]),
    `--${boundary}--`,
    ''
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

    let input: Record<string, unknown> = {};
    let form: FormData | null = null;
    try {
      if ((request.headers.get('Content-Type') ?? '').startsWith('multipart/form-data')) {
        form = await request.formData();
        for (const [key, value] of form) if (typeof value === 'string' && !(key in input)) input[key] = value;
      } else {
        input = await request.json();
      }
    } catch {
      return reply({ error: 'Invalid request.' }, 400, origin);
    }
    const text = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '');
    const choice = (key: string, options: string[]) => (options.includes(text(key)) ? text(key) : '');
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

    // Quote details, when the form sent them.
    const sentServices: unknown[] = form ? form.getAll('services') : Array.isArray(input.services) ? input.services : [];
    const services = sentServices.filter((value): value is string => typeof value === 'string' && SERVICES.includes(value));
    const details = [
      ['Project type', choice('projectType', PROJECT_TYPES)],
      ['Services', services.join(', ')],
      ['Budget', choice('budget', BUDGETS)],
      ['Timeline', choice('timeline', TIMELINES)]
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`);

    const files = (form?.getAll('files') ?? []).filter((value): value is File => typeof value !== 'string' && value.size > 0);
    if (files.length > MAX_FILES) return reply({ error: `Please attach at most ${MAX_FILES} files.` }, 400, origin);
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      return reply({ error: 'Attachments can be 10 MB in total. For larger files, send a link in your message.' }, 400, origin);
    }
    const attachments: Attachment[] = [];
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!FILE_TYPES[extension]) {
        return reply({ error: `${file.name} isn’t a file type the form accepts (PDF, images, CAD, Revit, SketchUp, ZIP or Office).` }, 400, origin);
      }
      attachments.push({ name: file.name, type: FILE_TYPES[extension], data: new Uint8Array(await file.arrayBuffer()) });
    }

    // The lead keeps the details and the attachment names (not the files).
    const lead = {
      name,
      email,
      topic,
      message: [...details, ...(attachments.length ? [`Attachments: ${attachments.map((file) => file.name).join(', ')}`] : []), message].join('\n')
    };
    // The binding fixes the destination; the To header must match it.
    const to = 'james.chase.richards@gmail.com';
    try {
      await env.CONTACT_EMAIL.send(
        new EmailMessage(env.FROM_ADDRESS, to, buildMessage(env, to, { name, email, topic, message, details }, attachments))
      );
    } catch (error) {
      console.error('send failed', error);
      await saveLead(env, request, lead);
      return reply({ error: 'The message could not be sent right now.' }, 502, origin);
    }
    await saveLead(env, request, lead);
    return reply({ ok: true }, 200, origin);
  }
};
