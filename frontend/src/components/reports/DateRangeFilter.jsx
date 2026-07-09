// src/components/reports/DateRangeFilter.jsx
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DATE_PRESETS } from "../../config/reportConfig";
import useDashboardTheme from "../../hooks/useDashboardTheme";

/**
 * DateRangeFilter
 * Props:
 *   value        – preset string (e.g. "last7")
 *   customStart  – Date | null
 *   customEnd    – Date | null
 *   onChange     – ({ preset, startDate, endDate }) => void
 */
export default function DateRangeFilter({ value, customStart, customEnd, onChange }) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState("");
  const [pendingEnd, setPendingEnd] = useState("");
  const ref = useRef(null);
  const dark = useDashboardTheme();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = DATE_PRESETS.find((p) => p.value === value)?.label ?? "Select range";

  const formatDateDisplay = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  const displayLabel =
    value === "custom" && customStart && customEnd
      ? `${formatDateDisplay(customStart)} – ${formatDateDisplay(customEnd)}`
      : selectedLabel;

  const handlePreset = (preset) => {
    if (preset !== "custom") {
      setOpen(false);
      onChange({ preset, startDate: null, endDate: null });
    }
    // For custom: stay open, show date pickers below
    else {
      onChange({ preset: "custom", startDate: null, endDate: null });
    }
  };

  const applyCustom = () => {
    if (!pendingStart || !pendingEnd) return;
    setOpen(false);
    onChange({
      preset: "custom",
      startDate: new Date(pendingStart),
      endDate: new Date(pendingEnd),
    });
  };

  const toInputValue = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toISOString().split("T")[0];
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all shadow-sm"
        style={{
          color: dark ? "#e5edf7" : "#374151",
          background: dark ? "rgba(15,23,42,0.92)" : "#fff",
          border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
        }}
      >
        <Calendar size={14} className="flex-shrink-0" color={dark ? "#c4b5fd" : "#8b5cf6"} />
        <span className="max-w-[220px] truncate">{displayLabel}</span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} color={dark ? "#94a3b8" : "#9ca3af"} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 rounded-xl shadow-lg z-30 overflow-hidden min-w-[220px]"
          style={{
            background: dark ? "rgba(15,23,42,0.98)" : "#fff",
            border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
          }}
        >
          {DATE_PRESETS.filter((p) => p.value !== "custom").map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePreset(preset.value)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === preset.value && value !== "custom"
                  ? (dark ? "bg-violet-500/15 text-violet-200 font-semibold" : "bg-violet-50 text-violet-700 font-semibold")
                  : (dark ? "text-slate-200 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50")
              }`}
            >
              {preset.label}
            </button>
          ))}

          {/* Divider */}
          <div className="h-px mx-3" style={{ background: dark ? "rgba(148,163,184,0.16)" : "rgb(243 244 246)" }} />

          {/* Custom range toggle */}
          <button
            onClick={() => handlePreset("custom")}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
              value === "custom"
                ? (dark ? "bg-violet-500/15 text-violet-200 font-semibold" : "bg-violet-50 text-violet-700 font-semibold")
                : (dark ? "text-slate-200 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50")
            }`}
          >
            Custom Range
          </button>

          {value === "custom" && (
            <div className="px-4 pb-4 pt-2 space-y-2.5" style={{ borderTop: dark ? "1px solid rgba(148,163,184,0.16)" : "1px solid rgb(243 244 246)" }}>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>Start Date</label>
                <input
                  type="date"
                  defaultValue={toInputValue(customStart)}
                  onChange={(e) => setPendingStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    color: dark ? "#e5edf7" : "#111827",
                    background: dark ? "rgba(255,255,255,0.04)" : "#fff",
                    border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: dark ? "#94a3b8" : "#6b7280" }}>End Date</label>
                <input
                  type="date"
                  defaultValue={toInputValue(customEnd)}
                  onChange={(e) => setPendingEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    color: dark ? "#e5edf7" : "#111827",
                    background: dark ? "rgba(255,255,255,0.04)" : "#fff",
                    border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
                  }}
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!pendingStart || !pendingEnd}
                className="w-full py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: "linear-gradient(135deg,#5B4FE8,#7C6FF0)" }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
