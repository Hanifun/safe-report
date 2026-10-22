"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, UserCheck, ArrowRight, LogIn } from "lucide-react";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import FormLaporan from "@/components/FormLaporan";
import ModalTiket from "@/components/ModalTiket";
import { AuthService } from "@/lib/data";
import { Profile } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [showAnonForm, setShowAnonForm] = useState(false);
  const [submittedKode, setSubmittedKode] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const current = AuthService.getUser();
    if (current) {
      if (current.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
      return;
    }
    setUser(null);
    setIsCheckingSession(false);
  }, [router]);

  // Tampilkan loading saat memeriksa sesi agar tidak berkedip
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/50">
        <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── TAMPILAN FORMULIR PENGADUAN ANONIM ──────────────────────
  if (showAnonForm) {
    return (
      <div className="min-h-screen flex flex-col bg-amber-50/50">
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-10">
          <div className="card p-6 sm:p-8 border border-amber-200/90 shadow-sm">
            <FormLaporan
              user={null}
              initialMode="anonim"
              onBackToMenu={() => setShowAnonForm(false)}
              onSuccess={(kode) => {
                setShowAnonForm(false);
                setSubmittedKode(kode);
              }}
            />
          </div>
        </main>

        {submittedKode && (
          <ModalTiket kode={submittedKode} onClose={() => setSubmittedKode(null)} />
        )}
        <Footer />
      </div>
    );
  }

  // ── TAMPILAN UTAMA: 2 PILIHAN LAYANAN ───────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-amber-50/50">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">

        {/* Header Portal */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex justify-center mb-5">
            <Logo size="lg" showTagline={true} href={null} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Layanan Pengaduan Bullying Sekolah
          </h1>
          <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Ruang aman dan terpercaya. Pilih cara pengaduan yang paling nyaman bagimu.
          </p>
        </div>

        {/* DUA PILIHAN UTAMA */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* PILIHAN 1: LAPOR ANONIM */}
          <button
            type="button"
            onClick={() => setShowAnonForm(true)}
            className="group text-left bg-white hover:bg-amber-50 rounded-3xl p-7 border-2 border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-4 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-7 h-7 text-stone-950 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300/80">
                100% Rahasia
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-stone-900 group-hover:text-amber-900 tracking-tight transition-colors">
                Lapor Anonim
              </h2>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Tidak perlu akun. Identitasmu tidak dicatat oleh siapa pun. Langsung sampaikan pengaduan dengan aman.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 group-hover:gap-2.5 transition-all">
              Mulai Lapor <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* PILIHAN 2: MASUK / LOGIN SISWA */}
          <Link
            href="/login"
            className="group text-left bg-white hover:bg-amber-50 rounded-3xl p-7 border-2 border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col gap-4 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7 text-stone-950 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300/80">
                Akun Siswa
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-stone-900 group-hover:text-amber-900 tracking-tight transition-colors">
                Masuk dengan Akun
              </h2>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Login dengan NISN untuk melapor dengan identitas atau memantau status laporan yang pernah kamu kirim.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 group-hover:gap-2.5 transition-all">
              Masuk ke Akun <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

        </div>
      </main>

      {submittedKode && (
        <ModalTiket kode={submittedKode} onClose={() => setSubmittedKode(null)} />
      )}

      <Footer />
    </div>
  );
}
