const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const DIFFICULTIES = ["mudah", "sedang", "sulit", "campuran"];

async function seedAdmin() {
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

async function seedQuestions() {
  const existing = await prisma.question.count();
  if (existing > 0) {
    console.log(`Bank soal sudah berisi ${existing} soal; seed soal dilewati.`);
    return;
  }
  const file = path.join(__dirname, "seed-data", "questions.json");
  if (!fs.existsSync(file)) {
    console.log("Berkas seed soal tidak ditemukan; dilewati.");
    return;
  }
  const questions = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(questions) || questions.length === 0) {
    console.log("Seed soal kosong; dilewati.");
    return;
  }
  const data = questions.map((question) => ({
    category: question.category,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation ?? null,
    sourceUrl: question.sourceUrl,
    sourceTitle: question.sourceTitle ?? null,
    difficulty: DIFFICULTIES.includes(question.difficulty) ? question.difficulty : "sedang",
    hideSource: Boolean(question.hideSource),
    isActive: question.isActive !== false,
    generatedByAI: Boolean(question.generatedByAI)
  }));
  const result = await prisma.question.createMany({ data });
  console.log(`Seed soal: ${result.count} soal dimasukkan ke bank soal.`);
}

async function main() {
  await seedAdmin();
  await seedQuestions();
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
