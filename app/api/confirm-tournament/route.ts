import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAndUpdateRankings } from "@/utils/rankingCalculation";
import {
  convertToEST,
  formatInTimeZone,
  getSemesterForDate,
} from "@/utils/semesterUtils";
import { sendSSEUpdate } from "@/app/api/sse/route";

interface Participant {
  startggPlayerId: string;
  gamerTag: string;
  placement: number;
  isElonStudent: boolean;
}

interface TournamentData {
  id: number;
  name: string;
  startAt: string;
  participants: Participant[];
  semesterId?: string;
  semesterName: string;
}

export async function POST(request: Request) {
  console.log("Starting tournament confirmation process");
  try {
    const body = await request.json();
    const { tournamentData }: { tournamentData: TournamentData } = body;

    console.log(
      `Confirming tournament: ${tournamentData.name} (ID: ${tournamentData.id})`
    );
    console.log(
      `Number of participants: ${tournamentData.participants.length}`
    );

    const estStartDate = convertToEST(new Date(tournamentData.startAt));
    let semester;

    // First, try to find the semester by name
    if (tournamentData.semesterName) {
      semester = await prisma.semester.findUnique({
        where: { name: tournamentData.semesterName },
      });
    }

    // If not found, calculate the semester based on the date
    if (!semester) {
      const calculatedSemester = getSemesterForDate(estStartDate);
      if (!calculatedSemester) {
        throw new Error("Could not determine semester for the given date");
      }
      semester = await prisma.semester.upsert({
        where: { name: calculatedSemester.name },
        update: {},
        create: {
          name: calculatedSemester.name,
          startDate: calculatedSemester.startDate,
          endDate: calculatedSemester.endDate,
        },
      });
    }

    //console.log(`Semester: ${semester.name} (ID: ${semester.id})`);

    const elonParticipants = tournamentData.participants.filter(
      (p) => p.isElonStudent
    );
    const totalElonParticipants = elonParticipants.length;
    const totalParticipants = tournamentData.participants.length;

    // Update or create players and their semester statuses
    for (const participant of tournamentData.participants) {
      const player = await prisma.player.upsert({
        where: { startggPlayerId: participant.startggPlayerId },
        update: {
          gamerTag: participant.gamerTag,
          updatedAt: new Date(),
        },
        create: {
          startggPlayerId: participant.startggPlayerId,
          gamerTag: participant.gamerTag,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.semesterStatus.upsert({
        where: {
          playerId_semesterId: {
            playerId: player.id,
            semesterId: semester.id,
          },
        },
        update: {
          isElonStudent: participant.isElonStudent,
          updatedAt: new Date(),
        },
        create: {
          playerId: player.id,
          semesterId: semester.id,
          isElonStudent: participant.isElonStudent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      //   console.log(
      //     `Updated status for player ${player.gamerTag} (startggPlayerId: ${player.startggPlayerId}): Elon Student: ${participant.isElonStudent}`
      //   );
    }

    // Upsert the tournament
    const tournament = await prisma.tournament.upsert({
      where: { startggId: tournamentData.id.toString() },
      update: {
        name: tournamentData.name,
        startAt: estStartDate,
        semesterId: semester.id,
        totalParticipants: totalParticipants,
        totalElonParticipants: totalElonParticipants,
      },
      create: {
        startggId: tournamentData.id.toString(),
        name: tournamentData.name,
        startAt: estStartDate,
        semesterId: semester.id,
        totalParticipants: totalParticipants,
        totalElonParticipants: totalElonParticipants,
        weight: 0, // This will be calculated in calculateAndUpdateRankings
      },
    });

    // console.log(
    //   `Tournament upserted: ${tournament.name} (ID: ${
    //     tournament.id
    //   }), Date: ${formatInTimeZone(
    //     tournament.startAt,
    //     "yyyy-MM-dd HH:mm:ss zzz"
    //   )}`
    // );

    // Create or update participations for all participants
    for (const participant of tournamentData.participants) {
      const player = await prisma.player.findUnique({
        where: { startggPlayerId: participant.startggPlayerId },
      });

      if (!player) {
        console.error(
          `Player not found for startggPlayerId: ${participant.startggPlayerId}`
        );
        continue;
      }

      await prisma.participation.upsert({
        where: {
          playerId_tournamentId: {
            playerId: player.id,
            tournamentId: tournament.id,
          },
        },
        update: {
          placement: participant.placement,
        },
        create: {
          playerId: player.id,
          tournamentId: tournament.id,
          placement: participant.placement,
          score: 0, // This will be calculated in calculateAndUpdateRankings
        },
      });

      //   console.log(
      //     `Participation upserted for ${player.gamerTag}: Placement: ${participant.placement}`
      //   );
    }

    console.log("All participants processed. Calculating rankings...");

    const updatedRankings = await calculateAndUpdateRankings(semester.id);

    // Emit SSE event
    sendSSEUpdate(
      JSON.stringify({
        type: "tournamentConfirmed",
        semesterId: semester.id, // Changed from dbSemester.id to semester.id
        tournament: tournament,
        rankings: updatedRankings,
      })
    );

    console.log("Rankings calculated successfully");

    return NextResponse.json({
      message: "Tournament confirmed and rankings updated successfully",
      rankings: updatedRankings,
    });
  } catch (error) {
    console.error("Error confirming tournament:", error);
    return NextResponse.json(
      {
        error: "Failed to confirm tournament",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
