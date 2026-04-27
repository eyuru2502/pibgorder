// netlify/functions/orders.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const store = getStore("pibg-orders");

    let orders = [];
    try {
      const data = await store.get("all-orders", { type: "json" });
      if (Array.isArray(data)) orders = data;
    } catch (e) {
      orders = [];
    }

    orders.sort((a, b) => b.id - a.id);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    };
  } catch (err) {
    console.error("Orders fetch error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Ralat server: " + err.message }),
    };
  }
};
