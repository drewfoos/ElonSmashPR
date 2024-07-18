import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAndUpdateRankings } from "@/utils/rankingCalculation";
import { convertToEST, getSemesterForDate } from "@/utils/semesterUtils";
import { sendSSEUpdate } from "@/app/api/sse/route";

interface Participant {
  startggPlayerId: string | null;
  gamerTag: string;
  placement: number;
  isElonStudent: boolean;
}

interface TournamentData {
  id: number;
  name: string;
  startAt: string;
  participants: Participant[];
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
    let semester = await prisma.semester.findUnique({
      where: { name: tournamentData.semesterName },
    });

    if (!semester) {
      const calculatedSemester = getSemesterForDate(estStartDate);
      if (!calculatedSemester) {
        throw new Error("Could not determine semester for the given date");
      }
      semester = await prisma.semester.create({
        data: {
          name: calculatedSemester.name,
          startDate: calculatedSemester.startDate,
          endDate: calculatedSemester.endDate,
        },
      });
    }

    const elonParticipants = tournamentData.participants.filter(
      (p) => p.isElonStudent
    );
    const totalElonParticipants = elonParticipants.length;
    const totalParticipants = tournamentData.participants.length;

    // Update or create players and their semester statuses
    for (const participant of tournamentData.participants) {
      let player;

      if (participant.startggPlayerId) {
        // If startggPlayerId is provided, use it to find or create the player
        player = await prisma.player.upsert({
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
      } else {
        // If no startggPlayerId, create a new player or use an existing one with the same gamerTag
        player = await prisma.player.findFirst({
          where: { gamerTag: participant.gamerTag },
        });

        if (!player) {
          player = await prisma.player.create({
            data: {
              gamerTag: participant.gamerTag,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

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
    }

    // Upsert the tournament
    const tournament = await prisma.tournament.create({
      data: {
        startggId: tournamentData.id.toString(),
        name: tournamentData.name,
        startAt: estStartDate,
        semesterId: semester.id,
        totalParticipants: totalParticipants,
        totalElonParticipants: totalElonParticipants,
        weight: 0, // This will be calculated in calculateAndUpdateRankings
      },
    });

    // Create participations for all participants
    for (const participant of tournamentData.participants) {
      const player = await prisma.player.findFirst({
        where: participant.startggPlayerId
          ? { startggPlayerId: participant.startggPlayerId }
          : { gamerTag: participant.gamerTag },
      });

      if (!player) {
        console.error(
          `Player not found for ${
            participant.startggPlayerId ? "startggPlayerId" : "gamerTag"
          }: ${participant.startggPlayerId || participant.gamerTag}`
        );
        continue;
      }

      await prisma.participation.create({
        data: {
          playerId: player.id,
          tournamentId: tournament.id,
          placement: participant.placement,
          score: 0, // This will be calculated in calculateAndUpdateRankings
        },
      });
    }

    console.log("All participants processed. Calculating rankings...");

    const updatedRankings = await calculateAndUpdateRankings(semester.id);

    // Emit SSE event
    sendSSEUpdate(
      JSON.stringify({
        type: "tournamentConfirmed",
        semesterId: semester.id,
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
