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

    // Convert date and get semester
    const estStartDate = convertToEST(new Date(tournamentData.startAt));
    
    // Find or create the semester - just once at the beginning
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

    // Count Elon participants for tournament metadata
    const elonParticipants = tournamentData.participants.filter(
      (p) => p.isElonStudent
    );
    const totalElonParticipants = elonParticipants.length;
    const totalParticipants = tournamentData.participants.length;

    // Create lookup data structures to reduce database queries
    const playerLookup = new Map<string, { id: string; gamerTag: string }>();
    
    // Process players and semester statuses in batches
    console.log("Processing players and semester statuses...");
    const BATCH_SIZE = 10;
    
    // Split into batches to avoid overwhelming MongoDB
    for (let i = 0; i < tournamentData.participants.length; i += BATCH_SIZE) {
      const participantBatch = tournamentData.participants.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(async (tx) => {
        for (const participant of participantBatch) {
          // Use our lookup map to avoid duplicate processing
          const lookupKey = participant.startggPlayerId || participant.gamerTag;
          
          if (!playerLookup.has(lookupKey)) {
            let player;
            
            if (participant.startggPlayerId) {
              // If startggPlayerId is provided, use it to find or create the player
              player = await tx.player.upsert({
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
              // If no startggPlayerId, find by gamerTag or create new
              player = await tx.player.findFirst({
                where: { gamerTag: participant.gamerTag },
              });

              if (!player) {
                player = await tx.player.create({
                  data: {
                    gamerTag: participant.gamerTag,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
              }
            }
            
            // Store in our lookup for future reference
            playerLookup.set(lookupKey, { 
              id: player.id, 
              gamerTag: player.gamerTag 
            });
            
            // Create/update semester status
            await tx.semesterStatus.upsert({
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
        }
      });
      
      // Add a small delay between batches for MongoDB free tier
      if (i + BATCH_SIZE < tournamentData.participants.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Create the tournament
    console.log("Creating tournament record...");
    const tournament = await prisma.tournament.create({
      data: {
        startggId: tournamentData.id.toString(),
        name: tournamentData.name,
        startAt: estStartDate,
        semesterId: semester.id,
        totalParticipants: totalParticipants,
        totalElonParticipants: totalElonParticipants,
        weight: 0, // Will be calculated later
      },
    });

    // Prepare all participation data first
    console.log("Creating participation records...");
    const participationData = [];
    
    for (const participant of tournamentData.participants) {
      const lookupKey = participant.startggPlayerId || participant.gamerTag;
      const player = playerLookup.get(lookupKey);
      
      if (!player) {
        console.error(
          `Player not found for ${
            participant.startggPlayerId ? "startggPlayerId" : "gamerTag"
          }: ${participant.startggPlayerId || participant.gamerTag}`
        );
        continue;
      }
      
      participationData.push({
        playerId: player.id,
        tournamentId: tournament.id,
        placement: participant.placement,
        score: 0, // Will be calculated later
      });
    }
    
    // Create participations in batches
    for (let i = 0; i < participationData.length; i += BATCH_SIZE) {
      const batch = participationData.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(async (tx) => {
        for (const data of batch) {
          await tx.participation.create({
            data: data
          });
        }
      });
      
      // Add a small delay between batches
      if (i + BATCH_SIZE < participationData.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log("All participants processed. Calculating rankings...");

    // Send initial status update via SSE
    sendSSEUpdate(
      JSON.stringify({
        type: "rankingProgress",
        semesterId: semester.id,
        message: "Starting ranking calculation...",
        percentage: 0
      })
    );

    // Calculate rankings
    const updatedRankings = await calculateAndUpdateRankings(semester.id);

    // Send final update
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