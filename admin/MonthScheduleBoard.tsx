import type { WeekSchedule } from "../types/schedule";
import { RULE_TEMPLATES } from "../utils/monthSchedule";

interface MonthWeekColumnProps {
  week: WeekSchedule;
  weekNumber: number;
  onChange: (week: WeekSchedule) => void;
}

function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${isoDate}T12:00:00`));
}

export function MonthWeekColumn({ week, weekNumber, onChange }: MonthWeekColumnProps) {
  return (
    <article className="month-week-col">
      <header className="month-week-head">
        <strong>Week {weekNumber}</strong>
        <span>
          {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
        </span>
      </header>

      <div className="month-rules">
        {RULE_TEMPLATES.map((template, index) => {
          const rule = week.rules[index];
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
                  onChange({
                    ...week,
                    rules: week.rules.map((item, ruleIndex) =>
                      ruleIndex === index ? { ...item, targetDate: event.target.value } : item,
                    ),
                  })
                }
              />
            </label>
          );
        })}
      </div>
    </article>
  );
}
