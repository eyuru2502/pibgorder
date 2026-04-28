import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const PRICE_MAP = { CSS: 45, RNLS: 47, RNSS: 44, Muslimah: 50 };
export const SIZE_SURCHARGE = 5;
export const SURCHARGE_SIZES = new Set(['3XL', '4XL']);
export const ALLOWED_JENIS = new Set(Object.keys(PRICE_MAP));
export const ALLOWED_SAIZ = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']);
export const ALLOWED_STATUS = new Set(['belum', 'diterima']);

const TOKEN_TTL_SEC = 8 * 60 * 60;
const RATE_LIMIT_STORE = 'pibg-ratelimit';

export function getSizeSurcharge(size) {
  return SURCHARGE_SIZES.has(String(size ?? '').trim().toUpperCase()) ? SIZE_SURCHARGE : 0;
}

export function getUnitPrice(jenis, saiz) {
  return Number(PRICE_MAP[jenis] || 0) + getSizeSurcharge(saiz);
}

export function getOrderTotal(jenis, saiz, kuantiti) {
  return getUnitPrice(jenis, saiz) * Math.max(1, Number(kuantiti || 1));
}

export function buildFingerprint(order = {}) {
  return [
    order.nama,
    order.telefon,
    order.jenis,
    order.saiz,
    order.kuantiti,
    order.jumlah,
    order.tarikh,
    order.status_bayaran,
  ].map((value) => String(value ?? '').trim().toLowerCase()).join('|');
}

export function extractCreatedAtMs(order = {}) {
  const fromField = Number(order.createdAtMs || 0);
  if (fromField > 0) return fromField;

  const idMatch = String(order.id || '').match(/^order-(\d{10,})-/);
  if (idMatch) return Number(idMatch[1]);

  const iso = Date.parse(String(order.createdAtIso || '').trim());
  if (!Number.isNaN(iso)) return iso;

  const raw = String(order.tarikh ?? '').trim();
  if (!raw) return 0;

  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (match) {
    let [, day, month, year, hour = '0', minute = '0', second = '0', meridiem = ''] = match;
    let hours = Number(hour);
    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hours < 12) hours += 12;
    if (upperMeridiem === 'AM' && hours === 12) hours = 0;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hours,
      Number(minute),
      Number(second)
    ).getTime();
  }

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;
  return 0;
}

const NAMA_MAX = 120;
const TELEFON_MAX = 20;
const CATATAN_MAX = 500;
const QTY_MAX = 50;

function clipString(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export function validateOrderInput(raw, { allowStatus = false } = {}) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Permintaan tidak sah' };
  }
  const nama = clipString(raw.nama, NAMA_MAX);
  const telefon = clipString(raw.telefon, TELEFON_MAX);
  const catatan = clipString(raw.catatan, CATATAN_MAX);
  const jenis = String(raw.jenis ?? '').trim();
  const saiz = String(raw.saiz ?? '').trim().toUpperCase();
  const kuantiti = Math.max(1, Math.min(QTY_MAX, Math.floor(Number(raw.kuantiti) || 0)));

  if (!nama) return { error: 'Nama diperlukan' };
  if (!telefon) return { error: 'Nombor telefon diperlukan' };
  if (!/^[0-9+\-\s]{8,20}$/.test(telefon)) return { error: 'Format telefon tidak sah' };
  if (!ALLOWED_JENIS.has(jenis)) return { error: 'Jenis baju tidak sah' };
  if (!ALLOWED_SAIZ.has(saiz)) return { error: 'Saiz tidak sah' };
  if (!kuantiti || kuantiti < 1) return { error: 'Kuantiti tidak sah' };

  let status_bayaran = 'belum';
  if (allowStatus) {
    const candidate = String(raw.status_bayaran ?? 'belum').trim().toLowerCase();
    if (!ALLOWED_STATUS.has(candidate)) return { error: 'Status bayaran tidak sah' };
    status_bayaran = candidate;
  }

  return {
    value: { nama, telefon, catatan, jenis, saiz, kuantiti, status_bayaran },
  };
}

const UPDATE_FIELDS = new Set([
  'nama',
  'telefon',
  'catatan',
  'jenis',
  'saiz',
  'kuantiti',
  'status_bayaran',
  'tarikh',
  'lastConfirmSentAt',
  'lastReminderSentAt',
  'lastNotificationType',
]);

export function sanitizeUpdateInput(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!UPDATE_FIELDS.has(key)) continue;
    if (key === 'kuantiti') {
      out.kuantiti = Math.max(1, Math.min(QTY_MAX, Math.floor(Number(value) || 1)));
      continue;
    }
    if (key === 'jenis') {
      const v = String(value ?? '').trim();
      if (v && !ALLOWED_JENIS.has(v)) return { error: 'Jenis tidak sah' };
      if (v) out.jenis = v;
      continue;
    }
    if (key === 'saiz') {
      const v = String(value ?? '').trim().toUpperCase();
      if (v && !ALLOWED_SAIZ.has(v)) return { error: 'Saiz tidak sah' };
      if (v) out.saiz = v;
      continue;
    }
    if (key === 'status_bayaran') {
      const v = String(value ?? '').trim().toLowerCase();
      if (v && !ALLOWED_STATUS.has(v)) return { error: 'Status bayaran tidak sah' };
      if (v) out.status_bayaran = v;
      continue;
    }
    if (key === 'nama') { out.nama = clipString(value, NAMA_MAX); continue; }
    if (key === 'telefon') { out.telefon = clipString(value, TELEFON_MAX); continue; }
    if (key === 'catatan') { out.catatan = clipString(value, CATATAN_MAX); continue; }
    if (key === 'tarikh') { out.tarikh = clipString(value, 64); continue; }
    if (key === 'lastConfirmSentAt' || key === 'lastReminderSentAt') {
      out[key] = clipString(value, 64);
      continue;
    }
    if (key === 'lastNotificationType') {
      out.lastNotificationType = clipString(value, 32);
      continue;
    }
  }
  return { value: out };
}

function base64urlEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}

function base64urlDecode(str) {
  return Buffer.from(String(str || ''), 'base64url');
}

function getSecret() {
  const secret = process.env.AUTH_TOKEN;
  if (!secret) throw new Error('Missing AUTH_TOKEN');
  return secret;
}

export function signSessionToken(payload = {}, ttlSec = TOKEN_TTL_SEC) {
  const secret = getSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const data = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64urlEncode(sig)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  let secret;
  try { secret = getSecret(); } catch { return null; }
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  let actual;
  try { actual = base64urlDecode(s); } catch { return null; }
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;
  let payload;
  try { payload = JSON.parse(base64urlDecode(p).toString('utf8')); } catch { return null; }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function requireAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return verifySessionToken(token);
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getClientIp(request) {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    ''
  );
}

export async function checkRateLimit(scope, ip, limit, windowSec) {
  if (!ip) return true;
  try {
    const store = getStore(RATE_LIMIT_STORE);
    const key = `${scope}:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    const entry = (await store.get(key, { type: 'json' })) || { count: 0, windowStart: now };
    if (now - entry.windowStart >= windowSec) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count += 1;
    await store.setJSON(key, entry);
    return entry.count <= limit;
  } catch {
    return true;
  }
}

export function isOriginAllowed(request) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true;
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  if (origin && allowed.includes(origin)) return true;
  if (referer) {
    try {
      const u = new URL(referer);
      if (allowed.includes(`${u.protocol}//${u.host}`)) return true;
    } catch {}
  }
  return false;
}
