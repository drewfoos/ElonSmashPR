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

interface Player {
  id: string;
  name: string;
}

interface ParticipantConfirmationProps {
  tournamentData: TournamentData;
  onConfirm: (confirmedData: TournamentData) => Promise<void>;
  currentElonStudents: Player[];
}

export default function ParticipantConfirmation({
  tournamentData,
  onConfirm,
  currentElonStudents,
}: ParticipantConfirmationProps) {
  const [participants, setParticipants] = useState<Participant[]>(
    tournamentData.participants
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    updateElonStudentStatus();
  }, [currentElonStudents]);

  const updateElonStudentStatus = () => {
    setParticipants((prev) =>
      prev.map((participant) => ({
        ...participant,
        isElonStudent:
          currentElonStudents.some(
            (student) => student.id === participant.startggPlayerId
          ) || participant.isElonStudent,
      }))
    );
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
      setIsConfirming(true);
      await onConfirm({ ...tournamentData, participants });
      // If onConfirm completes successfully, it will close the dialog
      // so we don't need to set isConfirming back to false here
    } catch (error) {
      console.error("Error confirming tournament:", error);
      toast({
        title: "Error",
        description: "Failed to confirm tournament. Please try again.",
        variant: "destructive",
      });
      setIsConfirming(false);
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
                disabled={isConfirming}
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
        <Button 
          onClick={handleConfirm} 
          className="mt-4" 
          disabled={isConfirming}
        >
          {isConfirming ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Confirming...</span>
            </div>
          ) : (
            "Confirm and Import Tournament"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}