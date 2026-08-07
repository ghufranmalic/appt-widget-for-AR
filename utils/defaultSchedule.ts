import type { ScheduleConfig, WeekSchedule } from "../types/schedule";
import { createTemplateWeek, formatWeekLabel } from "./weekSchedule";

function customizeWeek(
  week: WeekSchedule,
  endDate: string,
  options?: {
    mondaySlots?: string[];
    fridayBeforeTarget?: string;
    weekendTarget?: string;
  },
): WeekSchedule {
  return {
    ...week,
    endDate,
    label: formatWeekLabel(week.startDate, endDate),
    rules: week.rules.map((rule, index) => {
      if (index === 0 && options?.mondaySlots) {
        return { ...rule, slots: options.mondaySlots };
      }

      if (index === 4 && options?.fridayBeforeTarget) {
        return { ...rule, targetDate: options.fridayBeforeTarget };
      }

      if (index === 5 && options?.weekendTarget) {
        return { ...rule, targetDate: options.weekendTarget };
      }

      return rule;
    }),
  };
}

export function createDefaultScheduleConfig(): ScheduleConfig {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    business: {
      name: "Allied Remodeling",
      website: "https://alliedremodeling.com/",
      tagline: "Appointment scheduling for Allied Remodeling agents",
    },
    provider: {
      name: "Blazeo",
      website: "https://www.blazeo.com/",
      logoUrl: "https://www.blazeo.com/wp-content/uploads/2024/05/logo-blazeo.svg",
    },
    businessHours: {
      sunday: { open: "00:00", close: "00:00", closed: true },
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { open: "00:00", close: "00:00", closed: true },
    },
    defaultSlots: {
      sunday: [],
      monday: ["14:00", "18:00"],
      tuesday: ["10:00", "14:00", "18:00"],
      wednesday: ["10:00", "14:00", "18:00"],
      thursday: ["10:00", "14:00", "18:00"],
      friday: ["18:00"],
      saturday: [],
    },
    weeks: [
      customizeWeek(createTemplateWeek("2026-08-10"), "2026-08-16", {
        mondaySlots: ["14:00", "18:00"],
      }),
      customizeWeek(createTemplateWeek("2026-08-17"), "2026-08-22"),
      customizeWeek(createTemplateWeek("2026-08-24"), "2026-08-29", {
        fridayBeforeTarget: "2026-08-31",
        weekendTarget: "2026-09-01",
      }),
    ],
  };
}
