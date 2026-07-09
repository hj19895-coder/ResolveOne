// src/components/layout/Layout.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import NotificationBell from "../notifications/NotificationBell"; // ⚠️ adjust path if you saved it elsewhere
import CreateTicketModal from "../../pages/CreateTicketPage";// adjust path to match where you saved it
import { usePageHeader } from "../../context/PageHeaderContext";
import Toast from "../ui/Toast";



function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const PAGE_LABELS = {
  dashboard: "Dashboard",
  tickets: "Tickets",
  users: "Users",
  "master-data": "Master Data",
};


export default function Layout({ children }) {
  const { headerLabel } = usePageHeader();
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [forbiddenMsg, setForbiddenMsg] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("dashboard-theme") || "light";
  });
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [toast, setToast] = useState(null); // { title, message } | null



  useEffect(() => {
    const handler = (e) => setForbiddenMsg(e.detail);
    window.addEventListener("forbidden", handler);
    return () => window.removeEventListener("forbidden", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail;
      if (next === "dark" || next === "light") setTheme(next);
    };
    window.addEventListener("dashboard-theme-change", handler);
    return () => window.removeEventListener("dashboard-theme-change", handler);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.dashboardTheme = theme;
    }
  }, [theme]);
  const isTicketsPage = location.pathname === "/tickets";

  const currentPage = location.pathname.split("/").filter(Boolean)[0] || "dashboard";
  const pageLabel =
    PAGE_LABELS[currentPage] ||
    currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  const ticketShortLabel = headerLabel;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("dashboard-theme", next);
    window.dispatchEvent(new CustomEvent("dashboard-theme-change", { detail: next }));
    document.documentElement.dataset.dashboardTheme = next;
    setTheme(next);
  };

  const dark = theme === "dark";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: dark ? "#090e1b" : "#f5f5f7" }}>
      <style>{`
        @keyframes df-shimmer { to { background-position: 220% 0; } }
        .nav-new-ticket {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          border: none; border-radius: 11px;
          cursor: pointer;
          font-size: 12.5px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, #6b21a8 0%, #9333ea 40%, #6366f1 100%);
          box-shadow:
            0 4px 18px rgba(139,92,246,0.38),
            0 1px 0 rgba(255,255,255,0.12) inset,
            0 -1px 0 rgba(0,0,0,0.18) inset;
          transition: transform 0.18s, box-shadow 0.18s;
          white-space: nowrap; flex-shrink: 0;
        }
        .nav-new-ticket::before {
          content: "";
          position: absolute; inset: 0; border-radius: 11px;
          background: linear-gradient(135deg, #9333ea, #22d3ee, #6366f1);
          opacity: 0; transition: opacity 0.3s;
        }
        .nav-new-ticket:hover::before { opacity: 0.32; }
        .nav-new-ticket:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(139,92,246,0.5), 0 1px 0 rgba(255,255,255,0.15) inset;
        }
        .nav-new-ticket:active { transform: translateY(-1px); }
        .nav-new-ticket-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%);
          background-size: 220% 100%; background-position: -220% 0;
        }
        .nav-new-ticket:hover .nav-new-ticket-shimmer {
          animation: df-shimmer 0.65s ease forwards;
        }
        .nav-new-ticket-inner {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 5px;
        }
        .nav-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: none; background: transparent; cursor: pointer;
          color: #717680; transition: background 0.14s, color 0.14s;
          flex-shrink: 0;
        }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.7); color: #414651; }
      `}</style>

      {/* Sidebar */}
      <Sidebar />

      {/* Right column */}
      <div className={isTicketsPage
        ? "flex-1 min-w-0 relative overflow-hidden"
        : "flex-1 min-w-0 relative overflow-y-auto"
      } style={{ background: dark ? "#090e1b" : "transparent" }}>

        {/* Floating glass header */}
        <div className="sticky top-0 z-30 px-5 pt-2 pb-1">
          <header style={{
            background: dark ? "rgba(9,14,27,0.72)" : "rgba(255,255,255,0.18)",
            backdropFilter: "blur(20px) saturate(200%) brightness(1.04)",
            WebkitBackdropFilter: "blur(20px) saturate(200%) brightness(0.9)",
            borderRadius: "14px",
            border: dark ? "1.5px solid rgba(148,163,184,0.16)" : "1.5px solid rgba(255,255,255,0.35)",
            boxShadow:
              dark
                ? "0 12px 30px rgba(2,6,23,0.38), inset 0 1px 0 rgba(255,255,255,0.04)"
                : "0 4px 6px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
            }}>

              {/* Left: breadcrumb + title */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#a4a7ae", margin: 0 }}>
                  Pages&nbsp;<span>/</span>&nbsp;
                  <span style={{ color: dark ? "#c7d2fe" : "#5B4FE8" }}>{pageLabel}</span>
                </p>
                <h1 style={{
                  fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px",
                  color: dark ? "#f8fafc" : "#181d27", margin: "1px 0 0", lineHeight: 1.2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ticketShortLabel ?? pageLabel}
                </h1>
              </div>

              {/* Right: controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

                {/* New Ticket */}
                <button className="nav-new-ticket" onClick={() => setIsCreateTicketOpen(true)}>
                  <span className="nav-new-ticket-shimmer" />
                  <span className="nav-new-ticket-inner">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Ticket
                  </span>
                </button>

                {/* Icon group */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 1,
                  background: dark ? "rgba(9,14,27,0.85)" : "rgba(0,0,0,0.04)", borderRadius: 10,
                  border: dark ? "1px solid rgba(148,163,184,0.16)" : "1px solid rgba(0,0,0,0.07)", padding: "2px 3px",
                }}>
                  {/* Bell */}
                  <NotificationBell dark={dark} />
                  {/* Info */}
                  <button className="nav-icon-btn" aria-label="Info">
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                    </svg>
                  </button>
                  {/* Moon */}
                  <button className="nav-icon-btn" aria-label="Dark mode" onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                    </svg>
                  </button>
                </div>

                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(99,102,241,0.3)",
                }}>
                  {user?.name ? initials(user.name) : "U"}
                </div>

              </div>
            </div>
          </header>
        </div>

        {/* Page content */}
        <main className="w-full min-w-0">
          <div className="w-full px-5 pt-2 pb-6">
            {children}
          </div>
        </main>
      </div>
{/* Forbidden popup */}
      {forbiddenMsg && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setForbiddenMsg(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28,
            maxWidth: 380, width: "90%", textAlign: "center",
            fontFamily: '"Poppins", system-ui, sans-serif',
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "#FEF2F2", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 14px",
            }}>
              <svg width="22" height="22" fill="none" stroke="#EF4444" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
              Access Denied
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
              {forbiddenMsg}
            </p>
            <button
              onClick={() => setForbiddenMsg(null)}
              style={{
                padding: "9px 24px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      <CreateTicketModal
        open={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        onCreated={() => {
          setIsCreateTicketOpen(false);
          setToast({ title: "Ticket created successfully", message: "Your new ticket has been added to the queue." });
          // optional: if you're on the tickets list, trigger a refetch here,
          // e.g. via a shared context/event, since Layout wraps every page
          // and doesn't know about that page's local ticket-list state
        }}
        dark={dark}
      />
      <Toast
        open={!!toast}
        onClose={() => setToast(null)}
        title={toast?.title}
        message={toast?.message}
        dark={dark}
      />
    </div>
  );
}
