import { gql } from "graphql-request";
import { graphQLClient } from "@/lib/graphql-client";
import { getSemesterForDate } from "@/utils/semesterUtils";

interface TournamentQueryResponse {
  tournament: {
    id: string;
    name: string;
    startAt: string;
    events: Array<{
      id: string;
      name: string;
      phases: Array<{
        id: string;
        name: string;
      }>;
      standings: {
        pageInfo: {
          total: number;
          totalPages: number;
        };
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
  query TournamentQuery($slug: String!, $page: Int!) {
    tournament(slug: $slug) {
      id
      name
      startAt
      events {
        id
        name
        phases {
          id
          name
        }
        standings(query: { page: $page, perPage: 500, sortBy: "standing" }) {
          pageInfo {
            total
            totalPages
          }
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
    // Extract the tournament slug from the URL properly
    let tournamentSlug = slug;
    if (slug.includes("start.gg")) {
      const parts = slug.split("/tournament/");
      if (parts[1]) {
        tournamentSlug = parts[1].split("/")[0];
      }
    }

    console.log("Original URL:", slug);
    console.log("Extracted tournament slug:", tournamentSlug);

    // First query to get tournament info and total pages
    const initialData = await graphQLClient.request<TournamentQueryResponse>(
      TOURNAMENT_QUERY,
      { slug: tournamentSlug, page: 1 }
    );

    if (!initialData.tournament) {
      throw new Error("Tournament not found");
    }

    const tournament = initialData.tournament;

    // Log all available events first
    console.log(
      "Available events:",
      tournament.events.map((e) => ({
        name: e.name,
        id: e.id,
        phasesCount: e.phases?.length || 0,
      }))
    );

    let event;
    // If there's only one event, use it
    if (tournament.events.length === 1) {
      event = tournament.events[0];
      console.log("Only one event found, using:", event.name);
    } else {
      // Otherwise, find the matching event
      event = tournament.events.find((e) => {
        const name = e.name.toLowerCase();
        return (
          name === "smash ultimate" ||
          name.includes("ultimate singles") ||
          name.includes("smash singles") ||
          (name.includes("ultimate") && !name.includes("doubles")) ||
          name.includes("ult singles") ||
          (name.includes("smash") && name.includes("singles")) ||
          (name.includes("smash summit") && !name.includes("doubles")) ||
          (name.includes("summit") && !name.includes("doubles")) ||
          (name.includes("elon") &&
            name.includes("summit") &&
            !name.includes("doubles")) ||
          name.includes("singles") // More general singles check
        );
      });
    }

    if (!event) {
      throw new Error(
        "No suitable Ultimate Singles event found for this tournament"
      );
    }

    console.log("Selected event:", event.name);
    console.log("Number of phases:", event.phases?.length || 0);

    // Get total pages from pageInfo
    const totalPages = event.standings.pageInfo.totalPages;
    console.log(`Total pages of standings: ${totalPages}`);

    let allParticipants = [...event.standings.nodes];

    // Fetch remaining pages if there are any
    if (totalPages > 1) {
      console.log(
        `Fetching ${totalPages - 1} additional pages of participants...`
      );
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Fetching page ${page} of ${totalPages}`);
        const pageData = await graphQLClient.request<TournamentQueryResponse>(
          TOURNAMENT_QUERY,
          { slug: tournamentSlug, page }
        );

        if (pageData.tournament?.events[0]?.standings?.nodes) {
          allParticipants = [
            ...allParticipants,
            ...pageData.tournament.events[0].standings.nodes,
          ];
        }
      }
    }

    console.log(`Total participants found: ${allParticipants.length}`);

    const participants = allParticipants
      .map((node) => {
        if (!node?.entrant?.participants?.[0]?.player) {
          console.warn("Missing player data for a participant");
          return null;
        }

        return {
          startggPlayerId: String(node.entrant.participants[0].player.id || ''),
          gamerTag: node.entrant.participants[0].player.gamerTag || 'Unknown Player',
          placement: node.placement || 0,
          isElonStudent: false,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (participants.length === 0) {
      throw new Error("No valid participants found");
    }

    // Convert startAt from Unix timestamp to Date
    const startDate = new Date(parseInt(tournament.startAt) * 1000);
    const semester = getSemesterForDate(startDate);
    const semesterName = semester ? semester.name : "Unknown Semester";

    console.log(
      `Successfully processed ${participants.length} participants from event: ${event.name}`
    );

    return {
      id: parseInt(tournament.id, 10),
      name: tournament.name,
      startAt: startDate.toISOString(),
      participants,
      semesterName: semesterName,
    };
  } catch (error: unknown) {
    console.error("Error importing tournament:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}