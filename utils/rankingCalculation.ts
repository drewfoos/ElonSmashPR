import prisma from "@/lib/prisma";
import { formatInTimeZone } from "@/utils/semesterUtils";

interface PlayerScore {
  totalScore: number;
  tournamentCount: number;
  gamerTag: string;
  playerId: string;
}

export async function calculateAndUpdateRankings(semesterId: string) {
  console.log(`Starting optimized ranking calculation for semester: ${semesterId}`);
  try {
    // Step 1: Get all Elon students for this semester (cached to reduce queries)
    const elonStudentStatuses = await prisma.semesterStatus.findMany({
      where: {
        semesterId: semesterId,
        isElonStudent: true,
      },
      select: {
        playerId: true
      }
    });
    
    const elonPlayerIds = new Set(elonStudentStatuses.map(status => status.playerId));
    const totalElonStudents = elonPlayerIds.size;
    
    // Update semester info
    await prisma.semester.update({
      where: { id: semesterId },
      data: { totalElonStudentsParticipated: totalElonStudents }
    });

    // Step 2: Load all tournaments with their participations in one query
    console.log("Loading tournament data...");
    const tournaments = await prisma.tournament.findMany({
      where: { semesterId: semesterId },
      include: {
        participations: {
          include: {
            player: {
              select: {
                id: true,
                gamerTag: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${tournaments.length} tournaments to process`);
    
    // Step 3: Pre-compute all updates first (keep everything in memory)
    console.log("Calculating tournament weights and participation scores...");
    const tournamentUpdates = [];
    const participationUpdates = [];
    const playerScores: Record<string, PlayerScore> = {};
    
    // Process all tournaments (calc only, no DB operations yet)
    for (const tournament of tournaments) {
      // Filter Elon participants using our cached set
      const elonParticipations = tournament.participations.filter(p => 
        elonPlayerIds.has(p.playerId)
      );
      
      // Calculate tournament weight
      const weight = elonParticipations.length / 
                   tournament.totalParticipants / 
                   totalElonStudents;
      
      // Store tournament update for later
      tournamentUpdates.push({
        id: tournament.id,
        weight,
        totalElonParticipants: elonParticipations.length
      });
      
      // Process participations
      for (const participation of elonParticipations) {
        const score = participation.placement * weight;
        
        // Store participation update
        participationUpdates.push({
          id: participation.id,
          score
        });
        
        // Track scores for semester totals
        if (!playerScores[participation.playerId]) {
          playerScores[participation.playerId] = {
            totalScore: 0,
            tournamentCount: 0,
            gamerTag: participation.player.gamerTag,
            playerId: participation.playerId
          };
        }
        
        playerScores[participation.playerId].totalScore += score;
        playerScores[participation.playerId].tournamentCount += 1;
      }
    }
    
    // Step 4: Batch update tournaments with small pauses between batches
    console.log("Updating tournament weights...");
    const BATCH_SIZE = 3; // Small batch size for free tier
    
    for (let i = 0; i < tournamentUpdates.length; i += BATCH_SIZE) {
      const batch = tournamentUpdates.slice(i, i + BATCH_SIZE);
      
      // Process batch sequentially to avoid overwhelming DB
      for (const update of batch) {
        await prisma.tournament.update({
          where: { id: update.id },
          data: {
            weight: update.weight,
            totalElonParticipants: update.totalElonParticipants
          }
        });
      }
      
      // Add a small delay between batches (MongoDB free tier friendly)
      if (i + BATCH_SIZE < tournamentUpdates.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Step 5: Batch update participations
    console.log("Updating participation scores...");
    
    for (let i = 0; i < participationUpdates.length; i += BATCH_SIZE) {
      const batch = participationUpdates.slice(i, i + BATCH_SIZE);
      
      // Process batch sequentially
      for (const update of batch) {
        await prisma.participation.update({
          where: { id: update.id },
          data: { score: update.score }
        });
      }
      
      // Add delay between batches
      if (i + BATCH_SIZE < participationUpdates.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Step 6: Handle semester scores
    console.log("Generating player rankings...");
    
    // Prepare semester score data
    const semesterScoreData = Object.entries(playerScores).map(([playerId, playerScore]) => ({
      playerId: playerId,
      semesterId: semesterId,
      totalScore: playerScore.totalScore,
      tournamentCount: playerScore.tournamentCount,
      averageScore: playerScore.totalScore / playerScore.tournamentCount
    }));
    
    // Delete existing semester scores for clean slate
    await prisma.semesterScore.deleteMany({
      where: { semesterId: semesterId }
    });
    
    // Create new semester scores in batches
    for (let i = 0; i < semesterScoreData.length; i += BATCH_SIZE) {
      const batch = semesterScoreData.slice(i, i + BATCH_SIZE);
      
      // Create scores sequentially
      for (const scoreData of batch) {
        await prisma.semesterScore.create({
          data: scoreData
        });
      }
      
      // Add delay between batches
      if (i + BATCH_SIZE < semesterScoreData.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Step 7: Return the updated rankings
    console.log("Ranking calculation complete!");
    
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
    console.error("Error in optimized calculateAndUpdateRankings:", error);
    throw new Error(
      `Failed to calculate rankings: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}