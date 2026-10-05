import { sql } from "drizzle-orm";
import { text, integer, sqliteTable, index, real } from "drizzle-orm/sqlite-core";

// ── Desa / Kelompok (tanpa tabel daerah — singleton Cengkareng implisit) ──
export const desa = sqliteTable("desa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const kelompok = sqliteTable("kelompok", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  desaId: integer("desa_id")
    .notNull()
    .references(() => desa.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Generus (muda-mudi) — delta: perantauan/pribumi, domisili terbalik, pendidikan enum, shift JSON ──
export const generus = sqliteTable("generus", {
  id: text("id").primaryKey(),
  nomorUnik: text("nomor_unik").notNull().unique(),
  nama: text("nama").notNull(),
  namaOrtu: text("nama_ortu"),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: text("tanggal_lahir"),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull(),
  kategoriUsia: text("kategori_usia", {
    enum: ["PAUD", "TK", "SD", "SMP", "SMA", "SMK", "Kuliah", "Bekerja", "Mandiri"],
  }).notNull(),
  kategori: text("kategori", { enum: ["Generus", "Usia Mandiri"] }).default("Generus"),
  // P0: muda/mudi perantauan vs pribumi
  kategoriMudaMudi: text("kategori_muda_mudi", { enum: ["perantauan", "pribumi"] }),
  asalDaerah: text("asal_daerah"), // wajib jika perantauan
  // P0: domisili terbalik — anak wajib, ortu kondisional
  domisiliAnak: text("domisili_anak"),
  domisiliOrtu: text("domisili_ortu"),
  isDomisiliOrtuSama: integer("is_domisili_ortu_sama").default(1),
  // pendidikan P0 enum — SD/SMP/SMA/Sedang menempuh perguruan tinggi/Sarjana
  pendidikan: text("pendidikan"),
  pekerjaan: text("pekerjaan"),
  statusNikah: text("status_nikah"), // Lajang / Duda / Janda
  // P1: shift fleksibel JSON {mode, masuk, pulang, shifts[]}
  shiftPekerjaan: text("shift_pekerjaan"), // JSON string nullable
  statusOrtuJamaah: text("status_ortu_jamaah", { enum: ["sudah", "belum"] }),
  alamat: text("alamat"),
  noTelp: text("no_telp"),
  noTelpOrtu: text("no_telp_ortu"),
  hobi: text("hobi"),
  makananMinumanFavorit: text("makanan_minuman_favorit"),
  suku: text("suku"),
  anakKe: integer("anak_ke"),
  jumlahSaudara: integer("jumlah_saudara"),
  jumlahAnak: integer("jumlah_anak"),
  tinggiBadan: integer("tinggi_badan"),
  foto: text("foto"),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  mandiriDesaId: integer("mandiri_desa_id").references(() => mandiriDesa.id, { onDelete: "set null" }),
  mandiriKelompokId: integer("mandiri_kelompok_id").references(() => mandiriKelompok.id, { onDelete: "set null" }),
  statusHaid: text("status_haid"),
  instagram: text("instagram"),
  kriteriaPasangan: text("kriteria_pasangan"),
  targetMenikah: text("target_menikah"),
  isGenerus: integer("is_generus").default(0),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  namaIdx: index("generus_nama_idx").on(table.nama),
  desaIdIdx: index("generus_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("generus_kelompok_id_idx").on(table.kelompokId),
  mandiriDesaIdIdx: index("generus_mandiri_desa_id_idx").on(table.mandiriDesaId),
  mandiriKelompokIdIdx: index("generus_mandiri_kelompok_id_idx").on(table.mandiriKelompokId),
  kategoriUsiaIdx: index("generus_kategori_usia_idx").on(table.kategoriUsia),
  jenisKelaminIdx: index("generus_jenis_kelamin_idx").on(table.jenisKelamin),
  statusNikahIdx: index("generus_status_nikah_idx").on(table.statusNikah),
  isGenerusIdx: index("generus_is_generus_idx").on(table.isGenerus),
  noTelpIdx: index("generus_no_telp_idx").on(table.noTelp),
  kategoriMudaMudiIdx: index("generus_kategori_muda_mudi_idx").on(table.kategoriMudaMudi),
}));

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordPlain: text("password_plain"),
  role: text("role", { enum: ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "generus", "peserta", "creator", "pending", "tim_pnkb", "admin_romantic_room", "admin_keuangan", "admin_kegiatan", "admin_pdkt", "usia_mandiri", "tim_pnkb_gambuh", "admin_daerah", "admin_desa", "admin_kelompok"] })
    .notNull()
    .default("pending"),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "set null" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "set null" }),
  mandiriDesaId: integer("mandiri_desa_id").references(() => mandiriDesa.id, { onDelete: "set null" }),
  mandiriKelompokId: integer("mandiri_kelompok_id").references(() => mandiriKelompok.id, { onDelete: "set null" }),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  nameIdx: index("users_name_idx").on(table.name),
  emailIdx: index("users_email_idx").on(table.email),
  desaIdIdx: index("users_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("users_kelompok_id_idx").on(table.kelompokId),
  mandiriDesaIdIdx: index("users_mandiri_desa_id_idx").on(table.mandiriDesaId),
  mandiriKelompokIdIdx: index("users_mandiri_kelompok_id_idx").on(table.mandiriKelompokId),
  roleIdx: index("users_role_idx").on(table.role),
  generusIdIdx: index("users_generus_id_idx").on(table.generusId),
}));

