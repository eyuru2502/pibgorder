import { getStore } from '@netlify/blobs';

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function getSecurityHeaders(extra = {}) {
  return { ...BASE_HEADERS, ...extra };
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: getSecurityHeaders(extraHeaders),
  });
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const firstIp = forwarded.split(',')[0]?.trim();
  return firstIp || request.headers.get('x-nf-client-connection-ip') || 'unknown';
}

export async function enforceRateLimit(request, { scope, limit, windowMs }) {
  const ip = getClientIp(request);
  const bucket = Math.floor(Date.now() / windowMs);
  const resetAt = (bucket + 1) * windowMs;
  const key = `${scope}:${ip}:${bucket}`;
  const store = getStore('pibg-security');
  const record = (await store.get(key, { type: 'json' })) || { count: 0 };

  if (record.count >= limit) {
    return {
      ok: false,
      response: json(
        { error: 'Terlalu banyak cubaan. Sila cuba sebentar lagi.' },
        429,
        { 'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) }
      ),
    };
  }

  await store.setJSON(key, { count: record.count + 1, resetAt });
  return { ok: true };
}
