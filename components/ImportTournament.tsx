"use client";

import { useState, FormEvent } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import ParticipantConfirmation, {
  TournamentData,
} from "./ParticipantConfirmation";

interface ImportTournamentProps {
  onImport: () => void;
}

interface ManualParticipant {
  gamerTag: string;
  placement: number;
  isElonStudent: boolean;
}

export default function ImportTournament({ onImport }: ImportTournamentProps) {
  const [isManualImport, setIsManualImport] = useState(false);
  const [tournamentSlug, setTournamentSlug] = useState("");
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Manual import state
  const [manualTournamentName, setManualTournamentName] = useState("");
  const [manualTournamentDate, setManualTournamentDate] = useState("");
  const [manualParticipants, setManualParticipants] = useState<
    ManualParticipant[]
  >([{ gamerTag: "", placement: 1, isElonStudent: false }]);

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
    setManualParticipants([
      ...manualParticipants,
      {
        gamerTag: "",
        placement: manualParticipants.length + 1,
        isElonStudent: false,
      },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Tournament</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            checked={isManualImport}
            onCheckedChange={setIsManualImport}
          />
          <label>{isManualImport ? "Manual Import" : "Automatic Import"}</label>
        </div>

        {!tournamentData ? (
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              {isManualImport ? (
                <>
                  <Input
                    value={manualTournamentName}
                    onChange={(e) => setManualTournamentName(e.target.value)}
                    placeholder="Tournament Name"
                    required
                  />
                  <Input
                    type="date"
                    value={manualTournamentDate}
                    onChange={(e) => setManualTournamentDate(e.target.value)}
                    required
                  />
                  {manualParticipants.map((participant, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        value={participant.gamerTag}
                        onChange={(e) => {
                          const newParticipants = [...manualParticipants];
                          newParticipants[index].gamerTag = e.target.value;
                          setManualParticipants(newParticipants);
                        }}
                        placeholder="Gamer Tag"
                        required
                      />
                      <Input
                        type="number"
                        value={participant.placement}
                        onChange={(e) => {
                          const newParticipants = [...manualParticipants];
                          newParticipants[index].placement = parseInt(
                            e.target.value
                          );
                          setManualParticipants(newParticipants);
                        }}
                        placeholder="Placement"
                        required
                      />
                      <Checkbox
                        checked={participant.isElonStudent}
                        onCheckedChange={(checked) => {
                          const newParticipants = [...manualParticipants];
                          newParticipants[index].isElonStudent =
                            checked as boolean;
                          setManualParticipants(newParticipants);
                        }}
                        id={`elon-student-${index}`}
                      />
                      <label htmlFor={`elon-student-${index}`}>
                        Elon Student
                      </label>
                    </div>
                  ))}
                  <Button type="button" onClick={addManualParticipant}>
                    Add Participant
                  </Button>
                </>
              ) : (
                <Input
                  value={tournamentSlug}
                  onChange={(e) => setTournamentSlug(e.target.value)}
                  placeholder="Enter tournament slug or URL"
                  required
                />
              )}
              {error && <p className="text-red-500">{error}</p>}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Importing..." : "Import Tournament"}
              </Button>
            </div>
          </form>
        ) : (
          <ParticipantConfirmation
            tournamentData={tournamentData}
            onConfirm={handleConfirm}
          />
        )}
      </CardContent>
    </Card>
  );
}
