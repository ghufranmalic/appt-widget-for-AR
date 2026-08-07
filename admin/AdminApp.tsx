import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import type { DayKey, ScheduleConfig, ScheduleRule, WeekSchedule } from "../types/schedule";
import { createDefaultScheduleConfig } from "../utils/defaultSchedule";
import {
  createRuleId,
  createWeekId,
  DAY_KEYS,
  DAY_LABELS,
  SLOT_OPTIONS,
} from "../utils/scheduleConstants";
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
import {
  addDays,
  createTemplateWeek,
  findCoverageGaps,
  formatWeekLabel,
  generateWeeksForMonth,
  summarizeCoverageGaps,
} from "../utils/weekSchedule";

type AdminTab = "hours" | "weeks" | "publish" | "settings";

function RuleEditor({
  rule,
  onChange,
  onDelete,
}: {
  rule: ScheduleRule;
  onChange: (rule: ScheduleRule) => void;
  onDelete: () => void;
}) {
  const toggleSlot = (value: string) => {
    const current = rule.slots ?? [];
    const slots = current.includes(value) ? current.filter((slot) => slot !== value) : [...current, value];
    onChange({ ...rule, slots });
  };

  return (
    <div className="admin-row">
      <div className="admin-field">
        <label>When</label>
        <input value={rule.label} onChange={(event) => onChange({ ...rule, label: event.target.value })} />
      </div>
      <div className="admin-field">
        <label>Days</label>
        <select
          multiple
          value={rule.days}
          onChange={(event) =>
            onChange({
              ...rule,
              days: Array.from(event.target.selectedOptions).map((option) => option.value as DayKey),
            })
          }
          size={4}
        >
          {DAY_KEYS.map((day) => (
            <option key={day} value={day}>
              {DAY_LABELS[day]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-field">
        <label>Time rule</label>
        <select
          value={rule.timeCondition}
          onChange={(event) =>
            onChange({ ...rule, timeCondition: event.target.value as ScheduleRule["timeCondition"] })
          }
        >
          <option value="all">All day</option>
          <option value="before">Before time</option>
          <option value="after">After time / weekend</option>
          <option value="business_hours">During business hours</option>
        </select>
        {(rule.timeCondition === "before" || rule.timeCondition === "after") && (
          <input
            type="time"
            value={rule.time ?? "17:00"}
            onChange={(event) => onChange({ ...rule, time: event.target.value })}
          />
        )}
      </div>
      <div className="admin-field">
        <label>Schedule for (date)</label>
        <input
          type="date"
          value={rule.targetDate}
          onChange={(event) => onChange({ ...rule, targetDate: event.target.value })}
        />
        <div className="slot-checkboxes">
          {SLOT_OPTIONS.map((slot) => (
            <label key={slot.value}>
              <input
                type="checkbox"
                checked={(rule.slots ?? []).includes(slot.value)}
                onChange={() => toggleSlot(slot.value)}
              />
              {slot.label}
            </label>
          ))}
        </div>
        <span>Leave slots unchecked to use default slots for that day.</span>
      </div>
      <button type="button" className="admin-button danger" onClick={onDelete}>
        Remove
      </button>
    </div>
  );
}

export function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("weeks");
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultScheduleConfig());
  const [settings, setSettings] = useState(() => loadAdminSettings());
  const [tokenSaved, setTokenSaved] = useState(() => hasSavedGitHubToken());
  const [generateMonth, setGenerateMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
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

  const sortedWeeks = useMemo(
    () => [...config.weeks].sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [config.weeks],
  );

  const updateConfig = (updater: (current: ScheduleConfig) => ScheduleConfig) => {
    setConfig((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  };

  const coverageMessage = useMemo(
    () => summarizeCoverageGaps(findCoverageGaps(sortedWeeks)),
    [sortedWeeks],
  );

  const updateWeek = (weekId: string, week: WeekSchedule) => {
    updateConfig((current) => ({
      ...current,
      weeks: current.weeks.map((item) => (item.id === weekId ? week : item)),
    }));
  };

  const updateWeekDates = (weekId: string, week: WeekSchedule, startDate: string, endDate: string) => {
    updateWeek(weekId, {
      ...week,
      startDate,
      endDate,
      label: formatWeekLabel(startDate, endDate),
    });
  };

  const addWeek = () => {
    const lastWeek = sortedWeeks[sortedWeeks.length - 1];
    const startDate = lastWeek ? addDays(lastWeek.startDate, 7) : new Date().toISOString().slice(0, 10);
    updateConfig((current) => ({
      ...current,
      weeks: [...current.weeks, createTemplateWeek(startDate)],
    }));
  };

  const addMonthWeeks = () => {
    const [yearPart, monthPart] = generateMonth.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    const created = generateWeeksForMonth(year, month, config.weeks);

    if (created.length === 0) {
      setStatus("No new weeks were added. This month may already be covered.");
      setStatusType("error");
      return;
    }

    updateConfig((current) => ({
      ...current,
      weeks: [...current.weeks, ...created],
    }));
    setStatus(`Added ${created.length} week(s) for ${generateMonth}. Review the target dates, then publish.`);
    setStatusType("success");
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
          Weekly Schedule
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === "hours" ? "active" : ""}`}
          onClick={() => setTab("hours")}
        >
          Business Hours & Slots
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
          <p className="admin-note">Used when a weekly rule does not specify custom slots.</p>
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

      {tab === "weeks" && (
        <>
          <section className="admin-card admin-info-card">
            <h2>How weeks work</h2>
            <p className="admin-note">
              Each week is active only between its <strong>start</strong> and <strong>end</strong> dates (with year).
              August 2026, September 2026, October 2027, and so on each need their own weeks added — labels are
              generated automatically from the dates you pick.
            </p>
            <p className={`admin-status ${findCoverageGaps(sortedWeeks).length ? "error" : "success"}`}>
              {coverageMessage}
            </p>
          </section>

          <div className="admin-actions" style={{ marginBottom: 16 }}>
            <div className="admin-field" style={{ minWidth: 180 }}>
              <label>Generate weeks for month</label>
              <input
                type="month"
                value={generateMonth}
                onChange={(event) => setGenerateMonth(event.target.value)}
              />
            </div>
            <button type="button" className="admin-button primary" onClick={addMonthWeeks}>
              + Add month
            </button>
            <button type="button" className="admin-button secondary" onClick={addWeek}>
              + Add single week
            </button>
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => updateConfig(() => createDefaultScheduleConfig())}
            >
              Reset to sample August weeks
            </button>
          </div>

          {sortedWeeks.map((week) => (
            <section key={week.id} className="admin-card">
              <div className="week-header">
                <h2>{week.label}</h2>
                <button
                  type="button"
                  className="admin-button danger"
                  onClick={() =>
                    updateConfig((current) => ({
                      ...current,
                      weeks: current.weeks.filter((item) => item.id !== week.id),
                    }))
                  }
                >
                  Delete week
                </button>
              </div>

              <div className="week-meta">
                <div className="admin-field">
                  <label>Week label (auto-generated)</label>
                  <input value={week.label} readOnly />
                </div>
                <div className="admin-field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={week.startDate}
                    onChange={(event) =>
                      updateWeekDates(week.id, week, event.target.value, week.endDate)
                    }
                  />
                </div>
                <div className="admin-field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={week.endDate}
                    onChange={(event) =>
                      updateWeekDates(week.id, week, week.startDate, event.target.value)
                    }
                  />
                </div>
              </div>

              {week.rules.map((rule) => (
                <RuleEditor
                  key={rule.id}
                  rule={rule}
                  onChange={(updated) =>
                    updateWeek(week.id, {
                      ...week,
                      rules: week.rules.map((item) => (item.id === updated.id ? updated : item)),
                    })
                  }
                  onDelete={() =>
                    updateWeek(week.id, {
                      ...week,
                      rules: week.rules.filter((item) => item.id !== rule.id),
                    })
                  }
                />
              ))}

              <button
                type="button"
                className="admin-button secondary"
                onClick={() =>
                  updateWeek(week.id, {
                    ...week,
                    rules: [
                      ...week.rules,
                      {
                        id: createRuleId(),
                        label: "New rule",
                        days: ["monday"],
                        timeCondition: "all",
                        targetDate: week.startDate,
                      },
                    ],
                  })
                }
              >
                + Add rule
              </button>
            </section>
          ))}
        </>
      )}

      {tab === "publish" && (
        <section className="admin-card">
          <h2>Publish to Widget</h2>
          <p className="admin-note">
            No database needed. The widget reads <code>schedule.json</code> from this site. When you publish,
            changes go live for all agents after GitHub Pages redeploys.
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
            Save your GitHub token here once. It stays in this browser only (localStorage) so you do not need to enter
            it every time you publish.
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
