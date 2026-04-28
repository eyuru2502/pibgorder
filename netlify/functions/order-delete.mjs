import { getStore } from '@netlify/blobs';
import { buildFingerprint, requireAuth } from './_lib/orders.mjs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const session = requireAuth(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Permintaan tidak sah' }), { status: 400, headers });
  }

  try {
    const store = getStore('pibg-orders');

    let targetKey = body.id ? String(body.id) : '';
    if (targetKey) {
      const direct = await store.get(targetKey, { type: 'json' });
      if (!direct) targetKey = '';
    }

    if (!targetKey) {
      const { blobs } = await store.list();
      const fingerprint = body.fingerprint || buildFingerprint(body);
      for (const blob of blobs) {
        const existing = await store.get(blob.key, { type: 'json' });
        if (!existing) continue;
        const existingFingerprint = buildFingerprint({ ...existing, id: existing.id || blob.key });
        if (fingerprint && existingFingerprint === fingerprint) {
          targetKey = blob.key;
          break;
        }
      }
    }

    if (!targetKey) {
      return new Response(JSON.stringify({ error: 'Pesanan tidak dijumpai' }), { status: 404, headers });
    }

    await store.delete(targetKey);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('order-delete failed', err);
    return new Response(JSON.stringify({ error: 'Gagal padam' }), { status: 500, headers });
  }
};
