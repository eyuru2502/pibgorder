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

function parseOrderTime(value) {
  const raw = String(value ?? '').trim();
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
      return parseOrderTime(b.tarikh) - parseOrderTime(a.tarikh);
    });

    return new Response(JSON.stringify({ orders: orders.filter(Boolean) }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal muatkan pesanan', detail: err.message }), { status: 500, headers });
  }
};
