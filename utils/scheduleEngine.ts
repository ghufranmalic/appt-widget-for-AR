import type { DayKey, ScheduleConfig, ScheduleRule, TimeCondition } from "../types/schedule";
import type { AppointmentSlot, BookingSeverity, BusinessStatus, ETDateTimeParts, NextAppointmentDay } from "../types";
import { DAY_INDEX_TO_KEY, DAY_LABELS, formatSlotTime } from "./scheduleConstants";
import { getBusinessStatus, getNextAppointmentDay as getFallbackNextDay } from "./rules";

function minutesSinceMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function parseTimeToMinutes(value: string): number {
  const [hourPart, minutePart] = value.split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}

function getDayKey(dayIndex: number): DayKey {
  return DAY_INDEX_TO_KEY[dayIndex];
}

function isDateInRange(isoDate: string, startDate: string, endDate: string): boolean {
  return isoDate >= startDate && isoDate <= endDate;
}

function matchesTimeCondition(
  rule: ScheduleRule,
  current: Pick<ETDateTimeParts, "hour" | "minute">,
  config: ScheduleConfig,
  dayIndex: number,
): boolean {
  const currentMinutes = minutesSinceMidnight(current.hour, current.minute);
  const dayKey = getDayKey(dayIndex);
  const hours = config.businessHours[dayKey];

  if (rule.timeCondition === "all") {
    return true;
  }

  if (rule.timeCondition === "business_hours") {
    if (hours.closed) {
      return false;
    }

    const openMinutes = parseTimeToMinutes(hours.open);
    const closeMinutes = parseTimeToMinutes(hours.close);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  const threshold = parseTimeToMinutes(rule.time ?? "17:00");

  if (rule.timeCondition === "before") {
    return currentMinutes < threshold;
  }

  if (rule.timeCondition === "after") {
    if (dayKey === "friday") {
      return currentMinutes >= threshold;
    }

    return true;
  }

  return false;
}

function ruleMatches(
  rule: ScheduleRule,
  current: ETDateTimeParts,
  config: ScheduleConfig,
): boolean {
  const dayKey = getDayKey(current.dayIndex);

  if (!rule.days.includes(dayKey)) {
    return false;
  }

  return matchesTimeCondition(rule, current, config, current.dayIndex);
}

function slotsFromValues(values: string[]): AppointmentSlot[] {
  return values.map((value) => {
    const [hourPart, minutePart] = value.split(":");
    return {
      label: formatSlotTime(value),
      hour: Number(hourPart),
      minute: Number(minutePart),
    };
  });
}

function getSlotsForTargetDate(config: ScheduleConfig, targetDate: string, overrideSlots?: string[]): AppointmentSlot[] {
  if (overrideSlots && overrideSlots.length > 0) {
    return slotsFromValues(overrideSlots);
  }

  const target = new Date(`${targetDate}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
  const weekday = formatter.format(target);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const dayKey = getDayKey(dayIndex);
  const defaults = config.defaultSlots[dayKey] ?? [];

  return slotsFromValues(defaults);
}

function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getBusinessStatusFromConfig(
  current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">,
  config: ScheduleConfig,
): BusinessStatus {
  const dayKey = getDayKey(current.dayIndex);
  const hours = config.businessHours[dayKey];

  if (hours.closed) {
    return "CLOSED";
  }

  const currentMinutes = minutesSinceMidnight(current.hour, current.minute);
  const openMinutes = parseTimeToMinutes(hours.open);
  const closeMinutes = parseTimeToMinutes(hours.close);

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes ? "OPEN" : "CLOSED";
}

export function getNextAppointmentDayFromSchedule(
  current: ETDateTimeParts,
  config: ScheduleConfig,
): NextAppointmentDay | null {
  const activeWeek = config.weeks.find((week) => isDateInRange(current.isoDate, week.startDate, week.endDate));

  if (!activeWeek) {
    return null;
  }

  const matchedRule = activeWeek.rules.find((rule) => ruleMatches(rule, current, config));

  if (!matchedRule) {
    return null;
  }

  const slots = getSlotsForTargetDate(config, matchedRule.targetDate, matchedRule.slots);
  const targetLabel = formatDisplayDate(matchedRule.targetDate);
  const slotLabels = slots.map((slot) => slot.label).join(", ");
  const targetDateObj = new Date(`${matchedRule.targetDate}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(targetDateObj);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  return {
    label: targetLabel,
    dayIndex,
    severity: "limited" as BookingSeverity,
    reason: `${activeWeek.label}: ${matchedRule.label} — schedule for ${targetLabel}${slotLabels ? ` (${slotLabels})` : ""}.`,
    targetDate: matchedRule.targetDate,
    slots,
  };
}

export function resolveNextAppointmentDay(
  current: ETDateTimeParts,
  config: ScheduleConfig | null,
): NextAppointmentDay {
  if (config) {
    const scheduled = getNextAppointmentDayFromSchedule(current, config);

    if (scheduled) {
      return scheduled;
    }
  }

  return getFallbackNextDay(current);
}

export function resolveBusinessStatus(
  current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">,
  config: ScheduleConfig | null,
): BusinessStatus {
  if (config) {
    return getBusinessStatusFromConfig(current, config);
  }

  return getBusinessStatus(current);
}

export function getAgentMessageFromSchedule(next: NextAppointmentDay): string {
  const slots = next.slots ?? [];

  if (slots.length === 0) {
    return "No valid appointment slots are available for this day. Do not offer an appointment.";
  }

  const slotList = slots.map((slot) => slot.label).join(", ");
  const note = next.agentNote ? `${next.agentNote} ` : "";

  return `${note}You can offer an appointment on ${next.label} at ${slots[0].label}. Available slots are: ${slotList}.`;
}

export function sortRulesForEditing(rules: ScheduleRule[]): ScheduleRule[] {
  const order: Record<TimeCondition, number> = {
    after: 0,
    before: 1,
    business_hours: 2,
    all: 3,
  };

  return [...rules].sort((left, right) => order[left.timeCondition] - order[right.timeCondition]);
}

export { DAY_LABELS };
