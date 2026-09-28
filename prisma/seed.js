const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi untuk membuat admin awal.");
  }
  if (password.length < 8 || password.includes("replace-with")) throw new Error("ADMIN_PASSWORD harus diganti dengan password unik minimal 8 karakter.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true },
    create: {
      name: process.env.ADMIN_NAME || "Administrator",
      email,
      school: "Pengelola aplikasi",
      passwordHash,
      role: "ADMIN"
    }
  });
  console.log(`Admin bootstrap siap: ${email}`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
