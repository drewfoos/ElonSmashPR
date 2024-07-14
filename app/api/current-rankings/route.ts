import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSemester } from "@/utils/semesterUtils";

export async function GET() {
  try {
    const currentSemester = getCurrentSemester();
    const rankings = await prisma.semesterScore.findMany({
      where: {
        semester: {
          name: currentSemester.name,
        },
      },
      orderBy: {
        averageScore: "asc",
      },
      include: {
        player: true,
        semester: true,
      },
    });

    const formattedRankings = rankings.map((ranking) => ({
      playerId: ranking.playerId,
      playerName: ranking.player.gamerTag,
      startggPlayerId: ranking.player.startggPlayerId,
      averageScore: ranking.averageScore,
      tournamentCount: ranking.tournamentCount,
      semesterName: ranking.semester.name,
    }));

    return NextResponse.json(formattedRankings);
  } catch (error) {
    console.error("Error fetching current rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch current rankings" },
      { status: 500 }
    );
  }
}
