import { clearSessionCookie, createSessionCookie, getSessionSecret, isAdminRequest } from './_lib/auth.mjs';
import { enforceRateLimit, json } from './_lib/security.mjs';

export default async (request) => {
  if (request.method === 'GET') {
    return json({ authenticated: isAdminRequest(request) });
  }

  if (request.method === 'DELETE') {
    return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const limited = await enforceRateLimit(request, { scope: 'login', limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return limited.response;

  try {
    const { username, password } = await request.json();
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    const sessionSecret = getSessionSecret();

    if (!adminPass || !sessionSecret || username !== adminUser || password !== adminPass) {
      return json({ error: 'Nama pengguna atau kata laluan salah.' }, 401);
    }

    return json(
      { success: true, authenticated: true },
      200,
      { 'Set-Cookie': createSessionCookie(sessionSecret) }
    );
  } catch {
    return json({ error: 'Login gagal. Sila cuba lagi.' }, 500);
  }
};
