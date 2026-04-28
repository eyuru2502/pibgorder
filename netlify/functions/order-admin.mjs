import { getStore } from '@netlify/blobs';
import {
  getUnitPrice,
  requireAuth,
  validateOrderInput,
} from './_lib/orders.mjs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const session = requireAuth(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  let raw;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Permintaan tidak sah' }), { status: 400, headers });
  }

  const validation = validateOrderInput(raw, { allowStatus: true });
  if (validation.error) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers });
  }

  const input = validation.value;

  try {
    const store = getStore('pibg-orders');
    const createdAtMs = Date.now();
    const key = `order-${createdAtMs}-${Math.random().toString(36).slice(2, 8)}`;
    const harga = getUnitPrice(input.jenis, input.saiz);
    const jumlah = harga * input.kuantiti;
    const tarikh = new Date(createdAtMs).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });

    const record = {
      nama: input.nama,
      telefon: input.telefon,
      catatan: input.catatan || 'Ditambah secara manual oleh admin',
      jenis: input.jenis,
      saiz: input.saiz,
      kuantiti: input.kuantiti,
      harga,
      jumlah,
      tarikh,
      status_bayaran: input.status_bayaran,
      createdSource: 'admin-manual',
      id: key,
      createdAtMs,
      createdAtIso: new Date(createdAtMs).toISOString(),
    };

    await store.setJSON(key, record);
    return new Response(JSON.stringify({ success: true, id: key }), { status: 200, headers });
  } catch (err) {
    console.error('order-admin create failed', err);
    return new Response(JSON.stringify({ error: 'Gagal simpan pesanan' }), { status: 500, headers });
  }
};
