import * as React from "react";
import { useEffect, useState } from "react";
import type { ScheduleConfig } from "../types/schedule";
import { DAY_KEYS, DAY_LABELS, SLOT_OPTIONS } from "../utils/scheduleConstants";
import {
  downloadScheduleConfig,
  getDefaultScheduleConfig,
  isPublishConfigured,
  loadScheduleConfig,
  publishSchedule,
} from "../utils/scheduleConfig";
import { CalendarBoard } from "./CalendarBoard";

type AdminTab = "hours" | "weeks";

export function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("weeks");
  const [config, setConfig] = useState<ScheduleConfig>(() => getDefaultScheduleConfig());
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadScheduleConfig(true).then((loaded) => {
      if (loaded) {
        setConfig(loaded);
      }
      setLoading(false);
    });
  }, []);

  const saveToLiveWidget = async (
    nextConfig: ScheduleConfig,
    message = "Schedule saved. The live widget updates worldwide in about 1-2 minutes.",
  ) => {
    const updated = { ...nextConfig, updatedAt: new Date().toISOString() };

    setSaving(true);
    setStatus("Saving to live widget...");
    setStatusType("");

    try {
      await publishSchedule(updated);
      setConfig(updated);
      setStatus(message);
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save schedule.");
      setStatusType("error");
    } finally {
      setSaving(false);
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
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-actions">
          <a className="admin-button secondary" href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noreferrer">
            Preview widget
          </a>
          <button type="button" className="admin-button secondary" onClick={() => downloadScheduleConfig(config)}>
            Download schedule.json
          </button>
        </div>
        <p className="admin-note admin-toolbar-note">
          {isPublishConfigured()
            ? "Saving applies changes to the live widget for all visitors."
            : "Live publish is not enabled on this build yet."}
        </p>
      </div>

      {status && <div className={`admin-status ${statusType}`}>{status}</div>}

      {tab === "weeks" && (
        <CalendarBoard
          config={config}
          onChange={(next) => saveToLiveWidget(next)}
          saving={saving}
        />
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
                    disabled={saving}
                    onChange={(event) =>
                      setConfig((current) => ({
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
                  disabled={config.businessHours[day].closed || saving}
                  onChange={(event) =>
                    setConfig((current) => ({
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
                  disabled={config.businessHours[day].closed || saving}
                  onChange={(event) =>
                    setConfig((current) => ({
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
                        disabled={saving}
                        onChange={() =>
                          setConfig((current) => {
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

          <div className="admin-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="admin-button primary"
              disabled={saving}
              onClick={() => saveToLiveWidget(config, "Business hours saved to the live widget.")}
            >
              {saving ? "Saving..." : "Save business hours"}
            </button>
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
