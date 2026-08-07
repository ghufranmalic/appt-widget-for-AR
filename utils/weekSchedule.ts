import type { WeekSchedule } from "../types/schedule";
import { createRuleId, createWeekId } from "./scheduleConstants";

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatWeekLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  };
  const yearOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    timeZone: "America/New_York",
  };

  const startYear = new Intl.DateTimeFormat("en-US", yearOptions).format(start);
  const endYear = new Intl.DateTimeFormat("en-US", yearOptions).format(end);
  const startLabel = new Intl.DateTimeFormat("en-US", dateOptions).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    ...dateOptions,
    ...(startYear !== endYear ? yearOptions : {}),
  }).format(end);

  return `${startLabel} – ${endLabel}, ${endYear}`;
}

function weeksOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function createTemplateWeek(startDate: string): WeekSchedule {
  const endDate = addDays(startDate, 6);

  return {
    id: createWeekId(),
    label: formatWeekLabel(startDate, endDate),
    startDate,
    endDate,
    rules: [
      {
        id: createRuleId(),
        label: "If Monday",
        days: ["monday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 1),
      },
      {
        id: createRuleId(),
        label: "If Tuesday",
        days: ["tuesday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 2),
      },
      {
        id: createRuleId(),
        label: "If Wednesday",
        days: ["wednesday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 3),
      },
      {
        id: createRuleId(),
        label: "If Thursday",
        days: ["thursday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 4),
      },
      {
        id: createRuleId(),
        label: "If Friday before 5pm",
        days: ["friday"],
        timeCondition: "before",
        time: "17:00",
        targetDate: addDays(startDate, 7),
      },
      {
        id: createRuleId(),
        label: "If Friday after 5pm, Saturday, or Sunday",
        days: ["friday", "saturday", "sunday"],
        timeCondition: "after",
        time: "17:00",
        targetDate: addDays(startDate, 8),
      },
    ],
  };
}

export function generateWeeksForMonth(
  year: number,
  month: number,
  existingWeeks: WeekSchedule[],
): WeekSchedule[] {
  const created: WeekSchedule[] = [];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const cursor = new Date(monthStart);

  while (cursor.getDay() !== 1) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= monthEnd) {
    const startDate = cursor.toISOString().slice(0, 10);
    const endDate = addDays(startDate, 6);
    const overlaps = [...existingWeeks, ...created].some((week) =>
      weeksOverlap(startDate, endDate, week.startDate, week.endDate),
    );

    if (!overlaps) {
      created.push(createTemplateWeek(startDate));
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  return created;
}

export function findCoverageGaps(weeks: WeekSchedule[], daysAhead = 120): string[] {
  const gaps: string[] = [];
  const today = new Date();
  const sorted = [...weeks].sort((left, right) => left.startDate.localeCompare(right.startDate));

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const isoDate = date.toISOString().slice(0, 10);
    const covered = sorted.some((week) => isoDate >= week.startDate && isoDate <= week.endDate);

    if (!covered) {
      gaps.push(isoDate);
    }
  }

  return gaps;
}

export function summarizeCoverageGaps(gaps: string[]): string {
  if (gaps.length === 0) {
    return "All dates for the next 120 days are covered by a configured week.";
  }

  const first = gaps[0];
  const last = gaps[gaps.length - 1];

  if (gaps.length === 1) {
    return `${first} is not covered. Add a week for that date or the widget uses fallback rules.`;
  }

  return `${gaps.length} days are not covered (${first} through ${last}). Add weeks for those periods or the widget uses fallback rules.`;
}
