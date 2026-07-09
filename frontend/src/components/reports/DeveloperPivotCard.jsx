// src/components/reports/DeveloperPivotCard.jsx
import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";
import * as XLSX from "xlsx";

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

function SkeletonRow({ cols }) {
  return (
    <tr className="bg-white border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-2 py-1.5">
          <div className="h-3 bg-gray-200 rounded-full animate-pulse" style={{ width: i === 0 ? 80 : 24, marginLeft: i === 0 ? 0 : "auto" }} />
        </td>
      ))}
    </tr>
  );
}

export default function DeveloperPivotCard({ onDataLoad }) {
  const [rows, setRows]       = useState([]);
  const [statusColumns, setStatusColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [exporting, setExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusCols = useMemo(() => buildStatusCols(statusColumns, rows), [statusColumns, rows]);

  const handleExport = async () => {
    if (!rows.length) return;
    setExporting(true);
    try {
      const headers = ["Developer", ...statusCols.map(c => c.label), "Grand Total"];
      const wsData  = [
        ["Developer-wise Pending Tickets"],
        [`Generated: ${new Date().toLocaleString("en-GB")}`],
        [],
        headers,
        ...rows.map(r => [
          r.developer,
          ...statusCols.map(c => r.counts[c.key] || 0),
          r.total,
        ]),
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

  // Grand total row
  const grandTotal = rows.reduce((acc, r) => {
    statusCols.forEach(c => { acc[c.key] = (acc[c.key] || 0) + (r.counts[c.key] || 0); });
    acc._total = (acc._total || 0) + r.total;
    return acc;
  }, {});

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-shrink-0 flex flex-col w-[870px] max-w-full">
      {/* ── card header ── */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
        <div>
          <p className="text-[13px] font-semibold text-gray-800 leading-tight">Developer-wise Pending Tickets</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Current open tickets by assignee</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all"
          >
            <RefreshCw size={11} className={loading ? "animate-spin text-violet-500" : "text-gray-400"} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading || !rows.length}
            title="Export to Excel"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg transition-all"
          >
            <Download size={11} />
            {exporting ? "…" : "Export"}
          </button>
        </div>
      </div>

      {/* ── error ── */}
      {error && !loading && (
        <div className="px-3 py-8 flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-xs font-medium text-red-500">Failed to load</p>
          <p className="text-[10px] text-gray-400">{error}</p>
        </div>
      )}

      {/* ── table ── */}
      {!error && (
        <div className="max-h-[260px] overflow-auto">
          <table className="border-collapse min-w-max w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                  Developer
                </th>
                {statusCols.map(c => (
                  <th key={c.key} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[88px]">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[105px]">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={statusCols.length + 2} />)
                : rows.map((row, index) => (
                    <tr
                      key={row.developer}
                      className={`
                        ${index % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                        hover:bg-violet-50/30 transition-colors border-b border-gray-100
                      `}
                    >
                      <td className="px-3 py-2.5 text-[12px] text-gray-700 whitespace-nowrap font-medium">
                        {row.developer}
                      </td>
                      {statusCols.map(c => {
                        const v = row.counts[c.key] || 0;
                        return (
                          <td key={c.key} className="px-2 py-2.5 text-[12px] text-center tabular-nums text-gray-700">
                            {v > 0 ? v : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-[12px] text-right tabular-nums font-semibold text-gray-800">
                        {row.total}
                      </td>
                    </tr>
                  ))
              }

              {/* Grand Total row */}
              {!loading && rows.length > 0 && (
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-3 py-1.5 text-[11px] font-semibold text-gray-800">Grand Total</td>
                  {statusCols.map(c => (
                    <td key={c.key} className="px-2 py-1.5 text-[11px] text-center tabular-nums font-semibold text-gray-800">
                      {grandTotal[c.key] || 0}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[11px] text-right tabular-nums font-bold text-violet-700">
                    {grandTotal._total || 0}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── footer ── */}
      {!loading && rows.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between mt-auto shrink-0">
          <span className="text-[10px] text-gray-400">{rows.length} developers</span>
          {generatedAt && (
            <span className="text-[10px] text-gray-400">
              {new Date(generatedAt).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
