// File: app/api/semester-rankings/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semesterId = searchParams.get("semesterId");

  if (!semesterId) {
    return NextResponse.json(
      { error: "Semester ID is required" },
      { status: 400 }
    );
  }

  try {
    const rankings = await prisma.semesterScore.findMany({
      where: {
        semesterId: semesterId,
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
    console.error("Error fetching semester rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch semester rankings" },
      { status: 500 }
    );
  }
}
