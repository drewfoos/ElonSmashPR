import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSemester } from "@/utils/semesterUtils";

export async function GET() {
  try {
    const currentSemester = getCurrentSemester();
    const elonStudents = await prisma.player.findMany({
      where: {
        semesterStatuses: {
          some: {
            semester: {
              name: currentSemester.name,
            },
            isElonStudent: true,
          },
        },
      },
      select: {
        startggPlayerId: true,
        gamerTag: true,
      },
    });

    const formattedElonStudents = elonStudents.map((player) => ({
      id: player.startggPlayerId,
      name: player.gamerTag,
    }));

    return NextResponse.json(formattedElonStudents);
  } catch (error) {
    console.error("Error fetching current Elon students:", error);
    return NextResponse.json(
      { error: "Failed to fetch current Elon students" },
      { status: 500 }
    );
  }
}
