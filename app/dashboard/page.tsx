"use client";

import { useState, useEffect } from "react";
import ImportTournament from "@/components/ImportTournament";
import TournamentList from "@/components/TournamentList";
import Rankings from "@/components/Rankings";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  List,
  Trophy,
  Users,
  Calendar,
  Star,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Ranking {
  playerId: string;
  playerName: string;
  averageScore: number;
  tournamentCount: number;
}

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

export default function Dashboard() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentRankings, setCurrentRankings] = useState<Ranking[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAllTournamentsDialogOpen, setIsAllTournamentsDialogOpen] =
    useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSemesters();
    fetchCurrentRankings();
    setupSSE();
  }, []);

  const setupSSE = () => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      if (event.data !== "ping") {
        const data = JSON.parse(event.data);
        if (
          data.type === "tournamentConfirmed" ||
          data.type === "tournamentDeleted"
        ) {
          if (data.semesterId === currentSemesterId) {
            setCurrentRankings(data.rankings);
          }
          updateSemesters(data);
        }
      }
    };

    return () => {
      eventSource.close();
    };
  };

  const updateSemesters = (data: any) => {
    setSemesters((prevSemesters) =>
      prevSemesters.map((semester) =>
        semester.id === data.semesterId
          ? {
              ...semester,
              tournaments:
                data.type === "tournamentConfirmed"
                  ? [...semester.tournaments, data.tournament]
                  : semester.tournaments.filter(
                      (t) => t.id !== data.tournamentId
                    ),
            }
          : semester
      )
    );
  };

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/tournaments");
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      const data = await response.json();
      setSemesters(data);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tournaments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentRankings = async () => {
    try {
      const response = await fetch("/api/current-rankings");
      if (!response.ok) throw new Error("Failed to fetch current rankings");
      const data = await response.json();
      setCurrentRankings(data.rankings);
      setCurrentSemesterId(data.semesterId);
    } catch (error) {
      console.error("Error fetching current rankings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch current rankings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportComplete = async () => {
    await fetchSemesters();
    await fetchCurrentRankings();
    setIsImportDialogOpen(false);
    toast({
      title: "Success",
      description: "Tournament imported successfully.",
    });
  };

  const recentTournaments = semesters
    .flatMap((semester) =>
      semester.tournaments.map((t) => ({ ...t, semesterName: semester.name }))
    )
    .sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
    )
    .slice(0, 5);

  const totalTournaments = semesters.reduce(
    (sum, semester) => sum + semester.tournaments.length,
    0
  );
  const totalParticipants = semesters.reduce(
    (sum, semester) =>
      sum +
      semester.tournaments.reduce((tSum, t) => tSum + t.totalParticipants, 0),
    0
  );

  const topPlayers = (currentRankings || []).slice(0, 3);

  const upcomingTournaments = semesters
    .flatMap((semester) =>
      semester.tournaments.map((t) => ({ ...t, semesterName: semester.name }))
    )
    .filter((t) => new Date(t.startAt) > new Date())
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
    .slice(0, 3);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Smash Tournament Dashboard</h1>
        <div className="flex space-x-2">
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <PlusCircle size={20} />
                Import Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full">
              {" "}
              {/* Increased max-width */}
              <DialogHeader>
                <DialogTitle>Import New Tournament</DialogTitle>
                <DialogDescription>
                  Enter the tournament details to import a new tournament.
                </DialogDescription>
              </DialogHeader>
              <ImportTournament onImport={handleImportComplete} />
            </DialogContent>
          </Dialog>
          <Dialog
            open={isAllTournamentsDialogOpen}
            onOpenChange={setIsAllTournamentsDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <List size={20} />
                All Tournaments
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>All Tournaments</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto pr-4">
                <TournamentList semesters={semesters} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy size={24} />
              Current Rankings
            </CardTitle>
            <CardDescription>
              Top players for the current semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Rankings
              initialRankings={currentRankings}
              currentSemesterId={currentSemesterId}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tournaments</CardTitle>
              <CardDescription>
                Last 5 tournaments across all semesters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {recentTournaments.map((tournament) => (
                  <li key={tournament.id} className="border-b pb-2">
                    <p className="font-semibold">{tournament.name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(tournament.startAt).toLocaleDateString()} -{" "}
                      {tournament.semesterName}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={20} />
                  <div>
                    <p className="text-sm font-medium">Total Tournaments</p>
                    <p className="text-xl font-bold">{totalTournaments}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <div>
                    <p className="text-sm font-medium">Total Participants</p>
                    <p className="text-xl font-bold">{totalParticipants}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star size={24} />
                Top Players
              </CardTitle>
              <CardDescription>
                Current semester's best performers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {topPlayers.map((player, index) => (
                  <li
                    key={player.playerId}
                    className="flex justify-between items-center"
                  >
                    <span>
                      {index + 1}. {player.playerName}
                    </span>
                    <span className="font-semibold">
                      {player.averageScore.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={24} />
                Upcoming Tournaments
              </CardTitle>
              <CardDescription>Next 3 scheduled tournaments</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {upcomingTournaments.map((tournament) => (
                  <li key={tournament.id}>
                    <p className="font-semibold">{tournament.name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(tournament.startAt).toLocaleDateString()} -{" "}
                      {tournament.semesterName}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
