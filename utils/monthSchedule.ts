import type { ScheduleConfig, ScheduleRule, WeekSchedule } from "../types/schedule";
import { createRuleId, createWeekId } from "./scheduleConstants";
import { addDays, formatWeekLabel } from "./weekSchedule";

export interface MonthWeekChunk {
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
}

const RULE_TEMPLATES: Array<Pick<ScheduleRule, "label" | "days" | "timeCondition" | "time">> = [
  { label: "Monday", days: ["monday"], timeCondition: "all" },
  { label: "Tuesday", days: ["tuesday"], timeCondition: "all" },
  { label: "Wednesday", days: ["wednesday"], timeCondition: "all" },
  { label: "Thursday", days: ["thursday"], timeCondition: "all" },
  { label: "Friday before 5pm", days: ["friday"], timeCondition: "before", time: "17:00" },
  {
    label: "Fri after 5pm / weekend",
    days: ["friday", "saturday", "sunday"],
    timeCondition: "after",
    time: "17:00",
  },
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(year, month - 1, 1));
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [yearPart, monthPart] = yearMonth.split("-");
  const date = new Date(Number(yearPart), Number(monthPart) - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function getMonthFourWeeks(year: number, month: number): MonthWeekChunk[] {
  const daysInMonth = getDaysInMonth(year, month);
  const chunkCount = 4;
  let remainder = daysInMonth % chunkCount;
  const baseSize = Math.floor(daysInMonth / chunkCount);
  const chunks: MonthWeekChunk[] = [];
  let day = 1;

  for (let weekNumber = 1; weekNumber <= chunkCount; weekNumber += 1) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {
      remainder -= 1;
    }

    const startDate = toIsoDate(year, month, day);
    const endDate = toIsoDate(year, month, day + size - 1);
    chunks.push({
      weekNumber,
      startDate,
      endDate,
      label: formatWeekLabel(startDate, endDate),
    });
    day += size;
  }

  return chunks;
}

function defaultTargetForRule(startDate: string, ruleIndex: number): string {
  if (ruleIndex === 4) {
    return addDays(startDate, 7);
  }

  if (ruleIndex === 5) {
    return addDays(startDate, 8);
  }

  return addDays(startDate, ruleIndex + 1);
}

export function createWeekForChunk(chunk: MonthWeekChunk): WeekSchedule {
  return {
    id: createWeekId(),
    label: chunk.label,
    startDate: chunk.startDate,
    endDate: chunk.endDate,
    rules: RULE_TEMPLATES.map((template, index) => ({
      id: createRuleId(),
      ...template,
      targetDate: defaultTargetForRule(chunk.startDate, index),
    })),
  };
}

function weekMatchesChunk(week: WeekSchedule, chunk: MonthWeekChunk): boolean {
  return week.startDate === chunk.startDate && week.endDate === chunk.endDate;
}

export function getMonthWeeksFromConfig(
  year: number,
  month: number,
  weeks: WeekSchedule[],
): WeekSchedule[] {
  const chunks = getMonthFourWeeks(year, month);

  return chunks.map((chunk) => {
    const existing = weeks.find((week) => weekMatchesChunk(week, chunk));
    return existing ?? createWeekForChunk(chunk);
  });
}

export function applyMonthWeeksToConfig(
  config: ScheduleConfig,
  year: number,
  month: number,
  monthWeeks: WeekSchedule[],
): ScheduleConfig {
  const monthStart = toIsoDate(year, month, 1);
  const monthEnd = toIsoDate(year, month, getDaysInMonth(year, month));
  const remainingWeeks = config.weeks.filter(
    (week) => !(week.endDate >= monthStart && week.startDate <= monthEnd),
  );

  return {
    ...config,
    weeks: [...remainingWeeks, ...monthWeeks].sort((left, right) =>
      left.startDate.localeCompare(right.startDate),
    ),
  };
}

export function updateWeekRuleTarget(
  week: WeekSchedule,
  ruleIndex: number,
  targetDate: string,
): WeekSchedule {
  return {
    ...week,
    rules: week.rules.map((rule, index) => (index === ruleIndex ? { ...rule, targetDate } : rule)),
  };
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export { RULE_TEMPLATES };
