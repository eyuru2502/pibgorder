import { getStore } from '@netlify/blobs';

const SITE_ID = '561d73a3-614d-4db1-a790-1832bfb1dbba';

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = event.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');

  if (token !== 'pibg2026') {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const store = getStore({ name: 'orders', siteID: SITE_ID });
  const { blobs } = await store.list();

  const orders = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' }))
  );

  orders.sort((a, b) => {
    if (!a || !b) return 0;
    return new Date(b.tarikh || 0) - new Date(a.tarikh || 0);
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ orders: orders.filter(Boolean) }),
  };
};
