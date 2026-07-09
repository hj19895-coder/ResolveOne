import { PrismaClient } from "@prisma/client";
import logger from "../config/logger.js";
import { isSlaBreached, getSlaBucket, isNeedsAttention } from "../utils/sla.js";
import { notifyTicketEvent } from "../utils/notification.js";
 
const prisma = new PrismaClient();
 
// Shared include block — used in every ticket query so responses are consistent
const TICKET_LIST_INCLUDE = {
  status: { select: { id: true, value: true } },
  priority: { select: { id: true, value: true } },

  assignedTo: { 
    select: { 
      id: true, 
      name: true 
    } 
  },

  createdBy: { 
    select: { 
      id: true, 
      name: true 
    } 
  },

  clientName: { 
    select: { 
      id:true, 
      value:true 
    } 
  },

  ticketType:{
    select:{
      id:true,
      value:true
    }
  }
};

const TICKET_DETAIL_INCLUDE = {
  status:   { select: { id: true, value: true } },
  priority: { select: { id: true, value: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  clientName: { select: { id: true, value: true } },
  ticketType: { select: { id: true, value: true } },
  history: {
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } }
  }
};

// Ensure single-ticket endpoint always has stable assignedByline fields
const TICKET_INCLUDE_WITH_ASSIGNMENT_LINES = {
  ...TICKET_DETAIL_INCLUDE,
  // frontend expects ticket.assignedByline as a string in a couple places
  // (and uses ticket?.assignedByline in TicketDetailsPage)
};

 
// ─── POST /tickets ─────────────────────────────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
const {
      subject,
      description,
      requesterName,
      remarks,
      reopened,
      tat,
      assignedOn,
      estimatedTatHrs,
      // User FK
      assignedToId,
      // MasterData FK IDs
      statusId,
      sourceId,
      levelId,
      groupId,
      severityId,
      raisedById,
      siteId,
      ticketTypeId,
      clientNameId,
      priorityId,
      categoryId,
      subcategoryId,
      itemId,
      rootCauseCategoryId,
    } = req.body;
 
    // Required fields
    if (!subject || !description || !requesterName || !statusId || !priorityId) {
      return res.status(400).json({
        message: "Required fields: subject, description, requesterName, statusId, priorityId",
      });
    }
 
    // Verify required MasterData entries exist and are active
    const [statusEntry, priorityEntry] = await Promise.all([
      prisma.masterData.findFirst({ where: { id: statusId,   isActive: true } }),
      prisma.masterData.findFirst({ where: { id: priorityId, isActive: true } }),
    ]);
 
    if (!statusEntry)   return res.status(400).json({ message: "Invalid or inactive statusId" });
    if (!priorityEntry) return res.status(400).json({ message: "Invalid or inactive priorityId" });
 
const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        requesterName,
        remarks:         remarks   || null,
        reopened:        reopened  === true || reopened === "true",
        tat:             tat       ? new Date(tat)       : null,
        assignedOn:      assignedOn ? new Date(assignedOn) : null,
        estimatedTatHrs: estimatedTatHrs ? parseFloat(estimatedTatHrs) : null,

        createdById: req.user.userId,
        assignedToId: assignedToId || null,

        statusId,
        priorityId,
        sourceId:           sourceId           || null,
        levelId:            levelId            || null,
        groupId:            groupId            || null,
        severityId:         severityId         || null,
        raisedById:         raisedById         || null,
        siteId:             siteId             || null,
        ticketTypeId:       ticketTypeId       || null,
        clientNameId:       clientNameId       || null,
        categoryId:         categoryId         || null,
        subcategoryId:      subcategoryId      || null,
        itemId:             itemId             || null,
        rootCauseCategoryId: rootCauseCategoryId || null,
      },
      include: TICKET_DETAIL_INCLUDE,
    });

    if (ticket.assignedToId) {
      await notifyTicketEvent({
        type: "TICKET_ASSIGNED",
        title: "New ticket assigned to you",
        message: `#${ticket.ticketNumber} — ${ticket.subject}`,
        ticketId: ticket.id,
        targetUserId: ticket.assignedToId,
        actorUserId: req.user.userId,
      });
    } else {
      await notifyTicketEvent({
        type: "TICKET_CREATED",
        title: "New ticket created",
        message: `#${ticket.ticketNumber} — ${ticket.subject}`,
        ticketId: ticket.id,
        targetUserId: null,
        actorUserId: req.user.userId,
      });
    }

    res.status(201).json(ticket);
 
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating ticket" });
  }
};
const SORT_SCALAR_FIELDS = {
  id:            'ticketNumber',
  subject:       'subject',
  createdAt:     'createdAt',
  updatedAt:     'updatedAt',
  dueDate:       'dueDate',
  completedDate: 'completedDate',
  resolvedDate:  'resolvedDate',
  tat:           'tat',
};

