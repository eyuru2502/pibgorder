const ALLOWED_TYPES = new Set(['CSS', 'RNLS', 'RNSS', 'Muslimah']);
const ALLOWED_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']);
const ALLOWED_PAYMENT_STATUS = new Set(['belum', 'diterima']);
const ALLOWED_NOTIFICATION_TYPES = new Set(['', 'pengesahan', 'peringatan']);

function cleanText(value, maxLength) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('60') && digits.length >= 10 && digits.length <= 12) return digits;
  if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) return digits;
  return '';
}

export function sanitizePublicOrder(input = {}, { isAdmin = false } = {}) {
  const nama = cleanText(input.nama, 120);
  const telefon = normalizePhone(input.telefon);
  const jenis = cleanText(input.jenis, 20);
  const saiz = cleanText(input.saiz, 10).toUpperCase();
  const kuantiti = Number.parseInt(input.kuantiti, 10);
  const catatan = cleanText(input.catatan, 240);

  if (!nama) return { ok: false, error: 'Nama tidak sah.' };
  if (!telefon) return { ok: false, error: 'Nombor telefon tidak sah.' };
  if (!ALLOWED_TYPES.has(jenis)) return { ok: false, error: 'Jenis baju tidak sah.' };
  if (!ALLOWED_SIZES.has(saiz)) return { ok: false, error: 'Saiz baju tidak sah.' };
  if (!Number.isInteger(kuantiti) || kuantiti < 1 || kuantiti > 20) return { ok: false, error: 'Kuantiti tidak sah.' };

  const value = {
    nama,
    telefon,
    jenis,
    saiz,
    kuantiti,
    catatan,
    status_bayaran: 'belum',
    createdSource: isAdmin ? cleanText(input.createdSource || 'admin-manual', 40) : 'public-form',
  };

  if (isAdmin && ALLOWED_PAYMENT_STATUS.has(input.status_bayaran)) {
    value.status_bayaran = input.status_bayaran;
  }

  return { ok: true, value };
}

export function sanitizeOrderUpdates(input = {}) {
  const updates = {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (hasOwn('nama')) {
    const nama = cleanText(input.nama, 120);
    if (!nama) return { ok: false, error: 'Nama tidak sah.' };
    updates.nama = nama;
  }
  if (hasOwn('telefon')) {
    const telefon = normalizePhone(input.telefon);
    if (!telefon) return { ok: false, error: 'Nombor telefon tidak sah.' };
    updates.telefon = telefon;
  }
  if (hasOwn('jenis')) {
    const jenis = cleanText(input.jenis, 20);
    if (!ALLOWED_TYPES.has(jenis)) return { ok: false, error: 'Jenis baju tidak sah.' };
    updates.jenis = jenis;
  }
  if (hasOwn('saiz')) {
    const saiz = cleanText(input.saiz, 10).toUpperCase();
    if (!ALLOWED_SIZES.has(saiz)) return { ok: false, error: 'Saiz baju tidak sah.' };
    updates.saiz = saiz;
  }
  if (hasOwn('kuantiti')) {
    const kuantiti = Number.parseInt(input.kuantiti, 10);
    if (!Number.isInteger(kuantiti) || kuantiti < 1 || kuantiti > 20) return { ok: false, error: 'Kuantiti tidak sah.' };
    updates.kuantiti = kuantiti;
  }
  if (hasOwn('tarikh')) {
    const tarikh = cleanText(input.tarikh, 40);
    if (!tarikh) return { ok: false, error: 'Tarikh tidak sah.' };
    updates.tarikh = tarikh;
  }
  if (hasOwn('status_bayaran')) {
    const status = cleanText(input.status_bayaran, 20);
    if (!ALLOWED_PAYMENT_STATUS.has(status)) return { ok: false, error: 'Status bayaran tidak sah.' };
    updates.status_bayaran = status;
  }
  if (hasOwn('lastConfirmSentAt')) updates.lastConfirmSentAt = cleanText(input.lastConfirmSentAt, 40);
  if (hasOwn('lastReminderSentAt')) updates.lastReminderSentAt = cleanText(input.lastReminderSentAt, 40);
  if (hasOwn('lastNotificationType')) {
    const type = cleanText(input.lastNotificationType, 20);
    if (!ALLOWED_NOTIFICATION_TYPES.has(type)) return { ok: false, error: 'Status notifikasi tidak sah.' };
    updates.lastNotificationType = type;
  }

  return { ok: true, value: updates };
}
