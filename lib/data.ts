// =====================================================
// SafeReport — Data & Service Layer (Supabase Cloud)
// =====================================================
// Semua data kini disimpan di Supabase PostgreSQL.
// Autentikasi admin & siswa menggunakan tabel custom.
// File bukti disimpan di Supabase Storage.
// =====================================================

import {
  AdminAccount,
  BuktiFile,
  FormLaporanData,
  Laporan,
  Profile,
  SessionData,
  StatusLaporan,
  StudentAccount,
  TindakLanjut,
} from "@/types";
import { generateKodePelacak } from "./utils";
import {
  createSessionSignature,
  generateSecureToken,
  RateLimiter,
  sanitizeFileName,
  sanitizeInput,
  validateUploadedFile,
  verifySessionSignature,
} from "./security";
import { supabase } from "./supabase";

// Helper pembersih istilah Guru BK / Bimbingan Konseling
export function cleanAdminText(text: string): string {
  if (!text) return text;
  return text
    .replace(/Guru\s*Bimbingan\s*Konseling/gi, "Admin Sekolah")
    .replace(/Koordinator\s*Bimbingan\s*Konseling/gi, "Administrator Sekolah")
    .replace(/Bimbingan\s*Konseling/gi, "Admin")
    .replace(/Guru\s*BK/gi, "Admin");
}

