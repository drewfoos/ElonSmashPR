// File: app/api/tournaments/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const tournamentsGroupedBySemester = await prisma.semester.findMany({
      include: {
        tournaments: {
          orderBy: {
            startAt: "desc",
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(tournamentsGroupedBySemester);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}
