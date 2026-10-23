"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/data";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const user = AuthService.getUser();
    if (user && user.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center text-stone-400 text-sm">
      Memuat...
    </div>
  );
}
