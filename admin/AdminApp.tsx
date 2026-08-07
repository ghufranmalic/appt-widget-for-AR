import * as React from "react";
import { useEffect, useState } from "react";
import type { ScheduleConfig } from "../types/schedule";
import { createDefaultScheduleConfig } from "../utils/defaultSchedule";
import { DAY_KEYS, DAY_LABELS, SLOT_OPTIONS } from "../utils/scheduleConstants";
import {
  downloadScheduleConfig,
  getDefaultScheduleConfig,
  loadScheduleConfig,
  publishScheduleToGitHub,
} from "../utils/scheduleConfig";
import {
  clearAdminSettings,
  hasSavedGitHubToken,
  loadAdminSettings,
  saveAdminSettings,
} from "../utils/adminSettings";
import { MonthScheduleBoard } from "./MonthBoard";

type AdminTab = "hours" | "weeks" | "publish" | "settings";

export function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("weeks");
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultScheduleConfig());
  const [settings, setSettings] = useState(() => loadAdminSettings());
  const [tokenSaved, setTokenSaved] = useState(() => hasSavedGitHubToken());
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduleConfig(true).then((loaded) => {
      if (loaded) {
        setConfig(loaded);
      }
      setLoading(false);
    });
  }, []);

  const updateConfig = (updater: ScheduleConfig | ((current: ScheduleConfig) => ScheduleConfig)) => {
    setConfig((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  };

  const handleSaveSettings = () => {
    saveAdminSettings(settings);
    setTokenSaved(hasSavedGitHubToken());
    setStatus("GitHub settings saved in this browser. You will not need to enter the token again.");
    setStatusType("success");
  };

  const handlePublish = async () => {
    setStatus("");
    setStatusType("");
    const saved = loadAdminSettings();

    if (!saved.githubToken.trim()) {
      downloadScheduleConfig(config);
      setStatus("No saved GitHub token. Downloaded schedule.json — save your token under Settings for one-click publish.");
      setStatusType("error");
      return;
    }

    try {
      await publishScheduleToGitHub(config, saved.githubToken, saved.githubRepo);
      setStatus("Schedule published to GitHub. The widget will update after Pages deploys (about 1-2 minutes).");
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed.");
      setStatusType("error");
    }
  };

  if (loading) {
    return <div className="admin-shell">Loading schedule...</div>;
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-branding">
          <img src={config.provider.logoUrl} alt="Blazeo logo" />
          <div>
            <h1>Appointment Schedule Admin</h1>
            <p>Powered by Blazeo for {config.business.name}</p>
          </div>
        </div>
        <div className="admin-client">
          <strong>{config.business.name}</strong>
          <a href={config.business.website} target="_blank" rel="noreferrer">
            {config.business.website}
          </a>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${tab === "weeks" ? "active" : ""}`}
          onClick={() => setTab("weeks")}
        >
          Monthly Schedule
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === "hours" ? "active" : ""}`}
          onClick={() => setTab("hours")}
        >
          Business Hours
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === "publish" ? "active" : ""}`}
          onClick={() => setTab("publish")}
        >
          Publish
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {status && tab !== "publish" && tab !== "settings" && (
        <div className={`admin-status ${statusType}`}>{status}</div>
      )}

      {tab === "weeks" && <MonthScheduleBoard config={config} onChange={updateConfig} />}

      {tab === "hours" && (
        <section className="admin-card">
          <h2>Business Hours (Eastern Time)</h2>
          <p className="admin-note">
            Allied Remodeling operates Monday–Friday, 9:00 AM–5:00 PM EST. Saturday and Sunday are closed.
          </p>
          <div className="admin-grid hours">
            {DAY_KEYS.map((day) => (
              <div key={day} className="admin-field">
                <label>{DAY_LABELS[day]}</label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(config.businessHours[day].closed)}
                    onChange={(event) =>
                      updateConfig((current) => ({
                        ...current,
                        businessHours: {
                          ...current.businessHours,
                          [day]: { ...current.businessHours[day], closed: event.target.checked },
                        },
                      }))
                    }
                  />
                  Closed
                </label>
                <input
                  type="time"
                  value={config.businessHours[day].open}
                  disabled={config.businessHours[day].closed}
                  onChange={(event) =>
                    updateConfig((current) => ({
                      ...current,
                      businessHours: {
                        ...current.businessHours,
                        [day]: { ...current.businessHours[day], open: event.target.value },
                      },
                    }))
                  }
                />
                <input
                  type="time"
                  value={config.businessHours[day].close}
                  disabled={config.businessHours[day].closed}
                  onChange={(event) =>
                    updateConfig((current) => ({
                      ...current,
                      businessHours: {
                        ...current.businessHours,
                        [day]: { ...current.businessHours[day], close: event.target.value },
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Default Appointment Slots</h3>
          <p className="admin-note">Used when a rule does not specify custom slots.</p>
          <div className="admin-grid hours">
            {DAY_KEYS.map((day) => (
              <div key={day} className="admin-field">
                <label>{DAY_LABELS[day]}</label>
                <div className="slot-checkboxes">
                  {SLOT_OPTIONS.map((slot) => (
                    <label key={slot.value}>
                      <input
                        type="checkbox"
                        checked={config.defaultSlots[day].includes(slot.value)}
                        onChange={() =>
                          updateConfig((current) => {
                            const currentSlots = current.defaultSlots[day];
                            const slots = currentSlots.includes(slot.value)
                              ? currentSlots.filter((value) => value !== slot.value)
                              : [...currentSlots, slot.value];

                            return {
                              ...current,
                              defaultSlots: { ...current.defaultSlots, [day]: slots },
                            };
                          })
                        }
                      />
                      {slot.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "publish" && (
        <section className="admin-card">
          <h2>Publish to Widget</h2>
          <p className="admin-note">
            The widget reads <code>schedule.json</code>. Publish after updating the current or upcoming month.
          </p>

          {tokenSaved ? (
            <p className="admin-status success">
              GitHub token is saved in this browser. Click publish below — no need to re-enter it.
            </p>
          ) : (
            <p className="admin-status error">
              Set up your GitHub token once under the <strong>Settings</strong> tab to enable one-click publish.
            </p>
          )}

          <div className="admin-actions" style={{ marginTop: 16 }}>
            <button type="button" className="admin-button primary" onClick={handlePublish}>
              Publish schedule
            </button>
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => downloadScheduleConfig(config)}
            >
              Download schedule.json
            </button>
            <a className="admin-button secondary" href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noreferrer">
              Preview widget
            </a>
          </div>

          {status && <div className={`admin-status ${statusType}`}>{status}</div>}

          <p className="admin-note" style={{ marginTop: 16 }}>
            Last updated: {new Date(config.updatedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
          </p>
        </section>
      )}

      {tab === "settings" && (
        <section className="admin-card">
          <h2>One-time GitHub setup</h2>
          <p className="admin-note">
            Save your GitHub token here once. It stays in this browser only (localStorage).
          </p>

          <div className="admin-token-box">
            <div className="admin-field">
              <label>GitHub personal access token</label>
              <input
                type="password"
                value={settings.githubToken}
                placeholder="ghp_..."
                onChange={(event) => setSettings({ ...settings, githubToken: event.target.value })}
              />
              <span>Token needs <code>repo</code> scope to update schedule.json in the repository.</span>
            </div>
            <div className="admin-field">
              <label>GitHub repository</label>
              <input
                value={settings.githubRepo}
                onChange={(event) => setSettings({ ...settings, githubRepo: event.target.value })}
              />
              <span>Format: owner/repo (example: ghufranmalic/appt-widget-for-AR)</span>
            </div>
          </div>

          <div className="admin-actions" style={{ marginTop: 16 }}>
            <button type="button" className="admin-button primary" onClick={handleSaveSettings}>
              Save settings
            </button>
            <button
              type="button"
              className="admin-button danger"
              onClick={() => {
                clearAdminSettings();
                setSettings(loadAdminSettings());
                setTokenSaved(false);
                setStatus("Saved GitHub settings cleared from this browser.");
                setStatusType("success");
              }}
            >
              Clear saved token
            </button>
          </div>

          {status && <div className={`admin-status ${statusType}`}>{status}</div>}
        </section>
      )}
    </div>
  );
}

export default AdminApp;
