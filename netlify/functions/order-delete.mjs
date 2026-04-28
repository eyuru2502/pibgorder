import { getStore } from '@netlify/blobs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const expected = process.env.AUTH_TOKEN;
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID diperlukan' }), { status: 400, headers });
  }

  try {
    const store = getStore('pibg-orders');
    await store.delete(id);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal padam', detail: err.message }), { status: 500, headers });
  }
};