// =====================================================
// 1. SERVICE: LAPORAN (PENGADUAN)
// =====================================================
export const LaporanService = {
  async getAll(): Promise<Laporan[]> {
    const { data, error } = await supabase
      .from("laporan")
      .select(
        `
        *,
        bukti:bukti_laporan(*),
        tindak_lanjut(*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching laporan:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      kode_pelacak: row.kode_pelacak,
      is_anonim: row.is_anonim,
      pelapor_id: row.pelapor_id,
      nama_pelapor: row.nama_pelapor,
      kontak_opsional: row.kontak_opsional,
      peran_pelapor: row.peran_pelapor,
      kategori: row.kategori,
      nama_pelaku: row.nama_pelaku,
      lokasi: row.lokasi,
      tanggal_kejadian: row.tanggal_kejadian,
      deskripsi: row.deskripsi,
      bukti: row.bukti || [],
      status: row.status,
      tindak_lanjut: (row.tindak_lanjut || []).sort(
        (a: TindakLanjut, b: TindakLanjut) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  async getByKode(kode: string): Promise<Laporan | null> {
    const clean = kode.trim().toUpperCase();
    const { data, error } = await supabase
      .from("laporan")
      .select(
        `
        *,
        bukti:bukti_laporan(*),
        tindak_lanjut(*)
      `
      )
      .eq("kode_pelacak", clean)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      kode_pelacak: data.kode_pelacak,
      is_anonim: data.is_anonim,
      pelapor_id: data.pelapor_id,
      nama_pelapor: data.nama_pelapor,
      kontak_opsional: data.kontak_opsional,
      peran_pelapor: data.peran_pelapor,
      kategori: data.kategori,
      nama_pelaku: data.nama_pelaku,
      lokasi: data.lokasi,
      tanggal_kejadian: data.tanggal_kejadian,
      deskripsi: data.deskripsi,
      bukti: data.bukti || [],
      status: data.status,
      tindak_lanjut: (data.tindak_lanjut || []).sort(
        (a: TindakLanjut, b: TindakLanjut) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async getByPelaporId(pelaporId: string): Promise<Laporan[]> {
    const { data, error } = await supabase
      .from("laporan")
      .select(
        `
        *,
        bukti:bukti_laporan(*),
        tindak_lanjut(*)
      `
      )
      .eq("pelapor_id", pelaporId)
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data || []).map((row) => ({
      id: row.id,
      kode_pelacak: row.kode_pelacak,
      is_anonim: row.is_anonim,
      pelapor_id: row.pelapor_id,
      nama_pelapor: row.nama_pelapor,
      kontak_opsional: row.kontak_opsional,
      peran_pelapor: row.peran_pelapor,
      kategori: row.kategori,
      nama_pelaku: row.nama_pelaku,
      lokasi: row.lokasi,
      tanggal_kejadian: row.tanggal_kejadian,
      deskripsi: row.deskripsi,
      bukti: row.bukti || [],
      status: row.status,
      tindak_lanjut: (row.tindak_lanjut || []).sort(
        (a: TindakLanjut, b: TindakLanjut) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  async create(
    data: FormLaporanData,
    user: Profile | null
  ): Promise<Laporan> {
    // 1. Cek Honeypot (Anti-Bot Trap)
    if (data._hp_trap && data._hp_trap.trim().length > 0) {
      throw new Error("Pengiriman tidak valid terdeteksi (bot protection).");
    }

    // 2. Cek Rate Limiting
    const rateCheck = RateLimiter.check(
      "kirim_laporan",
      5,
      10 * 60 * 1000,
      15 * 1000
    );
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.error || "Batas pengiriman laporan tercapai.");
    }

    // 3. Sanitasi Input
    const cleanLokasi = sanitizeInput(data.lokasi);
    const cleanDeskripsi = sanitizeInput(data.deskripsi);
    const cleanNamaPelaku = data.nama_pelaku
      ? sanitizeInput(data.nama_pelaku)
      : null;
    const cleanKontak = data.kontak_opsional
      ? sanitizeInput(data.kontak_opsional)
      : null;

    if (!cleanLokasi || cleanLokasi.length < 3 || cleanLokasi.length > 150) {
      throw new Error("Lokasi kejadian harus antara 3 hingga 150 karakter.");
    }
    if (
      !cleanDeskripsi ||
      cleanDeskripsi.length < 15 ||
      cleanDeskripsi.length > 3000
    ) {
      throw new Error(
        "Kronologi kejadian harus antara 15 hingga 3000 karakter."
      );
    }

    // 4. Upload Bukti ke Supabase Storage
    const buktiList: BuktiFile[] = [];
    if (data.bukti_files && data.bukti_files.length > 0) {
      if (data.bukti_files.length > 3) {
        throw new Error("Maksimal lampiran bukti adalah 3 berkas.");
      }
      for (const file of data.bukti_files) {
        const fileCheck = validateUploadedFile(file);
        if (!fileCheck.valid) {
          throw new Error(fileCheck.error || "Berkas lampiran tidak valid.");
        }

        const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("bukti-laporan")
          .upload(safeName, file, { contentType: file.type });

        if (uploadError) {
          throw new Error(`Gagal mengunggah berkas: ${uploadError.message}`);
        }

        const { data: publicUrl } = supabase.storage
          .from("bukti-laporan")
          .getPublicUrl(uploadData.path);

        buktiList.push({
          id: `bukti-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          nama_file: sanitizeFileName(file.name),
          url: publicUrl.publicUrl,
          tipe_file: file.type,
          ukuran_byte: file.size,
        });
      }
    }

    const isSiswaIdentity =
      data.mode_identitas === "siswa" && Boolean(user);
    const isAnonim = !isSiswaIdentity;
    const kode = generateKodePelacak("SF");
    const now = new Date().toISOString();

    // 5. Insert Laporan ke Database
    const { data: laporanRow, error: laporanError } = await supabase
      .from("laporan")
      .insert({
        kode_pelacak: kode,
        is_anonim: isAnonim,
        pelapor_id:
          isSiswaIdentity && user ? user.id : null,
        nama_pelapor:
          isSiswaIdentity && user
            ? `${user.nama} (${user.nisn_kelas ?? "Siswa"})`
            : null,
        kontak_opsional: cleanKontak || null,
        peran_pelapor: data.peran_pelapor,
        kategori: data.kategori,
        nama_pelaku: cleanNamaPelaku || null,
        lokasi: cleanLokasi,
        tanggal_kejadian: data.tanggal_kejadian,
        deskripsi: cleanDeskripsi,
        status: "baru",
      })
      .select()
      .single();

    if (laporanError || !laporanRow) {
      throw new Error(
        `Gagal menyimpan laporan: ${laporanError?.message ?? "unknown"}`
      );
    }

    // 6. Insert Bukti Files
    if (buktiList.length > 0) {
      const buktiRows = buktiList.map((b) => ({
        laporan_id: laporanRow.id,
        nama_file: b.nama_file,
        url: b.url,
        tipe_file: b.tipe_file,
        ukuran_byte: b.ukuran_byte,
      }));
      await supabase.from("bukti_laporan").insert(buktiRows);
    }

    // 7. Insert Tindak Lanjut awal dari Sistem
    const { data: tlRow } = await supabase
      .from("tindak_lanjut")
      .insert({
        laporan_id: laporanRow.id,
        pesan:
          "Laporan telah diterima oleh sistem dan menunggu peninjauan tim Admin.",
        oleh_nama: "Sistem SafeReport",
        is_publik: true,
      })
      .select()
      .single();

    // Catat ke RateLimiter
    RateLimiter.record("kirim_laporan");

    return {
      id: laporanRow.id,
      kode_pelacak: laporanRow.kode_pelacak,
      is_anonim: laporanRow.is_anonim,
      pelapor_id: laporanRow.pelapor_id,
      nama_pelapor: laporanRow.nama_pelapor,
      kontak_opsional: laporanRow.kontak_opsional,
      peran_pelapor: laporanRow.peran_pelapor,
      kategori: laporanRow.kategori,
      nama_pelaku: laporanRow.nama_pelaku,
      lokasi: laporanRow.lokasi,
      tanggal_kejadian: laporanRow.tanggal_kejadian,
      deskripsi: laporanRow.deskripsi,
      bukti: buktiList,
      status: laporanRow.status,
      tindak_lanjut: tlRow ? [tlRow] : [],
      created_at: laporanRow.created_at,
      updated_at: laporanRow.updated_at,
    };
  },

  async updateStatus(id: string, status: StatusLaporan): Promise<boolean> {
    const { error } = await supabase
      .from("laporan")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  },

  async addTindakLanjut(
    laporanId: string,
    pesan: string,
    adminNama: string
  ): Promise<TindakLanjut | null> {
    const { data, error } = await supabase
      .from("tindak_lanjut")
      .insert({
        laporan_id: laporanId,
        pesan: pesan.trim(),
        oleh_nama: adminNama,
        is_publik: true,
      })
      .select()
      .single();

    if (error || !data) return null;

    // Update updated_at laporan
    await supabase
      .from("laporan")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", laporanId);

    return data as TindakLanjut;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("laporan").delete().eq("id", id);
    return !error;
  },

  async deleteAll(): Promise<void> {
    await supabase.from("laporan").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  },
};

