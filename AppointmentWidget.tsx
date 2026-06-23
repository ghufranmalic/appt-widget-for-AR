import * as React from "react";
import { useMemo } from "react";
import type { BookingSeverity, NextAppointmentDay } from "./types";
import { useTimeET } from "./utils/time";
import { getAgentMessage, getNextAppointmentDay, getSlots } from "./utils/rules";

const severityLabels: Record<BookingSeverity, string> = {
  normal: "Normal booking",
  limited: "Limited booking rules",
  restricted: "Restricted booking",
};

const severityStyles: Record<BookingSeverity, React.CSSProperties> = {
  normal: {
    borderColor: "#16803c",
    background: "#eefaf2",
    color: "#105c2e",
  },
  limited: {
    borderColor: "#c58a00",
    background: "#fff8e5",
    color: "#7a5200",
  },
  restricted: {
    borderColor: "#c9362b",
    background: "#fff0ef",
    color: "#8a1f18",
  },
};

function getStatusDot(severity: BookingSeverity): string {
  if (severity === "normal") {
    return "Green";
  }

  if (severity === "limited") {
    return "Yellow";
  }

  return "Red";
}

function RecommendationPanel({ next }: { next: NextAppointmentDay }) {
  const slots = getSlots(next.dayIndex);

  return (
    <section style={styles.section} aria-labelledby="appointment-recommendation-title">
      <h3 id="appointment-recommendation-title" style={styles.sectionTitle}>
        Recommendation
      </h3>
      <div style={styles.recommendationGrid}>
        <div>
          <span style={styles.fieldLabel}>Next valid day</span>
          <strong style={styles.largeValue}>{next.label}</strong>
        </div>
        <div>
          <span style={styles.fieldLabel}>Available slots</span>
          <div style={styles.slotList}>
            {slots.map((slot) => (
              <span key={slot.label} style={styles.slot}>
                {slot.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p style={styles.reason}>{next.reason}</p>
    </section>
  );
}

export function AppointmentWidget() {
  const current = useTimeET();
  const next = useMemo(() => getNextAppointmentDay(current), [current]);
  const agentMessage = useMemo(() => getAgentMessage(next), [next]);
  const severityStyle = severityStyles[next.severity];

  return (
    <aside style={styles.widget} aria-label="Appointment decision assistant">
      <section style={{ ...styles.statusHeader, ...severityStyle }}>
        <div>
          <span style={styles.statusEyebrow}>{getStatusDot(next.severity)}</span>
          <h2 style={styles.title}>{severityLabels[next.severity]}</h2>
        </div>
        <strong style={styles.statusPill}>{current.businessStatus}</strong>
      </section>

      <section style={styles.section} aria-labelledby="appointment-live-info-title">
        <h3 id="appointment-live-info-title" style={styles.sectionTitle}>
          Live Info
        </h3>
        <dl style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <dt style={styles.fieldLabel}>ET time</dt>
            <dd style={styles.fieldValue}>{current.formattedTime}</dd>
          </div>
          <div style={styles.infoItem}>
            <dt style={styles.fieldLabel}>Day</dt>
            <dd style={styles.fieldValue}>{current.dayName}</dd>
          </div>
          <div style={styles.infoItem}>
            <dt style={styles.fieldLabel}>Business status</dt>
            <dd style={styles.fieldValue}>{current.businessStatus}</dd>
          </div>
        </dl>
      </section>

      <RecommendationPanel next={next} />

      <section style={styles.agentBox} aria-labelledby="appointment-agent-assist-title">
        <h3 id="appointment-agent-assist-title" style={styles.sectionTitle}>
          Agent Assist
        </h3>
        <p style={styles.agentText}>{agentMessage}</p>
      </section>
    </aside>
  );
}

export default AppointmentWidget;

const styles: Record<string, React.CSSProperties> = {
  widget: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 380,
    minWidth: 240,
    border: "1px solid #d4d8dd",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1d252d",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadow: "0 6px 18px rgba(24, 35, 48, 0.1)",
    overflow: "hidden",
  },
  statusHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    borderLeft: "6px solid",
    padding: "10px 12px",
  },
  statusEyebrow: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.2,
  },
  statusPill: {
    flexShrink: 0,
    border: "1px solid currentColor",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 11,
    lineHeight: 1,
  },
  section: {
    padding: "10px 12px",
    borderTop: "1px solid #e7eaee",
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 12,
    lineHeight: 1.25,
    color: "#465260",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    margin: 0,
  },
  infoItem: {
    minWidth: 0,
  },
  fieldLabel: {
    display: "block",
    marginBottom: 3,
    color: "#667385",
    fontSize: 11,
    lineHeight: 1.25,
  },
  fieldValue: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },
  recommendationGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(110px, 0.7fr) minmax(0, 1.3fr)",
    gap: 10,
    alignItems: "start",
  },
  largeValue: {
    display: "block",
    fontSize: 16,
    lineHeight: 1.2,
  },
  slotList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
  },
  slot: {
    border: "1px solid #ccd3db",
    borderRadius: 5,
    padding: "4px 6px",
    background: "#f8fafc",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
  },
  reason: {
    margin: "8px 0 0",
    color: "#465260",
    fontSize: 12,
    lineHeight: 1.45,
  },
  agentBox: {
    padding: "10px 12px",
    borderTop: "1px solid #e7eaee",
    background: "#f8fafc",
  },
  agentText: {
    margin: 0,
    color: "#1d252d",
    fontSize: 12,
    lineHeight: 1.5,
    userSelect: "text",
  },
};
