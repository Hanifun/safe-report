import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "SafeReport — Pengaduan Bullying Aman & Rahasia",
  description:
    "Platform pelaporan perundungan (bullying) di sekolah & kelas. Privasi terjamin, anonim, transparan, dan ditangani oleh Admin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-amber-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
