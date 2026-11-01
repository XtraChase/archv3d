// Shared HTTP helpers for the control Worker: allowed origins, JSON replies, admin auth.

export interface Env {
  AWS_REGION: string;
  /** Name tag of the instance (its id changes if it is recreated). */
  INSTANCE_NAME: string;
  /** Access key of the IAM user archv3d-control (Worker secrets). */
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  /** Bearer token of the desktop app (Worker secret); the /admin endpoints are off without it. */
  ADMIN_TOKEN?: string;
  /** Visitor insights and contact leads (D1, shared with the contact Worker). */
  DB?: D1Database;
}

export function allowedOrigin(origin: string | null) {
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

export function reply(body: unknown, status: number, origin: string | null = null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function preflight(origin: string | null) {
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    }
  });
}

/** Whether the request carries the admin token, compared in constant time. */
export async function isAdmin(request: Request, env: Env) {
  const expected = env.ADMIN_TOKEN?.trim();
  const given = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!expected || !given) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(given))
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}