export const usersOld = sqliteTable("users_old", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("generus"),
  desaId: integer("desa_id"),
  kelompokId: integer("kelompok_id"),
  generusId: text("generus_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  nameIdx: index("users_old_name_idx").on(table.name),
  emailIdx: index("users_old_email_idx").on(table.email),
  desaIdIdx: index("users_old_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("users_old_kelompok_id_idx").on(table.kelompokId),
  roleIdx: index("users_old_role_idx").on(table.role),
  generusIdIdx: index("users_old_generus_id_idx").on(table.generusId),
}));

export type UserOld = typeof usersOld.$inferSelect;
export type NewUserOld = typeof usersOld.$inferInsert;

// ── Kegiatan — delta: kategoriAcara enum + kategoriCustom + judul template + GPS ──
export const kegiatan = sqliteTable("kegiatan", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  kategoriAcara: text("kategori_acara", { enum: ["sambung_rutin", "keakraban", "pemantapan", "lainnya"] }).default("sambung_rutin"),
  kategoriCustom: text("kategori_custom"),
  tanggal: text("tanggal").notNull(),
  jam: text("jam"),
  lokasi: text("lokasi"),
  lat: real("lat"),
  lng: real("lng"),
  radiusM: integer("radius_m").default(100),
  gpsRequired: integer("gps_required").default(0),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  desaIdIdx: index("kegiatan_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("kegiatan_kelompok_id_idx").on(table.kelompokId),
  tanggalIdx: index("kegiatan_tanggal_idx").on(table.tanggal),
  kategoriAcaraIdx: index("kegiatan_kategori_acara_idx").on(table.kategoriAcara),
}));

// ── Absensi — delta: lat/lng/accuracy/isGpsValid + qrWilayahLevel ──
export const absensi = sqliteTable("absensi", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id")
    .notNull()
    .references(() => kegiatan.id),
  generusId: text("generus_id")
    .notNull()
    .references(() => generus.id),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
  keterangan: text("keterangan", { enum: ["hadir", "izin", "alpha"] }).default("hadir"),
  lat: real("lat"),
  lng: real("lng"),
  accuracy: real("accuracy"),
  isGpsValid: integer("is_gps_valid"),
  qrWilayahLevel: text("qr_wilayah_level", { enum: ["kelompok", "desa", "daerah"] }),
}, (table) => ({
  kegiatanIdIdx: index("absensi_kegiatan_id_idx").on(table.kegiatanId),
  generusIdIdx: index("absensi_generus_id_idx").on(table.generusId),
}));

// ── Magic tokens — onboarding 30m sekali pakai ──
export const magicTokens = sqliteTable("magic_tokens", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  tokenHashIdx: index("magic_tokens_token_hash_idx").on(table.tokenHash),
  emailIdx: index("magic_tokens_email_idx").on(table.email),
  generusIdIdx: index("magic_tokens_generus_id_idx").on(table.generusId),
}));

