// =====================================================
// SafeReport — Generator Kode Tiket Unik
// Menghasilkan kode seperti "SF-8K9P" untuk setiap laporan.
// Kode ini digunakan pelapor anonim untuk cek status.
// =====================================================

/**
 * Buat kode tiket unik.
 * Menghindari karakter yang mudah tertukar: 0/O, 1/I
 */
export function generateKodePelacak(prefix = "SF"): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let kode = "";
  for (let i = 0; i < 4; i++) {
    kode += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${kode}`;
}

/**
 * Format tanggal ke format Indonesia.
 * Contoh: "2026-10-19" → "19 Oktober 2026"
 */
export function formatTanggal(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format tanggal + jam ke format Indonesia.
 * Contoh: "19 Okt 2026, 14:30"
 */
export function formatTanggalWaktu(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateStr;
  }
}
