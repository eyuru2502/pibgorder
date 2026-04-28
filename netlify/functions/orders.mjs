import { getStore } from '@netlify/blobs';

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
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const expected = process.env.AUTH_TOKEN;
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const store = getStore('pibg-orders');
    const { blobs } = await store.list();

    const orders = await Promise.all(
      blobs.map(async (b) => {
        const order = await store.get(b.key, { type: 'json' });
        if (!order) return null;
        const normalized = { ...order, id: order.id || b.key };
        return { ...normalized, fingerprint: buildFingerprint(normalized) };
      })
    );

    orders.sort((a, b) => {
      if (!a || !b) return 0;
      return new Date(b.tarikh || 0) - new Date(a.tarikh || 0);
    });

    return new Response(JSON.stringify({ orders: orders.filter(Boolean) }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal muatkan pesanan', detail: err.message }), { status: 500, headers });
  }
};
