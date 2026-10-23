import { NextResponse } from "next/server";

export async function GET() {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN ||
    "";
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ||
    "";

  const configured = Boolean(token.trim() && chatId.trim());
  const isGroup = chatId.startsWith("-");

  return NextResponse.json({
    configured,
    isGroup,
    chatIdMasked: chatId
      ? chatId.length > 6
        ? `${chatId.slice(0, 4)}...${chatId.slice(-3)}`
        : "***"
      : "",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token =
      body.customToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

    const chatId =
      body.customChatId ||
      process.env.TELEGRAM_CHAT_ID ||
      process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        message: "Bot Telegram belum dikonfigurasi di server.",
      });
    }

    // Aksi 1: Uji Coba Notifikasi Grup
    if (body.action === "test") {
      const testText = `🔔 <b>UJI COBA NOTIFIKASI GRUP TIM SAFEREPORT</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Koneksi Grup Tim Berhasil!</b>
Sistem SafeReport telah sukses terhubung ke Grup Telegram ini.

Mulai sekarang, setiap kali ada siswa atau masyarakat yang mengirimkan laporan pengaduan, seluruh anggota tim di grup ini akan menerima ringkasan laporan secara instan dan serentak.

🕒 <i>Waktu Uji Coba: ${new Date().toLocaleString("id-ID")}</i>`;

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: testText,
          parse_mode: "HTML",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        return NextResponse.json({
          ok: true,
          message: "Pesan uji coba berhasil masuk ke Grup Telegram Tim!",
        });
      } else {
        return NextResponse.json({
          ok: false,
          message:
            data.description ||
            "Gagal mengirim ke Telegram. Pastikan Bot sudah dimasukkan ke Grup dan diangkat sebagai Admin.",
        });
      }
    }

    // Aksi 2: Notifikasi Laporan Baru untuk Tim / Grup Sekolah
    const {
      kode_pelacak,
      kategori,
      lokasi,
      tanggal_kejadian,
      deskripsi,
      is_anonim,
      nama_pelapor,
    } = body;

    const pelaporLabel = is_anonim
      ? "🔒 Anonim (Identitas Dirahasiakan)"
      : `👤 ${nama_pelapor || "Siswa"}`;

    const cleanDeskripsi =
      deskripsi && deskripsi.length > 300
        ? deskripsi.slice(0, 300) + "..."
        : deskripsi || "-";

    const text = `🚨 <b>[LAPORAN BARU DITERIMA]</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Kode Pelacak :</b> <code>${kode_pelacak}</code>
🏷️ <b>Kategori     :</b> ${kategori}
📍 <b>Lokasi       :</b> ${lokasi}
📅 <b>Tgl Kejadian :</b> ${tanggal_kejadian}
👤 <b>Pelapor      :</b> ${pelaporLabel}

📝 <b>Kronologi Singkat:</b>
<i>"${cleanDeskripsi}"</i>
━━━━━━━━━━━━━━━━━━━━
👥 <b>Kepada Tim Penanganan Sekolah / BK:</b>
<i>Mohon segera buka Portal Admin SafeReport untuk meninjau berkas bukti dan memperbarui status penanganan.</i>`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: data.ok, data });
  } catch (err: unknown) {
    console.error("Gagal mengirim telegram notify dari API route:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
