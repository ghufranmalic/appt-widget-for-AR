export type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type TimeCondition = "all" | "before" | "after" | "business_hours";

export interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface ScheduleRule {
  id: string;
  label: string;
  days: DayKey[];
  timeCondition: TimeCondition;
  time?: string;
  targetDate: string;
  slots?: string[];
}

export interface WeekSchedule {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dates?: string[];
  rules: ScheduleRule[];
}

export interface ScheduleConfig {
  version: number;
  updatedAt: string;
  business: {
    name: string;
    website: string;
    tagline: string;
  };
  provider: {
    name: string;
    website: string;
    logoUrl: string;
  };
  businessHours: Record<DayKey, DayHours>;
  defaultSlots: Record<DayKey, string[]>;
  weeks: WeekSchedule[];
}
