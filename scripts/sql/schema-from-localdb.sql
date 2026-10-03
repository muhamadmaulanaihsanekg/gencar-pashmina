CREATE TABLE "absensi" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text NOT NULL,
	`generus_id` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')),
	`keterangan` text DEFAULT 'hadir', "lat" integer, "lng" integer, "accuracy" integer, "is_gps_valid" integer, "qr_wilayah_level" text,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "artikel" (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`konten` text NOT NULL,
	`ringkasan` text,
	`cover_image` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tipe` text DEFAULT 'artikel' NOT NULL,
	`author_id` text NOT NULL,
	`published_at` text,
	`rating_sum` integer DEFAULT 0,
	`rating_count` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "desa" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
CREATE TABLE `fcm_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
CREATE TABLE "form_panitia_dan_pengurus" (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text,
	`kegiatan_id` text,
	`nama` text NOT NULL,
	`jenis_kelamin` text,
	`tempat_lahir` text,
	`tanggal_lahir` text,
	`alamat` text,
	`no_telp` text,
	`suku` text,
	`foto` text,
	`mandiri_desa_id` integer,
	`mandiri_kelompok_id` integer,
	`dapukan` text,
	`nomor_unik` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mandiri_kelompok_id`) REFERENCES `mandiri_kelompok`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE "generus" (
	`id` text PRIMARY KEY NOT NULL,
	`nomor_unik` text NOT NULL,
	`nama` text NOT NULL,
	`nama_ortu` text,
	`tempat_lahir` text,
	`tanggal_lahir` text,
	`jenis_kelamin` text NOT NULL,
	`kategori_usia` text NOT NULL,
	`kategori` text DEFAULT 'Generus',
	`alamat` text,
	`no_telp` text,
	`no_telp_ortu` text,
	`pendidikan` text,
	`pekerjaan` text,
	`status_nikah` text DEFAULT 'Belum Menikah',
	`hobi` text,
	`makanan_minuman_favorit` text,
	`suku` text,
	`foto` text,
	`desa_id` integer,
	`kelompok_id` integer,
	`mandiri_desa_id` integer,
	`mandiri_kelompok_id` integer,
	`instagram` text,
	`is_generus` integer DEFAULT 0,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')), `kriteria_pasangan` text, "kategori_muda_mudi" text, "asal_daerah" text, "domisili_anak" text, "domisili_ortu" text, "is_domisili_ortu_sama" integer, "shift_pekerjaan" text, "status_ortu_jamaah" text, "anak_ke" integer, "jumlah_saudara" integer, "tinggi_badan" integer, "status_haid" text, "target_menikah" text,
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mandiri_kelompok_id`) REFERENCES `mandiri_kelompok`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE "id_card_builder_data" (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`daerah` text,
	`desa` text,
	`role` text,
	`dapukan` text,
	`foto` text,
	`nomor_unik` text NOT NULL,
	`jenis_kelamin` text,
	`kegiatan_id` text,
	`gradient` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE "kegiatan" (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`deskripsi` text,
	`tanggal` text NOT NULL,
	`jam` text,
	`lokasi` text,
	`desa_id` integer,
	`kelompok_id` integer,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')), "kategori_acara" text, "kategori_custom" text, "lat" integer, "lng" integer, "radius_m" integer, "gps_required" integer,
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "kelompok" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`desa_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri" (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL,
	`kegiatan_id` text,
	`nomor_urut` integer,
	`status_pdkt` text DEFAULT 'Aktif',
	`catatan` text,
	`last_session_token` text,
	`device_id` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')), status_peserta TEXT DEFAULT 'Utusan Daerah', dibayarkan_senilai INTEGER, bukti_pembayaran TEXT,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_absensi" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text NOT NULL,
	`generus_id` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')),
	`keterangan` text DEFAULT 'hadir', `alasan_pulang` text, `waktu_pulang` text,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "mandiri_antrean" (
	`id` text PRIMARY KEY NOT NULL,
	`generus_id` text NOT NULL,
	`status` text DEFAULT 'Menunggu',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_daerah" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
CREATE TABLE "mandiri_desa" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`mandiri_daerah_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`mandiri_daerah_id`) REFERENCES `mandiri_daerah`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_kegiatan" (
	`id` text PRIMARY KEY NOT NULL,
	`judul` text NOT NULL,
	`deskripsi` text,
	`tanggal` text NOT NULL,
	`lokasi` text,
	`kota` text NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`kelompok_id`) REFERENCES `mandiri_kelompok`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE `mandiri_kegiatan_daerah` (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text NOT NULL,
	`daerah_id` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`daerah_id`) REFERENCES `mandiri_daerah`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_kelompok" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`mandiri_desa_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_komentar" (
	`id` text PRIMARY KEY NOT NULL,
	`penerima_id` text NOT NULL,
	`pengirim_id` text,
	`pengirim_nama` text,
	`is_anonim` integer DEFAULT 0,
	`komentar` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`penerima_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pengirim_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE "mandiri_kuisioner" (
	`id` text PRIMARY KEY NOT NULL,
	`pemilihan_id` text,
	`pengisi_id` text NOT NULL,
	`nama_pnkb` text,
	`no_hp_pnkb` text,
	`tanggapan` text,
	`rekomendasi` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pemilihan_id`) REFERENCES `mandiri_pemilihan`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pengisi_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "mandiri_kunjungan" (
    id text PRIMARY KEY NOT NULL,
    generus_id text NOT NULL,
    pemilihan_id text,
    kegiatan_id text,
    created_at text DEFAULT (datetime('now')),
    FOREIGN KEY (generus_id) REFERENCES generus(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (pemilihan_id) REFERENCES mandiri_pemilihan(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (kegiatan_id) REFERENCES mandiri_kegiatan(id) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "mandiri_pemilihan" (
	`id` text PRIMARY KEY NOT NULL,
	`pengirim_id` text NOT NULL,
	`penerima_id` text NOT NULL,
	`kegiatan_id` text,
	`status` text DEFAULT 'Menunggu',
	`hasil_pengirim` text,
	`hasil_penerima` text,
	`created_at` text DEFAULT (datetime('now')), `status_tunggu` text DEFAULT 'antrean', "assigned_caller_id" text REFERENCES tim_gambuh(id) ON DELETE set null ON UPDATE no action, "assigned_caller2_id" text REFERENCES tim_gambuh(id) ON DELETE set null ON UPDATE no action, "assigned_guard_id" text REFERENCES tim_gambuh(id) ON DELETE set null ON UPDATE no action, `status_wa_pengirim` text, `status_wa_penerima` text,
	FOREIGN KEY (`pengirim_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`penerima_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "organisasi_pengurus" (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`dapukan` text NOT NULL,
	`foto` text,
	`urutan` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
CREATE TABLE "rab" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`item` text NOT NULL,
	`volume` integer NOT NULL,
	`satuan` text NOT NULL,
	`harga_satuan` integer NOT NULL,
	`total_harga` integer NOT NULL,
	`keterangan` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "rab_approval" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`status_pengurus` text DEFAULT 'pending',
	`status_admin` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`catatan_admin` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "rundown" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`waktu` text NOT NULL,
	`agenda` text NOT NULL,
	`pic` text,
	`keterangan` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "rundown_approval" (
	`id` text PRIMARY KEY NOT NULL,
	`kegiatan_id` text,
	`mandiri_kegiatan_id` text,
	`status_pengurus` text DEFAULT 'pending',
	`is_submitted` integer DEFAULT 0,
	`catatan_pengurus` text,
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`kegiatan_id`) REFERENCES `kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mandiri_kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "saran_masukan" (
	`id` text PRIMARY KEY NOT NULL,
	`untuk` text NOT NULL,
	`saran` text NOT NULL,
	`nama` text,
	`is_anonim` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now'))
, `user_id` text, `kepada` text);
CREATE TABLE "settings" (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (datetime('now'))
);
CREATE TABLE "tim_gambuh" (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`kegiatan_id` text,
	`daerah_id` integer,
	`desa_id` integer,
	`tipe` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')), "kelompok_id" integer REFERENCES mandiri_kelompok(id) ON DELETE cascade ON UPDATE no action, `no_telp` text, `umur` integer, foto text,
	FOREIGN KEY (`kegiatan_id`) REFERENCES `mandiri_kegiatan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`daerah_id`) REFERENCES `mandiri_daerah`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "users" (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_plain` text,
	`role` text DEFAULT 'pending' NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`mandiri_desa_id` integer,
	`mandiri_kelompok_id` integer,
	`generus_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mandiri_kelompok_id`) REFERENCES `mandiri_kelompok`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`generus_id`) REFERENCES `generus`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE "users_old" (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'generus' NOT NULL,
	`desa_id` integer,
	`kelompok_id` integer,
	`generus_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
CREATE TABLE "visitor_stats" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
CREATE INDEX `absensi_generus_id_idx` ON `absensi` (`generus_id`);
CREATE INDEX `absensi_kegiatan_id_idx` ON `absensi` (`kegiatan_id`);
CREATE INDEX `fcm_tokens_phone_idx` ON `fcm_tokens` (`phone`);
CREATE UNIQUE INDEX `fcm_tokens_token_unique` ON `fcm_tokens` (`token`);
CREATE INDEX `form_panitia_dan_pengurus_dapukan_idx` ON `form_panitia_dan_pengurus` (`dapukan`);
CREATE INDEX `form_panitia_dan_pengurus_generus_id_idx` ON `form_panitia_dan_pengurus` (`generus_id`);
CREATE INDEX `form_panitia_dan_pengurus_nama_idx` ON `form_panitia_dan_pengurus` (`nama`);
CREATE INDEX `generus_desa_id_idx` ON `generus` (`desa_id`);
CREATE INDEX `generus_is_generus_idx` ON `generus` (`is_generus`);
CREATE INDEX `generus_jenis_kelamin_idx` ON `generus` (`jenis_kelamin`);
CREATE INDEX `generus_kategori_usia_idx` ON `generus` (`kategori_usia`);
CREATE INDEX `generus_kelompok_id_idx` ON `generus` (`kelompok_id`);
CREATE INDEX `generus_mandiri_desa_id_idx` ON `generus` (`mandiri_desa_id`);
CREATE INDEX `generus_mandiri_kelompok_id_idx` ON `generus` (`mandiri_kelompok_id`);
CREATE INDEX `generus_nama_idx` ON `generus` (`nama`);
CREATE INDEX `generus_no_telp_idx` ON `generus` (`no_telp`);
CREATE UNIQUE INDEX `generus_nomor_unik_unique` ON `generus` (`nomor_unik`);
CREATE INDEX `generus_status_nikah_idx` ON `generus` (`status_nikah`);
CREATE INDEX `id_card_builder_kegiatan_id_idx` ON `id_card_builder_data` (`kegiatan_id`);
CREATE INDEX `id_card_builder_nomor_unik_idx` ON `id_card_builder_data` (`nomor_unik`);
CREATE INDEX `kegiatan_desa_id_idx` ON `kegiatan` (`desa_id`);
CREATE INDEX `kegiatan_kelompok_id_idx` ON `kegiatan` (`kelompok_id`);
CREATE INDEX `kegiatan_tanggal_idx` ON `kegiatan` (`tanggal`);
CREATE INDEX `mandiri_absensi_generus_id_idx` ON `mandiri_absensi` (`generus_id`);
CREATE INDEX `mandiri_absensi_kegiatan_id_idx` ON `mandiri_absensi` (`kegiatan_id`);
CREATE INDEX `mandiri_generus_id_idx` ON `mandiri` (`generus_id`);
CREATE INDEX `mandiri_kegiatan_daerah_keg_daer_idx` ON `mandiri_kegiatan_daerah` (`kegiatan_id`,`daerah_id`);
CREATE INDEX `mandiri_komentar_penerima_id_idx` ON `mandiri_komentar` (`penerima_id`);
CREATE INDEX `mandiri_komentar_pengirim_id_idx` ON `mandiri_komentar` (`pengirim_id`);
CREATE INDEX mandiri_kunjungan_generus_id_idx ON mandiri_kunjungan (generus_id);
CREATE INDEX `mandiri_pemilihan_penerima_id_idx` ON `mandiri_pemilihan` (`penerima_id`);
CREATE INDEX `mandiri_pemilihan_pengirim_id_idx` ON `mandiri_pemilihan` (`pengirim_id`);
CREATE INDEX `rab_approval_kegiatan_id_idx` ON `rab_approval` (`kegiatan_id`);
CREATE INDEX `rab_approval_mandiri_kegiatan_id_idx` ON `rab_approval` (`mandiri_kegiatan_id`);
CREATE INDEX `rab_kegiatan_id_idx` ON `rab` (`kegiatan_id`);
CREATE INDEX `rab_mandiri_kegiatan_id_idx` ON `rab` (`mandiri_kegiatan_id`);
CREATE INDEX `rundown_approval_kegiatan_id_idx` ON `rundown_approval` (`kegiatan_id`);
CREATE INDEX `rundown_approval_mandiri_kegiatan_id_idx` ON `rundown_approval` (`mandiri_kegiatan_id`);
CREATE INDEX `rundown_kegiatan_id_idx` ON `rundown` (`kegiatan_id`);
CREATE INDEX `rundown_mandiri_kegiatan_id_idx` ON `rundown` (`mandiri_kegiatan_id`);
CREATE INDEX `tim_gambuh_daerah_id_idx` ON `tim_gambuh` (`daerah_id`);
CREATE INDEX `tim_gambuh_desa_id_idx` ON `tim_gambuh` (`desa_id`);
CREATE INDEX `tim_gambuh_kegiatan_id_idx` ON `tim_gambuh` (`kegiatan_id`);
CREATE INDEX `users_desa_id_idx` ON `users` (`desa_id`);
CREATE INDEX `users_email_idx` ON `users` (`email`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE INDEX `users_generus_id_idx` ON `users` (`generus_id`);
CREATE INDEX `users_kelompok_id_idx` ON `users` (`kelompok_id`);
CREATE INDEX `users_mandiri_desa_id_idx` ON `users` (`mandiri_desa_id`);
CREATE INDEX `users_mandiri_kelompok_id_idx` ON `users` (`mandiri_kelompok_id`);
CREATE INDEX `users_name_idx` ON `users` (`name`);
CREATE INDEX `users_old_desa_id_idx` ON `users_old` (`desa_id`);
CREATE INDEX `users_old_email_idx` ON `users_old` (`email`);
CREATE UNIQUE INDEX `users_old_email_unique` ON `users_old` (`email`);
CREATE INDEX `users_old_generus_id_idx` ON `users_old` (`generus_id`);
CREATE INDEX `users_old_kelompok_id_idx` ON `users_old` (`kelompok_id`);
CREATE INDEX `users_old_name_idx` ON `users_old` (`name`);
CREATE INDEX `users_old_role_idx` ON `users_old` (`role`);
CREATE INDEX `users_role_idx` ON `users` (`role`);
CREATE UNIQUE INDEX `visitor_stats_country_code_unique` ON `visitor_stats` (`country_code`);