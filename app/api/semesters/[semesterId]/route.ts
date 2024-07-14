// File: app/api/rankings/[semesterId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { semesterId: string } }
) {
  try {
    const rankings = await prisma.semesterScore.findMany({
      where: {
        semesterId: params.semesterId,
      },
      orderBy: {
        averageScore: "asc",
      },
      include: {
        player: true,
      },
    });

    const formattedRankings = rankings.map((ranking) => ({
      playerId: ranking.playerId,
      playerName: ranking.player.gamerTag,
      averageScore: ranking.averageScore,
      tournamentCount: ranking.tournamentCount,
    }));

    return NextResponse.json(formattedRankings);
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
