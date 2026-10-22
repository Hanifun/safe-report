"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Send,
  Upload,
  X,
  Loader2,
  Eye,
  AlertCircle,
  MessageSquare,
  ShieldAlert,
  Smartphone,
  HeartPulse,
  Users,
  CircleDot,
  FileText,
  User,
  UserCheck,
  Shield,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import { FormLaporanData, KategoriBullying, PeranPelapor, Profile } from "@/types";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ToastProvider";
import { validateUploadedFile } from "@/lib/security";

const KATEGORI_OPTIONS: {
  value: KategoriBullying;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "verbal", label: "Verbal (Ejekan / Hinaan)", icon: MessageSquare },
  { value: "fisik", label: "Fisik (Pemukulan / Dorongan)", icon: ShieldAlert },
  { value: "cyber", label: "Cyberbullying (Medsos / Chat)", icon: Smartphone },
  { value: "psikologis", label: "Psikologis (Intimidasi / Tekanan)", icon: HeartPulse },
  { value: "sosial", label: "Sosial (Pengucilan / Diskriminasi)", icon: Users },
  { value: "lainnya", label: "Bentuk Lainnya", icon: CircleDot },
];

interface Props {
  user: Profile | null;
  initialMode?: "anonim" | "siswa";
  onBackToMenu?: () => void;
  onSuccess: (kode: string) => void;
}

