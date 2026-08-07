export type BusinessStatus = "OPEN" | "CLOSED";

export type BookingSeverity = "normal" | "limited" | "restricted";

export interface ETDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayIndex: number;
  dayName: string;
  formattedTime: string;
  formattedDate: string;
  isoDate: string;
  timestamp: number;
}

export interface TimeETState extends ETDateTimeParts {
  businessStatus: BusinessStatus;
}

export interface NextAppointmentDay {
  label: string;
  dayIndex: number;
  severity: BookingSeverity;
  reason: string;
  agentNote?: string;
  targetDate?: string;
  slots?: AppointmentSlot[];
}

export interface AppointmentSlot {
  label: string;
  hour: number;
  minute: number;
}
