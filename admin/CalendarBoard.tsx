import { useMemo, useState } from "react";
import type { ScheduleConfig, ScheduleRule } from "../types/schedule";
import {
  applyRulesToSelection,
  buildCalendarWeeks,
  clearRulesForSelection,
  formatMonthLabel,
  formatSelectionLabel,
  formatShortDate,
  getCurrentYearMonth,
  getDaysInMonth,
  getMonthDateList,
  isDateConfigured,
  loadRulesForSelection,
  RULE_TEMPLATES,
  shiftMonth,
} from "../utils/calendarSchedule";

interface CalendarBoardProps {
  config: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
}

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarBoard({ config, onChange }: CalendarBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [rules, setRules] = useState<ScheduleRule[]>([]);

  const [yearPart, monthPart] = selectedMonth.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const syncRulesForSelection = (dates: string[]) => {
    setSelectedDates(dates);
    setRules(loadRulesForSelection(config.weeks, dates));
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

      syncRulesForSelection(range);
      return;
    }

    setLastClicked(isoDate);
    const next = selectedSet.has(isoDate)
      ? selectedDates.filter((date) => date !== isoDate)
      : [...selectedDates, isoDate];
    syncRulesForSelection(next);
  };

  const selectWeek = (weekIndex: number) => {
    const dates = weeks[weekIndex]?.days
      .filter((cell) => cell.inMonth)
      .map((cell) => cell.isoDate)
      .filter(Boolean) ?? [];
    syncRulesForSelection(dates);
  };

  const selectMonth = () => {
    syncRulesForSelection(getMonthDateList(year, month));
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setRules([]);
    setLastClicked(null);
  };

  const applyRules = () => {
    onChange(applyRulesToSelection(config, selectedDates, rules));
  };

  const clearRules = () => {
    onChange(clearRulesForSelection(config, selectedDates));
    clearSelection();
  };

  return (
    <section className="admin-card calendar-board-card">
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="month-toolbar">
            <button type="button" className="admin-button secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
              ← Prev
            </button>
            <div className="month-toolbar-title">
              <h2>{formatMonthLabel(year, month)}</h2>
              <p>{getDaysInMonth(year, month)} days</p>
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
            <button type="button" className="admin-button secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
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
            <span className="calendar-hint">Click days · Shift+click for a range · Click a week label for that row</span>
          </div>

          <div className="calendar-grid">
            <div className="calendar-head-row">
              <div className="calendar-week-label">Week</div>
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
                      className={`calendar-day ${selected ? "selected" : ""} ${configured ? "configured" : ""}`}
                      onClick={(event) => toggleDate(cell.isoDate, event.shiftKey)}
                    >
                      <span className="calendar-day-number">{cell.day}</span>
                      {configured && <span className="calendar-day-dot" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <aside className="calendar-panel">
          <h3>Apply rules</h3>
          {selectedDates.length === 0 ? (
            <p className="admin-note">
              Select one or more days, a week row, or the entire month. Then set which appointment dates agents should offer.
            </p>
          ) : (
            <>
              <p className="calendar-selection-summary">
                <strong>{formatSelectionLabel(selectedDates)}</strong>
                <span>{selectedDates.length} day(s) selected</span>
              </p>

              <div className="month-rules">
                {RULE_TEMPLATES.map((template, index) => {
                  const rule = rules[index];
                  if (!rule) {
                    return null;
                  }

                  return (
                    <label key={rule.id} className="month-rule">
                      <span>{template.label}</span>
                      <input
                        type="date"
                        value={rule.targetDate}
                        onChange={(event) =>
                          setRules((current) =>
                            current.map((item, ruleIndex) =>
                              ruleIndex === index ? { ...item, targetDate: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                  );
                })}
              </div>

              <div className="admin-actions calendar-panel-actions">
                <button type="button" className="admin-button primary" onClick={applyRules}>
                  Apply to selection
                </button>
                <button type="button" className="admin-button danger" onClick={clearRules}>
                  Clear rules
                </button>
              </div>

              <p className="admin-note">
                Green dots = dates that already have rules. Selected range: {selectedDates.map(formatShortDate).join(", ")}
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
