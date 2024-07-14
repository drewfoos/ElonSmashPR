// Route: /import-tournament

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ImportTournament() {
  const [tournamentSlug, setTournamentSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!tournamentSlug.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tournament slug.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/import-tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tournamentSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to import tournament");
      }

      toast({
        title: "Success",
        description: `Tournament ${data.tournament.name} imported successfully!`,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description:
            error.message || "Failed to import tournament. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unknown error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Tournament</CardTitle>
          <CardDescription>
            Enter the tournament slug from start.gg to import data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="tournamentSlug">Tournament Slug</Label>
              <Input
                id="tournamentSlug"
                placeholder="e.g., tournament/elon-university-smash-fest-25"
                value={tournamentSlug}
                onChange={(e) => setTournamentSlug(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleImport} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Tournament"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
