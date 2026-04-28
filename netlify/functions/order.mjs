import { getStore } from '@netlify/blobs';

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
    const store = getStore('orders');
    const key = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await store.setJSON(key, { ...order, id: key });

    return new Response(JSON.stringify({ success: true, id: key }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal simpan pesanan', detail: err.message }), { status: 500, headers });
  }
};
