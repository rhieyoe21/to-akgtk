// One-off maintenance: strip leading "A.", "B)", "C:", "D -" prefixes from
// stored answer options. Run with: node --env-file=.env scripts/clean-option-prefixes.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PREFIX = /^\s*[A-Da-d]\s*[.)\]:-]\s*/;

function strip(value) {
  if (typeof value !== "string") return value;
  const cleaned = value.replace(PREFIX, "").trim();
  return cleaned || value;
}

async function main() {
  const questions = await prisma.question.findMany({ select: { id: true, options: true } });
  let questionChanges = 0;
  for (const question of questions) {
    const options = Array.isArray(question.options) ? question.options : [];
    const normalized = options.map(strip);
    if (JSON.stringify(normalized) !== JSON.stringify(options)) {
      await prisma.question.update({ where: { id: question.id }, data: { options: normalized } });
      questionChanges += 1;
    }
  }

  const items = await prisma.attemptQuestion.findMany({ select: { id: true, optionsSnapshot: true } });
  let snapshotChanges = 0;
  for (const item of items) {
    const options = Array.isArray(item.optionsSnapshot) ? item.optionsSnapshot : [];
    const normalized = options.map(strip);
    if (JSON.stringify(normalized) !== JSON.stringify(options)) {
      await prisma.attemptQuestion.update({ where: { id: item.id }, data: { optionsSnapshot: normalized } });
      snapshotChanges += 1;
    }
  }

  console.log(`Selesai. Soal diperbarui: ${questionChanges}/${questions.length}. Snapshot diperbarui: ${snapshotChanges}/${items.length}.`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
