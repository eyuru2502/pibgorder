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

  if (request.method !== 'PATCH') {
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

  const { id, fingerprint, original, ...updates } = body;

  try {
    const store = getStore('pibg-orders');
    let targetKey = id ? String(id) : '';
    let existing = targetKey ? await store.get(targetKey, { type: 'json' }) : null;

    if (!existing) {
      const { blobs } = await store.list();
      const matcher = fingerprint || buildFingerprint(original || body);
      for (const blob of blobs) {
        const record = await store.get(blob.key, { type: 'json' });
        if (!record) continue;
        const existingFingerprint = buildFingerprint({ ...record, id: record.id || blob.key });
        if (matcher && existingFingerprint === matcher) {
          targetKey = blob.key;
          existing = record;
          break;
        }
      }
    }

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Pesanan tidak dijumpai' }), { status: 404, headers });
    }
    const nextOrder = {
      ...existing,
      ...updates,
      id: existing.id || targetKey,
      createdAtMs: existing.createdAtMs || updates.createdAtMs || null,
      createdAtIso: existing.createdAtIso || updates.createdAtIso || null,
    };
    await store.setJSON(targetKey, nextOrder);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal kemaskini', detail: err.message }), { status: 500, headers });
  }
};
