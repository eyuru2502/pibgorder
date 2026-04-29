import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseCookies } from './security.mjs';

const SESSION_COOKIE = 'pibg_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function toBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64Url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.AUTH_TOKEN || '';
}

export function createSessionCookie(secret) {
  const payload = {
    sub: 'admin',
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  const token = `${encoded}.${signature}`;
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; ');
}

function verifySessionToken(token, secret) {
  if (!token || !secret || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded));
    if (!payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdminRequest(request) {
  const secret = getSessionSecret();
  const cookies = parseCookies(request);
  const session = verifySessionToken(cookies[SESSION_COOKIE], secret);
  if (session?.sub === 'admin') return true;

  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return Boolean(process.env.AUTH_TOKEN && token === process.env.AUTH_TOKEN);
}
