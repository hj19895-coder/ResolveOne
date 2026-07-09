// src/pages/ReportsPage.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import Layout from "../components/layout/Layout";
import TicketHealthCard from "../components/reports/TicketHealthCardDark";
import DeveloperPivotCard from "../components/reports/DeveloperPivotCardDark";
import ClientStatusCard from "../components/reports/ClientStatusCardDark";
import ReportInsightsBot from "../components/reports/ReportInsightsBotDark";
import useDashboardTheme from "../hooks/useDashboardTheme";

const REPORT_OPTIONS = [
  { value: "ticket-health",   label: "Tickets Health Summary",      Component: TicketHealthCard   },
  { value: "developer-pivot", label: "Developerwise Breakdown",     Component: DeveloperPivotCard },
  { value: "client-status",   label: "Clientwise Breakdown",        Component: ClientStatusCard   },
];

export default function ReportsPage() {
  const [selected, setSelected] = useState("ticket-health");
  const [open, setOpen]         = useState(false);
  const [cardData, setCardData] = useState(null); // data bubbled up from active card
  const dropRef                 = useRef(null);
  const dark                    = useDashboardTheme();

  // --- fixed size lock, measured off the Ticket Health card (source of truth) ---
  const measureRef              = useRef(null);
  const [boxSize, setBoxSize]   = useState(null); // { width, height }

  const measure = useCallback(() => {
    if (!measureRef.current) return;
    const { width, height } = measureRef.current.getBoundingClientRect();
    if (width && height) {
      setBoxSize((prev) => {
        if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) return prev;
        return { width, height };
      });
    }
  }, []);

  useEffect(() => {
    if (!measureRef.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(measureRef.current);
    measure();
    return () => ro.disconnect();
  }, [measure]);

  const current = REPORT_OPTIONS.find((o) => o.value === selected);

  // Reset data when report changes
  useEffect(() => { setCardData(null); }, [selected]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Layout>
      <div
        className="relative px-4 sm:px-6 lg:px-8 pt-2 pb-6 max-w-screen-2xl mx-auto"
        style={{ color: dark ? "#e5edf7" : "#111827" }}
      >

        {/* Hidden measuring instance of Ticket Health — defines the fixed box for all cards */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", top: 0, left: 0, visibility: "hidden", height: 0, overflow: "hidden", pointerEvents: "none" }}
        >
          <div ref={measureRef}>
            <TicketHealthCard />
          </div>
        </div>

        {/* Report selector */}
        <div className="flex items-center justify-end mb-3">
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl shadow-sm
                         transition-all min-w-[220px] justify-between"
              style={{
                color: dark ? "#e5edf7" : "#374151",
                background: dark ? "rgba(15,23,42,0.92)" : "#fff",
                border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
              }}
            >
              <span>{current?.label}</span>
              <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} color={dark ? "#94a3b8" : "#9ca3af"} />
            </button>

            {open && (
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl shadow-lg z-50 overflow-hidden min-w-[220px]"
                style={{
                  background: dark ? "rgba(15,23,42,0.98)" : "#fff",
                  border: dark ? "1px solid rgba(148,163,184,0.14)" : "1px solid rgb(229 231 235)",
                }}
              >
                {REPORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelected(opt.value); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      opt.value === selected
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
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start gap-6">
          <div
            className="flex-shrink-0"
            style={
              boxSize
                ? { width: boxSize.width, height: boxSize.height, overflow: "hidden" }
                : { minWidth: 0 }
            }
          >
            <current.Component onDataLoad={setCardData} />
          </div>
          <div className="min-w-0 xl:ml-auto">
            <ReportInsightsBot reportKey={selected} data={cardData} />
          </div>
        </div>

      </div>
    </Layout>
  );
}