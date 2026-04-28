import { getStore } from '@netlify/blobs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'PATCH') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token !== 'pibg2026') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { id, ...updates } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID diperlukan' }), { status: 400, headers });
  }

  try {
    const store = getStore('pibg-orders');
    const existing = await store.get(id, { type: 'json' });
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Pesanan tidak dijumpai' }), { status: 404, headers });
    }
    await store.setJSON(id, { ...existing, ...updates });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal kemaskini', detail: err.message }), { status: 500, headers });
  }
};
