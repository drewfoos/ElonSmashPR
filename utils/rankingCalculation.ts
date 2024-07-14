import prisma from "@/lib/prisma";
import { formatInTimeZone } from "@/utils/semesterUtils";

export async function calculateAndUpdateRankings(semesterId: string) {
  console.log(`Starting ranking calculation for semester: ${semesterId}`);
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { semesterId: semesterId },
      include: {
        participations: {
          include: {
            player: {
              include: {
                semesterStatuses: {
                  where: { semesterId: semesterId },
                },
              },
            },
          },
        },
      },
    });

    const totalElonStudents = await prisma.semesterStatus.count({
      where: {
        semesterId: semesterId,
        isElonStudent: true,
      },
    });

    await prisma.semester.update({
      where: { id: semesterId },
      data: { totalElonStudentsParticipated: totalElonStudents },
    });

    const playerScores: Record<
      string,
      {
        totalScore: number;
        tournamentCount: number;
        gamerTag: string;
        playerId: string;
      }
    > = {};

    for (const tournament of tournaments) {
      const elonParticipants = tournament.participations.filter((p) =>
        p.player.semesterStatuses.some((ss) => ss.isElonStudent)
      );

      const weight =
        elonParticipants.length /
        tournament.totalParticipants /
        totalElonStudents;

      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          weight: weight,
          totalElonParticipants: elonParticipants.length,
        },
      });

      for (const participation of elonParticipants) {
        const score = participation.placement * weight;

        await prisma.participation.update({
          where: { id: participation.id },
          data: { score: score },
        });

        if (!playerScores[participation.player.startggPlayerId]) {
          playerScores[participation.player.startggPlayerId] = {
            totalScore: 0,
            tournamentCount: 0,
            gamerTag: participation.player.gamerTag,
            playerId: participation.player.id,
          };
        }
        playerScores[participation.player.startggPlayerId].totalScore += score;
        playerScores[participation.player.startggPlayerId].tournamentCount += 1;

        // console.log(
        //   `Processed participation - Player: ${
        //     participation.player.gamerTag
        //   }, Tournament: ${tournament.name}, Date: ${formatInTimeZone(
        //     tournament.startAt,
        //     "yyyy-MM-dd HH:mm:ss zzz"
        //   )}, Score: ${score.toFixed(2)}, Weight: ${weight.toFixed(4)}`
        // );
      }
    }

    // Delete existing semester scores
    await prisma.semesterScore.deleteMany({
      where: { semesterId: semesterId },
    });

    // Create new semester scores
    for (const [startggPlayerId, scores] of Object.entries(playerScores)) {
      const averageScore = scores.totalScore / scores.tournamentCount;
      await prisma.semesterScore.create({
        data: {
          playerId: scores.playerId,
          semesterId: semesterId,
          totalScore: scores.totalScore,
          tournamentCount: scores.tournamentCount,
          averageScore: averageScore,
        },
      });

      //   console.log(
      //     `Created score for player ${
      //       scores.gamerTag
      //     } (startggPlayerId: ${startggPlayerId}): Average Score: ${averageScore.toFixed(
      //       2
      //     )}, Tournament Count: ${scores.tournamentCount}`
      //   );
    }

    const updatedRankings = await prisma.semesterScore.findMany({
      where: {
        semesterId: semesterId,
      },
      orderBy: { averageScore: "asc" },
      include: { player: true },
    });

    console.log("Final Rankings:");
    updatedRankings.forEach((ranking, index) => {
      console.log(
        `Rank ${index + 1}: ${
          ranking.player.gamerTag
        } - Average Score: ${ranking.averageScore.toFixed(
          2
        )}, Tournament Count: ${ranking.tournamentCount}`
      );
    });

    return updatedRankings;
  } catch (error) {
    console.error("Error in calculateAndUpdateRankings:", error);
    throw new Error(
      `Failed to calculate rankings: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
