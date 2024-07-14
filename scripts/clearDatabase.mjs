import { PrismaClient } from "@prisma/client";
import readline from "readline";

const prisma = new PrismaClient();

async function clearTable(model, modelName) {
  try {
    if (modelName === "Player") {
      // For Player table, delete records one by one
      const players = await model.findMany({ select: { id: true } });
      for (const player of players) {
        await model.delete({ where: { id: player.id } });
      }
    } else {
      await model.deleteMany({});
    }
    console.log(`Cleared ${modelName} table`);
  } catch (error) {
    console.error(`Error clearing ${modelName} table:`, error);
    if (error.meta && error.meta.message) {
      console.error(`Detailed error: ${error.meta.message}`);
    }
  }
}

async function clearDatabase() {
  try {
    // Clear all tables
    await clearTable(prisma.participation, "Participation");
    await clearTable(prisma.semesterScore, "SemesterScore");
    await clearTable(prisma.semesterStatus, "SemesterStatus");
    await clearTable(prisma.tournament, "Tournament");
    await clearTable(prisma.player, "Player");
    await clearTable(prisma.semester, "Semester");

    console.log("Database clearing process completed");
  } catch (error) {
    console.error("Error in clearDatabase function:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Are you sure you want to clear the database? (yes/no): ",
  (answer) => {
    if (answer.toLowerCase() === "yes") {
      clearDatabase().then(() => rl.close());
    } else {
      console.log("Database clearing aborted.");
      rl.close();
    }
  }
);
