import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAndUpdateRankings } from "@/utils/rankingCalculation";

export async function POST(request: Request) {
  const { fromPlayerId, toPlayerId, semesterId } = await request.json();

  if (!fromPlayerId || !toPlayerId || !semesterId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (prisma) => {
      // Update participations
      await prisma.participation.updateMany({
        where: {
          playerId: fromPlayerId,
          tournament: {
            semesterId: semesterId,
          },
        },
        data: {
          playerId: toPlayerId,
        },
      });

      // Update semesterStatus
      await prisma.semesterStatus.deleteMany({
        where: {
          playerId: fromPlayerId,
          semesterId: semesterId,
        },
      });

      // Merge SemesterScores
      const fromScores = await prisma.semesterScore.findMany({
        where: { playerId: fromPlayerId },
      });

      for (const fromScore of fromScores) {
        const toScore = await prisma.semesterScore.findUnique({
          where: {
            playerId_semesterId: {
              playerId: toPlayerId,
              semesterId: fromScore.semesterId,
            },
          },
        });

        if (toScore) {
          // If toPlayer has a score for this semester, merge the scores
          await prisma.semesterScore.update({
            where: { id: toScore.id },
            data: {
              totalScore: toScore.totalScore + fromScore.totalScore,
              tournamentCount:
                toScore.tournamentCount + fromScore.tournamentCount,
              averageScore:
                (toScore.totalScore + fromScore.totalScore) /
                (toScore.tournamentCount + fromScore.tournamentCount),
            },
          });
        } else {
          // If toPlayer doesn't have a score for this semester, create a new score
          await prisma.semesterScore.create({
            data: {
              playerId: toPlayerId,
              semesterId: fromScore.semesterId,
              totalScore: fromScore.totalScore,
              tournamentCount: fromScore.tournamentCount,
              averageScore: fromScore.averageScore,
            },
          });
        }

        // Delete the fromPlayer's score
        await prisma.semesterScore.delete({
          where: { id: fromScore.id },
        });
      }

      // Check if the 'from' player has any remaining participations or semester scores
      const remainingParticipations = await prisma.participation.count({
        where: {
          playerId: fromPlayerId,
        },
      });

      const remainingSemesterScores = await prisma.semesterScore.count({
        where: {
          playerId: fromPlayerId,
        },
      });

      // If there are no remaining participations or semester scores, delete the 'from' player
      if (remainingParticipations === 0 && remainingSemesterScores === 0) {
        await prisma.player.delete({
          where: {
            id: fromPlayerId,
          },
        });
      }
    });

    const updatedRankings = await calculateAndUpdateRankings(semesterId);

    return NextResponse.json({
      message: "Players merged successfully",
      updatedRankings: updatedRankings,
    });
  } catch (error) {
    console.error("Error merging players:", error);
    return NextResponse.json(
      { error: "Failed to merge players" },
      { status: 500 }
    );
  }
}
