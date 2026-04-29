import { getStore } from '@netlify/blobs';
import { isAdminRequest } from './_lib/auth.mjs';
import { enforceRateLimit, json } from './_lib/security.mjs';

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
  if (request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isAdminRequest(request)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const limited = await enforceRateLimit(request, { scope: 'order-delete', limit: 80, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return limited.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Format data tidak sah.' }, 400);
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
      return json({ error: 'Pesanan tidak dijumpai' }, 404);
    }

    await store.delete(targetKey);
    return json({ success: true }, 200);
  } catch {
    return json({ error: 'Gagal padam pesanan.' }, 500);
  }
};
