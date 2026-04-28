import { getStore } from '@netlify/blobs';
import {
  buildFingerprint,
  getUnitPrice,
  requireAuth,
  sanitizeUpdateInput,
} from './_lib/orders.mjs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'PATCH') {
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

  const { id, fingerprint, original } = body || {};
  const sanitized = sanitizeUpdateInput(body);
  if (sanitized.error) {
    return new Response(JSON.stringify({ error: sanitized.error }), { status: 400, headers });
  }
  const updates = sanitized.value;

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
      createdAtMs: existing.createdAtMs || null,
      createdAtIso: existing.createdAtIso || null,
    };

    if (nextOrder.jenis && nextOrder.saiz && nextOrder.kuantiti) {
      nextOrder.harga = getUnitPrice(nextOrder.jenis, nextOrder.saiz);
      nextOrder.jumlah = nextOrder.harga * Math.max(1, Number(nextOrder.kuantiti || 1));
    }

    await store.setJSON(targetKey, nextOrder);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('order-update failed', err);
    return new Response(JSON.stringify({ error: 'Gagal kemaskini' }), { status: 500, headers });
  }
};
