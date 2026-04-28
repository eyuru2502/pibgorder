const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let order;
  try {
    order = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { nama, telefon, jenis, saiz, kuantiti } = order;
  if (!nama || !telefon || !jenis || !saiz || !kuantiti) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Medan wajib tidak lengkap' }) };
  }

  try {
    const store = getStore('orders');
    const key = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await store.setJSON(key, { ...order, id: key });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: key }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Gagal simpan pesanan', detail: err.message }),
    };
  }
};