function buildOrderBy(sortBy, sortDir) {
  const dir = sortDir === 'asc' ? 'asc' : 'desc';
  if (!sortBy) return { ticketNumber: 'desc' };

  if (sortBy === 'status')     return { status:     { value: dir } };
  if (sortBy === 'priority')   return { priority:    { value: dir } };
  if (sortBy === 'assignedTo') return { assignedTo:  { name: dir } };
  if (sortBy === 'createdBy')  return { createdBy:   { name: dir } };

  const scalarField = SORT_SCALAR_FIELDS[sortBy];
  if (scalarField) return { [scalarField]: dir };

  // Unknown key → fall back to default ordering
  return { createdAt: 'desc' };
} 

// ─── GET /tickets ──────────────────────────────────────────────────────────────
export const getTickets = async (req, res) => {
  const { statusId, priorityId, assignedToMe, sortBy, sortDir, slaStatus } = req.query;
  let where = {};
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN";
 
    if (assignedToMe === "true") {
      where.assignedToId = req.user.userId;
    }

    if (req.query.unassigned === "true") {
      where.assignedToId = null;
    }
 
    if (statusId) {
      const ids = Array.isArray(statusId) ? statusId : [statusId];
      where.statusId = ids.length === 1 ? ids[0] : { in: ids };
    }
    if (priorityId) {
      const ids = Array.isArray(priorityId) ? priorityId : [priorityId];
      where.priorityId = ids.length === 1 ? ids[0] : { in: ids };
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      const numericSearch = parseInt(s);

      const searchOr = [
        { subject:       { contains: s, mode: 'insensitive' } },
        { description:   { contains: s, mode: 'insensitive' } },
        { requesterName: { contains: s, mode: 'insensitive' } },
        { remarks:       { contains: s, mode: 'insensitive' } },
      ];

      if (!isNaN(numericSearch)) {
        searchOr.push({ ticketNumber: numericSearch });
      }

      // where.OR may already be set by the role filter above — combine with AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchOr },
        ];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    logger.info('getTickets query:', { where, statusId: req.query.statusId, priorityId: req.query.priorityId, assignedToMe: req.query.assignedToMe, userRole: req.user.role, userId: req.user.userId });
    
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100000, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;
    const orderBy = buildOrderBy(sortBy, sortDir);

    if (slaStatus) {
      // SLA bucket is a derived field, not a DB column — compute in JS against
      // all tickets matching the other filters, then paginate the result.
      const now = new Date();

      const candidates = await prisma.ticket.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          resolvedDate: true,
          completedDate: true,
          updatedAt: true,
          status:   { select: { value: true } },
          priority: { select: { value: true } },
        },
        orderBy,
      });

      const matchFn = slaStatus === 'attention'
        ? (t) => isNeedsAttention(t, now)
        : (t) => getSlaBucket(t, now) === slaStatus;

      const matchingIds = candidates.filter(matchFn).map((t) => t.id);

      const total = matchingIds.length;
      const pageIds = matchingIds.slice(skip, skip + limit);

      const tickets = await prisma.ticket.findMany({
        where: { id: { in: pageIds } },
        include: TICKET_LIST_INCLUDE,
      });

      // Prisma doesn't preserve `in` order — re-sort to match pageIds order
      const ticketMap = new Map(tickets.map((t) => [t.id, t]));
      const orderedTickets = pageIds.map((id) => ticketMap.get(id)).filter(Boolean);

      logger.info(`getTickets (slaStatus=${slaStatus}) success: ${orderedTickets.length} of ${total} tickets`);

      return res.json({ tickets: orderedTickets, total, page, pages: Math.ceil(total / limit) });
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: TICKET_LIST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    logger.info(`getTickets success: ${tickets.length} of ${total} tickets`);

    res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('getTickets error:', { 
      error: err.message, 
      stack: err.stack,
      code: err.code,
      where,
      userRole: req.user?.role,
      query: req.query
    });
    res.status(500).json({ message: "Error fetching tickets", details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

 
// ─── GET /tickets/:id ──────────────────────────────────────────────────────────
export const getTicketById = async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: TICKET_DETAIL_INCLUDE,
    });

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Provide a stable string for the frontend details grid when assignment exists
    // (some screens reference ticket.assignedByline)
    if (ticket.assignedTo) {
      ticket.assignedByline = ticket.assignedTo.name
        || ticket.assignedTo.email
        || String(ticket.assignedTo.id);
    }
 
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching ticket" });
  }
};
 