export default function FormLaporan({ user, initialMode, onBackToMenu, onSuccess }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const [form, setForm] = useState<Partial<FormLaporanData>>({
    peran_pelapor: "korban",
    kategori: "verbal",
    tanggal_kejadian: new Date().toISOString().slice(0, 10),
  });

  const set = <K extends keyof FormLaporanData>(k: K, v: FormLaporanData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];

    for (const file of files) {
      const check = validateUploadedFile(file);
      if (!check.valid) {
        toast(check.error || "Berkas lampiran tidak diizinkan.", "error");
        e.target.value = "";
        return;
      }
      valid.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...valid].slice(0, 3));
    e.target.value = "";
  };

  const removeFile = (idx: number) =>
    setSelectedFiles((f) => f.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.lokasi?.trim() || form.lokasi.trim().length < 3) {
      toast("Mohon cantumkan lokasi kejadian secara jelas (minimal 3 karakter).", "warning");
      return;
    }
    if (!form.tanggal_kejadian) {
      toast("Tanggal kejadian wajib diisi.", "warning");
      return;
    }
    if (!form.deskripsi?.trim() || form.deskripsi.trim().length < 15) {
      toast("Mohon ceritakan kronologi kejadian secara ringkas dan jelas (minimal 15 karakter).", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const { LaporanService } = await import("@/lib/data");
      const laporan = await LaporanService.create(
        {
          ...form,
          mode_identitas: user ? "siswa" : "anonim",
          bukti_files: selectedFiles,
          _hp_trap: honeypot,
        } as FormLaporanData,
        user
      );
      onSuccess(laporan.kode_pelacak);
      toast("Laporan pengaduan berhasil dikirim secara aman!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim laporan. Silakan coba sesaat lagi.";
      console.error("Submit laporan error:", err);
      toast(msg, "error");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot Bot Trap (Tidak terlihat manusia, jebakan otomatis untuk bot spam) */}
      <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
        <label htmlFor="_hp_trap">Leave this empty</label>
        <input
          id="_hp_trap"
          type="text"
          name="_hp_trap"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
            {/* Brand Logo & Tombol Kembali */}
      <div className="pb-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
        <Logo size="md" showTagline={true} href={user ? (user.role === "admin" ? "/admin/dashboard" : "/dashboard") : null} />
        {user ? (
          <Link
            href={user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-amber-800 hover:bg-amber-100/60 border border-stone-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-600" /> Kembali ke Dashboard
          </Link>
        ) : onBackToMenu ? (
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-amber-800 hover:bg-amber-100/60 border border-stone-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-600" /> Kembali ke Pilihan Menu
          </button>
        ) : null}
      </div>

      {/* Header Form: Format Sama Persis, Akun Siswa Menggunakan Identitas Resmi */}
      {user ? (
        <div className="pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Pengaduan Siswa
              </h1>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-700" /> Identitas Resmi Siswa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Melapor resmi sebagai <strong className="text-stone-800 font-bold">{user.nama}</strong> ({user.nisn_kelas || "Siswa"}). Laporan akan langsung ditangani dan didampingi secara aman oleh Admin Sekolah.
            </p>
          </div>
        </div>
      ) : (
        <div className="pb-3 border-b border-stone-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Pengaduan Anonim
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Identitasmu 100% dirahasiakan. Laporan akan langsung ditangani secara aman oleh Tim Penanganan Sekolah.
            </p>
          </div>
        </div>
      )}

      {/* Peran Pelapor */}
      <div>
        <label className="form-label">Kamu Melapor Sebagai</label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { id: "korban" as PeranPelapor, label: "Saya adalah Korban", icon: ShieldAlert },
              { id: "saksi" as PeranPelapor, label: "Saya adalah Saksi", icon: Eye },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = form.peran_pelapor === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => set("peran_pelapor", item.id)}
                className={`py-3 px-4 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-amber-400 bg-amber-100/70 text-amber-950 shadow-sm"
                    : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-amber-700" : "text-stone-400"}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kategori Bullying */}
      <div>
        <label className="form-label">Kategori Perundungan</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {KATEGORI_OPTIONS.map((k) => {
            const Icon = k.icon;
            const isSelected = form.kategori === k.value;
            return (
              <button
                type="button"
                key={k.value}
                onClick={() => set("kategori", k.value)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-xs sm:text-sm font-semibold text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-amber-400 bg-amber-100/70 text-amber-950 shadow-sm"
                    : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-amber-400 text-stone-900" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{k.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inisial Pelaku (Opsional) */}
      <div>
        <label className="form-label">
          Inisial / Identitas Pelaku{" "}
          <span className="font-normal text-stone-400">(opsional)</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="Contoh: Siswa kelas XI inisial R, atau tanpa nama"
          value={form.nama_pelaku ?? ""}
          onChange={(e) => set("nama_pelaku", e.target.value as never)}
        />
      </div>

      {/* Lokasi & Tanggal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">
            Lokasi Kejadian <span className="text-rose-500">*</span>
          </label>
          <input
            className="input"
            type="text"
            placeholder="Contoh: Belakang Kantin, Grup WhatsApp Kelas"
            required
            value={form.lokasi ?? ""}
            onChange={(e) => set("lokasi", e.target.value as never)}
          />
        </div>
        <div>
          <label className="form-label">
            Tanggal Kejadian <span className="text-rose-500">*</span>
          </label>
          <input
            className="input"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={form.tanggal_kejadian ?? ""}
            onChange={(e) => set("tanggal_kejadian", e.target.value as never)}
          />
        </div>
      </div>

      {/* Kronologi / Deskripsi */}
      <div>
        <label className="form-label">
          Kronologi / Cerita Kejadian <span className="text-rose-500">*</span>
        </label>
        <textarea
          className="input resize-none"
          rows={5}
          placeholder="Tuliskan apa yang terjadi secara jelas dan jujur. Informasi ini akan diperlakukan sangat rahasia oleh tim Admin."
          required
          minLength={15}
          value={form.deskripsi ?? ""}
          onChange={(e) => set("deskripsi", e.target.value as never)}
        />
        <div className="flex justify-between items-center text-[11px] text-stone-400 mt-1">
          <span>Privasi dijamin sepenuhnya oleh pihak sekolah.</span>
          <span>{form.deskripsi?.length ?? 0} karakter</span>
        </div>
      </div>

      {/* Bukti Lampiran */}
      <div>
        <label className="form-label">
          Lampiran Bukti{" "}
          <span className="font-normal text-stone-400">(opsional, foto / tangkapan layar)</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-amber-300/80 rounded-2xl p-4 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-100/30 transition-all bg-white"
        >
          <Upload className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-stone-700">Pilih berkas dari perangkat</p>
          <p className="text-[11px] text-stone-400">Format gambar (JPG, PNG) maksimal 5 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {selectedFiles.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-stone-700"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-stone-400 hover:text-rose-500 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kontak Privat (Opsional) */}
      <div>
        <label className="form-label">
          Kontak Privat Pelapor{" "}
          <span className="font-normal text-stone-400">(opsional — nomor WhatsApp bila ingin dihubungi privat oleh Admin)</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="Contoh: 0812-xxxx-xxxx (hanya terlihat oleh Admin)"
          value={form.kontak_opsional ?? ""}
          onChange={(e) => set("kontak_opsional", e.target.value as never)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-rose-700">{error}</p>
        </div>
      )}

      {/* Tombol Kirim */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3.5 text-sm font-bold shadow-md shadow-amber-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Mengirimkan Laporan...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Kirim Pengaduan Sekarang
          </>
        )}
      </button>
    </form>
  );
}
