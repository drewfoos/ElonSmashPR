// File: utils/semesterUtils.ts

import { isWithinInterval, addYears, subYears } from "date-fns";
import { toZonedTime, format } from "date-fns-tz";

const TIME_ZONE = "America/New_York";

export interface Semester {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

function generateSemestersForYear(year: number): Semester[] {
  const fallStart = toZonedTime(new Date(year, 7, 22), TIME_ZONE); // August 22
  const fallEnd = toZonedTime(new Date(year + 1, 0, 24), TIME_ZONE); // January 24 of next year
  const springStart = toZonedTime(new Date(year + 1, 1, 1), TIME_ZONE); // February 1 of next year
  const springEnd = toZonedTime(new Date(year + 1, 4, 24), TIME_ZONE); // May 24 of next year

  return [
    {
      id: `${year}-fall`,
      name: `Fall ${year}`,
      startDate: fallStart,
      endDate: fallEnd,
    },
    {
      id: `${year + 1}-spring`,
      name: `Spring ${year + 1}`,
      startDate: springStart,
      endDate: springEnd,
    },
  ];
}

export function getSemesterForDate(date: Date): Semester | null {
  const estDate = toZonedTime(date, TIME_ZONE);
  const year = parseInt(format(estDate, "yyyy", { timeZone: TIME_ZONE }));

  // Generate semesters for the current academic year and the previous one
  const semesters = [
    ...generateSemestersForYear(year - 1),
    ...generateSemestersForYear(year),
  ];

  for (const semester of semesters) {
    if (
      isWithinInterval(estDate, {
        start: semester.startDate,
        end: semester.endDate,
      })
    ) {
      return semester;
    }
  }

  return null;
}

export function getCurrentSemester(): Semester {
  const now = new Date();
  const semester = getSemesterForDate(now);
  if (semester) {
    return semester;
  } else {
    // If we can't determine the current semester, return the most recent past semester
    const year = parseInt(format(now, "yyyy", { timeZone: TIME_ZONE }));
    const semesters = [
      ...generateSemestersForYear(year - 1),
      ...generateSemestersForYear(year),
    ];
    return semesters.reduce((prev, current) =>
      current.endDate <= now && current.endDate > prev.endDate ? current : prev
    );
  }
}

export function getNextSemester(currentSemester: Semester): Semester {
  const [year, term] = currentSemester.id.split("-");
  if (term === "fall") {
    return generateSemestersForYear(parseInt(year))[1]; // Spring of next year
  } else {
    return generateSemestersForYear(parseInt(year))[0]; // Fall of same year
  }
}

export function getPreviousSemester(currentSemester: Semester): Semester {
  const [year, term] = currentSemester.id.split("-");
  if (term === "spring") {
    return generateSemestersForYear(parseInt(year) - 1)[0]; // Fall of previous year
  } else {
    return generateSemestersForYear(parseInt(year) - 1)[1]; // Spring of same year
  }
}

export function convertToEST(date: Date): Date {
  return toZonedTime(date, TIME_ZONE);
}

export function formatInTimeZone(date: Date, fmt: string): string {
  return format(date, fmt, { timeZone: TIME_ZONE });
}
