import { NextResponse } from "next/server";
import { importTournament } from "@/utils/tournamentImport";
import { getSemesterForDate } from "@/utils/semesterUtils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let tournamentData;

    if (body.isManualImport) {
      // Handle manual import
      const { name, date, participants } = body;
      const startDate = new Date(date);
      const semester = getSemesterForDate(startDate);
      const semesterName = semester ? semester.name : "Unknown Semester";

      tournamentData = {
        id: Date.now(), // Generate a unique ID for manual tournaments
        name,
        startAt: startDate.toISOString(),
        participants: participants.map((p: any) => ({
          startggPlayerId: p.playerId || null,
          gamerTag: p.gamerTag,
          placement: p.placement,
          isElonStudent: p.isElonStudent,
        })),
        semesterName,
      };
    } else {
      // Handle Start.gg import
      const { slug } = body;
      tournamentData = await importTournament(slug);
    }

    // At this point, tournamentData should have the same structure for both manual and Start.gg imports

    return NextResponse.json(tournamentData);
  } catch (error) {
    console.error("Error importing tournament:", error);
    return NextResponse.json(
      {
        error: "Failed to import tournament",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
