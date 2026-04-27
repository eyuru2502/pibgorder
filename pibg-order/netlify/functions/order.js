// netlify/functions/order.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { nama, telefon, jenis, saiz, kuantiti, jumlah, harga, catatan, tarikh } = body;

    if (!nama || !telefon || !jenis || !saiz) {
      return { statusCode: 400, body: JSON.stringify({ error: "Maklumat tidak lengkap" }) };
    }

    // On Netlify, getStore() auto-injects siteID & token from runtime context
    const store = getStore("pibg-orders");

    let orders = [];
    try {
      const existing = await store.get("all-orders", { type: "json" });
      if (Array.isArray(existing)) orders = existing;
    } catch (e) {
      orders = [];
    }

    const newOrder = {
      id: Date.now().toString(),
      nama: nama.trim(),
      telefon: telefon.trim(),
      catatan: (catatan || "").trim(),
      jenis,
      harga,
      saiz,
      kuantiti: parseInt(kuantiti) || 1,
      jumlah: parseInt(jumlah) || 0,
      tarikh: tarikh || new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" }),
    };

    orders.push(newOrder);
    await store.setJSON("all-orders", orders);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, orderId: newOrder.id }),
    };
  } catch (err) {
    console.error("Order error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Ralat server: " + err.message }),
    };
  }
};
