const { spawn, spawnSync } = require("node:child_process");

const blockedPlaceholders = ["replace-with", "change-this-db-password"];

// Di dalam container, host database harus nama service Compose (default "db"),
// bukan localhost. Bangun DATABASE_URL dari POSTGRES_* agar tidak salah host
// dan password otomatis di-URL-encode.
const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;
if (POSTGRES_DB && POSTGRES_USER && POSTGRES_PASSWORD) {
  const host = process.env.DATABASE_HOST || "db";
  const port = process.env.DATABASE_PORT || "5432";
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@${host}:${port}/${encodeURIComponent(POSTGRES_DB)}?schema=public`;
  console.log(`[start] DATABASE_URL dibangun dari POSTGRES_* (host ${host}, database ${POSTGRES_DB}).`);
  if (blockedPlaceholders.some((value) => POSTGRES_PASSWORD.includes(value))) {
    console.error("POSTGRES_PASSWORD masih memakai nilai contoh. Ganti dengan password database yang kuat.");
    process.exit(1);
  }
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32 || blockedPlaceholders.some((value) => process.env.AUTH_SECRET.includes(value))) {
  console.error("AUTH_SECRET harus diganti dengan nilai acak minimal 32 karakter sebelum aplikasi dijalankan.");
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8 || blockedPlaceholders.some((value) => process.env.ADMIN_PASSWORD.includes(value))) {
  console.error("ADMIN_PASSWORD harus diganti dengan password unik minimal 8 karakter sebelum aplikasi dijalankan.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tidak diatur. Set DATABASE_URL atau POSTGRES_DB/POSTGRES_USER/POSTGRES_PASSWORD.");
  process.exit(1);
}
if (blockedPlaceholders.some((value) => process.env.DATABASE_URL.includes(value))) {
  console.error("Ganti password database contoh pada DATABASE_URL sebelum aplikasi dijalankan.");
  process.exit(1);
}
if (/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL) && process.env.DATABASE_HOST !== "localhost") {
  console.warn("[start] Peringatan: DATABASE_URL memakai localhost. Di dalam container gunakan host service (mis. 'db').");
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

run("./node_modules/.bin/prisma", ["migrate", "deploy"]);
run("node", ["prisma/seed.js"]);
delete process.env.ADMIN_PASSWORD;
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_NAME;
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", process.env.PORT || "3000"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
