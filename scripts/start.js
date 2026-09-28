const { spawn, spawnSync } = require("node:child_process");

const blockedPlaceholders = ["replace-with", "change-this-db-password"];
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32 || blockedPlaceholders.some((value) => process.env.AUTH_SECRET.includes(value))) {
  console.error("AUTH_SECRET harus diganti dengan nilai acak minimal 32 karakter sebelum aplikasi dijalankan.");
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8 || blockedPlaceholders.some((value) => process.env.ADMIN_PASSWORD.includes(value))) {
  console.error("ADMIN_PASSWORD harus diganti dengan password unik minimal 8 karakter sebelum aplikasi dijalankan.");
  process.exit(1);
}
if (blockedPlaceholders.some((value) => (process.env.DATABASE_URL || "").includes(value))) {
  console.error("Ganti password database contoh pada DATABASE_URL sebelum aplikasi dijalankan.");
  process.exit(1);
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
