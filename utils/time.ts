import { useEffect, useState } from "react";
import type { BusinessStatus, ETDateTimeParts, TimeETState } from "../types";
import { getBusinessStatus } from "./rules";

export const ET_TIME_ZONE = "America/New_York";
const REFRESH_INTERVAL_MS = 60_000;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  weekday: "long",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const DAY_INDEX_BY_SHORT_NAME: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getETDateTimeParts(date: Date = new Date()): ETDateTimeParts {
  const parts = partsFormatter.formatToParts(date);
  const weekday = getPart(parts, "weekday");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const year = getPart(parts, "year");

  return {
    year: toNumber(year),
    month: toNumber(month),
    day: toNumber(day),
    hour: toNumber(getPart(parts, "hour")),
    minute: toNumber(getPart(parts, "minute")),
    second: toNumber(getPart(parts, "second")),
    dayIndex: DAY_INDEX_BY_SHORT_NAME[weekday] ?? 0,
    dayName: dayFormatter.format(date),
    formattedTime: timeFormatter.format(date),
    formattedDate: dateFormatter.format(date),
    isoDate: `${year}-${month}-${day}`,
    timestamp: date.getTime(),
  };
}

export function getCurrentETState(date: Date = new Date()): TimeETState {
  const current = getETDateTimeParts(date);
  const businessStatus: BusinessStatus = getBusinessStatus(current);

  return {
    ...current,
    businessStatus,
  };
}

export function useTimeET(): TimeETState {
  const [current, setCurrent] = useState<TimeETState>(() => getCurrentETState());

  useEffect(() => {
    const refresh = () => setCurrent(getCurrentETState());
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    refresh();

    return () => window.clearInterval(intervalId);
  }, []);

  return current;
}
