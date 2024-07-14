// File: app/api/semesters/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const currentDate = new Date();

    const semesters = await prisma.semester.findMany({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    const semestersWithCurrent = semesters.map((semester) => ({
      ...semester,
      isCurrent:
        currentDate >= semester.startDate && currentDate <= semester.endDate,
    }));

    return NextResponse.json(semestersWithCurrent);
  } catch (error) {
    console.error("Error fetching semesters:", error);
    return NextResponse.json(
      { error: "Failed to fetch semesters" },
      { status: 500 }
    );
  }
}
