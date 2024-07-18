import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { semesterId: string } }
) {
  try {
    const players = await prisma.player.findMany({
      include: {
        semesterStatuses: {
          where: { semesterId: params.semesterId },
        },
      },
    });

    const formattedPlayers = players.map((player) => ({
      id: player.id,
      startggPlayerId: player.startggPlayerId,
      gamerTag: player.gamerTag,
      isElonStudent: player.semesterStatuses[0]?.isElonStudent || false,
    }));

    return NextResponse.json(formattedPlayers);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
