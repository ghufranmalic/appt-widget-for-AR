import type { ScheduleConfig } from "../types/schedule";
import { createDefaultScheduleConfig } from "./defaultSchedule";

const SCHEDULE_URL = `${import.meta.env.BASE_URL}schedule.json`;
const DEFAULT_REPO = import.meta.env.VITE_GITHUB_REPO?.trim() || "ghufranmalic/appt-widget-for-AR";

let cachedConfig: ScheduleConfig | null = null;
let loadPromise: Promise<ScheduleConfig | null> | null = null;

export async function loadScheduleConfig(force = false): Promise<ScheduleConfig | null> {
  if (!force && cachedConfig) {
    return cachedConfig;
  }

  if (!force && loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch(`${SCHEDULE_URL}?v=${Date.now()}`, { cache: "no-store" });

      if (!response.ok) {
        return null;
      }

      const config = (await response.json()) as ScheduleConfig;
      cachedConfig = config;
      return config;
    } catch {
      return null;
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

export function isPublishConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SCHEDULE_PUBLISH_TOKEN?.trim());
}

export async function publishSchedule(config: ScheduleConfig): Promise<void> {
  const token = import.meta.env.VITE_SCHEDULE_PUBLISH_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "Live publish is not configured on this build. Add SCHEDULE_PUBLISH_TOKEN to the GitHub repository secrets and redeploy.",
    );
  }

  const payload = JSON.stringify({ ...config, updatedAt: new Date().toISOString() }, null, 2);
  const paths = ["public/schedule.json", "schedule.json"];

  for (const path of paths) {
    await publishFileToGitHub(path, payload, token, DEFAULT_REPO);
  }

  cachedConfig = null;
  loadPromise = null;
}

async function publishFileToGitHub(
  path: string,
  content: string,
  token: string,
  repo: string,
): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const existingResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers });
  let sha: string | undefined;

  if (existingResponse.ok) {
    const existing = (await existingResponse.json()) as { sha: string };
    sha = existing.sha;
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update appointment schedule from Blazeo admin",
      content: encoded,
      sha,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Failed to publish ${path} to GitHub.`);
  }
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
