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

const MONDAY_SLOTS: AppointmentSlot[] = [
  { label: "2:00 PM", hour: 14, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
];

const FRIDAY_SLOTS: AppointmentSlot[] = [
  { label: "6:00 PM", hour: 18, minute: 0 },
];

const WEEKDAY_OPEN_MINUTES = 8 * 60;
const WEEKDAY_CLOSE_MINUTES = 17 * 60;
const SATURDAY_OPEN_MINUTES = 9 * 60;
const SATURDAY_CLOSE_MINUTES = 13 * 60;

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

const TUESDAY_RESTRICTED_REASON =
  "Friday, Saturday, and Sunday requests must skip the weekend and Monday; earliest allowed is Tuesday.";

const MONDAY_BEFORE_OPEN_REASON =
  "Monday before opening must skip the weekend; earliest allowed is Tuesday.";

function formatSlotLabels(slots: AppointmentSlot[]): string {
  return slots.map((slot) => slot.label).join(", ");
}

function shouldOfferTuesday(
  current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">,
): boolean {
  if (current.dayIndex === 5 || current.dayIndex === 6 || current.dayIndex === 0) {
    return true;
  }

  return current.dayIndex === 1 && minutesSinceMidnight(current) < WEEKDAY_OPEN_MINUTES;
}

export function getBusinessStatus(current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">): BusinessStatus {
  const currentMinutes = minutesSinceMidnight(current);

  if (current.dayIndex >= 1 && current.dayIndex <= 5) {
    return currentMinutes >= WEEKDAY_OPEN_MINUTES && currentMinutes <= WEEKDAY_CLOSE_MINUTES ? "OPEN" : "CLOSED";
  }

  if (current.dayIndex === 6) {
    return currentMinutes >= SATURDAY_OPEN_MINUTES && currentMinutes <= SATURDAY_CLOSE_MINUTES ? "OPEN" : "CLOSED";
  }

  return "CLOSED";
}

export function getSlots(dayIndex: number): AppointmentSlot[] {
  if (dayIndex === 1) {
    return [...MONDAY_SLOTS];
  }

  if (dayIndex >= 2 && dayIndex <= 4) {
    return [...WEEKDAY_SLOTS];
  }

  if (dayIndex === 5) {
    return [...FRIDAY_SLOTS];
  }

  return [];
}

export function getNextAppointmentDay(current: Pick<ETDateTimeParts, "dayIndex" | "hour" | "minute">): NextAppointmentDay {
  const status = getBusinessStatus(current);
  const currentMinutes = minutesSinceMidnight(current);
  const isBeforeWeekdayOpening = currentMinutes < WEEKDAY_OPEN_MINUTES;
  let dayIndex: number;
  let severity: BookingSeverity;
  let reason: string;
  let agentNote: string | undefined;

  if (shouldOfferTuesday(current)) {
    dayIndex = 2;
    severity = "restricted";
    reason =
      current.dayIndex === 1 ? MONDAY_BEFORE_OPEN_REASON : TUESDAY_RESTRICTED_REASON;
  } else if (isNormalWeekday(current.dayIndex)) {
    if (status === "OPEN") {
      dayIndex = nextBusinessDayFrom(current.dayIndex);
      severity = "normal";
      reason = "Normal weekday request during business hours allows next-day booking.";
    } else if (isBeforeWeekdayOpening) {
      dayIndex = nextBusinessDayFrom(current.dayIndex);
      severity = "limited";
      reason = "Before-hours weekday requests can offer next-day appointments.";
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
    agentNote,
  };
}

export function getAgentMessage(next: Pick<NextAppointmentDay, "label" | "dayIndex" | "agentNote">): string {
  const slots = getSlots(next.dayIndex);
  const firstSlot = slots[0]?.label;

  if (!firstSlot) {
    return "No valid appointment slots are available for this day. Do not offer an appointment.";
  }

  const slotList = formatSlotLabels(slots);
  const note = next.agentNote ? `${next.agentNote} ` : "";

  return `${note}You can offer an appointment on ${next.label} at ${firstSlot}. Available slots are: ${slotList}.`;
}
