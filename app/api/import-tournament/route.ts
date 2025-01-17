import { NextResponse } from "next/server";
import { importTournament } from "@/utils/tournamentImport";
import { getSemesterForDate } from "@/utils/semesterUtils";

export async function POST(request: Request) {
  console.log("API route handler started");
  try {
    const body = await request.json();
    console.log("Received request body:", body);
    
    let tournamentData;
    if (body.isManualImport) {
      console.log("Processing manual import");
      const { name, date, participants } = body;
      const startDate = new Date(date);
      const semester = getSemesterForDate(startDate);
      const semesterName = semester ? semester.name : "Unknown Semester";
      tournamentData = {
        id: Date.now(),
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
      console.log("Manual import processed successfully");
    } else {
      console.log("Processing Start.gg import with slug:", body.slug);
      const { slug } = body;
      console.log("API Key present:", !!process.env.STARTGG_API_KEY);
      tournamentData = await importTournament(slug);
      console.log("Start.gg import completed");
    }

    console.log("Tournament data processed successfully:", !!tournamentData);
    return NextResponse.json(tournamentData);
  } catch (error) {
    console.error("Detailed error in API route:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    return NextResponse.json(
      {
        error: "Failed to import tournament",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
