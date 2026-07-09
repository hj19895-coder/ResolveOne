// src/components/reports/ReportHeader.jsx
// ─── This is the FINAL version. Replace the existing file with this. ───────
import { useState, useRef, useEffect } from "react";
import { BarChart3, RefreshCw, Download, ChevronDown } from "lucide-react";
import DateRangeFilter from "./DateRangeFilter";
import { REPORT_OPTIONS } from "../../config/reportConfig";
import useDashboardTheme from "../../hooks/useDashboardTheme";

/**
 * ReportHeader
 * Props:
 *   selectedReport  – string (report key)
 *   onReportChange  – (key) => void
 *   dateFilter      – { preset, startDate, endDate }
 *   onDateChange    – (filter) => void
 *   onRefresh       – () => void
 *   onExport        – () => void
 *   loading         – bool
 *   exporting       – bool
 */
export default function ReportHeader({
  selectedReport,
  onReportChange,
  dateFilter,
  onDateChange,
  onRefresh,
  onExport,
  loading = false,
  exporting = false,
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dark = useDashboardTheme();

  const selectedLabel =
    REPORT_OPTIONS.find((o) => o.value === selectedReport)?.label ?? "Select report";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setReportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="mb-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
            style={{
              background: dark ? "rgba(124,58,237,0.14)" : "#f5f3ff",
              borderColor: dark ? "rgba(167,139,250,0.18)" : "rgb(221 214 254)",
            }}
          >
            <BarChart3 size={18} color={dark ? "#c4b5fd" : "#7c3aed"} />
          </div>
          <div>
            <p className="text-sm mt-0.5" style={{ color: dark ? "#94a3b8" : "#9ca3af" }}>
              Ticket insights and SLA performance
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh data"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            style={{
              color: dark ? "#cbd5e1" : "#4b5563",
              background: dark ? "rgba(15,23,42,0.92)" : "#fff",
              border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
            }}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              color={loading ? (dark ? "#c4b5fd" : "#8b5cf6") : (dark ? "#94a3b8" : "#9ca3af")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onExport}
            disabled={exporting || loading}
            title="Export to Excel"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-violet-200"
          >
            <Download size={14} />
            <span>{exporting ? "Exporting…" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Report selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setReportOpen((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all shadow-sm min-w-[200px] justify-between"
            style={{
              color: dark ? "#e5edf7" : "#374151",
              background: dark ? "rgba(15,23,42,0.92)" : "#fff",
              border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
            }}
          >
            <span>{selectedLabel}</span>
            <ChevronDown
              size={13}
              className={`transition-transform ${reportOpen ? "rotate-180" : ""}`}
              color={dark ? "#94a3b8" : "#9ca3af"}
            />
          </button>

          {reportOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 rounded-xl shadow-lg z-20 overflow-hidden min-w-[200px]"
              style={{
                background: dark ? "rgba(15,23,42,0.98)" : "#fff",
                border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
              }}
            >
              {REPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onReportChange(opt.value);
                    setReportOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    opt.value === selectedReport
                      ? (dark ? "bg-violet-500/15 text-violet-200 font-semibold" : "bg-violet-50 text-violet-700 font-semibold")
                      : (dark ? "text-slate-200 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50")
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 hidden sm:block" style={{ background: dark ? "rgba(148,163,184,0.18)" : "rgb(229 231 235)" }} />

        {/* Date range filter */}
        <DateRangeFilter
          value={dateFilter.preset}
          customStart={dateFilter.startDate}
          customEnd={dateFilter.endDate}
          onChange={onDateChange}
        />
      </div>
    </div>
  );
}
