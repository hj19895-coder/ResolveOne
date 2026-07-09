import { twMerge } from 'tailwind-merge'; // Optional, but good practice

const ICONS = {
  blue: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  amber: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  green: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function StatCard({ label, value, color = 'blue', sub, className = '' }) {
  const baseColor = color === 'blue' ? 'blue' : color === 'amber' ? 'amber' : color === 'green' ? 'green' : 'gray';
  const colorClasses = {
    blue: 'ring-blue-100 bg-blue-50 text-blue-800',
    amber: 'ring-amber-100 bg-amber-50 text-amber-800',
    green: 'ring-green-100 bg-green-50 text-green-800',
  }[color] || 'ring-gray-100 bg-gray-50 text-gray-800';

  return (
    <div className={twMerge('card hover:shadow-md transition-shadow cursor-pointer ring-1', colorClasses, className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</div>
        <div className="p-2 rounded-lg bg-white/50">{ICONS[color] || ICONS.blue}</div>
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

