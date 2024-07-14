// File: app/api/import-tournament/route.ts
import { NextResponse } from "next/server";
import { importTournament } from "@/utils/tournamentImport";
import { getSemesterForDate } from "@/utils/semesterUtils";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { isManualImport, ...data } = body;

    if (isManualImport) {
      return handleManualImport(data);
    } else {
      return handleAutoImport(data.slug);
    }
  } catch (error) {
    console.error("Error importing tournament:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to import tournament", details: errorMessage },
      { status: 500 }
    );
  }
}

async function handleAutoImport(slug: string) {
  if (!slug) {
    return NextResponse.json(
      { error: "Tournament slug is required" },
      { status: 400 }
    );
  }

  const tournamentData = await importTournament(slug);
  return NextResponse.json(tournamentData);
}

async function handleManualImport(data: any) {
  const { name, date, participants } = data;

  // Convert date string to Date object
  const tournamentDate = new Date(date);

  // Determine semester
  const semester = getSemesterForDate(tournamentDate);
  if (!semester) {
    return NextResponse.json(
      { error: "Unable to determine semester for the given date" },
      { status: 400 }
    );
  }

  const processedData = {
    id: `manual-${uuidv4()}`,
    name,
    startAt: tournamentDate.toISOString(),
    participants: participants.map((p: any) => ({
      startggPlayerId: `manual-${uuidv4()}`,
      gamerTag: p.gamerTag,
      placement: p.placement,
      isElonStudent: p.isElonStudent,
    })),
    semesterName: semester.name,
  };

  return NextResponse.json(processedData);
}
