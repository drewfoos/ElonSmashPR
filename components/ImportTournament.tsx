"use client";

import { useState, useEffect, FormEvent } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ParticipantConfirmation, {
  TournamentData,
} from "./ParticipantConfirmation";
import { PlayerInput } from "./PlayerInput";
import { Trash2 } from "lucide-react";

interface ImportTournamentProps {
  onImport: () => void;
}

interface ManualParticipant {
  gamerTag: string;
  playerId: string | null;
  placement: number;
  isElonStudent: boolean;
}

interface Player {
  id: string;
  name: string;
}

export default function ImportTournament({ onImport }: ImportTournamentProps) {
  const [isManualImport, setIsManualImport] = useState<boolean>(false);
  const [tournamentSlug, setTournamentSlug] = useState<string>("");
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentElonStudents, setCurrentElonStudents] = useState<Player[]>([]);
  const { toast } = useToast();

  // Manual import state
  const [manualTournamentName, setManualTournamentName] = useState<string>("");
  const [manualTournamentDate, setManualTournamentDate] = useState<string>("");
  const [manualParticipants, setManualParticipants] = useState<
    ManualParticipant[]
  >([{ gamerTag: "", playerId: null, placement: 1, isElonStudent: false }]);

  useEffect(() => {
    fetchCurrentElonStudents();
  }, []);

  const fetchCurrentElonStudents = async () => {
    try {
      const response = await fetch("/api/current-elon-students");
      if (!response.ok)
        throw new Error("Failed to fetch current Elon students");
      const data = await response.json();
      setCurrentElonStudents(data);
    } catch (error) {
      console.error("Error fetching current Elon students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch current Elon students. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/import-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isManualImport
            ? {
                isManualImport: true,
                name: manualTournamentName,
                date: manualTournamentDate,
                participants: manualParticipants,
              }
            : { slug: tournamentSlug }
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.details || "Failed to import tournament"
        );
      }

      setTournamentData(data);
      toast({
        title: "Success",
        description: "Tournament data imported successfully",
      });
    } catch (error) {
      console.error("Error importing tournament:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      toast({
        title: "Error",
        description: "Failed to import tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (confirmedData: TournamentData) => {
    try {
      const response = await fetch("/api/confirm-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentData: confirmedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to confirm tournament");
      }

      toast({
        title: "Success",
        description: "Tournament confirmed successfully",
      });
      setTournamentData(null);
      onImport();
    } catch (error) {
      console.error("Error confirming tournament:", error);
      toast({
        title: "Error",
        description: "Failed to confirm tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addManualParticipant = () => {
    setManualParticipants((prev) => [
      ...prev,
      {
        gamerTag: "",
        playerId: null,
        placement: prev.length + 1,
        isElonStudent: false,
      },
    ]);
  };

  const removeManualParticipant = (index: number) => {
    setManualParticipants((prev) => {
      const newParticipants = prev.filter((_, i) => i !== index);
      // Adjust placements after removal
      return newParticipants.map((p, i) => ({ ...p, placement: i + 1 }));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch checked={isManualImport} onCheckedChange={setIsManualImport} />
        <Label>{isManualImport ? "Manual Import" : "Automatic Import"}</Label>
      </div>

      {!tournamentData ? (
        <form onSubmit={onSubmit} className="space-y-6">
          {isManualImport ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournamentName">Tournament Name</Label>
                  <Input
                    id="tournamentName"
                    value={manualTournamentName}
                    onChange={(e) => setManualTournamentName(e.target.value)}
                    placeholder="Tournament Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tournamentDate">Tournament Date</Label>
                  <Input
                    id="tournamentDate"
                    type="date"
                    value={manualTournamentDate}
                    onChange={(e) => setManualTournamentDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                {manualParticipants.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <PlayerInput
                      value={participant.gamerTag}
                      onChange={(value, playerId, placement) => {
                        setManualParticipants((prev) =>
                          prev.map((p, i) =>
                            i === index
                              ? {
                                  ...p,
                                  gamerTag: value,
                                  playerId: playerId || null,
                                  placement,
                                }
                              : p
                          )
                        );
                      }}
                      onIsElonStudentChange={(checked) => {
                        setManualParticipants((prev) =>
                          prev.map((p, i) =>
                            i === index ? { ...p, isElonStudent: checked } : p
                          )
                        );
                      }}
                      isElonStudent={participant.isElonStudent}
                      placement={participant.placement}
                      currentElonStudents={currentElonStudents}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeManualParticipant(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={addManualParticipant}
                  variant="outline"
                >
                  Add Participant
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="tournamentSlug">Tournament Slug or URL</Label>
              <Input
                id="tournamentSlug"
                value={tournamentSlug}
                onChange={(e) => setTournamentSlug(e.target.value)}
                placeholder="Enter tournament slug or URL"
                required
              />
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Importing..." : "Import Tournament"}
            </Button>
          </div>
        </form>
      ) : (
        <ParticipantConfirmation
          tournamentData={tournamentData}
          onConfirm={handleConfirm}
          currentElonStudents={currentElonStudents}
        />
      )}
    </div>
  );
}
