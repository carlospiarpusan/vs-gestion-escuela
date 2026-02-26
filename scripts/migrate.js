/**
 * Sistema de migraciones para Supabase
 * Uso: npm run migrate
 *
 * Requiere DATABASE_URL en .env.local:
 * DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

async function migrate() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Falta DATABASE_URL en .env.local");
    console.error("   Agrégala así:");
    console.error("   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log("✅ Conectado a la base de datos\n");

  // Crear tabla de control de migraciones si no existe
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migraciones (
      nombre TEXT PRIMARY KEY,
      aplicada_en TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Leer archivos de migración ordenados
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const archivos = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Obtener migraciones ya aplicadas
  const { rows: aplicadas } = await client.query("SELECT nombre FROM _migraciones");
  const aplicadasSet = new Set(aplicadas.map((r) => r.nombre));

  let nuevas = 0;
  for (const archivo of archivos) {
    if (aplicadasSet.has(archivo)) {
      console.log(`⏭  ${archivo} (ya aplicada)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, archivo), "utf-8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migraciones (nombre) VALUES ($1)", [archivo]);
      await client.query("COMMIT");
      console.log(`✅ ${archivo}`);
      nuevas++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ Error en ${archivo}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();

  if (nuevas === 0) {
    console.log("\n✨ Todo está actualizado, no hay migraciones pendientes.");
  } else {
    console.log(`\n✨ ${nuevas} migración(es) aplicada(s) correctamente.`);
  }
}

migrate().catch((err) => {
  console.error("Error inesperado:", err.message);
  process.exit(1);
});
