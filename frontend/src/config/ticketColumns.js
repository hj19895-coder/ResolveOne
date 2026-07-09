/**
 * Centralized registry for the tickets table columns.
 *
 * Production-ready enterprise column registry.
 *
 * Keys correspond to ticket object fields used by the UI.
 */

/**
 * @typedef {Object} TicketColumn
 * @property {string} key
 * @property {string} label
 * @property {boolean} defaultVisible
 * @property {boolean} required
 * @property {number} width
 * @property {number} minWidth
 * @property {string} group
 * @property {string=} renderType
 * @property {string=} masterDataType
 */

/**
 * Ticket columns registry.
 *
 * NOTE:
 * - `renderType` is consumed by `TicketTable.jsx` to format cell output.
 * - `masterDataType` is informational for future sorting/filtering.
 */
export const TICKET_COLUMNS = [
  // =====================
  // Core
  // =====================
  {
    key: "id",
    icon: "hash",
    label: "ID",
    defaultVisible: true,
    required: true,
    width: 10,
    minWidth: 80,
    group: "Core",
    renderType: "id",
    
  },
  {
    key: "subject",
    icon: "align-left",
    label: "Subject",
    defaultVisible: true,
    required: true,
    width: 280,
    minWidth: 180,
    group: "Core",
    renderType: "text",
  },
  {
    key: "status",
    icon: "circle-dot",
    label: "Status",
    defaultVisible: true,
    required: true,
    width: 190,
    minWidth: 140,
    group: "Core",
    renderType: "statusPill",
  },
  {
    key: "priority",
    icon: "flag",
    label: "Priority",
    defaultVisible: true,
    required: true,
    width: 190,
    minWidth: 140,
    group: "Core",
    renderType: "priorityIndicator",
  },
  {
    key: "assignedTo",
    icon: "user",
    label: "Assigned To",
    defaultVisible: true,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Core",
    renderType: "userChip",
  },
  {
    key: "createdBy",
    icon: "user-circle",
    label: "Created By",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Core",
    renderType: "userChip",
  },
  {
    key: "createdAt",
    icon: "calendar",
    label: "Created Date",
    defaultVisible: true,
    required: false,
    width: 190,
    minWidth: 150,
    group: "SLA & Dates",
    renderType: "timeAgo",
  },

  // =====================
  // Assignment
  // =====================
  {
    key: "assignedOn",
    label: "Assigned On",
    defaultVisible: false,
    required: false,
    width: 180,
    minWidth: 140,
    group: "SLA & Dates",
    renderType: "date",
  },
  {
    key: "completedDate",
    label: "Completed Date",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "SLA & Dates",
    renderType: "time",
  },
  {
    key: "resolvedDate",
    label: "Resolved Date",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "SLA & Dates",
    renderType: "time",
  },

  // =====================
  // Classification
  // =====================
  {
    key: "category",
    label: "Category",
    defaultVisible: false,
    required: false,
    width: 170,
    minWidth: 140,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "CATEGORY",
  },
  {
    key: "subcategory",
    label: "Subcategory",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "SUBCATEGORY",
  },
  {
    key: "item",
    label: "Item",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "ITEM",
  },
  {
    key: "ticketType",
    label: "Ticket Type",
    defaultVisible: false,
    required: false,
    width: 200,
    minWidth: 150,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "TICKET_TYPE",
  },
  {
    key: "rootCauseCategory",
    label: "Root Cause Category",
    defaultVisible: false,
    required: false,
    width: 230,
    minWidth: 160,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "ROOT_CAUSE_CATEGORY",
  },
  {
    key: "severity",
    label: "Severity",
    defaultVisible: false,
    required: false,
    width: 170,
    minWidth: 140,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "SEVERITY",
  },
  {
    key: "source",
    label: "Source",
    defaultVisible: false,
    required: false,
    width: 170,
    minWidth: 140,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "SOURCE",
  },
  {
    key: "level",
    label: "Level",
    defaultVisible: false,
    required: false,
    width: 160,
    minWidth: 130,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "LEVEL",
  },
  {
    key: "group",
    label: "Group",
    defaultVisible: false,
    required: false,
    width: 160,
    minWidth: 130,
    group: "Classification",
    renderType: "masterLabel",
    masterDataType: "GROUP",
  },

  // =====================
  // Client & Requester
  // =====================
  {
    key: "requesterName",
    label: "Requester Name",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Client & Requester",
    renderType: "text",
  },
  {
    key: "clientName",
    label: "Client Name",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Client & Requester",
    renderType: "masterLabel",
    masterDataType: "CLIENT_NAME",
  },
  {
    key: "raisedBy",
    label: "Raised By",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Client & Requester",
    renderType: "masterLabel",
    masterDataType: "RAISED_BY",
  },
  {
    key: "department",
    label: "Department",
    defaultVisible: false,
    required: false,
    width: 200,
    minWidth: 150,
    group: "Client & Requester",
    renderType: "masterLabel",
    masterDataType: "DEPARTMENT",
  },
  {
    key: "site",
    label: "Site",
    defaultVisible: false,
    required: false,
    width: 180,
    minWidth: 140,
    group: "Client & Requester",
    renderType: "masterLabel",
    masterDataType: "SITE",
  },

  // =====================
  // SLA & Dates
  // =====================
  {
    key: "dueDate",
    label: "Due Date",
    defaultVisible: false,
    required: false,
    width: 180,
    minWidth: 140,
    group: "SLA & Dates",
    renderType: "date",
  },
  {
    key: "tat",
    label: "TAT",
    defaultVisible: false,
    required: false,
    width: 160,
    minWidth: 130,
    group: "SLA & Dates",
    renderType: "date",
  },
  {
    key: "timeElapsed",
    label: "Time Elapsed",
    defaultVisible: false,
    required: false,
    width: 160,
    minWidth: 130,
    group: "SLA & Dates",
    renderType: "elapsedTime",
  },
  {
    key: "updatedAt",
    label: "Last Update",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "SLA & Dates",
    renderType: "updatedAt",
  },
  {
    key: "responseDueByTime",
    label: "Response Due By Time",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "SLA & Dates",
    renderType: "text",
  },
  {
    key: "estimatedTatHrs",
    label: "Estimated TAT (Hrs)",
    defaultVisible: false,
    required: false,
    width: 200,
    minWidth: 150,
    group: "SLA & Dates",
    renderType: "number",
  },

  // =====================
  // Workflow
  // =====================
  {
    key: "reopened",
    label: "Reopened",
    defaultVisible: false,
    required: false,
    width: 140,
    minWidth: 120,
    group: "Workflow",
    renderType: "boolean",
  },
  {
    key: "remarks",
    label: "Remarks",
    defaultVisible: false,
    required: false,
    width: 240,
    minWidth: 160,
    group: "Workflow",
    renderType: "text",
  },
  {
    key: "sla",
    label: "SLA",
    defaultVisible: false,
    required: false,
    width: 160,
    minWidth: 130,
    group: "Workflow",
    renderType: "slaCountdown",
  },
  {
    key: "clientConfirmation",
    label: "Client Confirmation",
    defaultVisible: false,
    required: false,
    width: 220,
    minWidth: 160,
    group: "Workflow",
    renderType: "masterLabel",
    masterDataType: "CLIENT_CONFIRMATION",
  },

  // Completed columns (fallback placeholders)
  {
    key: "resolvedAt",
    label: "Resolved At",
    defaultVisible: false,
    required: false,
    width: 190,
    minWidth: 150,
    group: "Workflow",
    renderType: "time",
  },
  {
    key: "clientClosureComments",
    label: "Client Closure Comments",
    defaultVisible: false,
    required: false,
    width: 240,
    minWidth: 160,
    group: "Workflow",
    renderType: "text",
  },

  
];

