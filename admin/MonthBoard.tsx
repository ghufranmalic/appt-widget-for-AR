import { useMemo, useState } from "react";
import type { ScheduleConfig } from "../types/schedule";
import {
  applyMonthWeeksToConfig,
  formatMonthLabel,
  getCurrentYearMonth,
  getDaysInMonth,
  getMonthFourWeeks,
  getMonthWeeksFromConfig,
  shiftMonth,
} from "../utils/monthSchedule";
import { MonthWeekColumn } from "./MonthScheduleBoard";

interface MonthScheduleBoardProps {
  config: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
}

export function MonthScheduleBoard({ config, onChange }: MonthScheduleBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [yearPart, monthPart] = selectedMonth.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  const monthWeeks = useMemo(
    () => getMonthWeeksFromConfig(year, month, config.weeks),
    [year, month, config.weeks],
  );

  const chunks = useMemo(() => getMonthFourWeeks(year, month), [year, month]);

  const updateMonthWeek = (index: number, week: (typeof monthWeeks)[number]) => {
    const updated = monthWeeks.map((item, itemIndex) => (itemIndex === index ? week : item));
    onChange(applyMonthWeeksToConfig(config, year, month, updated));
  };

  return (
    <section className="admin-card month-board-card">
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
          <p>{getDaysInMonth(year, month)} days · 4 weeks across the month</p>
        </div>
        <input
          className="month-picker"
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
        <button
          type="button"
          className="admin-button secondary"
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
        >
          Next →
        </button>
        <button
          type="button"
          className="admin-button secondary"
          onClick={() => setSelectedMonth(getCurrentYearMonth())}
        >
          This month
        </button>
      </div>

      <p className="admin-note">
        Set the appointment date agents should offer for each call type. Changes apply to this month only.
        Pick a date under each row — Monday through weekend.
      </p>

      <div className="month-board">
        {monthWeeks.map((week, index) => (
          <MonthWeekColumn
            key={week.id}
            week={week}
            weekNumber={chunks[index]?.weekNumber ?? index + 1}
            onChange={(updated) => updateMonthWeek(index, updated)}
          />
        ))}
      </div>
    </section>
  );
}
