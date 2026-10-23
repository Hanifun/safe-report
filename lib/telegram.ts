// =====================================================
// SafeReport — Modul Notifikasi Telegram Bot
// =====================================================
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

const STORAGE_KEY = "safereport_telegram_config";

/**
 * Mengambil konfigurasi Telegram saat ini (dari localStorage di browser atau fallback env)
 */
export function getTelegramConfig(): TelegramConfig {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            botToken: parsed.botToken?.trim() || "",
            chatId: parsed.chatId?.trim() || "",
            isEnabled: Boolean(parsed.isEnabled),
          };
        }
      }
    } catch {
      // ignore parsing error
    }
  }

  return {
    botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN?.trim() || "",
    chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID?.trim() || "",
    isEnabled: Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN),
  };
}

/**
 * Menyimpan konfigurasi Telegram ke localStorage browser
 */
export function saveTelegramConfig(config: TelegramConfig): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi Telegram:", err);
    }
  }
}

/**
 * Mengirim pesan uji coba ke Telegram untuk memverifikasi token dan chat ID
 */
export async function testTelegramConnection(
  token: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();

  if (!cleanToken) {
    return { success: false, message: "Bot Token Telegram tidak boleh kosong." };
  }
  if (!cleanChatId) {
    return { success: false, message: "Chat ID Telegram tidak boleh kosong." };
  }

  try {
    const text = `🔔 <b>UJI COBA NOTIFIKASI SAFEREPORT</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Koneksi Berhasil!</b>
Bot Telegram SafeReport telah terhubung dengan akun Anda.

Mulai sekarang, setiap kali ada siswa yang mengirim laporan pengaduan, Anda akan menerima ringkasan laporan secara instan di sini.

🕒 <i>Waktu Uji Coba: ${new Date().toLocaleString("id-ID")}</i>`;

    let targetChatId = cleanChatId;
    let res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: "HTML",
      }),
    });

    let data = await res.json();
    if (!data.ok && data.parameters?.migrate_to_chat_id) {
      targetChatId = String(data.parameters.migrate_to_chat_id);
      saveTelegramConfig({ botToken: cleanToken, chatId: targetChatId, isEnabled: true });
      res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: "HTML",
        }),
      });
      data = await res.json();
    }

    if (data.ok) {
      return {
        success: true,
        message: targetChatId !== cleanChatId
          ? `Pesan uji coba berhasil masuk ke Supergroup! (ID Baru: ${targetChatId})`
          : "Pesan uji coba berhasil dikirim ke Telegram Anda!",
      };
    } else {
      return {
        success: false,
        message: data.description || "Gagal mengirim ke Telegram. Periksa kembali Bot Token dan Chat ID.",
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: `Terjadi kendala jaringan: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Mengirim notifikasi laporan baru ke Telegram Admin
 */
export async function sendTelegramNewLaporan(laporan: {
  kode_pelacak: string;
  kategori: string;
  lokasi: string;
  tanggal_kejadian: string;
  deskripsi: string;
  is_anonim: boolean;
  nama_pelapor?: string | null;
}): Promise<void> {
  try {
    const cfg = getTelegramConfig();
    if (!cfg.isEnabled || !cfg.botToken || !cfg.chatId) {
      // Belum dikonfigurasi, lewati dengan aman
      return;
    }

    const pelaporLabel = laporan.is_anonim
      ? "🔒 Anonim (Identitas Dirahasiakan)"
      : `👤 ${laporan.nama_pelapor || "Siswa"}`;

    const ringkasanKronologi =
      laporan.deskripsi.length > 250
        ? laporan.deskripsi.slice(0, 250) + "..."
        : laporan.deskripsi;

    const message = `🚨 <b>LAPORAN PENGADUAN BARU MASUK!</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Kode Pelacak :</b> <code>${laporan.kode_pelacak}</code>
🏷️ <b>Kategori     :</b> ${laporan.kategori}
📍 <b>Lokasi       :</b> ${laporan.lokasi}
📅 <b>Tgl Kejadian :</b> ${laporan.tanggal_kejadian}
👤 <b>Pelapor      :</b> ${pelaporLabel}

📝 <b>Kronologi:</b>
<i>"${ringkasanKronologi}"</i>
━━━━━━━━━━━━━━━━━━━━
⚡ <i>Segera buka Dashboard Admin SafeReport untuk meninjau bukti dan memperbarui status penanganan.</i>`;

    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    if (!data.ok && data.parameters?.migrate_to_chat_id) {
      const newChatId = String(data.parameters.migrate_to_chat_id);
      saveTelegramConfig({ botToken: cfg.botToken, chatId: newChatId, isEnabled: true });
      await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: newChatId,
          text: message,
          parse_mode: "HTML",
        }),
      });
    }
  } catch (err) {
    // Tidak boleh memblokir pengiriman laporan siswa jika Telegram gagal
    console.warn("Gagal mengirim notifikasi Telegram:", err);
  }
}
