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

type AdminTab = "hours" | "weeks" | "publish";

const TOKEN_STORAGE_KEY = "blazeo-admin-github-token";

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createTemplateWeek(startDate: string): WeekSchedule {
  const endDate = addDays(startDate, 6);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${startDate}T12:00:00`));
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${endDate}T12:00:00`));

  return {
    id: createWeekId(),
    label: `Week of ${startLabel}-${endLabel}`,
    startDate,
    endDate,
    rules: [
      {
        id: createRuleId(),
        label: "If Monday",
        days: ["monday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 1),
      },
      {
        id: createRuleId(),
        label: "If Tuesday",
        days: ["tuesday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 2),
      },
      {
        id: createRuleId(),
        label: "If Wednesday",
        days: ["wednesday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 3),
      },
      {
        id: createRuleId(),
        label: "If Thursday",
        days: ["thursday"],
        timeCondition: "all",
        targetDate: addDays(startDate, 4),
      },
      {
        id: createRuleId(),
        label: "If Friday before 5pm",
        days: ["friday"],
        timeCondition: "before",
        time: "17:00",
        targetDate: addDays(startDate, 7),
      },
      {
        id: createRuleId(),
        label: "If Friday after 5pm, Saturday, or Sunday",
        days: ["friday", "saturday", "sunday"],
        timeCondition: "after",
        time: "17:00",
        targetDate: addDays(startDate, 8),
      },
    ],
  };
}

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
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
    }

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

  const updateWeek = (weekId: string, week: WeekSchedule) => {
    updateConfig((current) => ({
      ...current,
      weeks: current.weeks.map((item) => (item.id === weekId ? week : item)),
    }));
  };

  const addWeek = () => {
    const lastWeek = sortedWeeks[sortedWeeks.length - 1];
    const startDate = lastWeek ? addDays(lastWeek.startDate, 7) : new Date().toISOString().slice(0, 10);
    updateConfig((current) => ({
      ...current,
      weeks: [...current.weeks, createTemplateWeek(startDate)],
    }));
  };

  const handlePublish = async () => {
    setStatus("");
    setStatusType("");

    if (!token.trim()) {
      downloadScheduleConfig(config);
      setStatus("No GitHub token provided. Downloaded schedule.json — place it in public/schedule.json and push to deploy.");
      setStatusType("success");
      return;
    }

    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
      await publishScheduleToGitHub(config, token.trim());
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
      </div>

      {tab === "hours" && (
        <section className="admin-card">
          <h2>Business Hours (Eastern Time)</h2>
          <p className="admin-note">Set when the office is open. Agents see OPEN/CLOSED in the widget.</p>
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
          <div className="admin-actions" style={{ marginBottom: 16 }}>
            <button type="button" className="admin-button primary" onClick={addWeek}>
              + Add week from template
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
                  <label>Week label</label>
                  <input
                    value={week.label}
                    onChange={(event) => updateWeek(week.id, { ...week, label: event.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={week.startDate}
                    onChange={(event) => updateWeek(week.id, { ...week, startDate: event.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={week.endDate}
                    onChange={(event) => updateWeek(week.id, { ...week, endDate: event.target.value })}
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

          <div className="admin-token-box">
            <div className="admin-field">
              <label>GitHub personal access token (optional)</label>
              <input
                type="password"
                value={token}
                placeholder="ghp_..."
                onChange={(event) => setToken(event.target.value)}
              />
              <span>
                Token needs <code>repo</code> scope. Stored only in this browser session. Without a token, you can
                download the JSON file instead.
              </span>
            </div>
          </div>

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
    </div>
  );
}

export default AdminApp;
