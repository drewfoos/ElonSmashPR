import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { playerId, semesterId, isElonStudent } = await request.json();

  if (!playerId || !semesterId) {
    return NextResponse.json(
      { error: "Player ID and Semester ID are required" },
      { status: 400 }
    );
  }

  try {
    await prisma.semesterStatus.upsert({
      where: {
        playerId_semesterId: {
          playerId: playerId,
          semesterId: semesterId,
        },
      },
      update: {
        isElonStudent: isElonStudent,
      },
      create: {
        playerId: playerId,
        semesterId: semesterId,
        isElonStudent: isElonStudent,
      },
    });

    return NextResponse.json({ message: "Player status updated successfully" });
  } catch (error) {
    console.error("Error updating player status:", error);
    return NextResponse.json(
      { error: "Failed to update player status" },
      { status: 500 }
    );
  }
}
