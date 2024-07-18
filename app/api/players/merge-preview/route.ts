import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromPlayerId = searchParams.get("fromPlayerId");
  const toPlayerId = searchParams.get("toPlayerId");
  const semesterId = searchParams.get("semesterId");

  if (!fromPlayerId || !toPlayerId || !semesterId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const affectedTournaments = await prisma.tournament.findMany({
      where: {
        semesterId: semesterId,
        participations: {
          some: {
            playerId: fromPlayerId,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(affectedTournaments);
  } catch (error) {
    console.error("Error fetching affected tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch affected tournaments" },
      { status: 500 }
    );
  }
}
