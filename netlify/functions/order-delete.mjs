import { getStore } from '@netlify/blobs';

function buildFingerprint(order = {}) {
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

  try {
    const store = getStore('pibg-orders');
    const { blobs } = await store.list();

    let targetKey = body.id ? String(body.id) : '';
    if (targetKey) {
      const direct = await store.get(targetKey, { type: 'json' });
      if (!direct) targetKey = '';
    }

    if (!targetKey) {
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
    return new Response(JSON.stringify({ error: 'Gagal padam', detail: err.message }), { status: 500, headers });
  }
};
