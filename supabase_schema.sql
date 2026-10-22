-- =====================================================
-- SafeReport — Skema Database Supabase PostgreSQL v2
-- Proyek Pengaduan Bullying Aman, Anonim & Terpercaya
-- =====================================================
-- CARA PAKAI:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project kamu
-- 3. Klik "SQL Editor" di sidebar kiri
-- 4. Klik "New query", paste seluruh isi file ini, lalu klik "Run"
-- =====================================================

-- 1. Enable extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM Tipe Data
DO $$ BEGIN
  CREATE TYPE peran_pelapor AS ENUM ('korban', 'saksi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kategori_bullying AS ENUM ('verbal', 'fisik', 'cyber', 'psikologis', 'sosial', 'lainnya');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_laporan AS ENUM ('baru', 'diverifikasi', 'diproses', 'selesai');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabel Admin (login manual, tanpa Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT 'admin',
  nip_jabatan TEXT DEFAULT 'Administrator Sekolah',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Tabel Siswa (login manual, dibuat oleh admin)
CREATE TABLE IF NOT EXISTS public.siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nisn TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '123456',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Tabel Kelas
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 6. Tabel Pengaduan / Laporan
CREATE TABLE IF NOT EXISTS public.laporan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_pelacak VARCHAR(20) UNIQUE NOT NULL,
  is_anonim BOOLEAN DEFAULT TRUE NOT NULL,
  pelapor_id UUID REFERENCES public.siswa(id) ON DELETE SET NULL,
  nama_pelapor TEXT,
  kontak_opsional TEXT,
  peran_pelapor peran_pelapor NOT NULL,
  kategori kategori_bullying NOT NULL,
  nama_pelaku TEXT,
  lokasi TEXT NOT NULL,
  tanggal_kejadian DATE NOT NULL,
  deskripsi TEXT NOT NULL,
  status status_laporan DEFAULT 'baru'::status_laporan NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. Tabel Bukti / File Lampiran
CREATE TABLE IF NOT EXISTS public.bukti_laporan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laporan_id UUID NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  nama_file TEXT NOT NULL,
  url TEXT NOT NULL,
  tipe_file TEXT,
  ukuran_byte BIGINT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Tabel Tindak Lanjut & Catatan Admin
CREATE TABLE IF NOT EXISTS public.tindak_lanjut (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laporan_id UUID NOT NULL REFERENCES public.laporan(id) ON DELETE CASCADE,
  pesan TEXT NOT NULL,
  oleh_nama TEXT NOT NULL,
  is_publik BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Row Level Security (RLS) & Hak Akses
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bukti_laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tindak_lanjut ENABLE ROW LEVEL SECURITY;

-- Hapus constraint strict foreign key pada pelapor_id agar tidak memblokir submit laporan
ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS laporan_pelapor_id_fkey;

-- Hapus policy lama jika ada agar aman di-run berulang kali
DROP POLICY IF EXISTS "Allow all with anon key" ON public.admins;
DROP POLICY IF EXISTS "Allow all with anon key" ON public.siswa;
DROP POLICY IF EXISTS "Allow all with anon key" ON public.kelas;
DROP POLICY IF EXISTS "Allow all with anon key" ON public.laporan;
DROP POLICY IF EXISTS "Allow all with anon key" ON public.bukti_laporan;
DROP POLICY IF EXISTS "Allow all with anon key" ON public.tindak_lanjut;

-- Buat policy baru yang mengizinkan akses anon key
CREATE POLICY "Allow all with anon key" ON public.admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all with anon key" ON public.siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all with anon key" ON public.kelas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all with anon key" ON public.laporan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all with anon key" ON public.bukti_laporan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all with anon key" ON public.tindak_lanjut FOR ALL USING (true) WITH CHECK (true);

-- Berikan izin akses skema ke role anon & authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 10. Indeks untuk kecepatan pencarian
CREATE INDEX IF NOT EXISTS idx_laporan_kode ON public.laporan(kode_pelacak);
CREATE INDEX IF NOT EXISTS idx_laporan_status ON public.laporan(status);
CREATE INDEX IF NOT EXISTS idx_laporan_created ON public.laporan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tindak_lanjut_laporan ON public.tindak_lanjut(laporan_id);
CREATE INDEX IF NOT EXISTS idx_bukti_laporan ON public.bukti_laporan(laporan_id);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON public.siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admins(email);

-- 11. Data Awal — Admin Default
INSERT INTO public.admins (nama, email, password, nip_jabatan)
VALUES ('Admin Sekolah', 'admin@sekolah.id', 'admin', 'Administrator Sekolah')
ON CONFLICT (email) DO UPDATE SET password = 'admin';

-- 12. Data Awal — Siswa Demo
INSERT INTO public.siswa (nisn, nama, kelas, password)
VALUES ('000', 'Siswa Demo', 'X MIPA 1', '123456')
ON CONFLICT (nisn) DO UPDATE SET password = '123456';

-- 13. Data Awal — Kelas Default
INSERT INTO public.kelas (nama) VALUES
  ('X MIPA 1'), ('X MIPA 2'), ('X IPS 1'), ('X IPS 2'),
  ('XI MIPA 1'), ('XI MIPA 2'), ('XI IPS 1'), ('XI IPS 2'),
  ('XII MIPA 1'), ('XII MIPA 2'), ('XII IPS 1'), ('XII IPS 2')
ON CONFLICT (nama) DO NOTHING;

-- 14. Setup Storage Bucket untuk File Bukti Lampiran
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-laporan', 'bukti-laporan', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to bukti-laporan" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from bukti-laporan" ON storage.objects;

CREATE POLICY "Allow public uploads to bukti-laporan"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'bukti-laporan');

CREATE POLICY "Allow public reads from bukti-laporan"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bukti-laporan');

-- 15. Reload PostgREST Cache agar seluruh tabel langsung terbaca oleh API
NOTIFY pgrst, 'reload schema';