// ==========================================
// 2. SERVICE: KELOLA AKUN ADMIN
// ==========================================
export const AdminService = {
  async getAll(): Promise<AdminAccount[]> {
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return [];
    return data || [];
  },

  async create(
    admin: Omit<AdminAccount, "id" | "created_at">
  ): Promise<AdminAccount> {
    const { data, error } = await supabase
      .from("admins")
      .insert({
        nama: admin.nama.trim(),
        email: admin.email.trim().toLowerCase(),
        password: admin.password || "admin",
        nip_jabatan: admin.nip_jabatan?.trim() || "Staf Admin",
      })
      .select()
      .single();

    if (error || !data) throw new Error("Gagal membuat akun admin");
    return data;
  },

  async login(email: string, password?: string): Promise<AdminAccount | null> {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (error) {
      console.error("Supabase Admin login error:", error.message, error);
      return null;
    }
    if (!data) return null;
    if (password && data.password && data.password !== password) return null;
    return data;
  },
};

// ==========================================
// 3. SERVICE: KELOLA AKUN SISWA
// ==========================================
export const StudentService = {
  async getAll(): Promise<StudentAccount[]> {
    const { data, error } = await supabase
      .from("siswa")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  },

  async create(dataInput: {
    nisn: string;
    nama: string;
    kelas: string;
    password?: string;
  }): Promise<StudentAccount> {
    const { data, error } = await supabase
      .from("siswa")
      .insert({
        nisn: dataInput.nisn.trim(),
        nama: dataInput.nama.trim(),
        kelas: dataInput.kelas.trim(),
        password: dataInput.password?.trim() || "123456",
      })
      .select()
      .single();

    if (error || !data) throw new Error("Gagal membuat akun siswa");
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("siswa").delete().eq("id", id);
    return !error;
  },

  async login(
    nisn: string,
    password?: string
  ): Promise<StudentAccount | null> {
    const cleanNisn = nisn.trim();
    const { data, error } = await supabase
      .from("siswa")
      .select("*")
      .eq("nisn", cleanNisn)
      .single();

    if (error) {
      console.error("Supabase Siswa login error:", error.message, error);
      return null;
    }
    if (!data) return null;
    if (password && data.password && data.password !== password) return null;
    return data;
  },
};

