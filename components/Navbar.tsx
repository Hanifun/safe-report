"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { AuthService } from "@/lib/data";

export default function Navbar() {
  const pathname = usePathname();
  const [logoHref, setLogoHref] = useState("/");

  useEffect(() => {
    const user = AuthService.getUser();
    if (user) {
      setLogoHref(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } else {
      setLogoHref("/");
    }
  }, [pathname]);

  // 1. Jangan tampilkan di area admin internal
  if (pathname?.startsWith("/admin")) return null;

  // 2. Jangan tampilkan di halaman login siswa
  if (pathname === "/login") return null;

  // 3. Jangan tampilkan di halaman beranda portal
  if (pathname === "/") return null;

  // 4. Jangan tampilkan di formulir pengaduan akun siswa
  if (pathname === "/dashboard/lapor") return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo SafeReport */}
        <Logo size="sm" showTagline={true} href={logoHref} />
      </div>
    </header>
  );
}
