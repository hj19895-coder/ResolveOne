import { useEffect, useState } from 'react';

export default function EmptyState({ title, desc, action, className = '' }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const syncTheme = (e) => {
      const next = e?.detail;
      if (next === 'dark' || next === 'light') {
        setDark(next === 'dark');
        return;
      }
      setDark(typeof document !== 'undefined' && document.documentElement.dataset.dashboardTheme === 'dark');
    };
    syncTheme();
    window.addEventListener('dashboard-theme-change', syncTheme);
    return () => window.removeEventListener('dashboard-theme-change', syncTheme);
  }, []);

  return (
    <div
      className={`text-center py-16 px-8 ${className}`}
      style={{
        background: dark ? 'rgba(10,14,28,0.72)' : 'transparent',
        border: dark ? '1px solid rgba(255,255,255,0.08)' : 'none',
        borderRadius: 16,
      }}
    >
      <svg className="mx-auto h-16 w-16 mb-6" style={{ color: dark ? '#94a3b8' : '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 className="text-lg font-semibold mb-2" style={{ color: dark ? '#f8fafc' : '#111827' }}>{title}</h3>
      {desc && <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: dark ? '#94a3b8' : '#6b7280' }}>{desc}</p>}
      {action}
    </div>
  );
}
