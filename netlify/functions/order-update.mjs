import { getStore } from '@netlify/blobs';
import { isAdminRequest } from './_lib/auth.mjs';
import { enforceRateLimit, json } from './_lib/security.mjs';
import { sanitizeOrderUpdates } from './_lib/validation.mjs';

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

export default async (request) => {
  if (request.method !== 'PATCH') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isAdminRequest(request)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const limited = await enforceRateLimit(request, { scope: 'order-update', limit: 120, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return limited.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Format data tidak sah.' }, 400);
  }

  const { id, fingerprint, original, ...rawUpdates } = body;
  const sanitized = sanitizeOrderUpdates(rawUpdates);
  if (!sanitized.ok) return json({ error: sanitized.error }, 400);
  const updates = sanitized.value;

  try {
    const store = getStore('pibg-orders');
    let targetKey = id ? String(id) : '';
    let existing = targetKey ? await store.get(targetKey, { type: 'json' }) : null;
    if (targetKey && !existing) {
      targetKey = '';
    }

    if (!existing && !targetKey) {
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
      return json({ error: 'Pesanan tidak dijumpai' }, 404);
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
    return json({ success: true }, 200);
  } catch {
    return json({ error: 'Gagal kemaskini pesanan.' }, 500);
  }
};
