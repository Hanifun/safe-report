"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";
import { AdminService, AuthService } from "@/lib/data";
import { isSupabaseConfigured, getSupabaseHost, supabase } from "@/lib/supabase";
import { RateLimiter, sanitizeInput } from "@/lib/security";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ToastProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State Diagnostik Koneksi Supabase
  const [dbDiagnostic, setDbDiagnostic] = useState<{
    loading: boolean;
    ok?: boolean;
    error?: string;
    count?: number;
  }>({ loading: true });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDbDiagnostic({
        loading: false,
        ok: false,
        error: "Kunci Supabase belum diset di Vercel (NEXT_PUBLIC_SUPABASE_URL masih placeholder).",
      });
      return;
    }

    const checkDb = async () => {
      try {
        const { data, error } = await supabase.from("admins").select("email");
        if (error) {
          setDbDiagnostic({
            loading: false,
            ok: false,
            error: `${error.message} (Kode: ${error.code || "unknown"})`,
          });
        } else {
          setDbDiagnostic({
            loading: false,
            ok: true,
            count: data?.length || 0,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal terhubung";
        setDbDiagnostic({
          loading: false,
          ok: false,
          error: `Koneksi gagal: ${msg}`,
        });
      }
    };

    checkDb();
  }, []);

  // State Form Login (Default kosong, tidak menampilkan kredensial)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State Validasi & Pesan Error
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Helper validasi format email
  const validateEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (val: string) => {
    setLoginEmail(val);
    if (emailError) setEmailError(null);
    if (loginError) setLoginError(null);
  };

  const handlePasswordChange = (val: string) => {
    setLoginPassword(val);
    if (passwordError) setPasswordError(null);
    if (loginError) setLoginError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setEmailError(null);
    setPasswordError(null);

    const cleanEmail = sanitizeInput(loginEmail.trim().toLowerCase());
    const cleanPassword = loginPassword.trim();

    // 1. Validasi Input Email
    if (!cleanEmail) {
      setEmailError("Email admin tidak boleh kosong.");
      return;
    }
    if (!validateEmailFormat(cleanEmail)) {
      setEmailError("Format email tidak valid (contoh: admin@sekolah.id).");
      return;
    }

    // 2. Validasi Input Password
    if (!cleanPassword) {
      setPasswordError("Kata sandi tidak boleh kosong.");
      return;
    }
    if (cleanPassword.length < 4) {
      setPasswordError("Kata sandi minimal 4 karakter.");
      return;
    }

    // 3. Proteksi Brute Force (Maksimal 5 percobaan per 5 menit)
    const rateCheck = RateLimiter.check("admin_login_attempt", 5, 5 * 60 * 1000, 2000);
    if (!rateCheck.allowed) {
      setLoginError(rateCheck.error || "Terlalu banyak percobaan login gagal. Silakan tunggu beberapa saat.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setLoginError("⚠️ Supabase belum terhubung di Vercel. Pastikan Environment Variables (NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY) sudah diisi di Vercel Settings lalu klik Redeploy!");
      toast("Supabase belum terhubung di Vercel.", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Simulasi delay mikro untuk UX feedback yang halus
      await new Promise((resolve) => setTimeout(resolve, 350));

      const { data: admin, error: loginErr } = await AdminService.login(cleanEmail, cleanPassword);
      if (loginErr || !admin) {
        RateLimiter.record("admin_login_attempt");
        const msg = loginErr || "Email atau kata sandi tidak cocok. Silakan periksa kembali.";
        setLoginError(msg);
        toast(msg, "error");
        setIsLoading(false);
        return;
      }

      // Set sesi profil admin terenkripsi
      AuthService.setUser({
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        nisn_kelas: admin.nip_jabatan || "Administrator Sekolah",
        role: "admin",
        created_at: admin.created_at,
      });

      toast("Login berhasil! Selamat datang di Portal Admin.", "success");
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat memproses login. Silakan coba kembali.";
      setLoginError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-900 text-stone-100 px-4 py-12 justify-center items-center">
      <div className="max-w-md w-full">
        <div className="bg-stone-800/90 border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center mx-auto mb-3 shadow-md font-black">
              <ShieldCheck className="w-6 h-6 text-stone-950" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Portal Admin
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Pusat kendali dan pengelolaan laporan pengaduan sekolah.
            </p>
          </div>

          {/* Banner Status Diagnostik Database */}
          {!dbDiagnostic.loading && !dbDiagnostic.ok && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold text-rose-300">Kendala Database Supabase:</p>
                <p className="mt-1 text-rose-200 leading-relaxed">{dbDiagnostic.error}</p>
                <p className="mt-2 text-[11px] text-stone-400">
                  Tip: Pastikan seluruh skema di <code className="text-amber-300">supabase_schema.sql</code> sudah dijalankan di menu <strong>SQL Editor</strong> Supabase.
                </p>
              </div>
            </div>
          )}

          {!dbDiagnostic.loading && dbDiagnostic.ok && dbDiagnostic.count === 0 && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-950/70 border border-amber-600/70 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold text-amber-300">Tabel 'admins' Masih Kosong (0 Akun):</p>
                <p className="mt-1 text-stone-300 leading-relaxed">
                  Tabel berhasil terhubung, tetapi belum ada akun admin. Silakan jalankan query INSERT di <strong>SQL Editor</strong> Supabase:
                </p>
                <pre className="mt-1.5 p-2 bg-stone-900 rounded-lg text-[10px] text-amber-300 overflow-x-auto">
                  INSERT INTO public.admins (nama, email, password, nip_jabatan) VALUES ('Admin Sekolah', 'admin@sekolah.id', 'admin', 'Administrator');
                </pre>
              </div>
            </div>
          )}

          {/* Form Login Admin */}
          <form onSubmit={handleLogin} className="space-y-4.5" noValidate>
            {/* Input Email */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center justify-between">
                <span>Email Admin</span>
                <span className="text-[10px] text-stone-500 font-normal">Wajib diisi</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="nama@sekolah.id"
                  value={loginEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-900 border text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none transition-colors ${emailError
                      ? "border-rose-500 focus:ring-2 focus:ring-rose-500/50"
                      : "border-stone-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                    }`}
                />
              </div>
              {emailError && (
                <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center justify-between">
                <span>Kata Sandi</span>
                <span className="text-[10px] text-stone-500 font-normal">Minimal 4 karakter</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={loginPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-900 border text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none transition-colors ${passwordError
                      ? "border-rose-500 focus:ring-2 focus:ring-rose-500/50"
                      : "border-stone-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors p-0.5 cursor-pointer"
                  title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            {/* Error Banner Global (Gagal Login / Brute Force) */}
            {loginError && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{loginError}</span>
              </div>
            )}

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi Kredensial...
                </>
              ) : (
                <>
                  Masuk Dashboard Admin <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Card */}
          <div className="mt-7 pt-4 border-t border-stone-700/60 text-center space-y-2">
            <p className="text-[11px] text-stone-500">
              Akses terbatas hanya untuk staf & pengelola sekolah berwenang.
            </p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-stone-400 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbDiagnostic.loading
                    ? "bg-amber-400 animate-ping"
                    : dbDiagnostic.ok
                    ? "bg-emerald-400"
                    : "bg-rose-500"
                }`}
              />
              <span>
                Supabase:{" "}
                <span className="text-stone-300">
                  {dbDiagnostic.loading
                    ? "Memeriksa..."
                    : isSupabaseConfigured()
                    ? getSupabaseHost()
                    : "Belum Dikonfigurasi di Vercel"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
