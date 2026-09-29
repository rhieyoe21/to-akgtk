// Export the current question bank to prisma/seed-data/questions.json so it can
// be used as initial seed data. Run: node --env-file=.env scripts/export-questions.js
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      category: true,
      prompt: true,
      options: true,
      correctIndex: true,
      explanation: true,
      sourceUrl: true,
      sourceTitle: true,
      difficulty: true,
      hideSource: true,
      isActive: true,
      generatedByAI: true
    }
  });
  const dir = path.join(__dirname, "..", "prisma", "seed-data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "questions.json");
  fs.writeFileSync(file, JSON.stringify(questions, null, 2) + "\n");
  console.log(`Diekspor ${questions.length} soal ke ${path.relative(process.cwd(), file)}`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
