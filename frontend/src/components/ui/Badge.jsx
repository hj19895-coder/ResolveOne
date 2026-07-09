const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  CLOSED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
};

const PRIORITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export default function Badge({ value, type = 'status' }) {
  if (!value) return (
    <span className="inline-flex px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border">
      —
    </span>
  );

  const upper = value.toUpperCase().replace(/\s+/g, '_');
  let label = value;
  let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';

  if (type === 'status') {
    label = STATUS_LABELS[upper] ?? value;
    colorClass = STATUS_COLORS[upper] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  } else if (type === 'priority') {
    label = PRIORITY_LABELS[upper] ?? value;
    colorClass = PRIORITY_COLORS[upper] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  }

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border shadow-sm ${colorClass}`}>
      {label}
    </span>
  );
}

