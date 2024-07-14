// File: app/api/tournaments/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAndUpdateRankings } from "@/utils/rankingCalculation";
import { sendSSEUpdate } from "@/app/api/sse/route";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (prisma) => {
      // Find the tournament to get its semesterId
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { semesterId: true },
      });

      if (!tournament) {
        throw new Error("Tournament not found");
      }

      // Delete all participations associated with this tournament
      await prisma.participation.deleteMany({
        where: { tournamentId: tournamentId },
      });

      // Delete the tournament
      await prisma.tournament.delete({
        where: { id: tournamentId },
      });

      return tournament.semesterId;
    });

    // Recalculate rankings for the semester
    const updatedRankings = await calculateAndUpdateRankings(result);

    // Emit SSE event
    sendSSEUpdate(
      JSON.stringify({
        type: "tournamentDeleted",
        semesterId: result,
        tournamentId: params.id,
        rankings: updatedRankings,
      })
    );

    return NextResponse.json({
      message: "Tournament and associated participations deleted successfully",
      semesterId: result,
      updatedRankings: updatedRankings,
    });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tournament",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
