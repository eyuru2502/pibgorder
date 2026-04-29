import { getStore } from '@netlify/blobs';
import { isAdminRequest } from './_lib/auth.mjs';
import { enforceRateLimit, json } from './_lib/security.mjs';
import { sanitizePublicOrder } from './_lib/validation.mjs';

const PRICE_MAP = { CSS: 45, RNLS: 47, RNSS: 44, Muslimah: 50 };
const SIZE_SURCHARGE = 5;
const SURCHARGE_SIZES = new Set(['3XL', '4XL']);

function getSizeSurcharge(size) {
  return SURCHARGE_SIZES.has(String(size ?? '').trim().toUpperCase()) ? SIZE_SURCHARGE : 0;
}

function getUnitPrice(jenis, saiz) {
  return Number(PRICE_MAP[jenis] || 0) + getSizeSurcharge(saiz);
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const limited = await enforceRateLimit(request, { scope: 'order-create', limit: 15, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return limited.response;

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Format data tidak sah.' }, 400);
  }

  const sanitized = sanitizePublicOrder(input, { isAdmin: isAdminRequest(request) });
  if (!sanitized.ok) return json({ error: sanitized.error }, 400);

  const order = sanitized.value;
  const { jenis, saiz, kuantiti } = order;

  try {
    const store = getStore('pibg-orders');
    const createdAtMs = Date.now();
    const key = `order-${createdAtMs}-${Math.random().toString(36).slice(2, 8)}`;
    const harga = getUnitPrice(jenis, saiz);
    const jumlah = harga * Math.max(1, Number(kuantiti || 1));
    await store.setJSON(key, {
      ...order,
      harga,
      jumlah,
      tarikh: new Date(createdAtMs).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      id: key,
      createdAtMs,
      createdAtIso: new Date(createdAtMs).toISOString(),
    });

    return json({ success: true, id: key }, 200);
  } catch {
    return json({ error: 'Gagal simpan pesanan.' }, 500);
  }
};
