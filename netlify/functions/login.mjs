export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const { username, password } = await request.json();

    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    const token = process.env.AUTH_TOKEN;

    if (!adminPass || !token || username !== adminUser || password !== adminPass) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers });
    }

    return new Response(JSON.stringify({ token }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Login failed', detail: err.message }), { status: 500, headers });
  }
};
