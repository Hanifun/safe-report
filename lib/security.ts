// =====================================================
// SafeReport — Modul Keamanan Tingkat Lanjut
// 1. Sanitasi Input XSS (Cross-Site Scripting)
// 2. Validasi Berkas Ketat (Anti-Malware / Format Palsu)
// 3. Tanda Tangan Integritas Sesi (Anti-Tampering Sesi)
// 4. Rate Limiting & Cooldown (Anti-Flood & Anti-Spam)
// =====================================================

import { Profile } from "@/types";

/**
 * 1. Sanitasi Teks (Anti-XSS):
 * Menghapus tag HTML, atribut event handler (onclick, onload), dan protocol berbahaya.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "") // Hapus semua tag HTML
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "") // Hapus inline event handlers
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Hapus kontrol karakter aneh
    .trim();
}

/**
 * Sanitasi Nama Berkas (Anti-Path Traversal ../)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .slice(0, 80);
}

/**
 * 2. Validasi Berkas Unggahan yang Ketat
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateUploadedFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Berkas "${file.name}" melebihi batas maksimal 5 MB.` };
  }

  // Cek MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Format berkas "${file.name}" tidak diizinkan. Hanya menerima format JPG, PNG, atau WebP.`,
    };
  }

  // Cek ekstensi nama berkas
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Ekstensi berkas "${file.name}" tidak aman. Hanya format .jpg, .png, atau .webp yang diizinkan.`,
    };
  }

  return { valid: true };
}

/**
 * 3. Token Kriptografis Acak
 */
export function generateSecureToken(length = 32): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 4. Tanda Tangan Integritas Sesi (Anti-Tampering)
 * Mencegah manipulasi 'role' atau 'id' pada localStorage oleh pihak ketiga.
 */
const SESSION_SECRET_SALT = "SafeReport_SecSalt_2026_SchoolShield_#X9";

export function createSessionSignature(user: Profile, expiresAt: number, token: string): string {
  const payload = `${user.id}:${user.role}:${user.nama}:${expiresAt}:${token}:${SESSION_SECRET_SALT}`;
  let h1 = 5381;
  let h2 = 0;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = (c + (h2 << 6) + (h2 << 16) - h2) >>> 0;
  }
  return `${h1.toString(16)}-${h2.toString(16)}`;
}

export function verifySessionSignature(
  user: Profile,
  expiresAt: number,
  token: string,
  signature: string
): boolean {
  const expected = createSessionSignature(user, expiresAt, token);
  return expected === signature;
}

/**
 * 5. Rate Limiting Pengiriman Form & Aksi Sensitif (Anti-Flood & Anti-Spam)
 */
const RATE_LIMIT_PREFIX = "safereport_ratelimit_";

export const RateLimiter = {
  check(
    action: string,
    maxAttempts = 5,
    windowMs = 10 * 60 * 1000,
    cooldownMs = 15 * 1000
  ): { allowed: boolean; error?: string; waitSeconds?: number } {
    if (typeof window === "undefined") return { allowed: true };

    try {
      const key = `${RATE_LIMIT_PREFIX}${action}`;
      const raw = localStorage.getItem(key);
      const now = Date.now();
      let records: number[] = raw ? JSON.parse(raw) : [];

      // Filter yang masih dalam rentang waktu window
      records = records.filter((ts) => now - ts < windowMs);

      // Cek jeda minimum antar aksi (cooldown)
      if (records.length > 0) {
        const last = records[records.length - 1];
        const elapsed = now - last;
        if (elapsed < cooldownMs) {
          const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
          return {
            allowed: false,
            waitSeconds: waitSec,
            error: `Mohon tunggu ${waitSec} detik sebelum mengirimkan laporan berikutnya (pencegahan spam).`,
          };
        }
      }

      // Cek jumlah maksimal percobaan
      if (records.length >= maxAttempts) {
        const oldest = records[0];
        const waitMinutes = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 60000));
        return {
          allowed: false,
          waitSeconds: waitMinutes * 60,
          error: `Terlalu banyak kiriman dalam waktu singkat. Demi keamanan, silakan tunggu ${waitMinutes} menit lagi.`,
        };
      }

      return { allowed: true };
    } catch {
      return { allowed: true };
    }
  },

  record(action: string): void {
    if (typeof window === "undefined") return;
    try {
      const key = `${RATE_LIMIT_PREFIX}${action}`;
      const raw = localStorage.getItem(key);
      const now = Date.now();
      let records: number[] = raw ? JSON.parse(raw) : [];
      records.push(now);
      localStorage.setItem(key, JSON.stringify(records));
    } catch {
      // ignore
    }
  },
};
