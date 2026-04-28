import { getStore } from '@netlify/blobs';
import {
  buildFingerprint,
  extractCreatedAtMs,
  getUnitPrice,
  requireAuth,
} from './_lib/orders.mjs';

export default async (request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const session = requireAuth(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
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

    return new Response(JSON.stringify({ orders: orders.filter(Boolean) }), { status: 200, headers });
  } catch (err) {
    console.error('orders list failed', err);
    return new Response(JSON.stringify({ error: 'Gagal muatkan pesanan' }), { status: 500, headers });
  }
};
