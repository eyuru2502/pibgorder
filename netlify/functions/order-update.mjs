import { getStore } from '@netlify/blobs';

const PRICE_MAP = { CSS: 45, RNLS: 47, RNSS: 44, Muslimah: 50 };
const SIZE_SURCHARGE = 5;
const SURCHARGE_SIZES = new Set(['3XL', '4XL']);

function getSizeSurcharge(size) {
  return SURCHARGE_SIZES.has(String(size ?? '').trim().toUpperCase()) ? SIZE_SURCHARGE : 0;
}

function getUnitPrice(jenis, saiz) {
  return Number(PRICE_MAP[jenis] || 0) + getSizeSurcharge(saiz);
}

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

function normalizeForFingerprint(record = {}) {
  const harga = getUnitPrice(record.jenis, record.saiz);
  const jumlah = harga * Math.max(1, Number(record.kuantiti || 1));
  return { ...record, harga, jumlah };
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
        const normalized = normalizeForFingerprint({ ...record, id: record.id || blob.key });
        const existingFingerprint = buildFingerprint(normalized);
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
    if (nextOrder.jenis && nextOrder.saiz && nextOrder.kuantiti) {
      nextOrder.harga = getUnitPrice(nextOrder.jenis, nextOrder.saiz);
      nextOrder.jumlah = nextOrder.harga * Math.max(1, Number(nextOrder.kuantiti || 1));
    }
    await store.setJSON(targetKey, nextOrder);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal kemaskini', detail: err.message }), { status: 500, headers });
  }
};
