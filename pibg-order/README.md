# 🟢 Sistem Pesanan Baju PIBG 2026

## Cara Deploy ke Netlify

### Langkah 1: Deploy site
1. Pergi ke https://netlify.com → Log masuk
2. Klik **"Add new site"** → **"Deploy manually"**
3. Drag & drop **folder ZIP** ini

### Langkah 2: Dapatkan SITE_ID dan TOKEN
Selepas deploy, pergi ke:
- **Site settings** → **General** → salin **Site ID**
- **User settings** → **Applications** → **Personal access tokens** → **New token** → salin token

### Langkah 3: Set Environment Variables
Pergi ke **Site settings** → **Environment variables** → **Add variable**:

| Key | Value |
|-----|-------|
| `SITE_ID` | (paste Site ID anda) |
| `TOKEN` | (paste personal access token) |

Klik **Save** kemudian **Deploy site** semula (Deploys → Trigger deploy).

### Langkah 4: Selesai ✅
Website sedia digunakan!

---

## Login Admin
- **URL:** `https://your-site.netlify.app/admin.html`
- **Username:** `admin`
- **Password:** `pibg2026`

> ⚠️ Tukar password dalam `admin.html` sebelum guna!

---

## Harga Baju
| Kod | Jenis | Harga |
|-----|-------|-------|
| CSS | Berkolar, Lengan Pendek | RM 45 |
| RNLS | Roundneck, Lengan Panjang | RM 47 |
| RNSS | Roundneck, Lengan Pendek | RM 44 |
| MUS | Muslimah | RM 50 |

**Tarikh Akhir: 8 Mei 2026**
