export function getPrioritySlaHours(priorityValue) {
  if (!priorityValue) return null;
  const value = String(priorityValue).toUpperCase();
  if (value.startsWith("P1")) return 0.75;
  if (value.startsWith("P2")) return 2;
  if (value.startsWith("P3")) return 5;
  if (value.startsWith("P4")) return 48;
  return 48;
}

export function getSlaDeadline(ticket) {
  const createdAt = ticket?.createdAt ? new Date(ticket.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null;

  const priorityValue =
    ticket?.priority?.value ??
    ticket?.priority?.name ??
    ticket?.priorityValue ??
    ticket?.priority ??
    "";

  const hours = getPrioritySlaHours(priorityValue);
  if (hours == null) return null;

  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function isSlaBreached(ticket, now = new Date()) {
  return getSlaBucket(ticket, now) === 'breached';
}
// Add near isSlaBreached
export function isSlaAtRisk(ticket, now = new Date()) {
  return getSlaBucket(ticket, now) === 'atRisk';
}

export function isOpenOrInProgress(ticket) {
  return isActiveStatus(ticket?.status?.value);
}

export function isClosedTicket(ticket) {
  return isClosedStatus(ticket?.status?.value);
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Combined "needs attention" bucket — mirrors InsightsCard's needAttention logic exactly
export function isNeedsAttention(ticket, now = new Date()) {
  const raw = String(ticket?.priority?.value ?? ticket?.priority?.name ?? "").toUpperCase();
  const isP1 = raw.includes("P1") || raw.includes("CRITICAL");

  if (isP1 && isOpenOrInProgress(ticket)) return true;
  if (isSlaBreached(ticket, now) || isSlaAtRisk(ticket, now)) return true;

  const age = ticket?.createdAt ? now.getTime() - new Date(ticket.createdAt).getTime() : 0;
  if (age > THREE_DAYS_MS && !isClosedTicket(ticket)) return true;

  return false;
}


function isClosedStatus(statusValue) {
  const s = String(statusValue ?? '').toLowerCase();
  return s === 'resolved' || s === 'closed' || s.includes('closed');
}

function isActiveStatus(statusValue) {
  const s = String(statusValue ?? '').toLowerCase();
  return s === 'open' || s === 'in progress' || s === 'in_progress' || s.includes('progress');
}

// Buckets a ticket into 'within' | 'atRisk' | 'breached' | null
export function getSlaBucket(ticket, now = new Date()) {
  const deadline = getSlaDeadline(ticket);
  if (!deadline) return null;

  const statusValue = ticket?.status?.value;

  if (isClosedStatus(statusValue)) {
    const resolvedTime = ticket?.resolvedDate ?? ticket?.completedDate;
    if (!resolvedTime) return null;
    return new Date(resolvedTime) > deadline ? 'breached' : 'within';
  }

  if (isActiveStatus(statusValue)) {
    if (deadline < now) return 'breached';
    const remainingMs = deadline.getTime() - now.getTime();
    return remainingMs < 4 * 60 * 60 * 1000 ? 'atRisk' : 'within';
  }

  return null;
}