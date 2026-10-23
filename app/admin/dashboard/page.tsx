"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  Plus,
  Search,
  Filter,
  LogOut,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  UserX,
  ChevronRight,
  X,
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Inbox,
  Bell,
  RefreshCw,
  Settings,
  Mail,
  Lock,
  Eye as EyeIcon,
  EyeOff,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { AdminService, AuthService, LaporanService, StudentService, KelasService } from "@/lib/data";
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
} from "@/lib/telegram";
import { supabase } from "@/lib/supabase";
import { formatTanggal, formatTanggalWaktu } from "@/lib/utils";
import { Laporan, Profile, StatusLaporan, StudentAccount } from "@/types";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ToastProvider";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast, confirmModal } = useToast();
  const [admin, setAdmin] = useState<Profile | null>(null);

  // Navigasi Tab Admin
  const [activeTab, setActiveTab] = useState<"laporan" | "siswa">("laporan");

  // State Laporan
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("semua");
  const [selectedKategori, setSelectedKategori] = useState<string>("semua");

  // State Modal Detail Laporan
  const [activeLaporan, setActiveLaporan] = useState<Laporan | null>(null);
  const [balasanPesan, setBalasanPesan] = useState("");
  const [isSendingBalasan, setIsSendingBalasan] = useState(false);

  // State Siswa
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [newKelasInput, setNewKelasInput] = useState("");
  const [kelasMsg, setKelasMsg] = useState<string | null>(null);
  const [newSiswaNama, setNewSiswaNama] = useState("");
  const [newSiswaNisn, setNewSiswaNisn] = useState("");
  const [newSiswaKelas, setNewSiswaKelas] = useState("");
  const [newSiswaPassword, setNewSiswaPassword] = useState("123456");
  const [siswaMsg, setSiswaMsg] = useState<string | null>(null);

  // State Realtime — notifikasi laporan baru
  const [newLaporanCount, setNewLaporanCount] = useState(0);
  const laporanCountRef = useRef(0);
  const isFirstLoad = useRef(true);

  // State Modal Pengaturan Admin (Kredensial & Bot Telegram)
  const [showKredensialModal, setShowKredensialModal] = useState(false);
  const [modalTab, setModalTab] = useState<"kredensial" | "telegram">("kredensial");

  // State Ganti Email (mode terpisah)
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [kredEmail, setKredEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // State Ganti Password (mode terpisah)
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [kredPasswordLama, setKredPasswordLama] = useState("");
  const [kredPasswordBaru, setKredPasswordBaru] = useState("");
  const [kredPasswordKonfirmasi, setKredPasswordKonfirmasi] = useState("");
  const [showKredPwLama, setShowKredPwLama] = useState(false);
  const [showKredPwBaru, setShowKredPwBaru] = useState(false);
  const [showKredPwKonfirmasi, setShowKredPwKonfirmasi] = useState(false);
  const [isSavingKred, setIsSavingKred] = useState(false);
  const [kredError, setKredError] = useState<string | null>(null);
  const [kredSuccess, setKredSuccess] = useState<string | null>(null);

  // State Pengaturan Bot Telegram
  const [teleBotToken, setTeleBotToken] = useState("");
  const [teleChatId, setTeleChatId] = useState("");
  const [teleEnabled, setTeleEnabled] = useState(false);
  const [teleTesting, setTeleTesting] = useState(false);
  const [teleTestMsg, setTeleTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [serverTelegramStatus, setServerTelegramStatus] = useState<{
    configured: boolean;
    isGroup: boolean;
    chatIdMasked: string;
  } | null>(null);

  // State Modal Reset / Ganti Kata Sandi Siswa oleh Admin
  const [selectedStudentForPassword, setSelectedStudentForPassword] = useState<StudentAccount | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [showStudentPasswordInput, setShowStudentPasswordInput] = useState(false);
  const [isSavingStudentPassword, setIsSavingStudentPassword] = useState(false);
  const [studentPasswordError, setStudentPasswordError] = useState<string | null>(null);

  const handleSaveStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPassword) return;

    if (!newStudentPassword.trim() || newStudentPassword.trim().length < 6) {
      setStudentPasswordError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setIsSavingStudentPassword(true);
    setStudentPasswordError(null);
    try {
      const res = await StudentService.updatePassword(
        selectedStudentForPassword.id,
        newStudentPassword.trim()
      );
      if (!res.success) {
        setStudentPasswordError(res.error || "Gagal memperbarui kata sandi siswa.");
        return;
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudentForPassword.id
            ? { ...s, password: newStudentPassword.trim() }
            : s
        )
      );

      toast(
        `Kata sandi akun siswa "${selectedStudentForPassword.nama}" berhasil diubah!`,
        "success"
      );
      setSelectedStudentForPassword(null);
      setNewStudentPassword("");
    } catch (err: unknown) {
      setStudentPasswordError(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setIsSavingStudentPassword(false);
    }
  };

  // Buka modal pengaturan dan muat data terkini
  const openSettingsModal = () => {
    // Reset semua state perubahan
    setIsEditingEmail(false);
    setIsEditingPassword(false);
    setKredEmail("");
    setKredPasswordLama("");
    setKredPasswordBaru("");
    setKredPasswordKonfirmasi("");
    setEmailError(null);
    setEmailSuccess(null);
    setKredError(null);
    setKredSuccess(null);

    const cfg = getTelegramConfig();
    setTeleBotToken(cfg.botToken);
    setTeleChatId(cfg.chatId);
    setTeleEnabled(cfg.isEnabled);
    setTeleTestMsg(null);
    setModalTab("kredensial");
    setShowKredensialModal(true);

    // Periksa apakah server sudah dikonfigurasi melalui .env.local
    fetch("/api/telegram-notify")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setServerTelegramStatus(data);
      })
      .catch(() => { });
  };

  // Nada notifikasi ramah saat ada aduan baru masuk
  const playNotificationSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Abaikan jika browser membatasi autoplay audio
    }
  };

  // Muat data awal
  const loadData = async () => {
    setLaporanList(await LaporanService.getAll());
    setStudents(await StudentService.getAll());
    setKelasList(await KelasService.getAll());
  };

  useEffect(() => {
    const checkSession = () => {
      const user = AuthService.getUser();
      if (!user || user.role !== "admin") {
        router.push("/admin/login?expired=1");
        return false;
      }
      setAdmin(user);
      return true;
    };

    const isOk = checkSession();
    if (isOk) {
      loadData().then(() => {
        isFirstLoad.current = false;
      });
    }

    // Pemantauan sesi aktif setiap 30 detik untuk keamanan real-time
    const interval = setInterval(checkSession, 30000);

    // Tangani jika sesi dihapus / logout dari tab lain
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "safereport_real_session" && !e.newValue) {
        router.push("/admin/login");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // ===== 1. REALTIME SUPABASE SUBSCRIPTION (INSTAN VIA WEBSOCKET) =====
    const channel = supabase
      .channel("realtime-laporan-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "laporan" },
        (payload) => {
          LaporanService.getAll().then((list) => {
            setLaporanList(list);
            if (payload.eventType === "INSERT") {
              const newCount = laporanCountRef.current + 1;
              laporanCountRef.current = newCount;
              setNewLaporanCount(newCount);
              playNotificationSound();
              const newRow = payload.new as
                | { kode_pelacak?: string; kategori?: string }
                | undefined;
              toast(
                `🔔 Laporan Baru Masuk! ${newRow?.kode_pelacak ? `[${newRow.kode_pelacak}]` : ""
                } (${newRow?.kategori || "Aduan Baru"})`,
                "info"
              );
            }
          });
        }
      )
      .subscribe();

    // ===== 2. AUTO-POLLING FALLBACK (SETIAP 10 DETIK) =====
    // Menjamin auto-refresh data laporan selalu berjalan real-time
    // bahkan jika Supabase Realtime WebSocket belum diaktifkan di project Supabase
    let lastKnownLength = -1;
    const pollInterval = setInterval(async () => {
      try {
        const freshList = await LaporanService.getAll();
        setLaporanList((currentList) => {
          if (lastKnownLength !== -1 && freshList.length > currentList.length) {
            const added = freshList.length - currentList.length;
            const newCount = laporanCountRef.current + added;
            laporanCountRef.current = newCount;
            setNewLaporanCount(newCount);
            playNotificationSound();
            toast(
              `🔔 ${added} laporan baru masuk! Daftar otomatis diperbarui.`,
              "info"
            );
            lastKnownLength = freshList.length;
            return freshList;
          }
          lastKnownLength = freshList.length;
          // Sinkronisasi status jika ada perubahan data tanpa penambahan jumlah
          const freshSig = freshList
            .map((l) => `${l.id}-${l.status}-${l.updated_at}`)
            .join(";");
          const currSig = currentList
            .map((l) => `${l.id}-${l.status}-${l.updated_at}`)
            .join(";");
          if (freshSig !== currSig) {
            return freshList;
          }
          return currentList;
        });
      } catch {
        // Abaikan kendala jaringan sementara
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Konfirmasi dan proses logout admin interaktif
  const handleLogout = async () => {
    const ok = await confirmModal({
      title: "Konfirmasi Keluar",
      message: "Apakah Anda yakin ingin keluar dari akun admin SafeReport?",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      AuthService.logout();
      toast("Anda berhasil keluar dari akun admin.", "info");
      window.location.href = "/";
    }
  };

  // Ubah status laporan
  const handleChangeStatus = async (id: string, newStatus: StatusLaporan) => {
    await LaporanService.updateStatus(id, newStatus);
    loadData();
    if (activeLaporan && activeLaporan.id === id) {
      setActiveLaporan({ ...activeLaporan, status: newStatus });
    }
    toast(`Status laporan berhasil diubah ke "${newStatus.toUpperCase()}".`, "success");
  };

  // Tambah balasan tindak lanjut
  const handleKirimBalasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLaporan || !balasanPesan.trim() || !admin) return;

    setIsSendingBalasan(true);
    await LaporanService.addTindakLanjut(activeLaporan.id, balasanPesan.trim(), admin.nama);
    setBalasanPesan("");
    loadData();

    const updated = await LaporanService.getByKode(activeLaporan.kode_pelacak);
    if (updated) setActiveLaporan(updated);
    setIsSendingBalasan(false);
    toast("Balasan tindak lanjut berhasil dikirim ke pelapor.", "success");
  };

  // Tambah Kelas Baru
  const handleTambahKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelasInput.trim()) return;

    const success = await KelasService.add(newKelasInput);
    if (!success) {
      setKelasMsg(`Kelas "${newKelasInput.trim()}" sudah ada sebelumnya.`);
      setTimeout(() => setKelasMsg(null), 3000);
      return;
    }

    const added = newKelasInput.trim();
    setKelasMsg(`Kelas "${added}" berhasil ditambahkan!`);
    toast(`Kelas "${added}" berhasil ditambahkan!`, "success");
    setNewKelasInput("");
    loadData();
    setNewSiswaKelas(added);
    setTimeout(() => setKelasMsg(null), 3000);
  };

  // Hapus Kelas dengan modal konfirmasi pop-up
  const handleHapusKelas = async (namaKelas: string) => {
    const ok = await confirmModal({
      title: "Hapus Pilihan Kelas",
      message: `Hapus kelas "${namaKelas}" dari daftar pilihan kelas?`,
      confirmText: "Hapus Kelas",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      await KelasService.delete(namaKelas);
      if (newSiswaKelas === namaKelas) {
        setNewSiswaKelas("");
      }
      loadData();
      toast(`Kelas "${namaKelas}" berhasil dihapus.`, "success");
    }
  };

  // Tambah akun siswa baru
  const handleTambahSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiswaNama.trim() || !newSiswaNisn.trim() || !newSiswaKelas.trim()) return;

    try {
      await StudentService.create({
        nama: newSiswaNama,
        nisn: newSiswaNisn,
        kelas: newSiswaKelas,
        password: newSiswaPassword || "123456",
      });

      setSiswaMsg(`Siswa "${newSiswaNama}" berhasil didaftarkan!`);
      toast(`Siswa "${newSiswaNama}" berhasil didaftarkan!`, "success");
      setNewSiswaNama("");
      setNewSiswaNisn("");
      setNewSiswaKelas("");
      setNewSiswaPassword("123456");
      loadData();

      setTimeout(() => setSiswaMsg(null), 4000);
    } catch {
      toast("Gagal mendaftarkan siswa. Terjadi kesalahan.", "error");
    }
  };

  // Hapus semua data pengaduan dengan dialog modal pop-up standar web
  const handleClearAllLaporan = async () => {
    const ok = await confirmModal({
      title: "Hapus Semua Pengaduan",
      message: "Apakah Anda yakin ingin membersihkan seluruh data pengaduan? Semua catatan dan berkas bukti akan terhapus secara permanen.",
      confirmText: "Ya, Hapus Semua",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      await LaporanService.deleteAll();
      loadData();
      setActiveLaporan(null);
      toast("Seluruh data pengaduan berhasil dibersihkan.", "success");
    }
  };

  // Hapus satu aduan spesifik dengan dialog modal pop-up
  const handleHapusLaporan = async (id: string, kode: string) => {
    const ok = await confirmModal({
      title: "Hapus Pengaduan Ini",
      message: `Hapus laporan pengaduan dengan kode tiket ${kode} secara permanen dari sistem? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus Laporan",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      await LaporanService.delete(id);
      loadData();
      setActiveLaporan(null);
      toast(`Laporan ${kode} berhasil dihapus.`, "success");
    }
  };

  // Hapus akun siswa dengan dialog modal pop-up
  const handleHapusSiswa = async (id: string, nama: string) => {
    const ok = await confirmModal({
      title: "Hapus Akun Siswa",
      message: `Hapus akun siswa "${nama}"? Siswa tidak akan dapat masuk ke dashboard lagi.`,
      confirmText: "Hapus Akun",
      cancelText: "Batal",
      destructive: true,
    });

    if (ok) {
      await StudentService.delete(id);
      loadData();
      toast(`Akun siswa ${nama} berhasil dihapus.`, "success");
    }
  };

  // Filter laporan
  const filteredList = laporanList.filter((item) => {
    const matchQuery =
      item.kode_pelacak.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nama_pelaku && item.nama_pelaku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.nama_pelapor && item.nama_pelapor.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus =
      selectedStatus === "semua" || item.status === selectedStatus;

    const matchKategori =
      selectedKategori === "semua" || item.kategori === selectedKategori;

    return matchQuery && matchStatus && matchKategori;
  });

  // Statistik ringkas
  const countTotal = laporanList.length;
  const countBaru = laporanList.filter((l) => l.status === "baru").length;
  const countProses = laporanList.filter((l) => l.status === "diproses" || l.status === "diverifikasi").length;
  const countSelesai = laporanList.filter((l) => l.status === "selesai").length;

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Topbar Admin */}
      <header className="bg-stone-900 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" showTagline={false} dark={true} href="/" />
            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30">
              PORTAL ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Indikator Laporan Baru (Realtime) */}
            {newLaporanCount > 0 && (
              <button
                onClick={() => { setNewLaporanCount(0); laporanCountRef.current = 0; setActiveTab("laporan"); }}
                className="relative inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all cursor-pointer shadow-xs animate-pulse"
                title="Ada laporan baru masuk!"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{newLaporanCount} Laporan Baru</span>
                <span className="sm:hidden">{newLaporanCount}</span>
              </button>
            )}

            {/* Tombol Refresh Manual */}
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-all cursor-pointer shadow-xs"
              title="Muat ulang data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reload</span>
            </button>

            {/* Tombol Pengaturan Akun & Notifikasi Admin */}
            <button
              onClick={openSettingsModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-all cursor-pointer shadow-xs"
              title="Pengaturan Akun & Notifikasi Bot Telegram"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pengaturan</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-rose-600 hover:text-white text-stone-300 transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Konten Dashboard */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 space-y-6">
        {/* Tab Navigasi: Laporan vs Kelola Akun Siswa */}
        <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("laporan")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === "laporan"
              ? "bg-amber-400 text-stone-950 shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-50"
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            Daftar Pengaduan ({laporanList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("siswa")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === "siswa"
              ? "bg-amber-400 text-stone-950 shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-50"
              }`}
          >
            <Users className="w-4 h-4" />
            Kelola Akun Siswa ({students.length})
          </button>
        </div>

        {/* TAB 1: DAFTAR PENGADUAN */}
        {activeTab === "laporan" && (
          <div className="space-y-6">
            {/* Metrik Ringkas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="card p-4 sm:p-5 border-l-4 border-l-stone-700">
                <div className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Total Laporan</div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{countTotal}</div>
              </div>
              <div className="card p-4 sm:p-5 border-l-4 border-l-rose-500 bg-rose-50/30">
                <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Perlu Ditinjau (Baru)</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{countBaru}</div>
              </div>
              <div className="card p-4 sm:p-5 border-l-4 border-l-blue-500 bg-blue-50/30">
                <div className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Sedang Diproses</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{countProses}</div>
              </div>
              <div className="card p-4 sm:p-5 border-l-4 border-l-emerald-500 bg-emerald-50/30">
                <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Terselesaikan</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{countSelesai}</div>
              </div>
            </div>

            {/* Filter & Pencarian */}
            <div className="card p-4 flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode tiket, lokasi, pelaku, isi aduan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="semua">Semua Status</option>
                  <option value="baru">Baru</option>
                  <option value="diverifikasi">Diverifikasi</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>

                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="verbal">Verbal</option>
                  <option value="fisik">Fisik</option>
                  <option value="cyber">Cyberbullying</option>
                  <option value="psikologis">Psikologis</option>
                  <option value="sosial">Sosial</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Tabel Laporan Pengaduan */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-extrabold text-stone-800 text-sm sm:text-base">
                  Daftar Masuk Pengaduan ({filteredList.length})
                </h2>
                {laporanList.length > 0 && (
                  <button
                    onClick={handleClearAllLaporan}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Hapus seluruh data laporan pengaduan"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Pengaduan
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[11px] border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">Kode Tiket</th>
                      <th className="py-3 px-4">Tgl & Kategori</th>
                      <th className="py-3 px-4">Pelapor</th>
                      <th className="py-3 px-4">Pelaku / Lokasi</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredList.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-amber-700">
                          {item.kode_pelacak}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900 capitalize">
                            {item.kategori}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {formatTanggal(item.tanggal_kejadian)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.is_anonim ? (
                            <span className="inline-flex items-center gap-1 text-stone-500 font-medium text-xs">
                              <UserX className="w-3.5 h-3.5 text-stone-400" /> Anonim ({item.peran_pelapor})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-900 font-semibold text-xs">
                              <User className="w-3.5 h-3.5 text-amber-600" /> {item.nama_pelapor}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-stone-800 font-medium truncate max-w-[180px]">
                            {item.nama_pelaku || "Tidak disebutkan"}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate max-w-[180px]">
                            {item.lokasi}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
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
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveLaporan(item)}
                            className="btn-primary text-xs px-3 py-1.5 font-bold"
                          >
                            Kelola Kasus <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-400 text-xs">
                          <Inbox className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                          Belum ada laporan pengaduan yang masuk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA AKUN SISWA & DATA KELAS (Dibuat oleh Admin) */}
        {activeTab === "siswa" && (
          <div className="space-y-6">
            {/* Bagian 1: Manajemen Data Kelas */}
            <div className="card p-6 border border-amber-200/90 bg-gradient-to-br from-white via-amber-50/40 to-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5 text-stone-900" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-stone-900">
                      Kelola Data Kelas
                    </h2>
                    <p className="text-xs text-stone-500">
                      Buat daftar kelas sekolahmu di sini. Kelas yang dibuat akan langsung muncul di pilihan pendaftaran siswa.
                    </p>
                  </div>
                </div>

                {/* Form Tambah Kelas */}
                <form onSubmit={handleTambahKelas} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama kelas baru (misal: X RPL 1)"
                    value={newKelasInput}
                    onChange={(e) => setNewKelasInput(e.target.value)}
                    className="input text-xs py-2 w-48 sm:w-56"
                  />
                  <button type="submit" className="btn-primary text-xs px-3.5 py-2 font-bold shrink-0 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </form>
              </div>

              {kelasMsg && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{kelasMsg}</span>
                </div>
              )}

              {/* Daftar Chips Kelas */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  Daftar Kelas Tersedia ({kelasList.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {kelasList.map((k) => (
                    <div
                      key={k}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-stone-800 shadow-2xs hover:border-amber-400 transition-all group"
                    >
                      <span>{k}</span>
                      <button
                        type="button"
                        onClick={() => handleHapusKelas(k)}
                        title={`Hapus kelas ${k}`}
                        className="text-stone-300 hover:text-rose-500 transition-colors cursor-pointer ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {kelasList.length === 0 && (
                    <p className="text-xs text-stone-400 italic">
                      Belum ada kelas yang dibuat. Silakan tambahkan kelas pertama pada input di atas.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bagian 2: Form Tambah Akun Siswa */}
            <div className="card p-6 border border-amber-200/90 bg-white">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 text-stone-900" />
                </div>
                <div>
                  <h2 className="text-base font-black text-stone-900">
                    Tambah Akun Siswa Baru
                  </h2>
                  <p className="text-xs text-stone-500">
                    Pilih kelas dari data yang sudah dibuat untuk mendaftarkan akun siswa baru.
                  </p>
                </div>
              </div>

              {siswaMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{siswaMsg}</span>
                </div>
              )}

              <form onSubmit={handleTambahSiswa} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="form-label text-xs">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Pratama"
                    value={newSiswaNama}
                    onChange={(e) => setNewSiswaNama(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="form-label text-xs">NISN</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 007234901"
                    value={newSiswaNisn}
                    onChange={(e) => setNewSiswaNisn(e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Pilih Kelas</label>
                  <select
                    required
                    value={newSiswaKelas}
                    onChange={(e) => setNewSiswaKelas(e.target.value)}
                    className="input text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {kelasList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs">Kata Sandi / PIN Awal</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      value={newSiswaPassword}
                      onChange={(e) => setNewSiswaPassword(e.target.value)}
                      className="input text-xs font-mono"
                    />
                    <button type="submit" className="btn-primary text-xs px-4 py-2 shrink-0 font-bold">
                      <UserPlus className="w-3.5 h-3.5" /> Daftarkan
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Tabel Daftar Siswa */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-extrabold text-stone-800 text-sm">
                  Daftar Siswa Terdaftar ({students.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[11px] border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">NISN</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">PIN / Kata Sandi</th>
                      <th className="py-3 px-4">Terdaftar Sejak</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {st.nama}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-amber-800">
                          {st.nisn}
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">
                          {st.kelas}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-500">
                          {st.password || "123456"}
                        </td>
                        <td className="py-3.5 px-4 text-stone-400 text-xs">
                          {formatTanggal(st.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedStudentForPassword(st);
                                setNewStudentPassword("");
                                setShowStudentPasswordInput(false);
                                setStudentPasswordError(null);
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Ganti / Reset kata sandi siswa"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHapusSiswa(st.id, st.nama)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus akun siswa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {students.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-stone-400 text-xs">
                          Belum ada akun siswa. Silakan tambahkan siswa di formulir atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Detail & Manajemen Kasus Admin */}
      {activeLaporan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 animate-pop-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-amber-400 font-bold uppercase">
                  Detail Pengaduan • {activeLaporan.kode_pelacak}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Perundungan {activeLaporan.kategori} di {activeLaporan.lokasi}
                </h3>
              </div>
              <button
                onClick={() => setActiveLaporan(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Box Info Identitas & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div>
                  <span className="text-stone-400 block text-[11px]">Identitas Pelapor</span>
                  <strong className="text-stone-900">
                    {activeLaporan.is_anonim ? "100% Anonim" : activeLaporan.nama_pelapor}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Peran</span>
                  <strong className="text-stone-900 capitalize">
                    {activeLaporan.peran_pelapor}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Tanggal Kejadian</span>
                  <strong className="text-stone-900">
                    {formatTanggal(activeLaporan.tanggal_kejadian)}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Terduga Pelaku</span>
                  <strong className="text-stone-900">
                    {activeLaporan.nama_pelaku || "-"}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Kontak Privat Pelapor</span>
                  <strong className="text-amber-800">
                    {activeLaporan.kontak_opsional || "(Tidak disertakan)"}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Status Saat Ini</span>
                  <span className="font-black text-stone-900 uppercase">
                    {activeLaporan.status}
                  </span>
                </div>
              </div>

              {/* Deskripsi Kronologi */}
              <div>
                <label className="font-bold text-stone-800 block mb-1">
                  Kronologi / Cerita Pengaduan:
                </label>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                  {activeLaporan.deskripsi}
                </div>
              </div>

              {/* Bukti Lampiran */}
              {activeLaporan.bukti && activeLaporan.bukti.length > 0 && (
                <div>
                  <label className="font-bold text-stone-800 block mb-1">
                    Bukti Lampiran ({activeLaporan.bukti.length}):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeLaporan.bukti.map((b) => (
                      <div key={b.id} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                        <span className="truncate text-xs text-stone-700 font-medium">{b.nama_file}</span>
                        {b.url && (
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-700 font-bold text-xs hover:underline shrink-0 ml-2"
                          >
                            Buka Bukti
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ubah Status Kasus */}
              <div className="pt-3 border-t border-stone-100">
                <label className="font-bold text-stone-800 block mb-2">
                  Update Tahap Penanganan Kasus:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["baru", "diverifikasi", "diproses", "selesai"] as StatusLaporan[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleChangeStatus(activeLaporan.id, st)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${activeLaporan.status === st
                        ? "bg-amber-400 text-stone-950 shadow-xs"
                        : "bg-stone-100 hover:bg-stone-200 text-stone-600"
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Riwayat & Kirim Balasan Admin */}
              <div className="pt-3 border-t border-stone-100 space-y-3">
                <label className="font-bold text-stone-800 block">
                  Riwayat Balasan & Pendampingan Admin:
                </label>

                {activeLaporan.tindak_lanjut && activeLaporan.tindak_lanjut.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeLaporan.tindak_lanjut.map((tl) => (
                      <div key={tl.id} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                        <div className="flex items-center justify-between text-stone-400 text-[10px] mb-1">
                          <strong className="text-amber-800">{tl.oleh_nama}</strong>
                          <span>{formatTanggalWaktu(tl.created_at)}</span>
                        </div>
                        <p className="text-stone-800">{tl.pesan}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">Belum ada catatan tindak lanjut.</p>
                )}

                {/* Form Kirim Balasan */}
                <form onSubmit={handleKirimBalasan} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Tulis balasan atau tindak lanjut dari Admin untuk pelapor (bisa dibaca siswa melalui kode tiket pelacak)..."
                    value={balasanPesan}
                    onChange={(e) => setBalasanPesan(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSendingBalasan || !balasanPesan.trim()}
                      className="btn-primary text-xs px-4 py-2 disabled:opacity-50 font-bold"
                    >
                      <Send className="w-3.5 h-3.5" /> Kirim Balasan ke Siswa
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleHapusLaporan(activeLaporan.id, activeLaporan.kode_pelacak)}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Hapus aduan ini secara permanen"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Aduan Ini
              </button>
              <button
                type="button"
                onClick={() => setActiveLaporan(null)}
                className="btn-secondary text-xs px-4 py-2 font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Admin: Kredensial & Bot Telegram */}
      {showKredensialModal && admin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 animate-pop-in overflow-hidden">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  Pengaturan Admin
                </div>
                <h3 className="text-base font-black text-white">
                  Akun & Notifikasi Laporan
                </h3>
              </div>
              <button
                onClick={() => setShowKredensialModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigasi Tab Modal */}
            <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-2">
              <button
                type="button"
                onClick={() => setModalTab("kredensial")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === "kredensial"
                    ? "border-amber-500 text-stone-950 font-black"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
              >
                <KeyRound className="w-3.5 h-3.5" /> Akun & Kata Sandi
              </button>
              <button
                type="button"
                onClick={() => setModalTab("telegram")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${modalTab === "telegram"
                    ? "border-amber-500 text-stone-950 font-black"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-sky-500" /> Grup Telegram Tim
                <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-bold">
                  Tim Sekolah
                </span>
              </button>
            </div>

            {/* Tab 1: Akun & Kata Sandi — Tampilan Baru yang Lebih Jelas */}
            {modalTab === "kredensial" && (
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* ── BLOK: Info Email Saat Ini ── */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Email Admin Saat Ini</div>
                        <div className="text-sm font-bold text-stone-900 mt-0.5">{admin.email}</div>
                      </div>
                    </div>
                    {!isEditingEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingEmail(true);
                          setKredEmail("");
                          setEmailError(null);
                          setEmailSuccess(null);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 transition-colors cursor-pointer shrink-0"
                      >
                        Ganti Email
                      </button>
                    )}
                  </div>

                  {/* Form Ganti Email (tampil saat tombol diklik) */}
                  {isEditingEmail && (
                    <div className="px-4 pb-4 pt-1 border-t border-stone-200 space-y-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Email Baru</label>
                        <input
                          type="email"
                          autoFocus
                          placeholder="Masukkan email baru..."
                          value={kredEmail}
                          onChange={(e) => { setKredEmail(e.target.value); setEmailError(null); setEmailSuccess(null); }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      {emailError && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {emailError}
                        </div>
                      )}
                      {emailSuccess && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {emailSuccess}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setIsEditingEmail(false); setEmailError(null); setEmailSuccess(null); }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEmail}
                          onClick={async () => {
                            const newEmail = kredEmail.trim();
                            if (!newEmail) { setEmailError("Email tidak boleh kosong."); return; }
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(newEmail)) { setEmailError("Format email tidak valid."); return; }
                            if (newEmail === admin.email) { setEmailError("Email baru sama dengan email saat ini."); return; }
                            setIsSavingEmail(true);
                            const result = await AdminService.updateCredentials(admin.id, { email: newEmail });
                            setIsSavingEmail(false);
                            if (!result.success) { setEmailError(result.error ?? "Gagal menyimpan email."); return; }
                            const updatedAdmin = { ...admin, email: newEmail };
                            AuthService.setUser(updatedAdmin);
                            setAdmin(updatedAdmin);
                            setEmailSuccess("Email berhasil diperbarui!");
                            toast("Email admin berhasil diperbarui.", "success");
                            setTimeout(() => { setIsEditingEmail(false); setEmailSuccess(null); }, 1800);
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-stone-950 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSavingEmail ? "Menyimpan..." : "Simpan Email"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── BLOK: Kata Sandi ── */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Kata Sandi</div>
                        <div className="text-sm font-bold text-stone-900 mt-0.5">••••••••</div>
                      </div>
                    </div>
                    {!isEditingPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(true);
                          setKredPasswordLama("");
                          setKredPasswordBaru("");
                          setKredPasswordKonfirmasi("");
                          setKredError(null);
                          setKredSuccess(null);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 transition-colors cursor-pointer shrink-0"
                      >
                        Ganti Password
                      </button>
                    )}
                  </div>

                  {/* Form Ganti Password (tampil saat tombol diklik) */}
                  {isEditingPassword && (
                    <div className="px-4 pb-4 pt-1 border-t border-stone-200 space-y-2.5">
                      {/* Password Lama */}
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Kata Sandi Saat Ini</label>
                        <div className="relative">
                          <input
                            type={showKredPwLama ? "text" : "password"}
                            autoFocus
                            placeholder="Masukkan kata sandi saat ini..."
                            value={kredPasswordLama}
                            onChange={(e) => { setKredPasswordLama(e.target.value); setKredError(null); }}
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button type="button" onClick={() => setShowKredPwLama(!showKredPwLama)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
                            {showKredPwLama ? <EyeOff className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {/* Password Baru */}
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Kata Sandi Baru</label>
                        <div className="relative">
                          <input
                            type={showKredPwBaru ? "text" : "password"}
                            placeholder="Masukkan kata sandi baru..."
                            value={kredPasswordBaru}
                            onChange={(e) => { setKredPasswordBaru(e.target.value); setKredError(null); }}
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button type="button" onClick={() => setShowKredPwBaru(!showKredPwBaru)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
                            {showKredPwBaru ? <EyeOff className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {/* Konfirmasi Password Baru */}
                      <div>
                        <label className="text-[11px] font-bold text-stone-600 block mb-1">Konfirmasi Kata Sandi Baru</label>
                        <div className="relative">
                          <input
                            type={showKredPwKonfirmasi ? "text" : "password"}
                            placeholder="Ulangi kata sandi baru..."
                            value={kredPasswordKonfirmasi}
                            onChange={(e) => { setKredPasswordKonfirmasi(e.target.value); setKredError(null); }}
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button type="button" onClick={() => setShowKredPwKonfirmasi(!showKredPwKonfirmasi)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
                            {showKredPwKonfirmasi ? <EyeOff className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {/* Pesan Error / Sukses */}
                      {kredError && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {kredError}
                        </div>
                      )}
                      {kredSuccess && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {kredSuccess}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setIsEditingPassword(false); setKredError(null); setKredSuccess(null); }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isSavingKred}
                          onClick={async () => {
                            setKredError(null);
                            setKredSuccess(null);
                            if (!kredPasswordLama.trim()) { setKredError("Masukkan kata sandi saat ini."); return; }
                            if (kredPasswordBaru.trim().length < 4) { setKredError("Kata sandi baru minimal 4 karakter."); return; }
                            if (kredPasswordBaru !== kredPasswordKonfirmasi) { setKredError("Konfirmasi kata sandi tidak cocok."); return; }
                            const check = await AdminService.login(admin.email ?? "", kredPasswordLama.trim());
                            if (!check.data) { setKredError("Kata sandi saat ini salah."); return; }
                            setIsSavingKred(true);
                            const result = await AdminService.updateCredentials(admin.id, { password: kredPasswordBaru.trim() });
                            setIsSavingKred(false);
                            if (!result.success) { setKredError(result.error ?? "Gagal menyimpan kata sandi."); return; }
                            setKredSuccess("Kata sandi berhasil diperbarui!");
                            toast("Kata sandi admin berhasil diperbarui.", "success");
                            setTimeout(() => { setIsEditingPassword(false); setKredSuccess(null); setKredPasswordLama(""); setKredPasswordBaru(""); setKredPasswordKonfirmasi(""); }, 1800);
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-stone-950 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSavingKred ? "Menyimpan..." : "Simpan Password"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tab 2: Notifikasi Telegram — Tampilan Ramah Klien Awam */}
            {modalTab === "telegram" && (
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* ── BLOK: Status Koneksi Grup ── */}
                {serverTelegramStatus?.configured || (teleEnabled && teleBotToken && teleChatId) ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <div>
                      <div className="text-xs font-black text-emerald-950 uppercase tracking-wider">Notifikasi Telegram: Aktif ✓</div>
                      <p className="text-[11px] text-emerald-900 leading-relaxed mt-1">
                        Setiap ada siswa melapor, seluruh tim di Grup Telegram akan langsung mendapatkan notifikasi otomatis.
                        {serverTelegramStatus?.chatIdMasked && <span className="font-mono ml-1 opacity-70">({serverTelegramStatus.chatIdMasked})</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                    <div>
                      <div className="text-xs font-black text-amber-950 uppercase tracking-wider">Notifikasi Telegram: Belum Aktif</div>
                      <p className="text-[11px] text-amber-900 leading-relaxed mt-1">
                        Hubungi pengembang untuk menghubungkan bot Telegram ke sistem SafeReport sekolah Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── BLOK: Link ke Bot Telegram ── */}
                <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bot Telegram SafeReport</div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4.5 h-4.5 text-sky-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Link Grub Tim Telegram</div>
                        <div className="text-[11px] text-stone-500">Klik untuk membuka link Grub</div>
                      </div>
                    </div>
                    <a
                      href="https://t.me/+wGWT0YJmt5EwOGJl"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka di Telegram
                    </a>
                  </div>
                </div>

                {/* ── BLOK: Tombol Kirim Uji Coba Notifikasi ── */}
                <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tes Kirim Notifikasi</div>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Klik tombol di bawah untuk mengirim pesan uji coba ke Grup Telegram tim sekolah. Pastikan bot sudah ada di grup dan menjadi admin.
                    </p>
                    <button
                      type="button"
                      disabled={teleTesting}
                      onClick={async () => {
                        setTeleTesting(true);
                        setTeleTestMsg(null);
                        try {
                          const res = await fetch("/api/telegram-notify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "test",
                              customToken: teleBotToken.trim() || undefined,
                              customChatId: teleChatId.trim() || undefined,
                            }),
                          });
                          const data = await res.json();
                          if (data.ok) {
                            setTeleTestMsg({ ok: true, text: data.message || "✅ Pesan uji coba berhasil dikirim ke Grup Telegram!" });
                            toast("Notifikasi tes berhasil dikirim!", "success");
                          } else {
                            if (teleBotToken && teleChatId) {
                              const directRes = await testTelegramConnection(teleBotToken, teleChatId);
                              setTeleTestMsg({ ok: directRes.success, text: directRes.message });
                            } else {
                              setTeleTestMsg({ ok: false, text: data.message || "Gagal kirim notifikasi. Pastikan bot sudah diundang ke grup dan dijadikan admin." });
                            }
                          }
                        } catch (err: unknown) {
                          setTeleTestMsg({ ok: false, text: `Kendala jaringan: ${err instanceof Error ? err.message : String(err)}` });
                        } finally {
                          setTeleTesting(false);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {teleTesting ? "Mengirim Pesan Uji Coba..." : "📲 Kirim Notifikasi Uji Coba"}
                    </button>

                    {/* Hasil tes */}
                    {teleTestMsg && (
                      <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${teleTestMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                        {teleTestMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />}
                        <span className="leading-relaxed">{teleTestMsg.text}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Footer Modal — Sederhana, hanya tombol Tutup */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowKredensialModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Kata Sandi Siswa oleh Admin */}
      {selectedStudentForPassword && (
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
                    Ganti Kata Sandi Siswa
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    Reset kata sandi untuk akun siswa ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForPassword(null);
                  setNewStudentPassword("");
                  setStudentPasswordError(null);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Siswa */}
            <div className="px-6 pt-5 pb-2">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                <div className="font-bold text-stone-900 text-sm">
                  {selectedStudentForPassword.nama}
                </div>
                <div className="flex items-center gap-2 text-stone-600 font-mono text-[11px]">
                  <span>NISN: <b>{selectedStudentForPassword.nisn}</b></span>
                  <span>•</span>
                  <span>Kelas: <b>{selectedStudentForPassword.kelas}</b></span>
                </div>
              </div>
            </div>

            {/* Form Input */}
            <form onSubmit={handleSaveStudentPassword} className="p-6 pt-3 space-y-4">
              {studentPasswordError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{studentPasswordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" /> Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showStudentPasswordInput ? "text" : "password"}
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Masukkan sandi baru (min. 6 karakter)"
                    className="input pr-10 text-xs sm:text-sm font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPasswordInput(!showStudentPasswordInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showStudentPasswordInput ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">
                  Default awal kata sandi siswa adalah <code className="bg-stone-100 px-1 py-0.5 rounded font-bold">123456</code>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForPassword(null);
                    setNewStudentPassword("");
                    setStudentPasswordError(null);
                  }}
                  disabled={isSavingStudentPassword}
                  className="btn-secondary text-xs px-4 py-2.5 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudentPassword || !newStudentPassword.trim()}
                  className="btn-primary text-xs px-5 py-2.5 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingStudentPassword ? "Menyimpan..." : "Simpan Sandi Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
