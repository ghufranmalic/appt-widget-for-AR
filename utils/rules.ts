import type {
  AppointmentSlot,
  BookingSeverity,
  BusinessStatus,
  ETDateTimeParts,
  NextAppointmentDay,
} from "../types";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const WEEKDAY_SLOTS: AppointmentSlot[] = [
  { label: "10:00 AM", hour: 10, minute: 0 },
  { label: "2:00 PM", hour: 14, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
];

const SATURDAY_SLOTS: AppointmentSlot[] = [
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "1:00 PM", hour: 13, minute: 0 },
];

function minutesSinceMidnight(state: Pick<ETDateTimeParts, "hour" | "minute">): number {
  return state.hour * 60 + state.minute;
}

function isWeekday(dayIndex: number): boolean {
  return dayIndex >= 1 && dayIndex <= 5;
}

function isNormalWeekday(dayIndex: number): boolean {
  return dayIndex >= 1 && dayIndex <= 4;
}

function nextBusinessDayFrom(dayIndex: number): number {
  const candidate = (dayIndex + 1) % 7;
  return candidate === 0 ? 1 : candidate;
}

function followingBusinessDayAfterNextDay(dayIndex: number): number {
  const nextDay = (dayIndex + 1) % 7;
  return nextBusinessDayFrom(nextDay);
}

export function getBusinessStatus(current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">): BusinessStatus {
  const currentMinutes = minutesSinceMidnight(current);

  if (current.dayIndex >= 1 && current.dayIndex <= 5) {
    return currentMinutes >= 10 * 60 && currentMinutes <= 19 * 60 + 30 ? "OPEN" : "CLOSED";
  }

  if (current.dayIndex === 6) {
    return currentMinutes >= 9 * 60 && currentMinutes <= 13 * 60 ? "OPEN" : "CLOSED";
  }

  return "CLOSED";
}

export function getSlots(dayIndex: number): AppointmentSlot[] {
  if (isWeekday(dayIndex)) {
    return [...WEEKDAY_SLOTS];
  }

  if (dayIndex === 6) {
    return [...SATURDAY_SLOTS];
  }

  return [];
}

export function getNextAppointmentDay(current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">): NextAppointmentDay {
  const status = getBusinessStatus(current);
  let dayIndex: number;
  let severity: BookingSeverity;
  let reason: string;

  if (current.dayIndex === 5) {
    if (status === "OPEN") {
      dayIndex = 6;
      severity = "limited";
      reason = "Friday requests during business hours can only offer Saturday appointments.";
    } else {
      dayIndex = 2;
      severity = "restricted";
      reason = "Friday after-hours requests skip the weekend and Monday; earliest allowed is Tuesday.";
    }
  } else if (current.dayIndex === 6 || current.dayIndex === 0) {
    dayIndex = 2;
    severity = "restricted";
    reason = "Weekend requests must skip Sunday and Monday; earliest allowed is Tuesday.";
  } else if (isNormalWeekday(current.dayIndex)) {
    if (status === "OPEN") {
      dayIndex = nextBusinessDayFrom(current.dayIndex);
      severity = "normal";
      reason = "Normal weekday request during business hours allows next-day booking.";
    } else {
      dayIndex = followingBusinessDayAfterNextDay(current.dayIndex);
      severity = "limited";
      reason = "After-hours weekday requests cannot offer same-day or next-day booking; earliest allowed is the following business day.";
    }
  } else {
    dayIndex = 2;
    severity = "restricted";
    reason = "The current day is closed for booking decisions; earliest allowed is Tuesday.";
  }

  return {
    label: DAY_LABELS[dayIndex],
    dayIndex,
    severity,
    reason,
  };
}

export function getAgentMessage(next: Pick<NextAppointmentDay, "label" | "dayIndex">): string {
  const slots = getSlots(next.dayIndex);
  const firstSlot = slots[0]?.label;

  if (!firstSlot) {
    return "No valid appointment slots are available for this day. Do not offer an appointment.";
  }

  return `You can offer an appointment on ${next.label} at ${firstSlot}. Available slots are: ${slots
    .map((slot) => slot.label)
    .join(", ")}.`;
}
