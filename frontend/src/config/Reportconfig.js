// src/config/reportConfig.js

export const REPORT_OPTIONS = [
  { value: "ticket-health", label: "Ticket Health Summary" },
  // Future reports can be added here
];

/**
 * DATE_PRESETS
 * Used by DateRangeFilter to compute startDate/endDate.
 */
export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

/**
 * computePresetDates
 * Returns { startDate: Date, endDate: Date } for a given preset string.
 */
export function computePresetDates(preset) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { startDate: today, endDate: todayEnd };
    case "yesterday": {
      const ys = new Date(today);
      ys.setDate(ys.getDate() - 1);
      const ye = new Date(ys);
      ye.setHours(23, 59, 59, 999);
      return { startDate: ys, endDate: ye };
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { startDate: s, endDate: todayEnd };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { startDate: s, endDate: todayEnd };
    }
    default:
      return { startDate: today, endDate: todayEnd };
  }
}

/**
 * TICKET_HEALTH_ROWS
 * Config-driven row definitions for the Ticket Health Summary table.
 *
 * Fields:
 *   key           – matches the key in the API response data object
 *   category      – display label (left column)
 *   description   – formula/description (second column)
 *   formatter     – "number" | "percent" | "hours" | "integer"
 *   highlightRule – null | "sla" | "p1" | "reopen"
 *   bold          – if true, render row in semibold (section header feel)
 *   dividerAfter  – if true, show a subtle bottom border after this row
 */
export const TICKET_HEALTH_ROWS = [
  {
    key: "totalOpenStart",
    category: "Total Open Tickets (Start of Period)",
    description: "COUNT(Ticket ID) — Tickets open at beginning of selected period",
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "raised",
    category: "Total Tickets Raised",
    description: "COUNT(Ticket ID) — Tickets created during selected period",
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "closed",
    category: "Total Tickets Closed",
    description: 'COUNTIF(Status, "Closed") — Tickets moved to closed status',
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "closedWithinSla",
    category: "Total Tickets Closed within SLA",
    description: 'COUNTIF(Status, "Closed within SLA") — Closed tickets where SLA was not breached',
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "slaCompliance",
    category: "SLA Compliance %",
    description: "Closed within SLA ÷ Total Closed × 100",
    formatter: "percent",
    highlightRule: "sla",
    bold: true,
    dividerAfter: true,
  },
  {
    key: "totalOpenNow",
    category: "Total Open Tickets",
    description: 'COUNTIF(Status, "<>Closed") — All currently open tickets',
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "activeOpen",
    category: "Total Open Tickets (Excl. Confirmation Awaiting & On-hold)",
    description: 'COUNTIF(Status, "Open", "In Progress") — Active working tickets only',
    formatter: "integer",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "openP1",
    category: "Open P1 Tickets",
    description: 'COUNTIFS(Priority, "P1", Status, "<>Closed") — Critical open tickets',
    formatter: "integer",
    highlightRule: "p1",
    bold: false,
    dividerAfter: true,
  },
  {
    key: "openSlaBreached",
    category: "Open Tickets Breaching SLA",
    description: "Open tickets where aging > SLA threshold for their priority",
    formatter: "integer",
    highlightRule: "p1",   // reuse red highlight — any value > 0 turns red
    bold: false,
    dividerAfter: true,
    weeklyAvailable: false,
  },
  {
    key: "overallSlaCompliance",
    category: "Overall SLA Compliance %",
    description: "All-time: Closed within SLA ÷ Total Closed × 100",
    formatter: "percent",
    highlightRule: "sla",
    bold: true,
    dividerAfter: false,
  },
  {
    key: "avgResolutionHrs",
    category: "Average Resolution Time (Hrs)",
    description: "AVERAGE(Resolution Time) — Avg. hours from creation to close",
    formatter: "hours",
    highlightRule: null,
    bold: false,
    dividerAfter: false,
  },
  {
    key: "reopenRate",
    category: "Reopen Rate %",
    description: "Reopened ÷ Closed × 100 — Percentage of tickets reopened after close",
    formatter: "percent",
    highlightRule: "reopen",
    bold: false,
    dividerAfter: false,
  },
];