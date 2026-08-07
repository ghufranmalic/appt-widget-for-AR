import * as React from "react";
import { useEffect, useState } from "react";
import type { ScheduleConfig } from "../types/schedule";
import { DAY_KEYS, DAY_LABELS, SLOT_OPTIONS } from "../utils/scheduleConstants";
import {
  clearScheduleOverride,
  downloadScheduleConfig,
  getDefaultScheduleConfig,
  hasScheduleOverride,
  loadScheduleConfig,
  saveScheduleToBrowser,
} from "../utils/scheduleConfig";
import { CalendarBoard } from "./CalendarBoard";

type AdminTab = "hours" | "weeks";

export function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("weeks");
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultScheduleConfig());
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);
  const [usingLocalSchedule, setUsingLocalSchedule] = useState(false);

  useEffect(() => {
    loadScheduleConfig().then((loaded) => {
      if (loaded) {
        setConfig(loaded);
        setUsingLocalSchedule(hasScheduleOverride());
      }
      setLoading(false);
    });
  }, []);

  const updateConfig = (
    updater: ScheduleConfig | ((current: ScheduleConfig) => ScheduleConfig),
    message = "Schedule saved and applied to the widget.",
  ) => {
    const next = typeof updater === "function" ? updater(config) : updater;
    const updated = { ...next, updatedAt: new Date().toISOString() };
    saveScheduleToBrowser(updated);
    setConfig(updated);
    setUsingLocalSchedule(true);
    setStatus(message);
    setStatusType("success");
  };

  const handleResetToLive = async () => {
    clearScheduleOverride();
    const loaded = await loadScheduleConfig(true);
    if (loaded) {
      setConfig(loaded);
      setUsingLocalSchedule(false);
      setStatus("Loaded the live schedule from schedule.json.");
      setStatusType("success");
      return;
    }

    setStatus("Could not load schedule.json. Using defaults.");
    setStatusType("error");
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
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <a className="admin-button secondary" href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noreferrer">
            Preview widget
          </a>
          <button type="button" className="admin-button secondary" onClick={() => downloadScheduleConfig(config)}>
            Download schedule.json
          </button>
          <button type="button" className="admin-button secondary" onClick={handleResetToLive}>
            Reset to live schedule
          </button>
        </div>
        <p className="admin-note admin-toolbar-note">
          {usingLocalSchedule
            ? "Your changes are saved in this browser and applied to the widget automatically."
            : "Showing the live schedule from schedule.json."}
        </p>
      </div>

      {status && <div className={`admin-status ${statusType}`}>{status}</div>}

      {tab === "weeks" && <CalendarBoard config={config} onChange={updateConfig} />}

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

          <p className="admin-note" style={{ marginTop: 16 }}>
            Last updated: {new Date(config.updatedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
          </p>
        </section>
      )}
    </div>
  );
}

export default AdminApp;
