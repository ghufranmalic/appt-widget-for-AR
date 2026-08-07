import type { ScheduleConfig } from "../types/schedule";
import { createDefaultScheduleConfig } from "./defaultSchedule";

const SCHEDULE_URL = `${import.meta.env.BASE_URL}schedule.json`;
const SCHEDULE_LOCAL_KEY = "blazeo-schedule-config";

let cachedConfig: ScheduleConfig | null = null;
let loadPromise: Promise<ScheduleConfig | null> | null = null;

function readScheduleFromBrowser(): ScheduleConfig | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_LOCAL_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ScheduleConfig;
  } catch {
    return null;
  }
}

export function saveScheduleToBrowser(config: ScheduleConfig): void {
  const payload = { ...config, updatedAt: new Date().toISOString() };
  localStorage.setItem(SCHEDULE_LOCAL_KEY, JSON.stringify(payload));
  cachedConfig = payload;
}

export function hasScheduleOverride(): boolean {
  return Boolean(localStorage.getItem(SCHEDULE_LOCAL_KEY));
}

export function clearScheduleOverride(): void {
  localStorage.removeItem(SCHEDULE_LOCAL_KEY);
  cachedConfig = null;
  loadPromise = null;
}

export async function loadScheduleConfig(force = false): Promise<ScheduleConfig | null> {
  if (!force && cachedConfig) {
    return cachedConfig;
  }

  if (!force && loadPromise) {
    return loadPromise;
  }

  const localConfig = readScheduleFromBrowser();
  if (localConfig && !force) {
    cachedConfig = localConfig;
    return localConfig;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch(`${SCHEDULE_URL}?v=${Date.now()}`, { cache: "no-store" });

      if (!response.ok) {
        return localConfig;
      }

      const remoteConfig = (await response.json()) as ScheduleConfig;
      const remoteUpdated = Date.parse(remoteConfig.updatedAt);
      const localUpdated = localConfig ? Date.parse(localConfig.updatedAt) : 0;

      if (localConfig && localUpdated > remoteUpdated) {
        cachedConfig = localConfig;
        return localConfig;
      }

      cachedConfig = remoteConfig;
      return remoteConfig;
    } catch {
      return localConfig;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function getCachedScheduleConfig(): ScheduleConfig | null {
  return cachedConfig;
}

export function getDefaultScheduleConfig(): ScheduleConfig {
  return createDefaultScheduleConfig();
}

export function downloadScheduleConfig(config: ScheduleConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schedule.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
