export const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const DAY_INDEX_TO_KEY = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const SLOT_OPTIONS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "18:00", label: "6:00 PM" },
] as const;

export function formatSlotTime(value: string): string {
  const match = SLOT_OPTIONS.find((slot) => slot.value === value);
  if (match) {
    return match.label;
  }

  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function createRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createWeekId(): string {
  return `week-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
