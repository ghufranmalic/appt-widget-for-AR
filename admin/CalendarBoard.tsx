import { useEffect, useMemo, useState } from "react";
import type { ScheduleConfig, TimeCondition } from "../types/schedule";
import {
  applyDayRulesToConfig,
  buildCalendarWeeks,
  clearRulesForSelection,
  createDayRuleEntry,
  DayRuleEntry,
  formatDayHeading,
  formatMonthLabel,
  formatSelectionLabel,
  formatShortDate,
  getCurrentYearMonth,
  getDayKeyFromIso,
  getDaysInMonth,
  getMonthDateList,
  isDateConfigured,
  loadDayRuleEntries,
  shiftMonth,
} from "../utils/calendarSchedule";
import { DAY_LABELS, SLOT_OPTIONS } from "../utils/scheduleConstants";

interface CalendarBoardProps {
  config: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void | Promise<void>;
  saving?: boolean;
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_CONDITION_OPTIONS: Array<{ value: TimeCondition; label: string; time?: string }> = [
  { value: "all", label: "All day" },
  { value: "business_hours", label: "Business hours only" },
  { value: "before", label: "Before 5:00 PM", time: "17:00" },
  { value: "after", label: "After 5:00 PM", time: "17:00" },
];

function timeConditionKey(entry: DayRuleEntry): string {
  return `${entry.timeCondition}:${entry.time ?? ""}`;
}

export function CalendarBoard({ config, onChange, saving = false }: CalendarBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [dayRules, setDayRules] = useState<DayRuleEntry[]>([]);

  const [yearPart, monthPart] = selectedMonth.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  useEffect(() => {
    if (selectedDates.length === 0) {
      setDayRules([]);
      return;
    }

    setDayRules(loadDayRuleEntries(config.weeks, selectedDates));
  }, [selectedDates, config.weeks]);

  const updateSelection = (dates: string[]) => {
    const unique = [...new Set(dates)].sort();
    setSelectedDates(unique);
  };

  const toggleDate = (isoDate: string, shiftKey: boolean) => {
    if (!isoDate) {
      return;
    }

    if (shiftKey && lastClicked) {
      const start = [lastClicked, isoDate].sort()[0];
      const end = [lastClicked, isoDate].sort()[1];
      const range: string[] = [];
      const cursor = new Date(`${start}T12:00:00`);

      while (cursor.toISOString().slice(0, 10) <= end) {
        range.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }

      updateSelection(range);
      return;
    }

    setLastClicked(isoDate);
    updateSelection(
      selectedSet.has(isoDate)
        ? selectedDates.filter((date) => date !== isoDate)
        : [...selectedDates, isoDate],
    );
  };

  const selectWeek = (weekIndex: number) => {
    const dates =
      weeks[weekIndex]?.days
        .filter((cell) => cell.inMonth)
        .map((cell) => cell.isoDate)
        .filter(Boolean) ?? [];
    updateSelection(dates);
  };

  const selectMonth = () => {
    updateSelection(getMonthDateList(year, month));
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setDayRules([]);
    setLastClicked(null);
  };

  const removeSelectedDate = (isoDate: string) => {
    updateSelection(selectedDates.filter((date) => date !== isoDate));
  };

  const updateDayRule = (isoDate: string, patch: Partial<DayRuleEntry>) => {
    setDayRules((current) =>
      current.map((entry) => (entry.isoDate === isoDate ? { ...entry, ...patch } : entry)),
    );
  };

  const applySameDateToAll = (targetDate: string) => {
    setDayRules((current) => current.map((entry) => ({ ...entry, targetDate })));
  };

  const applyRules = () => {
    onChange(applyDayRulesToConfig(config, dayRules));
  };

  const clearRules = () => {
    onChange(clearRulesForSelection(config, selectedDates));
    clearSelection();
  };

  const resetDayRule = (isoDate: string) => {
    updateDayRule(isoDate, createDayRuleEntry(config.weeks, isoDate));
  };

  return (
    <section className="admin-card calendar-board-card">
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="month-toolbar">
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            >
              ← Prev
            </button>
            <div className="month-toolbar-title">
              <h2>{formatMonthLabel(year, month)}</h2>
              <p>Click days to select · Shift+click for a range · W1–W6 selects a week</p>
            </div>
            <input
              className="month-picker"
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                clearSelection();
              }}
            />
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            >
              Next →
            </button>
          </div>

          <div className="calendar-select-bar">
            <button type="button" className="admin-button secondary" onClick={selectMonth}>
              Select entire month
            </button>
            <button type="button" className="admin-button secondary" onClick={clearSelection}>
              Clear selection
            </button>
            <span className="calendar-selection-count">
              {selectedDates.length > 0 ? `${selectedDates.length} day(s) selected` : "No days selected"}
            </span>
          </div>

          {selectedDates.length > 0 && (
            <div className="calendar-chips">
              {selectedDates.map((isoDate) => (
                <button
                  key={isoDate}
                  type="button"
                  className="calendar-chip"
                  onClick={() => removeSelectedDate(isoDate)}
                  title="Remove from selection"
                >
                  {formatShortDate(isoDate)} ×
                </button>
              ))}
            </div>
          )}

