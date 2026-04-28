import {
  checkRateLimit,
  getClientIp,
  safeEqual,
  signSessionToken,
} from './_lib/orders.mjs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit('login', ip, 5, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Terlalu banyak percubaan. Cuba lagi sebentar.' }), {
      status: 429,
      headers,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Permintaan tidak sah' }), { status: 400, headers });
  }

  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_TOKEN;

  if (!adminPass || !secret) {
    return new Response(JSON.stringify({ error: 'Konfigurasi tidak lengkap' }), {
      status: 500,
      headers,
    });
  }

  const userOk = safeEqual(username, adminUser);
  const passOk = safeEqual(password, adminPass);
  if (!userOk || !passOk) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers });
  }

  try {
    const token = signSessionToken({ sub: adminUser, role: 'admin' });
    return new Response(JSON.stringify({ token }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500, headers });
  }
};
