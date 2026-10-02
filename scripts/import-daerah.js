const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

async function importDaerah() {
  const sourceDbPath = 'C:/Users/user/Downloads/jb2id (1).db';
  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`File sumber tidak ditemukan: ${sourceDbPath}`);
  }

  console.log(`Membaca database sumber: ${sourceDbPath}`);
  const client = createClient({ url: `file:${sourceDbPath}` });

  // 1. Fetch tables
  const mandiriDaerahRows = (await client.execute('SELECT * FROM mandiri_daerah ORDER BY id ASC')).rows;
  const mandiriDesaRows = (await client.execute('SELECT * FROM mandiri_desa ORDER BY id ASC')).rows;
  const mandiriKelompokRows = (await client.execute('SELECT * FROM mandiri_kelompok ORDER BY id ASC')).rows;
  const desaRows = (await client.execute('SELECT * FROM desa ORDER BY id ASC')).rows;
  const kelompokRows = (await client.execute('SELECT * FROM kelompok ORDER BY id ASC')).rows;
  
  let mandiriKegiatanDaerahRows = [];
  try {
    mandiriKegiatanDaerahRows = (await client.execute('SELECT * FROM mandiri_kegiatan_daerah ORDER BY created_at ASC')).rows;
  } catch (e) {
    console.log('Catatan: mandiri_kegiatan_daerah dilewati jika tidak ada');
  }

  console.log(`Ditemukan data:`);
  console.log(`- mandiri_daerah: ${mandiriDaerahRows.length} baris`);
  console.log(`- mandiri_desa: ${mandiriDesaRows.length} baris`);
  console.log(`- mandiri_kelompok: ${mandiriKelompokRows.length} baris`);
  console.log(`- desa: ${desaRows.length} baris`);
  console.log(`- kelompok: ${kelompokRows.length} baris`);
  console.log(`- mandiri_kegiatan_daerah: ${mandiriKegiatanDaerahRows.length} baris`);

  // Helper escape
  function esc(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  const sqlLines = [];
  sqlLines.push('-- D1 / SQLite Seed: Data Daerah, Desa, dan Kelompok');
  sqlLines.push('PRAGMA foreign_keys = OFF;');
  sqlLines.push('');
  sqlLines.push('DROP TABLE IF EXISTS `mandiri_kelompok`;');
  sqlLines.push('DROP TABLE IF EXISTS `mandiri_desa`;');
  sqlLines.push('');

  // Tables DDL
  sqlLines.push('CREATE TABLE IF NOT EXISTS `mandiri_daerah` (');
  sqlLines.push('  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,');
  sqlLines.push('  `nama` text NOT NULL,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now'))");
  sqlLines.push(');');
  sqlLines.push('');

  sqlLines.push('CREATE TABLE IF NOT EXISTS `mandiri_desa` (');
  sqlLines.push('  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,');
  sqlLines.push('  `nama` text NOT NULL,');
  sqlLines.push('  `mandiri_daerah_id` integer,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now')),");
  sqlLines.push('  FOREIGN KEY (`mandiri_daerah_id`) REFERENCES `mandiri_daerah`(`id`) ON UPDATE no action ON DELETE cascade');
  sqlLines.push(');');
  sqlLines.push('');

  sqlLines.push('CREATE TABLE IF NOT EXISTS `mandiri_kelompok` (');
  sqlLines.push('  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,');
  sqlLines.push('  `nama` text NOT NULL,');
  sqlLines.push('  `mandiri_desa_id` integer NOT NULL,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now')),");
  sqlLines.push('  FOREIGN KEY (`mandiri_desa_id`) REFERENCES `mandiri_desa`(`id`) ON UPDATE no action ON DELETE cascade');
  sqlLines.push(');');
  sqlLines.push('');

  sqlLines.push('CREATE TABLE IF NOT EXISTS `desa` (');
  sqlLines.push('  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,');
  sqlLines.push('  `nama` text NOT NULL,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now'))");
  sqlLines.push(');');
  sqlLines.push('');

  sqlLines.push('CREATE TABLE IF NOT EXISTS `kelompok` (');
  sqlLines.push('  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,');
  sqlLines.push('  `nama` text NOT NULL,');
  sqlLines.push('  `desa_id` integer NOT NULL,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now')),");
  sqlLines.push('  FOREIGN KEY (`desa_id`) REFERENCES `desa`(`id`) ON UPDATE no action ON DELETE cascade');
  sqlLines.push(');');
  sqlLines.push('');

  sqlLines.push('CREATE TABLE IF NOT EXISTS `mandiri_kegiatan_daerah` (');
  sqlLines.push('  `id` text PRIMARY KEY NOT NULL,');
  sqlLines.push('  `kegiatan_id` text NOT NULL,');
  sqlLines.push('  `daerah_id` integer NOT NULL,');
  sqlLines.push('  `is_active` integer DEFAULT 1,');
  sqlLines.push("  `created_at` text DEFAULT (datetime('now')),");
  sqlLines.push('  FOREIGN KEY (`daerah_id`) REFERENCES `mandiri_daerah`(`id`) ON UPDATE no action ON DELETE cascade');
  sqlLines.push(');');
  sqlLines.push('');

  // Insert mandiri_daerah
  for (const r of mandiriDaerahRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`mandiri_daerah\` (\`id\`, \`nama\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.nama)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  // Insert mandiri_desa
  for (const r of mandiriDesaRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`mandiri_desa\` (\`id\`, \`nama\`, \`mandiri_daerah_id\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.nama)}, ${esc(r.mandiri_daerah_id)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  // Insert mandiri_kelompok
  for (const r of mandiriKelompokRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`mandiri_kelompok\` (\`id\`, \`nama\`, \`mandiri_desa_id\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.nama)}, ${esc(r.mandiri_desa_id)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  // Insert desa
  for (const r of desaRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`desa\` (\`id\`, \`nama\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.nama)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  // Insert kelompok
  for (const r of kelompokRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`kelompok\` (\`id\`, \`nama\`, \`desa_id\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.nama)}, ${esc(r.desa_id)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  // Insert mandiri_kegiatan_daerah
  for (const r of mandiriKegiatanDaerahRows) {
    sqlLines.push(`INSERT OR REPLACE INTO \`mandiri_kegiatan_daerah\` (\`id\`, \`kegiatan_id\`, \`daerah_id\`, \`is_active\`, \`created_at\`) VALUES (${esc(r.id)}, ${esc(r.kegiatan_id)}, ${esc(r.daerah_id)}, ${esc(r.is_active)}, ${esc(r.created_at)});`);
  }
  sqlLines.push('');

  sqlLines.push('PRAGMA foreign_keys = ON;');

  const outputSqlPath = path.resolve('drizzle/seed_wilayah.sql');
  fs.writeFileSync(outputSqlPath, sqlLines.join('\n'), 'utf8');
  console.log(`File SQL seed berhasil disimpan di: ${outputSqlPath}`);
  console.log(`Total baris statement: ${sqlLines.length}`);
}

importDaerah().catch((err) => {
  console.error('Error saat import daerah:', err);
  process.exit(1);
});
