// src/components/reports/ClientStatusCard.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";

// ─── Status column config (order + display label) ───────────────────────────
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

// ─── Skeleton ─────────────────────────────────────────────────────────────
function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-3 py-2">
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-28" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2 text-center">
          <div className="h-3 bg-gray-200 rounded-full animate-pulse w-6 mx-auto" />
        </td>
      ))}
      <td className="px-3 py-2 text-center">
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-8 mx-auto" />
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function ClientStatusCard({ onDataLoad }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── export to CSV ──
  const handleExport = () => {
    if (!data?.rows) return;
    const header = ["Client", ...statusCols.map((s) => s.label), "Grand Total"];
    const lines = [
      header.join(","),
      ...data.rows.map((r) =>
        [
          `"${r.client}"`,
          ...statusCols.map((s) => r.counts[s.key] || ""),
          r.total,
        ].join(",")
      ),
      // grand total row
      [
        "Grand Total",
        ...statusCols.map((s) =>
          data.rows.reduce((sum, r) => sum + (r.counts[s.key] || 0), 0)
        ),
        data.rows.reduce((sum, r) => sum + r.total, 0),
      ].join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `client-status-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── derived totals for footer ──
  const colTotals = statusCols.map((s) =>
    (data?.rows ?? []).reduce((sum, r) => sum + (r.counts[s.key] || 0), 0)
  );
  const grandTotal = colTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-shrink-0 flex flex-col w-[870px] max-w-full">
      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[13px] font-semibold text-gray-800 leading-tight">Clientwise Status Overview</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Open tickets by client × status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">

            <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-all"
                >
                <RefreshCw size={11} className={loading ? "animate-spin text-violet-500" : "text-gray-400"} />
                Refresh
                </button>
                <button
                onClick={handleExport}
                disabled={loading || !data}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg transition-all"
                >
                <Download size={11} />
                Export
            </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Failed to load report</p>
          <p className="text-xs text-gray-400">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      {!error && (
        <div className="max-h-[260px] overflow-auto">
          <table className="border-collapse min-w-max w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                  Client
                </th>
                {statusCols.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[88px]">
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[105px]">
                  Grand Total
                </th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonRow key={i} cols={statusCols.length} />
                  ))
                : data?.rows.map((row, idx) => (
                    <tr
                      key={row.client}
                      className={`
                        border-b border-gray-100 hover:bg-violet-50/30 transition-colors
                        ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                      `}
                    >
                      {/* Client name */}
                      <td className="px-3 py-2.5 text-[12px] text-gray-700 whitespace-nowrap font-medium">
                        {row.client}
                      </td>

                      {/* Count cells */}
                      {statusCols.map((s) => {
                        const val = row.counts[s.key] || null;
                        return (
                          <td key={s.key} className="px-2 py-2.5 text-[12px] text-center tabular-nums text-gray-700">
                            {val ? val : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}

                      {/* Row total */}
                      <td className="px-3 py-2.5 text-[12px] text-right tabular-nums font-semibold text-gray-800">
                        {row.total}
                      </td>
                    </tr>
                  ))}
            </tbody>

            {/* ── Grand Total footer ── */}
            {!loading && data && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-3 py-1.5 text-[11px] font-semibold text-gray-800">
                    Grand Total
                  </td>
                  {colTotals.map((t, i) => (
                    <td key={i} className="px-2 py-1.5 text-[11px] text-center tabular-nums font-semibold text-gray-800">
                      {t || 0}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[11px] text-right tabular-nums font-bold text-violet-700">
                    {grandTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Footer bar ── */}
      {!loading && data && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between mt-auto shrink-0">
          <span className="text-[10px] text-gray-400">{data.rows.length} clients</span>
          {data.generatedAt && (
            <span className="text-[10px] text-gray-400">
              {new Date(data.generatedAt).toLocaleString("en-GB", {
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
