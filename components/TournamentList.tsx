"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Tournament {
  id: string;
  name: string;
  startAt: string;
  totalParticipants: number;
  totalElonParticipants: number;
  weight: number;
}

interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  tournaments: Tournament[];
}

interface TournamentListProps {
  semesters: Semester[];
}

export default function TournamentList({ semesters }: TournamentListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleViewDetails = (tournamentId: string) => {
    // Implement logic to view tournament details
    console.log(`View details for tournament ${tournamentId}`);
  };

  const handleDeleteTournament = async (
    tournamentId: string,
    semesterId: string
  ) => {
    if (confirm("Are you sure you want to delete this tournament?")) {
      setIsDeleting(tournamentId);
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete tournament");
        }

        toast({
          title: "Success",
          description: "Tournament deleted successfully",
        });

        // Note: The actual removal of the tournament from the list is handled by the Dashboard component
        // through the SSE updates. We don't need to update the state here.
      } catch (err) {
        console.error("Error deleting tournament:", err);
        toast({
          title: "Error",
          description: "Failed to delete tournament. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tournaments by Semester</h1>
      <Accordion type="single" collapsible className="w-full">
        {semesters.map((semester) => (
          <AccordionItem key={semester.id} value={semester.id}>
            <AccordionTrigger>{semester.name}</AccordionTrigger>
            <AccordionContent>
              {semester.tournaments.map((tournament) => (
                <Card key={tournament.id} className="mb-4">
                  <CardHeader>
                    <CardTitle>{tournament.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      Date:{" "}
                      {format(new Date(tournament.startAt), "MMMM d, yyyy")}
                    </p>
                    <p>Total Participants: {tournament.totalParticipants}</p>
                    <p>Elon Participants: {tournament.totalElonParticipants}</p>
                    <p>Weight: {tournament.weight.toFixed(4)}</p>
                    <div className="mt-2 space-x-2">
                      <Button onClick={() => handleViewDetails(tournament.id)}>
                        View Details
                      </Button>
                      <Button
                        onClick={() =>
                          handleDeleteTournament(tournament.id, semester.id)
                        }
                        variant="destructive"
                        disabled={isDeleting === tournament.id}
                      >
                        {isDeleting === tournament.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
