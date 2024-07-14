import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspectPlayers() {
  try {
    const players = await prisma.player.findMany({
      select: {
        id: true,
        startggId: true,
        name: true,
      },
    });

    console.log("Total players:", players.length);

    const problematicPlayers = players.filter(
      (player) => !player.id.match(/^[0-9a-fA-F]{24}$/)
    );

    console.log("Problematic players:", problematicPlayers.length);
    problematicPlayers.forEach((player) => {
      console.log(
        `ID: ${player.id}, startggId: ${player.startggId}, name: ${player.name}`
      );
    });
  } catch (error) {
    console.error("Error inspecting players:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectPlayers();
