import { useEffect, useMemo, useState } from "react";
import type { ScheduleConfig, ScheduleRule } from "../types/schedule";
import {
  applyDayRulesToConfig,
  applyRulesToSelection,
  buildCalendarWeeks,
  clearRulesForSelection,
  DayRuleEntry,
  formatDayHeading,
  formatMonthLabel,
  formatSelectionLabel,
  formatShortDate,
  getCurrentYearMonth,
  getDaysInMonth,
  getMonthDateList,
  isDateConfigured,
  loadDayRuleEntries,
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
  const [dayRules, setDayRules] = useState<DayRuleEntry[]>([]);
  const [weeklyRules, setWeeklyRules] = useState<ScheduleRule[]>([]);
  const [useWeeklyRules, setUseWeeklyRules] = useState(false);

  const [yearPart, monthPart] = selectedMonth.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  useEffect(() => {
    if (selectedDates.length === 0) {
      setDayRules([]);
      setWeeklyRules([]);
      return;
    }

    setDayRules(loadDayRuleEntries(config.weeks, selectedDates));
    setWeeklyRules(loadRulesForSelection(config.weeks, selectedDates));
    setUseWeeklyRules(selectedDates.length > 7);
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
    setWeeklyRules([]);
    setLastClicked(null);
  };

  const removeSelectedDate = (isoDate: string) => {
    updateSelection(selectedDates.filter((date) => date !== isoDate));
  };

  const applySameDateToAll = (targetDate: string) => {
    setDayRules((current) => current.map((entry) => ({ ...entry, targetDate })));
  };

  const applyRules = () => {
    if (useWeeklyRules) {
      onChange(applyRulesToSelection(config, selectedDates, weeklyRules));
      return;
    }

    onChange(applyDayRulesToConfig(config, dayRules));
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
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            >
              ← Prev
            </button>
            <div className="month-toolbar-title">
              <h2>{formatMonthLabel(year, month)}</h2>
              <p>Click days to select · Shift+click for a range</p>
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
        </div>

        <aside className="calendar-panel">
          <h3>Set rules for selected days</h3>
          {selectedDates.length === 0 ? (
            <p className="admin-note">
              Click one or more dates on the calendar. Each selected day gets its own rule for which appointment date
              to offer.
            </p>
          ) : (
            <>
              <p className="calendar-selection-summary">
                <strong>{formatSelectionLabel(selectedDates)}</strong>
              </p>

              {selectedDates.length > 1 && (
                <label className="calendar-bulk-field">
                  <span>Same offer date for all selected days</span>
                  <input
                    type="date"
                    onChange={(event) => applySameDateToAll(event.target.value)}
                  />
                </label>
              )}

              {selectedDates.length > 7 && (
                <label className="calendar-mode-toggle">
                  <input
                    type="checkbox"
                    checked={useWeeklyRules}
                    onChange={(event) => setUseWeeklyRules(event.target.checked)}
                  />
                  Use weekly call-type rules (Mon–weekend) for this large selection
                </label>
              )}

              {!useWeeklyRules ? (
                <div className="day-rule-list">
                  {dayRules.map((entry) => (
                    <label key={entry.isoDate} className="day-rule-row">
                      <span>{formatDayHeading(entry.isoDate)}</span>
                      <input
                        type="date"
                        value={entry.targetDate}
                        onChange={(event) =>
                          setDayRules((current) =>
                            current.map((item) =>
                              item.isoDate === entry.isoDate
                                ? { ...item, targetDate: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="month-rules">
                  {RULE_TEMPLATES.map((template, index) => {
                    const rule = weeklyRules[index];
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
                            setWeeklyRules((current) =>
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
              )}

              <div className="admin-actions calendar-panel-actions">
                <button type="button" className="admin-button primary" onClick={applyRules}>
                  Save rules
                </button>
                <button type="button" className="admin-button danger" onClick={clearRules}>
                  Clear rules
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
