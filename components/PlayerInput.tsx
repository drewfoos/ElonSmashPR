import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Player {
  id: string;
  name: string;
}

interface PlayerInputProps {
  value: string;
  onChange: (value: string, playerId: string | null, placement: number) => void;
  onIsElonStudentChange: (value: boolean) => void;
  isElonStudent: boolean;
  placement: number;
  currentElonStudents: Player[];
}

export function PlayerInput({
  value,
  onChange,
  onIsElonStudentChange,
  isElonStudent,
  placement,
  currentElonStudents,
}: PlayerInputProps) {
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (value && !selectedPlayer) {
      const filtered = currentElonStudents.filter((player) =>
        player.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPlayers(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredPlayers([]);
      setShowSuggestions(false);
    }
  }, [value, currentElonStudents, selectedPlayer]);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    onChange(player.name, player.id, placement);
    onIsElonStudentChange(true);
    setShowSuggestions(false);
  };

  const handleClearSelection = () => {
    setSelectedPlayer(null);
    onChange("", null, placement);
    onIsElonStudentChange(false);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-6 space-y-1">
        <Label htmlFor={`playerName-${placement}`} className="text-sm">
          Name
        </Label>
        <div className="relative">
          <Input
            id={`playerName-${placement}`}
            value={value}
            onChange={(e) => {
              if (!selectedPlayer) {
                onChange(e.target.value, null, placement);
              }
            }}
            onFocus={() => !selectedPlayer && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Player Name"
            disabled={!!selectedPlayer}
            className="truncate"
          />
          {selectedPlayer && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={handleClearSelection}
            >
              <X size={16} />
            </Button>
          )}
          {showSuggestions && filteredPlayers.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-auto rounded-md shadow-lg">
              {filteredPlayers.map((player) => (
                <li
                  key={player.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer truncate"
                  onMouseDown={() => handleSelectPlayer(player)}
                >
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="col-span-2 space-y-1">
        <Label htmlFor={`placement-${placement}`} className="text-sm">
          Place
        </Label>
        <Input
          id={`placement-${placement}`}
          type="number"
          value={placement}
          onChange={(e) =>
            onChange(
              value,
              selectedPlayer?.id || null,
              parseInt(e.target.value)
            )
          }
          className="w-full"
        />
      </div>
      <div className="col-span-4 space-y-1">
        <Label htmlFor={`isElonStudent-${placement}`} className="text-sm">
          Elon Student
        </Label>
        <div className="flex items-center">
          <Checkbox
            id={`isElonStudent-${placement}`}
            checked={isElonStudent}
            onCheckedChange={(checked) =>
              onIsElonStudentChange(checked as boolean)
            }
          />
          <Label
            htmlFor={`isElonStudent-${placement}`}
            className="ml-2 text-sm"
          >
            Yes
          </Label>
        </div>
      </div>
    </div>
  );
}
