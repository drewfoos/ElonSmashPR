"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Ranking {
  playerId: string;
  playerName: string;
  averageScore: number;
  tournamentCount: number;
}

interface Semester {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface RankingsProps {
  initialRankings: Ranking[];
  currentSemesterId: string;
}

const trophyEmoji = ["🏆", "🥈", "🥉"];

export default function Rankings({
  initialRankings,
  currentSemesterId,
}: RankingsProps) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] =
    useState<string>(currentSemesterId);
  const [rankings, setRankings] = useState<Ranking[]>(initialRankings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [minTournaments, setMinTournaments] = useState<number>(0);

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (
      currentSemesterId &&
      (!selectedSemesterId || selectedSemesterId === "select")
    ) {
      setSelectedSemesterId(currentSemesterId);
    }
  }, [currentSemesterId, selectedSemesterId]);

  useEffect(() => {
    if (selectedSemesterId && selectedSemesterId !== "select") {
      fetchRankings(selectedSemesterId);
    }
  }, [selectedSemesterId]);

  async function fetchSemesters() {
    try {
      const response = await fetch("/api/semesters");
      if (!response.ok) {
        throw new Error("Failed to fetch semesters");
      }
      const data: Semester[] = await response.json();
      setSemesters(data);
    } catch (err) {
      setError("Failed to load semesters. Please try again later.");
      console.error(err);
    }
  }

  async function fetchRankings(semesterId: string) {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/semester-rankings?semesterId=${semesterId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch rankings");
      }
      const data = await response.json();
      setRankings(data);
    } catch (err) {
      setError("Failed to load rankings. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRankings = rankings.filter(
    (r) => r.tournamentCount >= minTournaments
  );
  const displayedRankings = expanded
    ? filteredRankings
    : filteredRankings.slice(0, 10);
  const canExpand = filteredRankings.length > 10;

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <Select
          value={selectedSemesterId}
          onValueChange={setSelectedSemesterId}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}{" "}
                {semester.isCurrent && <Badge variant="outline">Current</Badge>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <label htmlFor="minTournaments" className="text-sm font-medium">
            Min Tournaments:
          </label>
          <Input
            id="minTournaments"
            type="number"
            value={minTournaments}
            onChange={(e) =>
              setMinTournaments(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="w-20"
            min="0"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Average Score</TableHead>
                <TableHead className="text-center">Tournaments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRankings.length > 0 ? (
                displayedRankings.map((ranking, index) => (
                  <TableRow key={ranking.playerId}>
                    <TableCell className="font-medium text-center">
                      <span className="inline-block w-8 text-center">
                        {index < 3 ? (
                          <span
                            title={`Rank ${index + 1}`}
                            className="text-2xl"
                          >
                            {trophyEmoji[index]}
                          </span>
                        ) : (
                          index + 1
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{ranking.playerName}</TableCell>
                    <TableCell className="text-center">
                      {ranking.averageScore.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {ranking.tournamentCount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No rankings available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canExpand && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} />
                    Show Top 10
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Show All Rankings
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
