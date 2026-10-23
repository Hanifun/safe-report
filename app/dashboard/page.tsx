"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  PlusCircle,
  Clock,
  ShieldCheck,
  Search,
  LogOut,
  ChevronRight,
  Inbox,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthService, LaporanService, StudentService } from "@/lib/data";
import { formatTanggal } from "@/lib/utils";
import { Laporan, Profile } from "@/types";
import { useToast } from "@/components/ToastProvider";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { toast, confirmModal } = useToast();
  const [user, setUser] = useState<Profile | null>(null);
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [searchKode, setSearchKode] = useState("");

  // State Ganti Kata Sandi Siswa
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState("");
  const [showPassLama, setShowPassLama] = useState(false);
  const [showPassBaru, setShowPassBaru] = useState(false);
  const [showPassKonfirmasi, setShowPassKonfirmasi] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const current = AuthService.getUser();
      if (!current) {
        router.push("/login?expired=1");
        return false;
      }
      setUser(current);
      return true;
    };

    const isOk = checkSession();
    if (isOk) {
      const current = AuthService.getUser();
      if (current) {
        LaporanService.getByPelaporId(current.id).then((list) => {
          setLaporanList(list);
        });
      }
    }

    // Pemantauan berkala sesi siswa
    const interval = setInterval(checkSession, 30000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "safereport_real_session" && !e.newValue) {
        router.push("/login");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]);

  const handleOpenPasswordModal = () => {
    setPasswordLama("");
    setPasswordBaru("");
    setPasswordKonfirmasi("");
    setPasswordError(null);
    setShowPassLama(false);
    setShowPassBaru(false);
    setShowPassKonfirmasi(false);
    setShowPasswordModal(true);
  };

  const handleSimpanPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!user) return;

    if (!passwordLama.trim()) {
      setPasswordError("Masukkan kata sandi akun saat ini.");
      return;
    }
    if (!passwordBaru.trim() || passwordBaru.trim().length < 6) {
      setPasswordError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }
    if (passwordBaru !== passwordKonfirmasi) {
      setPasswordError("Konfirmasi kata sandi baru tidak sesuai.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await StudentService.updatePassword(
        user.id,
        passwordBaru.trim(),
        passwordLama.trim()
      );

      if (!res.success) {
        setPasswordError(res.error || "Gagal memperbarui kata sandi.");
        return;
      }

      toast("Kata sandi Anda berhasil diperbarui! Silakan gunakan sandi baru untuk login selanjutnya.", "success");
      setShowPasswordModal(false);
      setPasswordLama("");
      setPasswordBaru("");
      setPasswordKonfirmasi("");
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Terjadi kesalahan pada sistem."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirmModal({
      title: "Konfirmasi Keluar",
      message: "Apakah Anda yakin ingin keluar dari akun siswa?",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      AuthService.logout();
      toast("Anda berhasil keluar dari akun siswa.", "info");
      window.location.href = "/";
    }
  };

  const handleCariKode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKode.trim()) return;
    router.push(`/status?kode=${searchKode.trim().toUpperCase()}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Banner Profil Siswa */}
        <div className="card p-6 sm:p-7 mb-6 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-stone-900 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-stone-900 flex items-center justify-center font-black text-xl shadow-xs">
              {user.nama.charAt(0)}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-stone-800/80">
                Dashboard Siswa
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                {user.nama}
              </h1>
              <p className="text-xs text-stone-800 font-medium mt-0.5">
                {user.nisn_kelas || "Siswa Terdaftar"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/lapor"
              className="btn-primary bg-stone-900 hover:bg-stone-800 text-white shadow-none text-xs sm:text-sm font-bold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Buat Aduan Baru
            </Link>
            <button
              onClick={handleOpenPasswordModal}
              className="btn-secondary bg-white/90 hover:bg-white text-stone-900 border-none text-xs sm:text-sm font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Ganti kata sandi akun siswa"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-700" /> Ganti Sandi
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary bg-white hover:bg-stone-50 text-stone-800 border-none text-xs sm:text-sm font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>

        {/* Kotak Pencarian Tiket Cepat */}
        <div className="card p-4 sm:p-5 mb-8 border border-amber-200/90 bg-white shadow-xs">
          <form onSubmit={handleCariKode} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Punya Kode Tiket lain? Masukkan kode di sini (SF-XXXX)..."
                value={searchKode}
                onChange={(e) => setSearchKode(e.target.value.toUpperCase())}
                className="input pl-10 text-xs sm:text-sm font-mono uppercase"
              />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold">
              Lacak Tiket Ini <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Daftar Laporan Pengguna */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Riwayat Pengaduan Saya ({laporanList.length})
            </h2>
          </div>

          {laporanList.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {laporanList.map((item) => (
                <div
                  key={item.id}
                  className="card p-5 hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-200/80 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs sm:text-sm text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-300">
                        {item.kode_pelacak}
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${item.status === "baru"
                          ? "badge-baru"
                          : item.status === "diverifikasi"
                            ? "badge-verifikasi"
                            : item.status === "diproses"
                              ? "badge-proses"
                              : "badge-selesai"
                          }`}
                      >
                        {item.status}
                      </span>
                      {item.is_anonim ? (
                        <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                          🎭 Terkirim Anonim
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          👤 Dengan Identitas Siswa
                        </span>
                      )}
                      <span className="text-xs text-stone-400">
                        • {formatTanggal(item.tanggal_kejadian)}
                      </span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-sm capitalize">
                      Perundungan {item.kategori} di {item.lokasi}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {item.deskripsi}
                    </p>
                  </div>

                  <Link
                    href={`/status?kode=${item.kode_pelacak}`}
                    className="btn-secondary text-xs px-4 py-2 self-start sm:self-center shrink-0 font-bold"
                  >
                    Pantau Detail <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center bg-white border border-dashed border-amber-200">
              <Inbox className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-stone-800 mb-1">
                Belum Ada Pengaduan
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Kamu belum pernah mengirim laporan dengan akun ini. Jika mengalami atau melihat perundungan, jangan ragu untuk bersuara.
              </p>
              <Link href="/dashboard/lapor" className="btn-primary text-xs px-6 py-2.5 font-bold cursor-pointer">
                <PlusCircle className="w-4 h-4" /> Buat Pengaduan Sekarang
              </Link>
            </div>
          )}
        </div>

        {/* Modal Ganti Kata Sandi Siswa */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 animate-pop-in overflow-hidden">
              {/* Header Modal */}
              <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Ganti Kata Sandi Akun
                    </h3>
                    <p className="text-[11px] text-stone-300">
                      Perbarui kata sandi untuk keamanan akun Anda
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSimpanPassword} className="p-6 space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Sandi Saat Ini */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-stone-400" /> Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type={showPassLama ? "text" : "password"}
                      value={passwordLama}
                      onChange={(e) => setPasswordLama(e.target.value)}
                      placeholder="Masukkan kata sandi lama Anda"
                      className="input pr-10 text-xs sm:text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassLama(!showPassLama)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassLama ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showPassBaru ? "text" : "password"}
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="input pr-10 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassBaru(!showPassBaru)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassBaru ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ulangi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showPassKonfirmasi ? "text" : "password"}
                      value={passwordKonfirmasi}
                      onChange={(e) => setPasswordKonfirmasi(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="input pr-10 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassKonfirmasi(!showPassKonfirmasi)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassKonfirmasi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                  💡 <b>Tips:</b> Gunakan kombinasi huruf dan angka agar akun pengaduan Anda tidak mudah diakses oleh orang lain.
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={isUpdatingPassword}
                    className="btn-secondary text-xs px-4 py-2.5 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="btn-primary text-xs px-5 py-2.5 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingPassword ? "Menyimpan..." : "Simpan Sandi Baru"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
