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

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  let order;
  try {
    order = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { nama, telefon, jenis, saiz, kuantiti } = order;
  if (!nama || !telefon || !jenis || !saiz || !kuantiti) {
    return new Response(JSON.stringify({ error: 'Medan wajib tidak lengkap' }), { status: 400, headers });
  }

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
      id: key,
      createdAtMs,
      createdAtIso: new Date(createdAtMs).toISOString(),
    });

    return new Response(JSON.stringify({ success: true, id: key }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal simpan pesanan', detail: err.message }), { status: 500, headers });
  }
};
