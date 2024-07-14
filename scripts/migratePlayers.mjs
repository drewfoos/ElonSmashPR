import { PrismaClient } from "@prisma/client";
import { ObjectId } from "mongodb";

const prisma = new PrismaClient();

async function migratePlayers() {
  try {
    const players = await prisma.player.findMany({
      select: {
        id: true,
        startggId: true,
        name: true,
      },
    });

    for (const player of players) {
      if (!player.id.match(/^[0-9a-fA-F]{24}$/)) {
        const newId = new ObjectId().toString();
        await prisma.player.update({
          where: { id: player.id },
          data: { id: newId },
        });
        console.log(
          `Updated player: ${player.name}, old id: ${player.id}, new id: ${newId}`
        );
      }
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error migrating players:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migratePlayers();
