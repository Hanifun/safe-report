// =====================================================
// SafeReport — Types (Tipe Data)
// Semua tipe/interface TypeScript ada di sini.
// =====================================================

// Peran pelapor: apakah dia korban atau saksi
export type PeranPelapor = "korban" | "saksi";

// Kategori jenis bullying
export type KategoriBullying =
  | "verbal"
  | "fisik"
  | "cyber"
  | "psikologis"
  | "sosial"
  | "lainnya";

// Status penanganan laporan
export type StatusLaporan =
  | "baru"        // baru masuk, belum diproses
  | "diverifikasi" // admin sudah baca dan verifikasi
  | "diproses"    // sedang dalam proses mediasi/penanganan
  | "selesai";    // kasus sudah diselesaikan

// Role pengguna
export type UserRole = "siswa" | "admin";

// Data profil pengguna (siswa atau admin dalam sesi aktif)
export interface Profile {
  id: string;
  nama: string;
  nisn_kelas?: string;
  email?: string;
  role: UserRole;
  created_at: string;
}

// Data akun siswa (dibuat & dikelola oleh Admin)
export interface StudentAccount {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  password?: string;
  created_at: string;
}

// Data akun admin
export interface AdminAccount {
  id: string;
  nama: string;
  email: string;
  password?: string;
  nip_jabatan?: string;
  created_at: string;
}

// Data bukti/file yang dilampirkan
export interface BuktiFile {
  id: string;
  nama_file: string;
  url: string;        // data:URL (lokal) atau URL Supabase Storage
  tipe_file?: string;
  ukuran_byte?: number;
}

// Pesan balasan / tindak lanjut dari Admin
export interface TindakLanjut {
  id: string;
  laporan_id: string;
  pesan: string;
  oleh_nama: string;  // nama Admin yang mengirim
  is_publik: boolean; // kalau true, pelapor bisa lihat di /status
  created_at: string;
}

// Data laporan pengaduan
export interface Laporan {
  id: string;
  kode_pelacak: string;       // contoh: "SF-8K9P"
  is_anonim: boolean;
  pelapor_id?: string | null;
  nama_pelapor?: string | null;
  kontak_opsional?: string | null;
  peran_pelapor: PeranPelapor;
  kategori: KategoriBullying;
  nama_pelaku?: string | null;
  lokasi: string;
  tanggal_kejadian: string;
  deskripsi: string;
  bukti?: BuktiFile[];
  status: StatusLaporan;
  tindak_lanjut?: TindakLanjut[];
  created_at: string;
  updated_at: string;
}

// Data yang dikirim dari form laporan
export interface FormLaporanData {
  peran_pelapor: PeranPelapor;
  kategori: KategoriBullying;
  nama_pelaku?: string;
  lokasi: string;
  tanggal_kejadian: string;
  deskripsi: string;
  kontak_opsional?: string;
  bukti_files?: File[];
  mode_identitas?: "anonim" | "siswa"; // Mode identitas pelapor
  _hp_trap?: string; // Honeypot field (anti-bot trap)
}

// Data sesi keamanan pengguna (dengan token, masa berlaku & tanda tangan integritas)
export interface SessionData {
  token: string;
  user: Profile;
  expiresAt: number;
  createdAt: number;
  signature: string;
}
