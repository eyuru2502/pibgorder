import { getStore } from '@netlify/blobs';
import { isAdminRequest } from './_lib/auth.mjs';
import { json } from './_lib/security.mjs';

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

function extractCreatedAtMs(order = {}) {
  const fromField = Number(order.createdAtMs || 0);
  if (fromField > 0) return fromField;

  const idMatch = String(order.id || '').match(/^order-(\d{10,})-/);
  if (idMatch) return Number(idMatch[1]);

  const iso = Date.parse(String(order.createdAtIso || '').trim());
  if (!Number.isNaN(iso)) return iso;

  const raw = String(order.tarikh ?? '').trim();
  if (!raw) return 0;

  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (match) {
    let [, day, month, year, hour = '0', minute = '0', second = '0', meridiem = ''] = match;
    let hours = Number(hour);
    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hours < 12) hours += 12;
    if (upperMeridiem === 'AM' && hours === 12) hours = 0;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hours,
      Number(minute),
      Number(second)
    ).getTime();
  }

  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;
  return 0;
}

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isAdminRequest(request)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const store = getStore('pibg-orders');
    const { blobs } = await store.list();

    const orders = await Promise.all(
      blobs.map(async (b) => {
        const order = await store.get(b.key, { type: 'json' });
        if (!order) return null;
        const harga = getUnitPrice(order.jenis, order.saiz);
        const normalized = {
          ...order,
          id: order.id || b.key,
          harga,
          jumlah: harga * Math.max(1, Number(order.kuantiti || 1)),
          createdAtMs: extractCreatedAtMs({ ...order, id: order.id || b.key }),
        };
        return { ...normalized, fingerprint: buildFingerprint(normalized) };
      })
    );

    orders.sort((a, b) => {
      if (!a || !b) return 0;
      return extractCreatedAtMs(b) - extractCreatedAtMs(a);
    });

    return json({ orders: orders.filter(Boolean) }, 200);
  } catch {
    return json({ error: 'Gagal muatkan pesanan.' }, 500);
  }
};
