"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  AlertCircle,
  Clock,
  MessageSquare,
  Lock,
  User,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TimelineStatus from "@/components/TimelineStatus";
import { AuthService, LaporanService } from "@/lib/data";
import { formatTanggal, formatTanggalWaktu } from "@/lib/utils";
import { Laporan, Profile } from "@/types";
import { useToast } from "@/components/ToastProvider";

function StatusContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const kodeParam = searchParams.get("kode") || "";

  const [user, setUser] = useState<Profile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [inputKode, setInputKode] = useState(kodeParam);
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const currentUser = AuthService.getUser();
    setUser(currentUser);
    setIsCheckingAuth(false);

    if (currentUser && kodeParam) {
      setInputKode(kodeParam);
      LaporanService.getByKode(kodeParam).then((res) => {
        setLaporan(res);
        setSearched(true);
      });
    }
  }, [kodeParam]);

  const handleSearch = async (overrideKode?: string) => {
    const target = (overrideKode || inputKode).trim().toUpperCase();
    if (!target) {
      toast("Masukkan kode tiket pelacak terlebih dahulu (contoh: SF-ABC1234).", "warning");
      return;
    }
    const res = await LaporanService.getByKode(target);
    setLaporan(res);
    setSearched(true);
    if (!res) {
      toast("Kode tiket tidak ditemukan. Pastikan kode tiket ditulis dengan benar.", "error");
    } else {
      toast("Data laporan pengaduan berhasil ditemukan.", "success");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="max-w-md mx-auto w-full px-4 py-16 text-center text-stone-400 text-xs">
        Memeriksa sesi...
      </div>
    );
  }

  // Jika Belum Login: Tampilkan Layar Kebutuhan Login Akun Siswa
  if (!user) {
    const loginRedirect = kodeParam
      ? `/login?redirect=${encodeURIComponent(`/status?kode=${kodeParam}`)}`
      : "/login?redirect=/status";

    return (
      <div className="max-w-md mx-auto w-full px-4 py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-500 hover:text-amber-800 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>

        <div className="card p-7 sm:p-9 border border-amber-200/90 bg-white text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-7 h-7 text-amber-700" />
          </div>

          <h2 className="text-xl font-black text-stone-900 mb-2">
            Masuk Akun Siswa untuk Melacak Tiket
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">
            Untuk menjaga kerahasiaan kasus dan memastikan informasi hanya dapat diakses oleh pihak yang berhak, pelacakan status tiket pengaduan dapat dilakukan setelah masuk ke Akun Siswa.
          </p>

          <div className="space-y-3">
            <Link
              href={loginRedirect}
              className="btn-primary w-full py-3 text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" /> Masuk ke Akun Siswa
            </Link>

            <Link
              href="/"
              className="btn-secondary w-full py-3 text-xs sm:text-sm font-semibold block text-center"
            >
              Kirim Pengaduan Baru
            </Link>
          </div>

          <p className="text-[11px] text-stone-400 mt-5 pt-4 border-t border-amber-100">
            Akun siswa didaftarkan oleh Admin sekolah untuk perlindungan siswa.
          </p>
        </div>
      </div>
    );
  }

  // Jika Sudah Login: Tampilkan Form Pelacakan Tiket
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      {/* Navigasi Balik */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-stone-500 hover:text-amber-800 text-xs sm:text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Form Laporan
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-amber-800 hover:text-amber-900 text-xs sm:text-sm font-bold transition-colors bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-200"
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard Saya
        </Link>
      </div>

      {/* Header & Kotak Pencarian Tiket */}
      <div className="card p-6 sm:p-8 mb-6 border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/50 to-white shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center shadow-xs">
            <Search className="w-6 h-6 text-stone-900" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">
              Lacak Status Pengaduan
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Masuk sebagai <strong>{user.nama}</strong>. Masukkan Kode Tiket unik untuk melihat perkembangannya.
            </p>
          </div>
        </div>

        {/* Input Tiket */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Masukkan Kode Tiket (Contoh: SF-XXXX)"
              value={inputKode}
              onChange={(e) => setInputKode(e.target.value.toUpperCase())}
              className="input uppercase font-mono tracking-wider font-bold text-sm sm:text-base pl-11"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <button type="submit" className="btn-primary sm:w-auto px-7 py-3 text-xs sm:text-sm font-bold">
            Cek Status
          </button>
        </form>
      </div>

      {/* Hasil Pencarian */}
      {searched && (
        <>
          {laporan ? (
            <div className="space-y-6 animate-fade-in">
              {/* Kartu Status Utama */}
              <div className="card p-6 border-l-8 border-l-amber-400 border-amber-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-amber-100">
                  <div>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                      Kode Tiket Pelacak
                    </span>
                    <span className="text-2xl font-black font-mono text-amber-600">
                      {laporan.kode_pelacak}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        laporan.status === "baru"
                          ? "badge-baru"
                          : laporan.status === "diverifikasi"
                          ? "badge-verifikasi"
                          : laporan.status === "diproses"
                          ? "badge-proses"
                          : "badge-selesai"
                      }`}
                    >
                      Status: {laporan.status}
                    </span>
                    {laporan.is_anonim ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        🎭 Anonim
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        👤 Identitas Siswa
                      </span>
                    )}
                  </div>
                </div>

                {/* Detail Singkat Laporan */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                    <span className="text-stone-400 block mb-0.5 text-[11px]">Kategori</span>
                    <strong className="text-stone-800 capitalize">
                      {laporan.kategori}
                    </strong>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                    <span className="text-stone-400 block mb-0.5 text-[11px]">Peran Pelapor</span>
                    <strong className="text-stone-800 capitalize">
                      {laporan.peran_pelapor}
                    </strong>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                    <span className="text-stone-400 block mb-0.5 text-[11px]">Tanggal Kejadian</span>
                    <strong className="text-stone-800">
                      {formatTanggal(laporan.tanggal_kejadian)}
                    </strong>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                    <span className="text-stone-400 block mb-0.5 text-[11px]">Lokasi</span>
                    <strong className="text-stone-800 truncate block">
                      {laporan.lokasi}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Alur Timeline Penanganan */}
              <div className="card p-6 border-amber-200/80 shadow-xs">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Alur Penanganan Kasus
                </h3>
                <TimelineStatus status={laporan.status} />
              </div>

              {/* Tanggapan & Catatan Admin */}
              <div className="card p-6 border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 shadow-xs">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Tanggapan & Pendampingan Admin
                </h3>

                {laporan.tindak_lanjut && laporan.tindak_lanjut.length > 0 ? (
                  <div className="space-y-3">
                    {laporan.tindak_lanjut
                      .filter((tl) => tl.is_publik)
                      .map((tl) => (
                        <div
                          key={tl.id}
                          className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs text-stone-500 mb-2 pb-1.5 border-b border-amber-50">
                            <span className="font-bold text-amber-800">
                              {tl.oleh_nama}
                            </span>
                            <span>{formatTanggalWaktu(tl.created_at)}</span>
                          </div>
                          <p className="text-stone-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {tl.pesan}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">
                    Belum ada catatan baru dari Admin. Laporanmu sudah tersimpan aman di sistem.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center bg-rose-50/70 border border-rose-200 animate-fade-in">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-rose-900 mb-1">
                Kode Tiket Tidak Ditemukan
              </h3>
              <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto leading-relaxed">
                Pastikan kode tiket yang kamu masukkan sesuai dengan yang diberikan saat mengirim aduan (contoh: <code>SF-XXXX</code>).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <div className="min-h-screen flex flex-col bg-amber-50/50">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-3xl mx-auto w-full px-4 py-16 text-center text-stone-500 text-xs">
              Memuat data pelacakan...
            </div>
          }
        >
          <StatusContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