          <div className="calendar-grid">
            <div className="calendar-head-row">
              <div className="calendar-week-label head">Week</div>
              {WEEKDAY_HEADERS.map((label) => (
                <div key={label} className="calendar-head-cell">
                  {label}
                </div>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week.weekIndex} className="calendar-week-row">
                <button
                  type="button"
                  className="calendar-week-label"
                  onClick={() => selectWeek(week.weekIndex)}
                >
                  W{week.weekIndex + 1}
                </button>
                {week.days.map((cell, index) => {
                  if (!cell.inMonth) {
                    return <div key={`empty-${week.weekIndex}-${index}`} className="calendar-day empty" />;
                  }

                  const configured = isDateConfigured(config.weeks, cell.isoDate);
                  const selected = selectedSet.has(cell.isoDate);

                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      aria-pressed={selected}
                      className={`calendar-day ${selected ? "selected" : ""} ${configured ? "configured" : ""}`}
                      onClick={(event) => toggleDate(cell.isoDate, event.shiftKey)}
                    >
                      <span className="calendar-day-number">{cell.day}</span>
                      {configured && <span className="calendar-day-dot" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="admin-note calendar-legend">
            Green dots = dates that already have rules saved. Blue highlight = your current selection.
          </p>
        </div>

        <aside className="calendar-panel">
          <h3>Appointment rules</h3>
          {selectedDates.length === 0 ? (
            <div className="calendar-panel-empty">
              <p className="admin-note">
                <strong>How it works:</strong> pick a date on the calendar, then choose which appointment date the
                widget should offer when visitors come on that day.
              </p>
              <ol className="calendar-steps">
                <li>Click a day on the calendar (blue highlight)</li>
                <li>Set the <strong>offer date</strong> in the panel that appears here</li>
                <li>Click <strong>Save rules</strong> to push changes to the live widget</li>
              </ol>
            </div>
          ) : (
            <>
              <div className="calendar-how-to">
                <strong>Set the rule for each selected day below.</strong>
                <p>
                  Example: if visitors come on <em>{formatDayHeading(selectedDates[0])}</em>, which appointment date
                  should agents offer?
                </p>
              </div>

              <div className="calendar-panel-intro">
                <p className="calendar-selection-summary">
                  <strong>{formatSelectionLabel(selectedDates)}</strong>
                  <span>{selectedDates.length} day(s) selected</span>
                </p>
              </div>

              {selectedDates.length > 1 && (
                <label className="calendar-bulk-field">
                  <span>Apply the same offer date to every selected day</span>
                  <input type="date" onChange={(event) => applySameDateToAll(event.target.value)} />
                </label>
              )}

              <div className="day-rule-list">
                {dayRules.map((entry) => {
                  const dayKey = getDayKeyFromIso(entry.isoDate);

                  return (
                    <article key={entry.isoDate} className="day-rule-card">
                      <div className="day-rule-flow">
                        <div className="day-rule-flow-step">
                          <span className="day-rule-step-label">If visitors come on</span>
                          <strong>{formatDayHeading(entry.isoDate)}</strong>
                        </div>
                        <div className="day-rule-flow-arrow" aria-hidden="true">
                          →
                        </div>
                        <div className="day-rule-flow-step day-rule-flow-step-offer">
                          <span className="day-rule-step-label">Offer appointment on</span>
                          <input
                            type="date"
                            value={entry.targetDate}
                            onChange={(event) =>
                              updateDayRule(entry.isoDate, { targetDate: event.target.value })
                            }
                          />
                        </div>
                      </div>

                      <p className="day-rule-preview">
                        Widget will offer <strong>{formatDayHeading(entry.targetDate)}</strong> when visitors come on{" "}
                        <strong>{formatDayHeading(entry.isoDate)}</strong>.
                      </p>

                      <details className="day-rule-advanced">
                        <summary>More options (time window &amp; slots)</summary>

                        <label className="day-rule-field">
                          <span>Visitor time window</span>
                          <select
                            value={timeConditionKey(entry)}
                            onChange={(event) => {
                              const option = TIME_CONDITION_OPTIONS.find(
                                (item) => `${item.value}:${item.time ?? ""}` === event.target.value,
                              );
                              if (!option) {
                                return;
                              }

                              updateDayRule(entry.isoDate, {
                                timeCondition: option.value,
                                time: option.time,
                              });
                            }}
                          >
                            {TIME_CONDITION_OPTIONS.map((option) => (
                              <option
                                key={`${option.value}:${option.time ?? ""}`}
                                value={`${option.value}:${option.time ?? ""}`}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="day-rule-field">
                          <span>Appointment slots (optional)</span>
                          <div className="slot-checkboxes day-rule-slots">
                            {SLOT_OPTIONS.map((slot) => (
                              <label key={slot.value}>
                                <input
                                  type="checkbox"
                                  checked={entry.slots?.includes(slot.value) ?? false}
                                  onChange={() => {
                                    const currentSlots = entry.slots ?? [];
                                    const slots = currentSlots.includes(slot.value)
                                      ? currentSlots.filter((value) => value !== slot.value)
                                      : [...currentSlots, slot.value];

                                    updateDayRule(entry.isoDate, {
                                      slots: slots.length > 0 ? slots : undefined,
                                    });
                                  }}
                                />
                                {slot.label}
                              </label>
                            ))}
                          </div>
                          <span className="day-rule-hint">
                            Leave unchecked to use default {DAY_LABELS[dayKey]} slots from Business Hours.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="day-rule-reset"
                          onClick={() => resetDayRule(entry.isoDate)}
                        >
                          Reset this day to defaults
                        </button>
                      </details>
                    </article>
                  );
                })}
              </div>

              <div className="admin-actions calendar-panel-actions">
                <button type="button" className="admin-button primary" onClick={applyRules} disabled={saving}>
                  {saving ? "Saving..." : "Save rules"}
                </button>
                <button type="button" className="admin-button danger" onClick={clearRules} disabled={saving}>
                  Clear rules
                </button>
              </div>
              <p className="admin-note calendar-save-note">
                Saving updates the live widget for all visitors worldwide (about 1-2 minutes to deploy).
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
