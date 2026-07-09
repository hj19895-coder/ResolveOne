import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, RefreshCw, Download } from "lucide-react";
import useDashboardTheme from "../../hooks/useDashboardTheme";

const DEFAULT_STATUS_COLUMNS = [
  "On-hold",
  "Open",
  "Confirmation Awaiting",
  "In Progress",
  "Information Awaiting",
];

function formatStatusLabel(status) {
  const cleaned = String(status ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = cleaned.toLowerCase();
  if (normalized.includes("confirmation awaiting")) return "Conf. Awaiting";
  if (normalized.includes("information awaiting")) return "Info Awaiting";
  if (normalized === "onhold" || normalized.includes("on hold")) return "On Hold";
  if (normalized.includes("progress")) return "In Progress";
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function buildStatusCols(data) {
  const keys = data?.statusColumns?.length ? [...data.statusColumns] : [...DEFAULT_STATUS_COLUMNS];
  for (const row of data?.rows ?? []) {
    for (const key of Object.keys(row.counts ?? {})) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((key) => ({ key, label: formatStatusLabel(key) }));
}

function SkeletonRow({ cols, dark }) {
  return (
    <tr className={dark ? "border-b border-white/8" : "border-b border-gray-100"}>
      <td className="px-3 py-2"><div className={`h-3 rounded-full animate-pulse w-28 ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2 text-center"><div className={`h-3 rounded-full animate-pulse w-6 mx-auto ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
      ))}
      <td className="px-3 py-2 text-center"><div className={`h-3 rounded-full animate-pulse w-8 mx-auto ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
    </tr>
  );
}

export default function ClientStatusCardDark({ onDataLoad }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dark = useDashboardTheme();
  const statusCols = useMemo(() => buildStatusCols(data), [data]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/client-status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      onDataLoad?.(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onDataLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    if (!data?.rows) return;
    const header = ["Client", ...statusCols.map((s) => s.label), "Grand Total"];
    const lines = [
      header.join(","),
      ...data.rows.map((r) => [`"${r.client}"`, ...statusCols.map((s) => r.counts[s.key] || ""), r.total].join(",")),
      ["Grand Total", ...statusCols.map((s) => data.rows.reduce((sum, r) => sum + (r.counts[s.key] || 0), 0)), data.rows.reduce((sum, r) => sum + r.total, 0)].join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-status-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = data?.rows ?? [];
  const colTotals = statusCols.map((s) => rows.reduce((sum, r) => sum + (r.counts[s.key] || 0), 0));
  const grandTotal = colTotals.reduce((a, b) => a + b, 0);

  const shell = {
    background: dark ? "rgba(10,14,28,0.96)" : "#fff",
    border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
    boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : "0 12px 34px rgba(80,60,200,0.08)",
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-xl" style={shell}>
      <div
        className="px-3 py-2.5 flex items-center justify-between gap-2 shrink-0"
        style={{
          borderBottom: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(243 244 246)",
          background: dark ? "rgba(255,255,255,0.02)" : "rgba(249,250,251,0.75)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: dark ? "rgba(124,58,237,0.16)" : "#f5f3ff",
              border: dark ? "1px solid rgba(167,139,250,0.18)" : "1px solid rgb(221 214 254)",
            }}
          >
            <Users size={17} color={dark ? "#c4b5fd" : "#7c3aed"} />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>
              Clientwise Status Overview
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
              Open tickets by client x status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg disabled:opacity-40 transition-all"
            style={{
              color: dark ? "#cbd5e1" : "#6b7280",
              background: dark ? "rgba(255,255,255,0.05)" : "rgb(249 250 251)",
              border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
            }}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} color={loading ? (dark ? "#c4b5fd" : "#8b5cf6") : (dark ? "#94a3b8" : "#9ca3af")} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={loading || !data}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white rounded-lg disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#5B4FE8,#7C6FF0)" }}
          >
            <Download size={11} />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3 px-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: dark ? "rgba(248,113,113,0.12)" : "#fef2f2" }}>
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: dark ? "#e5edf7" : "#374151" }}>Failed to load report</p>
          <p className="text-xs text-center" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{error}</p>
        </div>
      )}

      {!error && (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse min-w-max w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgb(249 250 251)", borderBottom: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)" }}>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[160px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>Client</th>
                {statusCols.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[88px]" style={{ color: dark ? "#cbd5e1" : "#94a3b8" }}>
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[105px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>Grand Total</th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={statusCols.length} dark={dark} />)}

              {!loading &&
                rows.map((row, idx) => (
                  <tr
                    key={row.client}
                    className="transition-colors"
                    style={{
                      background: idx % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgba(249,250,251,0.4)"),
                      borderBottom: dark ? "1px solid rgba(148,163,184,0.10)" : "1px solid rgb(243 244 246)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? "rgba(167,139,250,0.08)" : "rgba(245,243,255,0.85)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgba(249,250,251,0.4)"); }}
                  >
                    <td className="px-3 py-2.5 text-[12px] whitespace-nowrap font-medium" style={{ color: dark ? "#e5edf7" : "#1f2937" }}>{row.client}</td>
                    {statusCols.map((s) => {
                      const val = row.counts[s.key] || null;
                      return (
                        <td key={s.key} className="px-2 py-2.5 text-[12px] text-center tabular-nums" style={{ color: dark ? "#e5edf7" : "#374151" }}>
                          {val ? val : <span className={dark ? "text-slate-600" : "text-gray-300"}>-</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-[12px] text-right tabular-nums font-semibold" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>
                      {row.total}
                    </td>
                  </tr>
                ))}
            </tbody>

            {!loading && data && rows.length > 0 && (
              <tfoot>
                <tr style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgb(249 250 251)", borderTop: dark ? "2px solid rgba(148,163,184,0.18)" : "2px solid rgb(229 231 235)" }}>
                  <td className="px-3 py-1.5 text-[11px] font-semibold uppercase" style={{ color: dark ? "#e5edf7" : "#1f2937" }}>Grand Total</td>
                  {colTotals.map((t, i) => (
                    <td key={i} className="px-2 py-1.5 text-[11px] text-center tabular-nums font-semibold" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>
                      {t || 0}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[11px] text-right tabular-nums font-bold" style={{ color: dark ? "#c4b5fd" : "#5B4FE8" }}>
                    {grandTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1.5 py-14">
              <p className="text-xs font-medium" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>No client data available</p>
            </div>
          )}
        </div>
      )}

      <div className="px-3 py-1.5 flex items-center justify-between shrink-0" style={{ borderTop: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(243 244 246)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(249,250,251,0.75)" }}>
        <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{rows.length} clients</span>
        {data?.generatedAt && (
          <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
            {new Date(data.generatedAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}