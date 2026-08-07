import type { DayKey, ScheduleConfig, ScheduleRule, WeekSchedule } from "../types/schedule";
import { createRuleId, createWeekId, DAY_INDEX_TO_KEY } from "./scheduleConstants";
import { addDays, formatWeekLabel } from "./weekSchedule";
import { RULE_TEMPLATES } from "./monthSchedule";

export interface CalendarCell {
  isoDate: string;
  day: number;
  inMonth: boolean;
}

export interface CalendarWeekRow {
  weekIndex: number;
  days: CalendarCell[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [yearPart, monthPart] = yearMonth.split("-");
  const date = new Date(Number(yearPart), Number(monthPart) - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(year, month - 1, 1));
}

export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${isoDate}T12:00:00`));
}

export function buildCalendarWeeks(year: number, month: number): CalendarWeekRow[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ isoDate: "", day: 0, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      isoDate: toIsoDate(year, month, day),
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ isoDate: "", day: 0, inMonth: false });
  }

  const weeks: CalendarWeekRow[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push({
      weekIndex: weeks.length,
      days: cells.slice(index, index + 7),
    });
  }

  return weeks;
}

export function getMonthDateList(year: number, month: number): string[] {
  const daysInMonth = getDaysInMonth(year, month);
  return Array.from({ length: daysInMonth }, (_, index) => toIsoDate(year, month, index + 1));
}

export function weekContainsDate(week: WeekSchedule, isoDate: string): boolean {
  if (week.dates?.length) {
    return week.dates.includes(isoDate);
  }

  return isoDate >= week.startDate && isoDate <= week.endDate;
}

export function findWeekForDate(weeks: WeekSchedule[], isoDate: string): WeekSchedule | undefined {
  return weeks.find((week) => weekContainsDate(week, isoDate));
}

export function isDateConfigured(weeks: WeekSchedule[], isoDate: string): boolean {
  return Boolean(findWeekForDate(weeks, isoDate));
}

function isContiguous(dates: string[]): boolean {
  if (dates.length <= 1) {
    return true;
  }

  const sorted = [...dates].sort();
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T12:00:00`);
    const current = new Date(`${sorted[index]}T12:00:00`);
    previous.setDate(previous.getDate() + 1);
    if (toIsoDate(previous.getFullYear(), previous.getMonth() + 1, previous.getDate()) !== sorted[index]) {
      return false;
    }
  }

  return true;
}

export function formatSelectionLabel(dates: string[]): string {
  const sorted = [...dates].sort();
  const start = sorted[0];
  const end = sorted[sorted.length - 1];

  if (sorted.length === 1) {
    return formatShortDate(start);
  }

  if (isContiguous(sorted)) {
    return formatWeekLabel(start, end);
  }

  return `${sorted.length} selected days`;
}

export function createDefaultRules(anchorDate: string): ScheduleRule[] {
  return RULE_TEMPLATES.map((template, index) => ({
    id: createRuleId(),
    ...template,
    targetDate:
      index === 4 ? addDays(anchorDate, 7) : index === 5 ? addDays(anchorDate, 8) : addDays(anchorDate, index + 1),
  }));
}

export function applyRulesToSelection(
  config: ScheduleConfig,
  selectedDates: string[],
  rules: ScheduleRule[],
): ScheduleConfig {
  const sorted = [...new Set(selectedDates)].sort();

  if (sorted.length === 0) {
    return config;
  }

  const startDate = sorted[0];
  const endDate = sorted[sorted.length - 1];
  const fullSpanLength = getSpanLength(startDate, endDate) + 1;
  const useExplicitDates = !isContiguous(sorted) || sorted.length !== fullSpanLength;

  const newWeek: WeekSchedule = {
    id: createWeekId(),
    label: formatSelectionLabel(sorted),
    startDate,
    endDate,
    dates: useExplicitDates ? sorted : undefined,
    rules,
  };

  const remainingWeeks = config.weeks.filter(
    (week) => !sorted.some((isoDate) => weekContainsDate(week, isoDate)),
  );

  return {
    ...config,
    weeks: [...remainingWeeks, newWeek].sort((left, right) => left.startDate.localeCompare(right.startDate)),
  };
}

function getSpanLength(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function clearRulesForSelection(config: ScheduleConfig, selectedDates: string[]): ScheduleConfig {
  const selected = new Set(selectedDates);
  return {
    ...config,
    weeks: config.weeks.filter((week) => {
      if (week.dates?.length) {
        return !week.dates.every((isoDate) => selected.has(isoDate));
      }

      return !selectedDates.some(
        (isoDate) => isoDate >= week.startDate && isoDate <= week.endDate,
      );
    }),
  };
}

export function loadRulesForSelection(weeks: WeekSchedule[], selectedDates: string[]): ScheduleRule[] {
  const anchor = [...selectedDates].sort()[0];
  if (!anchor) {
    return [];
  }

  const existing = findWeekForDate(weeks, anchor);
  return existing?.rules ?? createDefaultRules(anchor);
}

export interface DayRuleEntry {
  isoDate: string;
  targetDate: string;
}

export function getDayKeyFromIso(isoDate: string): DayKey {
  const dayIndex = new Date(`${isoDate}T12:00:00`).getDay();
  return DAY_INDEX_TO_KEY[dayIndex];
}

export function formatDayHeading(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${isoDate}T12:00:00`));
}

export function loadDayRuleEntries(weeks: WeekSchedule[], selectedDates: string[]): DayRuleEntry[] {
  return [...selectedDates].sort().map((isoDate) => {
    const week = findWeekForDate(weeks, isoDate);
    const dayKey = getDayKeyFromIso(isoDate);
    const rule =
      week?.rules.find((item) => item.days.includes(dayKey) && item.timeCondition === "all") ??
      week?.rules[0];

    return {
      isoDate,
      targetDate: rule?.targetDate ?? addDays(isoDate, 1),
    };
  });
}

export function applyDayRulesToConfig(config: ScheduleConfig, entries: DayRuleEntry[]): ScheduleConfig {
  const dates = entries.map((entry) => entry.isoDate);
  const cleared = config.weeks.filter((week) => !dates.some((isoDate) => weekContainsDate(week, isoDate)));

  const newWeeks: WeekSchedule[] = entries.map((entry) => {
    const dayKey = getDayKeyFromIso(entry.isoDate);

    return {
      id: createWeekId(),
      label: formatDayHeading(entry.isoDate),
      startDate: entry.isoDate,
      endDate: entry.isoDate,
      dates: [entry.isoDate],
      rules: [
        {
          id: createRuleId(),
          label: `Calls on ${formatDayHeading(entry.isoDate)}`,
          days: [dayKey],
          timeCondition: "all",
          targetDate: entry.targetDate,
        },
      ],
    };
  });

  return {
    ...config,
    weeks: [...cleared, ...newWeeks].sort((left, right) => left.startDate.localeCompare(right.startDate)),
  };
}

export { RULE_TEMPLATES };