// ─── PUT /tickets/assign ───────────────────────────────────────────────────────
export const assignTicket = async (req, res) => {
  try {
 
    const { ticketId, assignedToId } = req.body;
    if (!ticketId || !assignedToId) {
      return res.status(400).json({ message: "ticketId and assignedToId are required" });
    }
 
    const [ticket, user] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: ticketId } }),
      prisma.user.findUnique({ where: { id: assignedToId } }),
    ]);
 
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!user)   return res.status(404).json({ message: "User not found" });
 
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data:  { assignedToId },
      include: TICKET_INCLUDE_WITH_ASSIGNMENT_LINES,
    });
 
    await notifyTicketEvent({
      type: "TICKET_ASSIGNED",
      title: "Ticket assigned to you",
      message: `#${updated.ticketNumber} — ${updated.subject}`,
      ticketId: updated.id,
      targetUserId: assignedToId,
      actorUserId: req.user.userId,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error assigning ticket" });
  }
};
 
// ─── PATCH /tickets/:id ──────────────────────────────────────────────────────
export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.userId;

    // Sanitize PATCH payload: remove keys explicitly set to `undefined` by the client.
    // Otherwise Prisma update can error with invalid input.
    for (const k of Object.keys(updateData || {})) {
      if (updateData[k] === undefined) delete updateData[k];
    }




    // Fetch existing ticket
    const oldTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        subject: true,
        description: true,
        remarks: true,
        reopened: true,
        requesterName: true,
        tat: true,
        dueDate: true,
        assignedOn: true,
        estimatedTatHrs: true,
        statusId: true,
        sourceId: true,
        levelId: true,
        groupId: true,
        severityId: true,
        raisedById: true,
        siteId: true,
        ticketTypeId: true,
        clientNameId: true,
        priorityId: true,
        categoryId: true,
        subcategoryId: true,
        itemId: true,
        rootCauseCategoryId: true,
        resolvedDate: true,
        completedDate: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!oldTicket) return res.status(404).json({ message: "Ticket not found" });

    if (updateData.statusId) {
      const willBeAssigned = updateData.assignedToId || oldTicket.assignedToId;

      if (!willBeAssigned) {
        const nextStatusCheck = await prisma.masterData.findUnique({
          where: { id: updateData.statusId },
          select: { value: true },
        });
        const nextStatusValue = nextStatusCheck?.value?.trim().toLowerCase();

        // Allow keeping/setting it to "open" — block everything else (in progress, resolved, closed)
        if (nextStatusValue && nextStatusValue !== 'open') {
          return res.status(400).json({
            message: "Ticket must be assigned to a technician before changing its status.",
          });
        }
      }
    }

    

    // Validate related master-data IDs if provided.
    // Backend requirement: when PATCHing statusId, priorityId must also be present.
    // If frontend omits priorityId in that case, we can safely default to oldTicket.priorityId.
    

    const fieldsToValidate = [];
    if (updateData.statusId) fieldsToValidate.push('statusId');
    if (updateData.priorityId !== undefined) fieldsToValidate.push('priorityId');


    if (fieldsToValidate.length > 0) {
      const validations = fieldsToValidate.map(fid => 
        prisma.masterData.findFirst({ where: { id: updateData[fid], isActive: true } })
      );
      const validated = await Promise.all(validations);
      if (validated.some(v => !v)) {
        return res.status(400).json({ message: "Invalid or inactive MasterData ID provided" });
      }
    }
        // ─── Workflow automation ─────────────────────────────

    if (updateData.statusId) {

      const oldStatus = await prisma.masterData.findUnique({
        where: { id: oldTicket.statusId },
        select: { value: true }
      });

      const nextStatus = await prisma.masterData.findUnique({
        where: { id: updateData.statusId },
        select: { value: true }
      });

      const oldStatusValue =
        oldStatus?.value?.trim().toLowerCase();

      const statusValue =
        nextStatus?.value?.trim().toLowerCase();

      console.log("OLD STATUS:", oldStatusValue);
      console.log("NEW STATUS:", statusValue);

            if (oldTicket.assignedToId || oldTicket.createdById) {
        await notifyTicketEvent({
          type: "STATUS_CHANGED",
          title: "Ticket status updated",
          message: `#${oldTicket.id.slice(0, 8)} status changed to "${nextStatus?.value ?? updateData.statusId}"`,
          ticketId: id,
          targetUserId: oldTicket.assignedToId || oldTicket.createdById,
          actorUserId: userId,
        });
      }

      // ─── Resolved workflow ─────────────────────
      if (statusValue?.includes("resolved")) {
        if (!oldTicket.resolvedDate) {
          updateData.resolvedDate = new Date();
        }
      }

      // ─── Closed workflow ─────────────────────
      if (statusValue?.includes("closed")) {

        if (!oldTicket.completedDate) {
          updateData.completedDate = new Date();
        }

        if (!oldTicket.resolvedDate) {
          updateData.resolvedDate = new Date();
        }
      }

      // ─── Reopened workflow ─────────────────────
      const wasClosed =
        oldStatusValue?.includes("closed");

      const isNowActive =
        statusValue?.includes("open") ||
        statusValue?.includes("progress");

      if (wasClosed && isNowActive) {
        updateData.reopened = true;
      }
    }
    
    // Determine changed fields for history
    const changes = [];
    const allFields = [
      'subject', 'description', 'remarks', 'reopened', 'requesterName', 'tat','dueDate', 'assignedOn', 'estimatedTatHrs',
      'statusId', 'sourceId', 'levelId', 'groupId', 'severityId', 'raisedById', 'siteId', 'ticketTypeId','resolvedDate','completedDate',
      'clientNameId', 'priorityId', 'categoryId', 'subcategoryId', 'itemId', 'rootCauseCategoryId'
    ];

    // History table expects string-or-null values for oldValue/newValue.
    // Coerce non-string primitives to string so Prisma doesn't throw.
    const coerceHistoryValue = (v) => {
      if (v === undefined) return null;
      if (v === null) return null;
      if (typeof v === 'string') return v;
      return String(v);
    };


    for (const field of allFields) {
      if (updateData[field] !== undefined && updateData[field] !== oldTicket[field]) {
        changes.push({
          ticketId: id,
          userId,
          field,
          oldValue: coerceHistoryValue(oldTicket[field]),
          newValue: coerceHistoryValue(updateData[field])
        });

      }
    }

    // Transaction: update ticket + create history
    // (logging removed; it referenced an out-of-scope variable in this controller flow)

    const [updatedTicket, historyRecords] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id },
        data: {
          ...updateData,
          tat: updateData.tat ? new Date(updateData.tat) : undefined,
          assignedOn: updateData.assignedOn ? new Date(updateData.assignedOn) : undefined,
          dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
          estimatedTatHrs: updateData.estimatedTatHrs ? parseFloat(updateData.estimatedTatHrs) : undefined,
          resolvedDate: updateData.resolvedDate? new Date(updateData.resolvedDate): updateData.resolvedDate === null? null: undefined,
          completedDate: updateData.completedDate? new Date(updateData.completedDate): updateData.completedDate === null? null: undefined,
          reopened: updateData.reopened,
          // Note: assignedToId updates allowed for superadmin
        },
        include: TICKET_DETAIL_INCLUDE
      }),
      ...changes.map(change => prisma.ticketHistory.create({ data: change }))
    ]);

    res.json(updatedTicket);
  } catch (err) {
    console.error("[updateTicket] failed:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      name: err?.name,
    });
    res.status(500).json({ message: "Error updating ticket" });
  }
};

