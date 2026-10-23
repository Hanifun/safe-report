"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import Footer from "@/components/Footer";
import { AuthService, StudentService } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const { toast } = useToast();

  useEffect(() => {
    const current = AuthService.getUser();
    if (current) {
      if (current.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Pop-up
    if (!nisn.trim()) {
      toast("Silakan masukkan NISN.", "warning");
      return;
    }
    if (!password) {
      toast("Silakan masukkan kata sandi.", "warning");
      return;
    }

    if (!isSupabaseConfigured()) {
      toast("Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const { data: student, error: loginErr } = await StudentService.login(nisn, password);
      if (loginErr || !student) {
        toast(loginErr || "Login gagal. NISN atau kata sandi salah.", "error");
        setIsLoading(false);
        return;
      }

      // Simpan sesi profil siswa
      AuthService.setUser({
        id: student.id,
        nama: student.nama,
        nisn_kelas: `${student.nisn} - ${student.kelas}`,
        role: "siswa",
        created_at: student.created_at,
      });

      toast("Login berhasil!", "success");
      router.push(redirectTarget);
    } catch {
      toast("Terjadi kesalahan. Silakan coba lagi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-6 sm:p-8 bg-white border border-amber-200/90 shadow-sm">
      {/* Header Form Login: Rapi, Terpusat, Elegan */}
      <div className="flex flex-col items-center text-center mb-6 pb-5 border-b border-stone-100">
        <Link href="/" className="group mb-3 inline-block" title="Kembali ke Beranda SafeReport">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-7 h-7 text-stone-950 stroke-[2.2]" />
          </div>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300/80 mb-2">
          SafeReport Siswa
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Masuk Akun Siswa
        </h1>
        <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
          Gunakan NISN dan kata sandi yang telah didaftarkan oleh Admin sekolah.
        </p>
      </div>

      {/* Form Login Siswa dengan Padding Ikon Rapi (Bebas Tabrakan) */}
      <form onSubmit={handleStudentLogin} className="space-y-4.5">
        {/* Input NISN */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
            <span>Nomor Induk Siswa Nasional (NISN)</span>
            <span className="text-[10px] text-stone-400 font-normal">Wajib diisi</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="Contoh: 007234901"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
              style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
              className="w-full py-2.5 rounded-2xl bg-white border border-stone-200 text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all shadow-2xs"
              autoFocus
            />
          </div>
        </div>

        {/* Input Password */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
            <span>Kata Sandi / PIN Siswa</span>
            <span className="text-[10px] text-stone-400 font-normal">PIN dari Admin</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Masukkan kata sandi / PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
              className="w-full py-2.5 rounded-2xl bg-white border border-stone-200 text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title={showPassword ? "Sembunyikan password" : "Lihat password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60 mt-2"
        >
          {isLoading ? "Memproses..." : "Masuk ke Akun Saya"} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Informasi Melapor Bebas Tanpa Akun */}
      <div className="mt-6 pt-5 border-t border-amber-100 text-center space-y-1.5">
        <p className="text-xs text-stone-500 leading-relaxed">
          Belum punya akun atau ingin melapor tanpa nama?
        </p>
        <Link
          href="/"
          className="inline-block font-bold text-xs text-amber-700 hover:text-amber-800 underline"
        >
          Kirim Pengaduan Bebas Secara Anonim
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-amber-50/50">
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-10 sm:py-14 flex flex-col justify-center">
        {/* Tombol Navigasi Kembali ke Formulir */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-500 hover:text-amber-800 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>

        <Suspense fallback={<div className="text-center text-xs text-stone-400">Memuat form login...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
