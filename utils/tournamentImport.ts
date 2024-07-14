import { gql } from "graphql-request";
import { graphQLClient } from "@/lib/graphql-client";
import { getSemesterForDate } from "@/utils/semesterUtils";

// Define types for the GraphQL response
interface TournamentQueryResponse {
  tournament: {
    id: string;
    name: string;
    startAt: string;
    events: Array<{
      id: string;
      name: string;
      standings: {
        nodes: Array<{
          placement: number;
          entrant: {
            participants: Array<{
              player: {
                id: string;
                gamerTag: string;
              };
            }>;
          };
        }>;
      };
    }>;
  };
}

const TOURNAMENT_QUERY = gql`
  query TournamentQuery($slug: String!) {
    tournament(slug: $slug) {
      id
      name
      startAt
      events {
        id
        name
        standings(query: { page: 1, perPage: 200 }) {
          nodes {
            placement
            entrant {
              participants {
                player {
                  id
                  gamerTag
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function importTournament(slug: string) {
  try {
    // Extract the slug if a full URL is provided
    const tournamentSlug = slug.split("/").pop() || slug;

    console.log(`Attempting to fetch tournament with slug: ${tournamentSlug}`);
    const tournamentData = await graphQLClient.request<TournamentQueryResponse>(
      TOURNAMENT_QUERY,
      { slug: tournamentSlug }
    );

    // console.log(
    //   "Tournament data fetched successfully:",
    //   JSON.stringify(tournamentData, null, 2)
    // );

    if (!tournamentData.tournament) {
      throw new Error("Tournament not found");
    }

    const tournament = tournamentData.tournament;
    const event = tournament.events[0]; // Assuming we're interested in the first event

    if (!event) {
      throw new Error("No events found for this tournament");
    }

    //console.log(`Processing ${event.standings.nodes.length} participants`);
    const participants = event.standings.nodes.map((node) => {
      const participant = {
        startggPlayerId: String(node.entrant.participants[0].player.id), // Convert to string
        gamerTag: node.entrant.participants[0].player.gamerTag,
        placement: node.placement,
        isElonStudent: false,
      };
      //console.log(`Processed participant: ${JSON.stringify(participant)}`);
      return participant;
    });

    //console.log(`Processed ${participants.length} participants`);

    // Convert startAt from Unix timestamp to Date
    const startDate = new Date(parseInt(tournament.startAt) * 1000);

    // Determine semester name
    const semester = getSemesterForDate(startDate);
    const semesterName = semester ? semester.name : "Unknown Semester";

    const result = {
      id: parseInt(tournament.id, 10),
      name: tournament.name,
      startAt: startDate.toISOString(), // Convert to ISO string for easier handling
      participants,
      semesterName: semesterName,
    };

    //console.log("Final result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error: unknown) {
    console.error("Error importing tournament:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to import tournament: ${error.message}`);
    }
    throw new Error("An unknown error occurred while importing the tournament");
  }
}
