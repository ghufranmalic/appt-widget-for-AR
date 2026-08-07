const TOKEN_KEY = "blazeo-admin-github-token";
const REPO_KEY = "blazeo-admin-github-repo";
const DEFAULT_REPO = "ghufranmalic/appt-widget-for-AR";

export interface AdminSettings {
  githubToken: string;
  githubRepo: string;
}

export function loadAdminSettings(): AdminSettings {
  return {
    githubToken: localStorage.getItem(TOKEN_KEY) ?? "",
    githubRepo: localStorage.getItem(REPO_KEY) ?? DEFAULT_REPO,
  };
}

export function saveAdminSettings(settings: AdminSettings): void {
  if (settings.githubToken.trim()) {
    localStorage.setItem(TOKEN_KEY, settings.githubToken.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  localStorage.setItem(REPO_KEY, settings.githubRepo.trim() || DEFAULT_REPO);
}

export function clearAdminSettings(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REPO_KEY);
}

export function hasSavedGitHubToken(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}
