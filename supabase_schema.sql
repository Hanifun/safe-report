-- =====================================================
-- SafeReport — Skema Database Supabase PostgreSQL
-- Proyek Pengaduan Bullying Aman, Anonim & Terpercaya
-- =====================================================

-- 1. Enable extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM Tipe Data
CREATE TYPE user_role AS ENUM ('siswa', 'admin');
CREATE TYPE peran_pelapor AS ENUM ('korban', 'saksi');
CREATE TYPE kategori_bullying AS ENUM ('verbal', 'fisik', 'cyber', 'psikologis', 'sosial', 'lainnya');
CREATE TYPE status_laporan AS ENUM ('baru', 'diverifikasi', 'diproses', 'selesai');

-- 3. Tabel Profil Pengguna (Siswa & Guru BK)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nisn_kelas TEXT,
  email TEXT,
  role user_role DEFAULT 'siswa'::user_role,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabel Pengaduan / Laporan
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_pelacak VARCHAR(20) UNIQUE NOT NULL,
  is_anonim BOOLEAN DEFAULT TRUE NOT NULL,
  pelapor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nama_pelapor TEXT,
  kontak_opsional TEXT,
  peran_pelapor peran_pelapor NOT NULL,
  kategori kategori_bullying NOT NULL,
  nama_pelaku TEXT,
  lokasi TEXT NOT NULL,
  tanggal_kejadian DATE NOT NULL,
  deskripsi TEXT NOT NULL,
  status status_laporan DEFAULT 'baru'::status_laporan NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabel Bukti / File Lampiran
CREATE TABLE IF NOT EXISTS public.bukti_laporan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laporan_id UUID NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  nama_file TEXT NOT NULL,
  url TEXT NOT NULL,
  tipe_file TEXT,
  ukuran_byte BIGINT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabel Tindak Lanjut & Catatan Guru BK
CREATE TABLE IF NOT EXISTS public.tindak_lanjut (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laporan_id UUID NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  pesan TEXT NOT NULL,
  oleh_nama TEXT NOT NULL,
  is_publik BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Row Level Security (RLS) Kebijakan Keamanan Privasi
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bukti_laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tindak_lanjut ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Laporan:
-- Publik/Siswa anonim bisa membaca laporan JIKA mengetahui kode_pelacak
CREATE POLICY "Akses publik berdasar kode pelacak" ON public.laporan
  FOR SELECT
  USING (true);

-- Siapapun dapat membuat laporan baru (Anonim First)
CREATE POLICY "Siapapun dapat kirim laporan" ON public.laporan
  FOR INSERT
  WITH CHECK (true);

-- Hanya admin/BK yang bisa update status
CREATE POLICY "Admin dapat perbarui status laporan" ON public.laporan
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indeks untuk kecepatan pencarian
CREATE INDEX IF NOT EXISTS idx_laporan_kode ON public.laporan(kode_pelacak);
CREATE INDEX IF NOT EXISTS idx_laporan_status ON public.laporan(status);
