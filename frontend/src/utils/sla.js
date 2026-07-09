export function getPrioritySlaHours(priorityValue) {
  if (!priorityValue) return null;
  const value = String(priorityValue).toUpperCase();
  if (value.startsWith("P1")) return 0.75;
  if (value.startsWith("P2")) return 2;
  if (value.startsWith("P3")) return 5;
  if (value.startsWith("P4")) return 48;
  return 48;
}

export function getPriorityValue(ticket) {
  return (
    ticket?.priority?.value ??
    ticket?.priority?.name ??
    ticket?.priorityValue ??
    ticket?.priority ??
    ""
  );
}

export function isClosedStatus(statusValue) {
  const s = String(statusValue ?? "").toLowerCase();
  return s === "resolved" || s === "closed" || s.includes("closed") || s.includes("resolved");
}

function getTicketEndTime(ticket) {
  const raw = ticket?.resolvedDate ?? ticket?.completedDate ?? ticket?.updatedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSlaDeadlineFromTicket(ticket) {
  const createdAt = ticket?.createdAt ? new Date(ticket.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null;

  const hrs = getPrioritySlaHours(getPriorityValue(ticket));
  if (hrs == null) return null;

  return new Date(createdAt.getTime() + hrs * 60 * 60 * 1000);
}

// TAT deadline: prefer the explicit `tat` date field on the ticket; fall
// back to assignedOn/createdAt + estimatedTatHrs when `tat` isn't set.
export function getTatDeadlineFromTicket(ticket) {
  if (ticket?.tat) {
    const d = new Date(ticket.tat);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const base = ticket?.assignedOn
    ? new Date(ticket.assignedOn)
    : ticket?.createdAt
    ? new Date(ticket.createdAt)
    : null;
  const hrs = Number(ticket?.estimatedTatHrs);
  if (base && !Number.isNaN(base.getTime()) && Number.isFinite(hrs) && hrs > 0) {
    return new Date(base.getTime() + hrs * 60 * 60 * 1000);
  }
  return null;
}

// Generic countdown/elapsed calculator for any deadline (SLA or TAT).
// Freezes at the ticket's close time once resolved/closed, instead of
// continuing to tick against `now` — this is what stops the meter after close.
export function getDeadlineCountdown(deadline, ticket, now = new Date()) {
  if (!deadline || Number.isNaN(deadline.getTime())) {
    return { label: "—", tone: "neutral", overdue: false };
  }

  const statusValue = ticket?.status?.value ?? ticket?.status?.name;
  const closed = isClosedStatus(statusValue);

  if (closed) {
    const endTime = getTicketEndTime(ticket);
    if (!endTime) return { label: "Closed", tone: "neutral", overdue: false };
    const overdue = endTime.getTime() > deadline.getTime();
    return {
      label: overdue ? "Closed (breached)" : "Closed (within SLA)",
      tone: overdue ? "danger" : "success",
      overdue,
    };
  }

  const diffMs = deadline.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const label =
    days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

  let tone = "success";
  if (overdue) tone = "danger";
  else if (diffMs < 4 * 60 * 60 * 1000) tone = "warning";

  return { label: overdue ? `Overdue by ${label}` : `${label} left`, tone, overdue };
}

// Kept for any existing callers (e.g. table columns) that just want plain text.
export function getSlaCountdownFromTicket(ticket, now = new Date()) {
  const deadline = getSlaDeadlineFromTicket(ticket);
  return getDeadlineCountdown(deadline, ticket, now).label;
}

export function isSlaBreached(ticket, now = new Date()) {
  const deadline = getSlaDeadlineFromTicket(ticket);
  if (!deadline) return false;
  return getDeadlineCountdown(deadline, ticket, now).overdue;
}