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
        const normalized = normalizeForFingerprint({ ...existing, id: existing.id || blob.key });
        const existingFingerprint = buildFingerprint(normalized);
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
