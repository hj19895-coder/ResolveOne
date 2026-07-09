import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Download, Users } from "lucide-react";
import * as XLSX from "xlsx";
import useDashboardTheme from "../../hooks/useDashboardTheme";

const DEFAULT_STATUS_COLUMNS = [
  "Confirmation_awaiting",
  "In-Progress",
  "Onhold",
  "Open",
  "Information_awaiting",
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

function buildStatusCols(statusColumns, rows) {
  const keys = statusColumns?.length ? [...statusColumns] : [...DEFAULT_STATUS_COLUMNS];
  for (const row of rows ?? []) {
    for (const key of Object.keys(row.counts ?? {})) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((key) => ({ key, label: formatStatusLabel(key) }));
}

function SkeletonRow({ cols, dark }) {
  return (
    <tr style={{ borderBottom: dark ? "1px solid rgba(148,163,184,0.10)" : "1px solid rgb(243 244 246)" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-2 py-1.5">
          <div
            className="h-3 rounded-full animate-pulse"
            style={{
              width: i === 0 ? 80 : 24,
              marginLeft: i === 0 ? 0 : "auto",
              background: dark ? "rgba(255,255,255,0.10)" : "rgb(229 231 235)",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function DeveloperPivotCardDark({ onDataLoad }) {
  const [rows, setRows] = useState([]);
  const [statusColumns, setStatusColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const dark = useDashboardTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/developer-pending");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setRows(json.rows ?? []);
      setStatusColumns(json.statusColumns ?? []);
      setGeneratedAt(json.generatedAt ?? null);
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

  const statusCols = useMemo(() => buildStatusCols(statusColumns, rows), [statusColumns, rows]);

  const handleExport = async () => {
    if (!rows.length) return;
    setExporting(true);
    try {
      const headers = ["Developer", ...statusCols.map((c) => c.label), "Grand Total"];
      const wsData = [
        ["Developer-wise Pending Tickets"],
        [`Generated: ${new Date().toLocaleString("en-GB")}`],
        [],
        headers,
        ...rows.map((r) => [r.developer, ...statusCols.map((c) => r.counts[c.key] || 0), r.total]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 28 }, ...statusCols.map(() => ({ wch: 16 })), { wch: 12 }];
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Developer Pending");
      XLSX.writeFile(wb, `Developer_Pending_${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const grandTotal = rows.reduce((acc, r) => {
    statusCols.forEach((c) => {
      acc[c.key] = (acc[c.key] || 0) + (r.counts[c.key] || 0);
    });
    acc._total = (acc._total || 0) + r.total;
    return acc;
  }, {});

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
              Developer-wise Pending Tickets
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
              Current open tickets by assignee
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
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
            disabled={exporting || loading || !rows.length}
            title="Export to Excel"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white rounded-lg disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#5B4FE8,#7C6FF0)" }}
          >
            <Download size={11} />
            {exporting ? "..." : "Export"}
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="px-3 py-8 flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-xs font-medium text-red-500">Failed to load</p>
          <p className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{error}</p>
        </div>
      )}

      {!error && (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse min-w-max w-full">
            <thead className="sticky top-0 z-10">
              <tr
                style={{
                  background: dark ? "rgba(255,255,255,0.03)" : "rgb(249 250 251)",
                  borderBottom: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
                }}
              >
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[160px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
                  Developer
                </th>
                {statusCols.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[88px]" style={{ color: dark ? "#cbd5e1" : "#94a3b8" }}>
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap min-w-[105px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={statusCols.length + 2} dark={dark} />)}

              {!loading &&
                rows.map((row, index) => (
                  <tr
                    key={row.developer}
                    className="transition-colors"
                    style={{
                      background: index % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgba(249,250,251,0.4)"),
                      borderBottom: dark ? "1px solid rgba(148,163,184,0.10)" : "1px solid rgb(243 244 246)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? "rgba(167,139,250,0.08)" : "rgba(245,243,255,0.85)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = index % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#fff") : (dark ? "rgba(255,255,255,0.04)" : "rgba(249,250,251,0.4)"); }}
                  >
                    <td className="px-3 py-2.5 text-[12px] whitespace-nowrap font-medium" style={{ color: dark ? "#e5edf7" : "#1f2937" }}>
                      {row.developer}
                    </td>
                    {statusCols.map((c) => {
                      const v = row.counts[c.key] || 0;
                      return (
                        <td key={c.key} className="px-2 py-2.5 text-[12px] text-center tabular-nums" style={{ color: dark ? "#e5edf7" : "#374151" }}>
                          {v > 0 ? v : <span className={dark ? "text-slate-600" : "text-gray-300"}>-</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-[12px] text-right tabular-nums font-semibold" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>
                      {row.total}
                    </td>
                  </tr>
                ))}

              {!loading && rows.length > 0 && (
                <tr
                  style={{
                    background: dark ? "rgba(255,255,255,0.03)" : "rgb(249 250 251)",
                    borderTop: dark ? "2px solid rgba(148,163,184,0.18)" : "2px solid rgb(229 231 235)",
                  }}
                >
                  <td className="px-3 py-1.5 text-[11px] font-semibold uppercase" style={{ color: dark ? "#e5edf7" : "#1f2937" }}>
                    Grand Total
                  </td>
                  {statusCols.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-[11px] text-center tabular-nums font-semibold" style={{ color: dark ? "#f8fafc" : "#1f2937" }}>
                      {grandTotal[c.key] || 0}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[11px] text-right tabular-nums font-bold" style={{ color: dark ? "#c4b5fd" : "#5B4FE8" }}>
                    {grandTotal._total || 0}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1.5 py-14">
              <p className="text-xs font-medium" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>No developer data available</p>
            </div>
          )}
        </div>
      )}

      <div className="px-3 py-1.5 border-t flex items-center justify-between shrink-0" style={{ borderTopColor: dark ? "rgba(148,163,184,0.14)" : "rgb(243 244 246)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(249,250,251,0.75)" }}>
        <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>{rows.length} developers</span>
        {generatedAt && (
          <span className="text-[10px]" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
            {new Date(generatedAt).toLocaleString("en-GB", {
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