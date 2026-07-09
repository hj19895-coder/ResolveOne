// src/components/reports/ReportTable.jsx
import { TICKET_HEALTH_ROWS } from "../../config/reportConfig";

/* ─── formatters ─────────────────────────────────────────────── */
function formatValue(value, formatter) {
  if (value === null || value === undefined)
    return <span className="text-gray-300">—</span>;
  switch (formatter) {
    case "percent": return `${value}%`;
    case "hours":   return `${value} hrs`;
    default:        return value.toLocaleString();
  }
}

/* ─── highlight resolvers ─────────────────────────────────────── */
function getCellStyle(value, highlightRule) {
  if (value === null || value === undefined) return "";
  if (highlightRule === "sla") {
    if (value >= 95) return "text-emerald-600 font-semibold";
    if (value >= 80) return "text-amber-600 font-semibold";
    return "text-red-600 font-semibold";
  }
  if (highlightRule === "p1"     && value > 0)  return "text-red-600 font-semibold";
  if (highlightRule === "reopen" && value > 10) return "text-amber-600 font-semibold";
  return "";
}

function getCellBg(value, highlightRule) {
  if (value === null || value === undefined) return "";
  if (highlightRule === "p1" && value > 0) return "bg-red-50";
  return "";
}

/* ─── skeleton row ───────────────────────────────────────────── */
function SkeletonRow({ index }) {
  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
      <td className="px-3 py-1"><div className="h-3 bg-gray-200 rounded-full animate-pulse w-40" /></td>
      <td className="px-3 py-1"><div className="h-3 bg-gray-200 rounded-full animate-pulse w-10 ml-auto" /></td>
      <td className="px-3 py-1"><div className="h-3 bg-gray-200 rounded-full animate-pulse w-10 ml-auto" /></td>
    </tr>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function ReportTable({ data, loading, error, rows = TICKET_HEALTH_ROWS }) {

  /* ── error state ── */
  if (error) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Failed to load report</p>
          <p className="text-xs text-gray-400 text-center">{error}</p>
        </div>
      </div>
    );
  }

  /* ── empty state ── */
  if (!loading && !data) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm font-medium text-gray-500">No data available</p>
          <p className="text-xs text-gray-400">Select a report and date range to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── table ── */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {/* Category col: takes remaining space */}
            <th className="px-3 py-2 text-left text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
              Category
            </th>
            {/* Today + Last 7 Days: fixed narrow width, right-aligned */}
            <th className="px-3 py-2 text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-28">
              Today
            </th>
            <th className="px-3 py-2 text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap w-32">
              Last 7 Days
            </th>
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: rows.length }).map((_, i) => (
                <SkeletonRow key={i} index={i} />
              ))
            : rows.map((row, index) => {
                const todayVal  = data?.today?.[row.key]  ?? null;
                const weeklyVal = data?.weekly?.[row.key] ?? null;

                const rowBase      = index % 2 === 0 ? "bg-white" : "bg-gray-50/40";
                const todayCellBg  = getCellBg(todayVal,  row.highlightRule);
                const weeklyCellBg = getCellBg(weeklyVal, row.highlightRule);

                return (
                  <tr
                    key={row.key}
                    className={`
                      ${rowBase}
                      hover:bg-violet-50/30 transition-colors
                      ${row.dividerAfter ? "border-b-2 border-gray-200" : "border-b border-gray-100"}
                    `}
                  >
                    {/* Category — stretches, truncates on overflow */}
                    <td
                      className={`px-3 py-1.5 text-[11px] leading-snug
                        ${row.bold ? "font-semibold text-gray-800" : "text-gray-700"}`}
                      title={row.category}
                    >
                      {row.category}
                    </td>

                    {/* Today */}
                    <td
                      className={`px-3 py-1.5 text-[11px] text-right tabular-nums w-28
                        ${todayCellBg}
                        ${getCellStyle(todayVal, row.highlightRule) || "text-gray-800"}`}
                    >
                      {formatValue(todayVal, row.formatter)}
                    </td>

                    {/* Weekly */}
                    <td
                      className={`px-3 py-1.5 text-[11px] text-right tabular-nums w-32
                        ${weeklyCellBg}
                        ${getCellStyle(weeklyVal, row.highlightRule) || "text-gray-800"}`}
                    >
                      {formatValue(weeklyVal, row.formatter)}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>

      {/* ── footer ── */}
      {!loading && data && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{rows.length} metrics</span>
          {data.meta?.generatedAt && (
            <span className="text-[10px] text-gray-400">
              {new Date(data.meta.generatedAt).toLocaleString("en-GB", {
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