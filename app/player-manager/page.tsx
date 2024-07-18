"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Player {
  id: string;
  startggPlayerId: string | null;
  gamerTag: string;
  isElonStudent: boolean;
}

interface Semester {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
}

export default function PlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [playerToKeep, setPlayerToKeep] = useState<Player | null>(null);
  const [playerToMerge, setPlayerToMerge] = useState<Player | null>(null);
  const [affectedTournaments, setAffectedTournaments] = useState<Tournament[]>(
    []
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchPlayers(selectedSemester);
    }
  }, [selectedSemester]);

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters");
      if (!response.ok) throw new Error("Failed to fetch semesters");
      const data = await response.json();
      setSemesters(data);
      if (data.length > 0) {
        setSelectedSemester(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching semesters:", error);
      toast({
        title: "Error",
        description: "Failed to fetch semesters. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchPlayers = async (semesterId: string) => {
    try {
      const response = await fetch(`/api/semesters/${semesterId}/players`);
      if (!response.ok) throw new Error("Failed to fetch players");
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error("Error fetching players:", error);
      toast({
        title: "Error",
        description: "Failed to fetch players. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (
    playerId: string,
    isElonStudent: boolean
  ) => {
    try {
      const response = await fetch("/api/players/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          semesterId: selectedSemester,
          isElonStudent,
        }),
      });
      if (!response.ok) throw new Error("Failed to update player status");
      await fetchPlayers(selectedSemester);
      toast({
        title: "Success",
        description: "Player status updated successfully.",
      });
    } catch (error) {
      console.error("Error updating player status:", error);
      toast({
        title: "Error",
        description: "Failed to update player status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerSelection = (player: Player) => {
    setSelectedPlayers((prev) => {
      if (prev.find((p) => p.id === player.id)) {
        return prev.filter((p) => p.id !== player.id);
      }
      if (prev.length < 2) {
        return [...prev, player];
      }
      return prev;
    });
  };

  const openMergeModal = () => {
    if (selectedPlayers.length !== 2) {
      toast({
        title: "Error",
        description: "Please select exactly two players to merge.",
        variant: "destructive",
      });
      return;
    }
    setPlayerToKeep(selectedPlayers[0]);
    setPlayerToMerge(selectedPlayers[1]);
    fetchAffectedTournaments(selectedPlayers[1].id, selectedPlayers[0].id);
    setMergeModalOpen(true);
  };

  const fetchAffectedTournaments = async (
    fromPlayerId: string,
    toPlayerId: string
  ) => {
    try {
      const response = await fetch(
        `/api/players/merge-preview?fromPlayerId=${fromPlayerId}&toPlayerId=${toPlayerId}&semesterId=${selectedSemester}`
      );
      if (!response.ok) throw new Error("Failed to fetch affected tournaments");
      const data = await response.json();
      setAffectedTournaments(data);
    } catch (error) {
      console.error("Error fetching affected tournaments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch affected tournaments. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerToKeepChange = (playerId: string) => {
    const newPlayerToKeep = selectedPlayers.find((p) => p.id === playerId)!;
    const newPlayerToMerge = selectedPlayers.find((p) => p.id !== playerId)!;
    setPlayerToKeep(newPlayerToKeep);
    setPlayerToMerge(newPlayerToMerge);
    fetchAffectedTournaments(newPlayerToMerge.id, newPlayerToKeep.id);
  };

  const handleMerge = async () => {
    if (!playerToKeep || !playerToMerge) return;

    try {
      const response = await fetch("/api/players/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPlayerId: playerToMerge.id,
          toPlayerId: playerToKeep.id,
          semesterId: selectedSemester,
        }),
      });
      if (!response.ok) throw new Error("Failed to merge players");
      await fetchPlayers(selectedSemester);
      setMergeModalOpen(false);
      setSelectedPlayers([]);
      setPlayerToKeep(null);
      setPlayerToMerge(null);
      toast({
        title: "Success",
        description: "Players merged successfully.",
      });
    } catch (error) {
      console.error("Error merging players:", error);
      toast({
        title: "Error",
        description: "Failed to merge players. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.gamerTag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Player Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players"
              className="flex-grow"
            />
            <Button
              onClick={openMergeModal}
              disabled={selectedPlayers.length !== 2}
            >
              Merge Selected Players
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Gamer Tag</TableHead>
                <TableHead>Start.gg Player ID</TableHead>
                <TableHead className="w-[100px] text-center">
                  Elon Student
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedPlayers.some(
                          (p) => p.id === player.id
                        )}
                        onCheckedChange={() => handlePlayerSelection(player)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{player.gamerTag}</TableCell>
                  <TableCell>{player.startggPlayerId || "N/A"}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={player.isElonStudent}
                        onCheckedChange={(checked) =>
                          handleStatusChange(player.id, checked as boolean)
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Players</DialogTitle>
            <DialogDescription>
              Choose which player to keep. The other player's data will be
              merged into the selected player.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={playerToKeep?.id}
            onValueChange={handlePlayerToKeepChange}
          >
            {selectedPlayers.map((player) => (
              <div key={player.id} className="flex items-center space-x-2">
                <RadioGroupItem value={player.id} id={player.id} />
                <Label htmlFor={player.id}>{player.gamerTag}</Label>
              </div>
            ))}
          </RadioGroup>
          {playerToKeep && playerToMerge && (
            <div>
              <p>
                Merging {playerToMerge.gamerTag} into {playerToKeep.gamerTag}
              </p>
            </div>
          )}
          {affectedTournaments.length > 0 && (
            <div>
              <h3 className="font-semibold">Affected Tournaments:</h3>
              <ul>
                {affectedTournaments.map((tournament) => (
                  <li key={tournament.id}>{tournament.name}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleMerge}
              disabled={!playerToKeep || !playerToMerge}
            >
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