export const mergeTickets = async (req, res) => {
  try {

    const { parentId, childIds } = req.body;


    if (!parentId || !childIds?.length) {
      return res.status(400).json({
        message: "Parent and child tickets required"
      });
    }


    await prisma.ticket.updateMany({
      where: {
        id: {
          in: childIds
        }
      },
      data: {
        mergedIntoId: parentId,
        isMerged: true
      }
    });


    const children = await prisma.ticket.findMany({
      where: { id: { in: childIds } },
      select: { id: true, ticketNumber: true, createdById: true, assignedToId: true },
    });

    await prisma.ticket.updateMany({
      where: { id: { in: childIds } },
      data: { mergedIntoId: parentId, isMerged: true },
    });

    for (const child of children) {
      const target = child.assignedToId || child.createdById;
      await notifyTicketEvent({
        type: "TICKET_MERGED",
        title: "Ticket merged",
        message: `#${child.ticketNumber} was merged into another ticket`,
        ticketId: parentId,
        targetUserId: target,
        actorUserId: req.user.userId,
      });
    }

    return res.json({ success: true, message: "Tickets merged successfully" });


  } catch(error){

    console.error(error);

    res.status(500).json({
      message:"Merge failed"
    });

  }
};

// ─── GET /tickets/users (SUPERADMIN) ──────────────────────────────────────────
export const getTicketUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ users });
  } catch (err) {
    console.error("[getTicketUsers] failed:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// ─── GET /tickets/stats (Dashboard) ──────────────────────────────────────────
export const getTicketStats = async (req, res) => {
  try {

    // ── Where clause ──
    let where = {};

    // ── Dates ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    // ── Helpers ──
    const normalize   = (v = '') => v.toString().trim().toLowerCase();
    const isOpen       = (t) => normalize(t.status?.value) === 'open';
    const isInProgress = (t) => {
      const n = normalize(t.status?.value);
      return n === 'in progress' || 
            n === 'in_progress' || 
            n === 'inprogress' ||
            n.includes('progress');
    };
    const isResolved   = (t) => normalize(t.status?.value) === 'resolved';
    const isClosed     = (t) => normalize(t.status?.value).includes('closed');
    const isActive     = (t) => isOpen(t) || isInProgress(t);
    const isDone       = (t) => isResolved(t) || isClosed(t);
    const isToday      = (d) => { if (!d) return false; const dt = new Date(d); return dt >= today && dt < tomorrow; };
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday  = (d) => { if (!d) return false; const dt = new Date(d); return dt >= yesterday && dt < today; };


    const getPriority  = (t) => { const raw = (t.priority?.value ?? '').toString().toUpperCase(); const m = raw.match(/\b(P[1-4])\b/); return m?.[1] ?? 'P4'; };

    // ── Fetch tickets ──
    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        resolvedDate: true,
        completedDate: true,
        updatedAt: true,
        assignedToId: true,
        dueDate: true,
        status:   { select: { value: true } },
        priority: { select: { value: true } },
      },
    });

    const activeTickets = tickets.filter(isActive);

    // ── Priority breakdown ──
    const priorityBreakdown = {
      p1: activeTickets.filter(t => getPriority(t) === 'P1').length,
      p2: activeTickets.filter(t => getPriority(t) === 'P2').length,
      p3: activeTickets.filter(t => getPriority(t) === 'P3').length,
      p4: activeTickets.filter(t => getPriority(t) === 'P4').length,
    };

    // ── Today / Yesterday counts (Ticket Flow section) ──
    const createdToday     = tickets.filter(t => isToday(t.createdAt)).length;
    const createdYesterday = tickets.filter(t => isYesterday(t.createdAt)).length;

    const closedToday  = tickets.filter(t => isDone(t) && isToday(t.resolvedDate ?? t.completedDate ?? t.updatedAt)).length;
    const closedYesterday = tickets.filter(t => isDone(t) && isYesterday(t.resolvedDate ?? t.completedDate ?? t.updatedAt)).length;

    // "Assigned today" = tickets created today that already have an assignee
    // (matches how the ticket flow funnel reads — created → assigned same day)
    const assignedToday     = tickets.filter(t => t.assignedToId && isToday(t.createdAt)).length;
    const assignedYesterday = tickets.filter(t => t.assignedToId && isYesterday(t.createdAt)).length;

    const hasPassedInProgress = (t) => isInProgress(t) || isResolved(t) || isClosed(t);

    const inProgressToday     = tickets.filter(t => hasPassedInProgress(t) && isToday(t.createdAt)).length;
    const inProgressYesterday = tickets.filter(t => hasPassedInProgress(t) && isYesterday(t.createdAt)).length;
    // ── SLA ──
    const slaBreached      = activeTickets.filter((t) => isSlaBreached(t, now));
    const slaBreachedCount = slaBreached.length;
    const slaBreakdown     = {
      critical: slaBreached.filter(t => getPriority(t) === 'P1').length,
      high:     slaBreached.filter(t => getPriority(t) === 'P2').length,
      medium:   slaBreached.filter(t => getPriority(t) === 'P3').length,
    };

    // ── Unassigned ──
    const unassignedCount = activeTickets.filter(t => !t.assignedToId).length;

    // ── Sparklines ──

    // Card 1 — "Total active tickets": 7-day snapshot trend, but the LAST
    // point (today) is cut off at the current moment ("now") instead of
    // midnight tonight — so it always reflects the real live count, not a
    // projection of the rest of today.
    const activeCountAt = (cutoff) =>
      tickets.filter(t => {
        if (!t.createdAt || new Date(t.createdAt) >= cutoff) return false;
        if (!isDone(t)) return true;
        const resolvedAt = new Date(t.resolvedDate ?? t.completedDate ?? t.updatedAt);
        return resolvedAt >= cutoff;
      }).length;

    // Peak-active-in-window: instead of sampling only at the window's
    // boundary, this walks every create/close event that falls inside
    // [start, end) and tracks the running active count, returning the
    // highest value it ever hit. This is what lets a ticket that was
    // both created AND closed inside the same window still show up as
    // a rise-then-fall instead of being invisible between snapshots.
    const activeCountsInWindow = (start, end) => {
      const relevant = tickets.filter(t => {
        const created = new Date(t.createdAt);
        const closedAt = isDone(t)
          ? new Date(t.resolvedDate ?? t.completedDate ?? t.updatedAt)
          : null;
        // ticket must have existed (been created) before window ends,
        // and if it closed, the close must not have happened before window starts
        return created < end && (!closedAt || closedAt >= start);
      });

      const events = [];
      for (const t of relevant) {
        const created = new Date(t.createdAt);
        const closedAt = isDone(t)
          ? new Date(t.resolvedDate ?? t.completedDate ?? t.updatedAt)
          : null;
        // clamp the "created" event to the window start if it happened earlier
        events.push({ time: created < start ? start : created, delta: +1 });
        if (closedAt && closedAt < end) {
          events.push({ time: closedAt, delta: -1 });
        }
      }
      events.sort((a, b) => a.time - b.time);

      let running = activeCountAt(start); // baseline going into this window
      let peak = running;
      for (const e of events) {
        running += e.delta;
        if (running > peak) peak = running;
      }
      return peak;
    };

    // Past 6 full days: still one end-of-day snapshot each — coarse is
    // fine here since those days are already over and we're not trying
    // to catch same-window blips retroactively.
    const pastDaysActive = Array.from({ length: 6 }, (_, i) => {
      const day = new Date(today); day.setDate(day.getDate() - (6 - i));
      const dayEnd = new Date(day); dayEnd.setDate(dayEnd.getDate() + 1);
      return activeCountAt(dayEnd);
    });

    // Today: same 3-hour buckets as before, but each bucket now reports
    // its PEAK active count (via activeCountsInWindow) instead of just
    // the value at the bucket's closing boundary — so a same-window
    // create+close cycle shows up as a visible bump.
    const todayCheckpoints = [];
    let windowStart = today; // midnight
    for (let h = 3; h <= 21; h += 3) {
      const checkpoint = new Date(today); checkpoint.setHours(h, 0, 0, 0);
      if (checkpoint > now) break;
      todayCheckpoints.push(activeCountsInWindow(windowStart, checkpoint));
      windowStart = checkpoint;
    }

    // The current (still-open, partial) window is special: it can contain
    // a full create→close cycle that peaks and then drops back down
    // BEFORE "now". A single peak value for this window would erase that
    // drop (peak=1 even though the live count is back to 0). So we emit
    // two points for this window: the peak seen during it, and then the
    // actual live count at "now" — giving the curve a real rise-then-fall
    // instead of collapsing both into one misleading high point.
    const currentWindowPeak = activeCountsInWindow(windowStart, now);
    const currentLiveCount = activeCountAt(now);
    todayCheckpoints.push(currentWindowPeak);
    if (currentLiveCount !== currentWindowPeak) {
      todayCheckpoints.push(currentLiveCount);
    }

    const totalActiveSparkline = [...pastDaysActive, ...todayCheckpoints];  // 👈 add this



    // Cards 2 & 3 — "Created today" / "Closed today": these labels only
    // mean *today*, so the sparkline shows hourly buckets from midnight up
    // to the current hour (not a 7-day view). Buckets beyond "now" simply
    // don't exist yet, so the curve always ends exactly at the current
    // moment.
    const currentHourBucket = Math.floor(now.getHours() / 3); // 0..7, one bucket per 3h
    const HOURS_PER_BUCKET = 3;

    const createdSparkline = Array.from({ length: currentHourBucket + 1 }, (_, i) => {
      const start = new Date(today); start.setHours(i * HOURS_PER_BUCKET, 0, 0, 0);
      const end = i === currentHourBucket ? now : new Date(start.getTime() + HOURS_PER_BUCKET * 3600 * 1000);
      return tickets.filter(t => t.createdAt && new Date(t.createdAt) >= start && new Date(t.createdAt) < end).length;
    });

    const closedSparkline = Array.from({ length: currentHourBucket + 1 }, (_, i) => {
      const start = new Date(today); start.setHours(i * HOURS_PER_BUCKET, 0, 0, 0);
      const end = i === currentHourBucket ? now : new Date(start.getTime() + HOURS_PER_BUCKET * 3600 * 1000);
      return tickets.filter(t => {
        if (!isDone(t)) return false;
        const d = new Date(t.resolvedDate ?? t.completedDate ?? t.updatedAt);
        return d >= start && d < end;
      }).length;
    });


    // ── Top performers ──
    const resolvedWhere = { resolvedDate: { not: null } };
    const resolvedTickets = await prisma.ticket.findMany({
      where: resolvedWhere,
      select: { assignedTo: { select: { id: true, name: true } } },
    });

    const performerMap = new Map();
    for (const t of resolvedTickets) {
      if (!t.assignedTo) continue;
      const key = t.assignedTo.id;
      if (!performerMap.has(key)) performerMap.set(key, { user: t.assignedTo, count: 0 });
      performerMap.get(key).count++;
    }
    const topPerformers = [...performerMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalActive:     activeTickets.length,
      totalTickets:    tickets.length,
      totalAssigned:   tickets.filter(t => t.assignedToId).length,
      totalInProgress: tickets.filter(isInProgress).length,
      totalResolved:   resolvedTickets.length,
      createdToday,
      closedToday,
      // 👇 new fields for Ticket Flow card
      createdYesterday,
      closedYesterday,
      assignedToday,
      assignedYesterday,
      inProgressToday,
      inProgressYesterday,
      priorityBreakdown,
      slaBreachedCount,
      slaBreakdown,
      unassignedCount,
      createdSparkline,
      closedSparkline,
      totalActiveSparkline,
      topPerformers,
    });

  } catch (err) {
    console.error('[getTicketStats] failed:', { message: err?.message, stack: err?.stack });
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
