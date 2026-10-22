"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import Footer from "@/components/Footer";
import FormLaporan from "@/components/FormLaporan";
import ModalTiket from "@/components/ModalTiket";
import { AuthService } from "@/lib/data";
import { Profile } from "@/types";

export default function StudentLaporPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [submittedKode, setSubmittedKode] = useState<string | null>(null);

  useEffect(() => {
    const current = AuthService.getUser();
    if (!current) {
      router.replace("/login?redirect=/dashboard/lapor");
      return;
    }
    if (current.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    setUser(current);
    setIsChecking(false);
  }, [router]);

  if (isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/50">
        <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/50">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-10">
        <div className="card p-6 sm:p-8 border border-amber-200/90 shadow-sm bg-white">
          <FormLaporan
            user={user}
            initialMode="siswa"
            onSuccess={(kode) => {
              setSubmittedKode(kode);
            }}
          />
        </div>
      </main>

      {submittedKode && (
        <ModalTiket
          kode={submittedKode}
          onClose={() => {
            setSubmittedKode(null);
            router.push("/dashboard");
          }}
        />
      )}

      <Footer />
    </div>
  );
}
