"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

interface Participant {
  startggPlayerId: string;
  gamerTag: string;
  placement: number;
  isElonStudent: boolean;
}

export interface TournamentData {
  id: number;
  name: string;
  startAt: string;
  participants: Participant[];
  semesterName: string;
}

interface ParticipantConfirmationProps {
  tournamentData: TournamentData;
  onConfirm: (confirmedData: TournamentData) => Promise<void>;
}

export default function ParticipantConfirmation({
  tournamentData,
  onConfirm,
}: ParticipantConfirmationProps) {
  const [participants, setParticipants] = useState<Participant[]>(
    tournamentData.participants
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentElonStudents();
  }, []);

  const fetchCurrentElonStudents = async () => {
    try {
      const response = await fetch("/api/current-elon-students");
      const currentStudents: { id: string; name: string }[] =
        await response.json();

      setParticipants((prev) =>
        prev.map((participant) => ({
          ...participant,
          isElonStudent:
            currentStudents.some(
              (student) => student.id === participant.startggPlayerId
            ) || participant.isElonStudent,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch current Elon students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch current Elon students. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckboxChange = (startggPlayerId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.startggPlayerId === startggPlayerId
          ? { ...p, isElonStudent: !p.isElonStudent }
          : p
      )
    );
  };

  const handleConfirm = async () => {
    try {
      await onConfirm({ ...tournamentData, participants });
      // Any additional logic after confirmation
    } catch (error) {
      console.error("Error confirming tournament:", error);
      toast({
        title: "Error",
        description: "Failed to confirm tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Participants - {tournamentData.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          {participants.map((participant) => (
            <div
              key={participant.startggPlayerId}
              className="flex items-center space-x-2 py-2"
            >
              <Checkbox
                id={participant.startggPlayerId}
                checked={participant.isElonStudent}
                onCheckedChange={() =>
                  handleCheckboxChange(participant.startggPlayerId)
                }
              />
              <label
                htmlFor={participant.startggPlayerId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {participant.gamerTag} (Placement: {participant.placement})
              </label>
            </div>
          ))}
        </ScrollArea>
        <Button onClick={handleConfirm} className="mt-4">
          Confirm and Import Tournament
        </Button>
      </CardContent>
    </Card>
  );
}
