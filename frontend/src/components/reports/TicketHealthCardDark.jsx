import { useState, useCallback, useEffect } from "react";
import { RefreshCw, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { TICKET_HEALTH_ROWS } from "../../config/reportConfig";
import useDashboardTheme from "../../hooks/useDashboardTheme";

const W = 580;
const COL = { cat: 340, today: 110, weekly: 130 };

function formatValue(value, formatter, dark) {
  if (value === null || value === undefined) return <span style={{ color: dark ? "#64748b" : "#d1d5db" }}>-</span>;
  switch (formatter) {
    case "percent":
      return `${value}%`;
    case "hours":
      return `${value} hrs`;
    default:
      return value.toLocaleString();
  }
}

function getCellStyle(value, rule) {
  if (value === null || value === undefined) return "";
  if (rule === "sla") {
    if (value >= 95) return "text-emerald-300 font-semibold";
    if (value >= 80) return "text-amber-300 font-semibold";
    return "text-red-300 font-semibold";
  }
  if (rule === "p1" && value > 0) return "text-red-300 font-semibold";
  if (rule === "reopen" && value > 10) return "text-amber-300 font-semibold";
  return "";
}

function getCellBg(value, rule, dark) {
  if (value === null || value === undefined) return "";
  if (rule === "p1" && value > 0) return dark ? "bg-red-500/10" : "bg-red-50";
  return "";
}

function SkeletonRow({ index, dark }) {
  return (
    <tr style={{ background: index % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgb(249 250 251)") }}>
      <td className="px-3 py-2.5"><div className={`h-3 rounded-full animate-pulse w-40 ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
      <td className="px-3 py-2.5"><div className={`h-3 rounded-full animate-pulse w-10 ml-auto ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
      <td className="px-3 py-2.5"><div className={`h-3 rounded-full animate-pulse w-10 ml-auto ${dark ? "bg-white/10" : "bg-gray-200"}`} /></td>
    </tr>
  );
}

export default function TicketHealthCardDark({ onDataLoad }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const dark = useDashboardTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/ticket-health");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
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

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const wsData = [["Ticket Health Summary Report"], [`Generated: ${new Date().toLocaleString("en-GB")}`], [], ["Category", "Today", "Last 7 Days"]];
      TICKET_HEALTH_ROWS.forEach((row) => {
        const fmt = (v) => {
          if (v === null || v === undefined) return "-";
          if (row.formatter === "percent") return `${v}%`;
          if (row.formatter === "hours") return `${v} hrs`;
          return v;
        };
        wsData.push([row.category, fmt(data.today?.[row.key]), fmt(data.weekly?.[row.key])]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 48 }, { wch: 14 }, { wch: 14 }];
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ticket Health");
      XLSX.writeFile(wb, `Ticket_Health_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const shellStyle = {
    width: W,
    background: dark ? "rgba(10,14,28,0.96)" : "#fff",
    border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
    boxShadow: dark ? "0 18px 48px rgba(2,6,23,0.45)" : "0 12px 34px rgba(80,60,200,0.08)",
  };

  return (
    <div className="flex items-start gap-5" style={{ color: dark ? "#e5edf7" : "#111827" }}>
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={shellStyle}>
        <div className="px-3 py-2.5 flex items-center justify-between gap-2" style={{ borderBottom: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(243 244 246)", background: dark ? "rgba(255,255,255,0.02)" : "rgba(249,250,251,0.75)" }}>
          <div>
            <p className="text-[13px] font-semibold leading-tight" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>Ticket Health Summary</p>
            <p className="text-[11px] mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>Today vs Last 7 Days</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg disabled:opacity-40 transition-all"
              style={{ color: dark ? "#cbd5e1" : "#6b7280", background: dark ? "rgba(255,255,255,0.05)" : "rgb(249 250 251)", border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)" }}
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} color={loading ? (dark ? "#c4b5fd" : "#8b5cf6") : (dark ? "#94a3b8" : "#9ca3af")} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || loading || !data}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40 rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg,#5B4FE8,#7C6FF0)" }}
            >
              <Download size={11} />
              {exporting ? "..." : "Export"}
            </button>
          </div>
        </div>

        {error && !loading && (
          <div className="px-3 py-8 flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-red-500">Failed to load</p>
            <p className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{error}</p>
          </div>
        )}

        {!error && (
          <table className="border-collapse" style={{ width: W }}>
            <thead>
              <tr style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgb(249 250 251)", borderBottom: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)" }}>
                <th className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider" style={{ width: COL.cat, color: dark ? "#94a3b8" : "#9ca3af" }}>Category</th>
                <th className="px-3 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ width: COL.today, color: dark ? "#94a3b8" : "#9ca3af" }}>Today</th>
                <th className="px-3 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ width: COL.weekly, color: dark ? "#94a3b8" : "#9ca3af" }}>Last 7 Days</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: TICKET_HEALTH_ROWS.length }).map((_, i) => <SkeletonRow key={i} index={i} dark={dark} />)
                : TICKET_HEALTH_ROWS.map((row, index) => {
                    const tv = data?.today?.[row.key] ?? null;
                    const wv = data?.weekly?.[row.key] ?? null;
                    return (
                      <tr
                        key={row.key}
                        style={{
                          background: index % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgb(249 250 251)"),
                          borderBottom: row.dividerAfter ? (dark ? "2px solid rgba(148,163,184,0.18)" : "2px solid rgb(229 231 235)") : (dark ? "1px solid rgba(148,163,184,0.12)" : "1px solid rgb(243 244 246)"),
                        }}
                      >
                        <td
                          className="px-3 py-2.5 text-[12.5px] leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            color: row.bold ? (dark ? "#f8fafc" : "#1f2937") : (dark ? "#e5edf7" : "#374151"),
                            fontWeight: row.bold ? 600 : 500,
                            maxWidth: COL.cat,
                          }}
                          title={row.category}
                        >
                          {row.category}
                        </td>
                        <td className={`px-3 py-2.5 text-[12.5px] text-right tabular-nums ${getCellBg(tv, row.highlightRule, dark)} ${getCellStyle(tv, row.highlightRule)}`} style={{ color: dark ? "#e5edf7" : "#1f2937" }}>
                          {formatValue(tv, row.formatter, dark)}
                        </td>
                        <td className={`px-3 py-2.5 text-[12.5px] text-right tabular-nums ${getCellBg(wv, row.highlightRule, dark)} ${getCellStyle(wv, row.highlightRule)}`} style={{ color: dark ? "#e5edf7" : "#1f2937" }}>
                          {formatValue(wv, row.formatter, dark)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        )}

        {!loading && data && (
          <div className="px-3 py-1.5 flex items-center justify-between" style={{ width: W, borderTop: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(243 244 246)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(249,250,251,0.75)" }}>
            <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{TICKET_HEALTH_ROWS.length} metrics</span>
            {data.meta?.generatedAt && (
              <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
                {new Date(data.meta.generatedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