// =====================================================
// 4. SERVICE: SESI PENGGUNA (AUTH SESSION)
// =====================================================
const SECURE_SESSION_KEY = "safereport_real_session";
const ADMIN_SESSION_TTL = 4 * 60 * 60 * 1000; // 4 Jam
const STUDENT_SESSION_TTL = 12 * 60 * 60 * 1000; // 12 Jam

export const AuthService = {
  getUser(): Profile | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(SECURE_SESSION_KEY);
      if (!raw) return null;

      const session: SessionData = JSON.parse(raw);
      const now = Date.now();

      if (now > session.expiresAt) {
        this.logout();
        return null;
      }

      const isValidSignature = verifySessionSignature(
        session.user,
        session.expiresAt,
        session.token,
        session.signature
      );
      if (!isValidSignature) {
        this.logout();
        return null;
      }

      return session.user;
    } catch {
      this.logout();
      return null;
    }
  },

  setUser(user: Profile): void {
    if (typeof window === "undefined") return;
    const token = generateSecureToken(32);
    const ttl =
      user.role === "admin" ? ADMIN_SESSION_TTL : STUDENT_SESSION_TTL;
    const expiresAt = Date.now() + ttl;
    const signature = createSessionSignature(user, expiresAt, token);

    const session: SessionData = {
      token,
      user,
      expiresAt,
      createdAt: Date.now(),
      signature,
    };

    sessionStorage.setItem(SECURE_SESSION_KEY, JSON.stringify(session));
  },

  logout(): void {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(SECURE_SESSION_KEY);
    } catch (e) {
      console.error(e);
    }
  },
};

// =====================================================
// 5. SERVICE: KELOLA DATA KELAS
// =====================================================
export const KelasService = {
  async getAll(): Promise<string[]> {
    const { data, error } = await supabase
      .from("kelas")
      .select("nama")
      .order("nama", { ascending: true });

    if (error || !data || data.length === 0) {
      return [
        "X MIPA 1",
        "X MIPA 2",
        "X IPS 1",
        "XI MIPA 1",
        "XI IPS 1",
        "XII MIPA 1",
        "XII IPS 1",
      ];
    }
    return data.map((k) => k.nama);
  },

  async add(nama: string): Promise<boolean> {
    const clean = nama.trim();
    if (!clean) return false;
    const { error } = await supabase.from("kelas").insert({ nama: clean });
    return !error;
  },

  async delete(nama: string): Promise<boolean> {
    const { error } = await supabase.from("kelas").delete().eq("nama", nama);
    return !error;
  },
};
