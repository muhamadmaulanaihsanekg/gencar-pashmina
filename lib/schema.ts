// Re-export canonical schema from shared/ for D1 migration.
// All new tables/columns (kategoriMudaMudi, domisiliAnak/Ortu, shiftPekerjaan JSON,
// pendidikan enum baru, kegiatan kategoriAcara+GPS, magicTokens, wilayahQr, 3 admin roles)
// live in shared/schema.ts. This file stays for backward-compat with existing server/api routes.
export * from "../shared/schema";
