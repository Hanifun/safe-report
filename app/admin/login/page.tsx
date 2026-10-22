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
import { RateLimiter, sanitizeInput } from "@/lib/security";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ToastProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();

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

    setIsLoading(true);

    try {
      // Simulasi delay mikro untuk UX feedback yang halus
      await new Promise((resolve) => setTimeout(resolve, 350));

      const admin = await AdminService.login(cleanEmail, cleanPassword);
      if (!admin) {
        RateLimiter.record("admin_login_attempt");
        setLoginError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
      toast("Email atau kata sandi admin tidak cocok.", "error");
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
    } catch {
      setLoginError("Terjadi kendala saat memproses login. Silakan coba kembali.");
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
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-900 border text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none transition-colors ${
                    emailError
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
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-900 border text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none transition-colors ${
                    passwordError
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
          <div className="mt-7 pt-4 border-t border-stone-700/60 text-center">
            <p className="text-[11px] text-stone-500">
              Akses terbatas hanya untuk staf & pengelola sekolah berwenang.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