// ── Wilayah QR statis — 1 per kelompok/desa/daerah ──
export const wilayahQr = sqliteTable("wilayah_qr", {
  id: text("id").primaryKey(),
  level: text("level", { enum: ["kelompok", "desa", "daerah"] }).notNull(),
  desaId: integer("desa_id").references(() => desa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),
  qrToken: text("qr_token").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  qrTokenIdx: index("wilayah_qr_token_idx").on(table.qrToken),
  levelIdx: index("wilayah_qr_level_idx").on(table.level),
  desaIdIdx: index("wilayah_qr_desa_id_idx").on(table.desaId),
  kelompokIdIdx: index("wilayah_qr_kelompok_id_idx").on(table.kelompokId),
}));

// ── Rest (keep as-is for D1 compatibility) ──
export const artikel = sqliteTable("artikel", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  konten: text("konten").notNull(),
  ringkasan: text("ringkasan"),
  coverImage: text("cover_image"),
  status: text("status", { enum: ["pending", "published", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  tipe: text("tipe", { enum: ["berita", "artikel"] })
    .notNull()
    .default("artikel"),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  publishedAt: text("published_at"),
  ratingSum: integer("rating_sum").default(0),
  ratingCount: integer("rating_count").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const mandiri = sqliteTable("mandiri", {
  id: text("id").primaryKey(),
  generusId: text("generus_id")
    .notNull()
    .references(() => generus.id, { onDelete: "cascade" }),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  nomorUrut: integer("nomor_urut"),
  statusMandiri: text("status_pdkt", { enum: ["Aktif", "Selesai", "Batal"] }).default("Aktif"),
  statusPeserta: text("status_peserta", { enum: ["Utusan Daerah", "Person"] }).default("Utusan Daerah"),
  dibayarkanSenilai: integer("dibayarkan_senilai"),
  buktiPembayaran: text("bukti_pembayaran"),
  catatan: text("catatan"),
  lastSessionToken: text("last_session_token"),
  deviceId: text("device_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  generusIdIdx: index("mandiri_generus_id_idx").on(table.generusId),
}));

export const mandiriDaerah = sqliteTable("mandiri_daerah", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const mandiriDesa = sqliteTable("mandiri_desa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  mandiriDaerahId: integer("mandiri_daerah_id")
    .references(() => mandiriDaerah.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const mandiriKelompok = sqliteTable("mandiri_kelompok", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  mandiriDesaId: integer("mandiri_desa_id")
    .notNull()
    .references(() => mandiriDesa.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const mandiriKegiatan = sqliteTable("mandiri_kegiatan", {
  id: text("id").primaryKey(),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  tanggal: text("tanggal").notNull(),
  lokasi: text("lokasi"),
  kota: text("kota").notNull(),
  desaId: integer("desa_id").references(() => mandiriDesa.id, { onDelete: "set null" }),
  kelompokId: integer("kelompok_id").references(() => mandiriKelompok.id, { onDelete: "set null" }),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const mandiriAbsensi = sqliteTable("mandiri_absensi", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id")
    .notNull()
    .references(() => mandiriKegiatan.id),
  generusId: text("generus_id")
    .notNull()
    .references(() => generus.id),
  timestamp: text("timestamp").default(sql`(datetime('now'))`),
  keterangan: text("keterangan", { enum: ["hadir", "izin", "alpha", "pulang"] }).default("hadir"),
  alasanPulang: text("alasan_pulang"),
  waktuPulang: text("waktu_pulang"),
}, (table) => ({
  kegiatanIdIdx: index("mandiri_absensi_kegiatan_id_idx").on(table.kegiatanId),
  generusIdIdx: index("mandiri_absensi_generus_id_idx").on(table.generusId),
}));

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const visitorStats = sqliteTable("visitor_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryCode: text("country_code").notNull().unique(),
  countryName: text("country_name").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const mandiriAntrean = sqliteTable("mandiri_antrean", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["Menunggu", "Diproses", "Selesai", "Batal"] }).default("Menunggu"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const mandiriPemilihan = sqliteTable("mandiri_pemilihan", {
  id: text("id").primaryKey(),
  pengirimId: text("pengirim_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  penerimaId: text("penerima_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id),
  status: text("status", { enum: ["Menunggu", "Diterima", "Ditolak", "Selesai"] }).default("Menunggu"),
  hasilPengirim: text("hasil_pengirim"),
  hasilPenerima: text("hasil_penerima"),
  statusWaPengirim: text("status_wa_pengirim"),
  statusWaPenerima: text("status_wa_penerima"),
  statusTunggu: text("status_tunggu").default("antrean"),
  assignedCallerId: text("assigned_caller_id").references(() => timGambuh.id, { onDelete: "set null" }),
  assignedCaller2Id: text("assigned_caller2_id").references(() => timGambuh.id, { onDelete: "set null" }),
  assignedGuardId: text("assigned_guard_id").references(() => timGambuh.id, { onDelete: "set null" }),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  pengirimIdIdx: index("mandiri_pemilihan_pengirim_id_idx").on(table.pengirimId),
  penerimaIdIdx: index("mandiri_pemilihan_penerima_id_idx").on(table.penerimaId),
}));

export const mandiriKuisioner = sqliteTable("mandiri_kuisioner", {
  id: text("id").primaryKey(),
  pemilihanId: text("pemilihan_id").references(() => mandiriPemilihan.id, { onDelete: "set null" }),
  pengisiId: text("pengisi_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  namaPnkb: text("nama_pnkb"),
  noHpPnkb: text("no_hp_pnkb"),
  tanggapan: text("tanggapan"),
  rekomendasi: text("rekomendasi"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const mandiriKunjungan = sqliteTable("mandiri_kunjungan", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  pemilihanId: text("pemilihan_id").references(() => mandiriPemilihan.id, { onDelete: "set null" }),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  generusIdIdx: index("mandiri_kunjungan_generus_id_idx").on(table.generusId),
}));

export const mandiriKomentar = sqliteTable("mandiri_komentar", {
  id: text("id").primaryKey(),
  penerimaId: text("penerima_id").notNull().references(() => generus.id, { onDelete: "cascade" }),
  pengirimId: text("pengirim_id").references(() => generus.id, { onDelete: "set null" }),
  pengirimNama: text("pengirim_nama"),
  isAnonim: integer("is_anonim").default(0),
  komentar: text("komentar").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  penerimaIdIdx: index("mandiri_komentar_penerima_id_idx").on(table.penerimaId),
  pengirimIdIdx: index("mandiri_komentar_pengirim_id_idx").on(table.pengirimId),
}));

export const idCardBuilderData = sqliteTable("id_card_builder_data", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  daerah: text("daerah"),
  desa: text("desa"),
  role: text("role"),
  dapukan: text("dapukan"),
  foto: text("foto"),
  nomorUnik: text("nomor_unik").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "set null" }),
  gradient: text("gradient"),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  nomorUnikIdx: index("id_card_builder_nomor_unik_idx").on(table.nomorUnik),
  kegiatanIdIdx: index("id_card_builder_kegiatan_id_idx").on(table.kegiatanId),
}));

export const formPanitiaDanPengurus = sqliteTable("form_panitia_dan_pengurus", {
  id: text("id").primaryKey(),
  generusId: text("generus_id").references(() => generus.id, { onDelete: "cascade" }),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: text("tanggal_lahir"),
  alamat: text("alamat"),
  noTelp: text("no_telp"),
  suku: text("suku"),
  foto: text("foto"),
  mandiriDesaId: integer("mandiri_desa_id").references(() => mandiriDesa.id, { onDelete: "set null" }),
  mandiriKelompokId: integer("mandiri_kelompok_id").references(() => mandiriKelompok.id, { onDelete: "set null" }),
  dapukan: text("dapukan"),
  nomorUnik: text("nomor_unik"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  generusIdIdx: index("form_panitia_dan_pengurus_generus_id_idx").on(table.generusId),
  namaIdx: index("form_panitia_dan_pengurus_nama_idx").on(table.nama),
  dapukanIdx: index("form_panitia_dan_pengurus_dapukan_idx").on(table.dapukan),
}));

export const rab = sqliteTable("rab", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  mandiriKegiatanId: text("mandiri_kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  volume: integer("volume").notNull(),
  satuan: text("satuan").notNull(),
  hargaSatuan: integer("harga_satuan").notNull(),
  totalHarga: integer("total_harga").notNull(),
  keterangan: text("keterangan"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rab_kegiatan_id_idx").on(table.kegiatanId),
  mandiriKegiatanIdIdx: index("rab_mandiri_kegiatan_id_idx").on(table.mandiriKegiatanId),
}));

export const rabApproval = sqliteTable("rab_approval", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  mandiriKegiatanId: text("mandiri_kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  statusPengurus: text("status_pengurus", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  statusAdmin: text("status_admin", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  isSubmitted: integer("is_submitted").default(0),
  catatanPengurus: text("catatan_pengurus"),
  catatanAdmin: text("catatan_admin"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rab_approval_kegiatan_id_idx").on(table.kegiatanId),
  mandiriKegiatanIdIdx: index("rab_approval_mandiri_kegiatan_id_idx").on(table.mandiriKegiatanId),
}));

export const rundown = sqliteTable("rundown", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  mandiriKegiatanId: text("mandiri_kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  waktu: text("waktu").notNull(),
  agenda: text("agenda").notNull(),
  pic: text("pic"),
  keterangan: text("keterangan"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rundown_kegiatan_id_idx").on(table.kegiatanId),
  mandiriKegiatanIdIdx: index("rundown_mandiri_kegiatan_id_idx").on(table.mandiriKegiatanId),
}));

export const rundownApproval = sqliteTable("rundown_approval", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
  mandiriKegiatanId: text("mandiri_kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  statusPengurus: text("status_pengurus", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  isSubmitted: integer("is_submitted").default(0),
  catatanPengurus: text("catatan_pengurus"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("rundown_approval_kegiatan_id_idx").on(table.kegiatanId),
  mandiriKegiatanIdIdx: index("rundown_approval_mandiri_kegiatan_id_idx").on(table.mandiriKegiatanId),
}));

export type Desa = typeof desa.$inferSelect;
export type Kelompok = typeof kelompok.$inferSelect;
export type User = typeof users.$inferSelect;
export type Generus = typeof generus.$inferSelect;
export type Kegiatan = typeof kegiatan.$inferSelect;
export type MandiriKegiatan = typeof mandiriKegiatan.$inferSelect;
export type MandiriDaerah = typeof mandiriDaerah.$inferSelect;
export type MandiriDesa = typeof mandiriDesa.$inferSelect;
export type MandiriKelompok = typeof mandiriKelompok.$inferSelect;
export type Absensi = typeof absensi.$inferSelect;
export type MandiriAbsensi = typeof mandiriAbsensi.$inferSelect;
export type Artikel = typeof artikel.$inferSelect;
export type Mandiri = typeof mandiri.$inferSelect;
export type VisitorStats = typeof visitorStats.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type MandiriAntrean = typeof mandiriAntrean.$inferSelect;
export type MandiriPemilihan = typeof mandiriPemilihan.$inferSelect;
export type MandiriKuisioner = typeof mandiriKuisioner.$inferSelect;
export type Rab = typeof rab.$inferSelect;
export type RabApproval = typeof rabApproval.$inferSelect;
export type Rundown = typeof rundown.$inferSelect;
export type RundownApproval = typeof rundownApproval.$inferSelect;
export type MandiriKunjungan = typeof mandiriKunjungan.$inferSelect;
export type IdCardBuilderData = typeof idCardBuilderData.$inferSelect;
export type FormPanitiaDanPengurus = typeof formPanitiaDanPengurus.$inferSelect;
export type MandiriKomentar = typeof mandiriKomentar.$inferSelect;
export type MagicToken = typeof magicTokens.$inferSelect;
export type WilayahQr = typeof wilayahQr.$inferSelect;

export const organisasiPengurus = sqliteTable("organisasi_pengurus", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  dapukan: text("dapukan").notNull(),
  foto: text("foto"),
  urutan: integer("urutan").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const saranMasukan = sqliteTable("saran_masukan", {
  id: text("id").primaryKey(),
  untuk: text("untuk").notNull(),
  kepada: text("kepada"),
  saran: text("saran").notNull(),
  nama: text("nama"), userId: text("user_id"),
  isAnonim: integer("is_anonim").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export type SaranMasukan = typeof saranMasukan.$inferSelect;

export type NewDesa = typeof desa.$inferInsert;
export type NewKelompok = typeof kelompok.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewGenerus = typeof generus.$inferInsert;
export type NewKegiatan = typeof kegiatan.$inferInsert;
export type NewMandiriKegiatan = typeof mandiriKegiatan.$inferInsert;
export type NewMandiriDaerah = typeof mandiriDaerah.$inferInsert;
export type NewMandiriDesa = typeof mandiriDesa.$inferInsert;
export type NewMandiriKelompok = typeof mandiriKelompok.$inferInsert;
export type NewAbsensi = typeof absensi.$inferInsert;
export type NewMandiriAbsensi = typeof mandiriAbsensi.$inferInsert;
export type NewArtikel = typeof artikel.$inferInsert;
export type NewMandiri = typeof mandiri.$inferInsert;
export type NewVisitorStats = typeof visitorStats.$inferInsert;
export type NewSettings = typeof settings.$inferInsert;
export type NewMandiriAntrean = typeof mandiriAntrean.$inferInsert;
export type NewMandiriPemilihan = typeof mandiriPemilihan.$inferInsert;
export type NewMandiriKuisioner = typeof mandiriKuisioner.$inferInsert;
export type NewRab = typeof rab.$inferInsert;
export type NewRabApproval = typeof rabApproval.$inferInsert;
export type NewRundown = typeof rundown.$inferInsert;
export type NewRundownApproval = typeof rundownApproval.$inferInsert;
export type NewMandiriKunjungan = typeof mandiriKunjungan.$inferInsert;
export type NewIdCardBuilderData = typeof idCardBuilderData.$inferInsert;
export type NewFormPanitiaDanPengurus = typeof formPanitiaDanPengurus.$inferInsert;
export type NewMandiriKomentar = typeof mandiriKomentar.$inferInsert;
export type NewOrganisasiPengurus = typeof organisasiPengurus.$inferInsert;
export type NewSaranMasukan = typeof saranMasukan.$inferInsert;
export type NewMagicToken = typeof magicTokens.$inferInsert;
export type NewWilayahQr = typeof wilayahQr.$inferInsert;

export const timGambuh = sqliteTable("tim_gambuh", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  umur: integer("umur"),
  kegiatanId: text("kegiatan_id").references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  daerahId: integer("daerah_id").references(() => mandiriDaerah.id, { onDelete: "cascade" }),
  desaId: integer("desa_id").references(() => mandiriDesa.id, { onDelete: "cascade" }),
  kelompokId: integer("kelompok_id").references(() => mandiriKelompok.id, { onDelete: "cascade" }),
  tipe: text("tipe", { enum: ["PNKB", "Ibu Gambuh", "Tim Penunggu", "Penunggu PNKB", "Penunggu Ibu Gambuh"] }).notNull(),
  noTelp: text("no_telp"),
  foto: text("foto"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanIdIdx: index("tim_gambuh_kegiatan_id_idx").on(table.kegiatanId),
  daerahIdIdx: index("tim_gambuh_daerah_id_idx").on(table.daerahId),
  desaIdIdx: index("tim_gambuh_desa_id_idx").on(table.desaId),
}));

export type TimGambuh = typeof timGambuh.$inferSelect;
export type NewTimGambuh = typeof timGambuh.$inferInsert;

export const mandiriKegiatanDaerah = sqliteTable("mandiri_kegiatan_daerah", {
  id: text("id").primaryKey(),
  kegiatanId: text("kegiatan_id")
    .notNull()
    .references(() => mandiriKegiatan.id, { onDelete: "cascade" }),
  daerahId: integer("daerah_id")
    .notNull()
    .references(() => mandiriDaerah.id, { onDelete: "cascade" }),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => ({
  kegiatanDaerahIdx: index("mandiri_kegiatan_daerah_keg_daer_idx").on(table.kegiatanId, table.daerahId),
}));

export type MandiriKegiatanDaerah = typeof mandiriKegiatanDaerah.$inferSelect;
export type NewMandiriKegiatanDaerah = typeof mandiriKegiatanDaerah.$inferInsert;
