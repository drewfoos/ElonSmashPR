"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Tournament {
  id: string;
  name: string;
  startAt: string;
  totalParticipants: number;
  totalElonParticipants: number;
  weight: number;
  semesterName: string;
}

interface RecentTournamentsProps {
  tournaments: Tournament[];
  limit: number;
}

export default function RecentTournaments({
  tournaments,
  limit,
}: RecentTournamentsProps) {
  const sortedTournaments = tournaments
    .sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
    )
    .slice(0, limit);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Recent Tournaments</h2>
      {sortedTournaments.map((tournament) => (
        <Card key={tournament.id} className="mb-4">
          <CardHeader>
            <CardTitle>{tournament.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Date: {format(new Date(tournament.startAt), "MMMM d, yyyy")}</p>
            <p>Semester: {tournament.semesterName}</p>
            <p>Total Participants: {tournament.totalParticipants}</p>
            <p>Elon Participants: {tournament.totalElonParticipants}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
