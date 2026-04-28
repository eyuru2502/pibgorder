# 🟢 Sistem Pesanan Baju PIBG 2026

## Cara Deploy ke Netlify

### Langkah 1: Deploy site
1. Pergi ke https://netlify.com → Log masuk
2. Klik **"Add new site"** → **"Deploy manually"**
3. Drag & drop **folder ZIP** ini

### Langkah 2: Set Environment Variables
Pergi ke **Site settings** → **Environment variables** → **Add variable**:

| Key | Value |
|-----|-------|
| `ADMIN_PASSWORD` | kata laluan admin yang kuat |

Klik **Save** kemudian deploy site semula (Deploys → Trigger deploy).

### Langkah 3: Selesai ✅
Website sedia digunakan!

---

## Login Admin
- **URL:** `https://your-site.netlify.app/admin.html`
- **Username:** `admin`
- **Password:** nilai `ADMIN_PASSWORD` yang ditetapkan di Netlify

> ⚠️ Jangan letak password admin dalam fail HTML. Simpan hanya sebagai environment variable `ADMIN_PASSWORD` di Netlify.

---

## Harga Baju
| Kod | Jenis | Harga |
|-----|-------|-------|
| CSS | Berkolar, Lengan Pendek | RM 45 |
| RNLS | Roundneck, Lengan Panjang | RM 47 |
| RNSS | Roundneck, Lengan Pendek | RM 44 |
| MUS | Muslimah | RM 50 |

**Tarikh Akhir: 8 Mei 2026**
