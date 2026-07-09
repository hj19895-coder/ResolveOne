// NotificationBell.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
// ⚠️ ADJUST: path to the hook below relative to where you place this file
import useNotifications from "../../hooks/useNotifications";

const TYPE_META = {
  TICKET_CREATED:  { color: "#6366f1", bg: "#EEF2FF", icon: "M12 4v16m8-8H4" },
  TICKET_ASSIGNED: { color: "#9333ea", bg: "#F5F3FF", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  STATUS_CHANGED:  { color: "#0891b2", bg: "#ECFEFF", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  SLA_BREACH:      { color: "#dc2626", bg: "#FEF2F2", icon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
  TICKET_MERGED:   { color: "#0d9488", bg: "#F0FDFA", icon: "M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" },
  DEFAULT:         { color: "#6b7280", bg: "#F4F4F5", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a1 1 0 10-2 0v1.341C9.67 5.165 8 7.388 8 10v4.159c0 .538-.214 1.055-.595 1.436L6 17h9z" },
};

const AVATAR_COLORS = ["#7C3AED", "#0891B2", "#DC2626", "#D97706", "#0D9488", "#6366F1"];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function displayMessage(n) {
  if (!n.message) return n.message;
  if (!n.ticket?.ticketNumber) return n.message;
  // Replace a UUID-slice like "#b55c0947" with the real ticket number
  return n.message.replace(/#[0-9a-fA-F]{6,}\b/, `#${n.ticket.ticketNumber}`);
}


// Groups rows that share the same ticket + event + message (fan-out to admins)
// into a single row with a combined recipient avatar stack.
function groupNotifications(list) {
  const groups = [];
  const indexByKey = new Map();

  for (const n of list) {
    const key = `${n.ticketId ?? n.ticket?.id}__${n.type}__${n.message}`;
    if (indexByKey.has(key)) {
      const g = groups[indexByKey.get(key)];
      g.ids.push(n.id);
      g.isRead = g.isRead && n.isRead;
      if (n.user?.name && !g.userNames.includes(n.user.name)) g.userNames.push(n.user.name);
      if (new Date(n.createdAt) > new Date(g.createdAt)) g.createdAt = n.createdAt;
    } else {
      indexByKey.set(key, groups.length);
      groups.push({ ...n, ids: [n.id], userNames: n.user?.name ? [n.user.name] : [] });
    }
  }
  return groups;
}

// Pass the same `dark` boolean Layout.jsx already computes from theme state.
export default function NotificationBell({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState("all"); // 'all' | 'unread'
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    viewingAll,
    fetchNotifications,
    markRead,
    markReadMultiple,
    markAllRead,
  } = useNotifications();

  const openPanel = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 8, left: Math.max(12, rect.right - 380) });
    }
    setOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(t);
    }
    setEntered(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const grouped = useMemo(() => {
    const g = viewingAll
      ? groupNotifications(notifications)
      : notifications.map((n) => ({ ...n, ids: [n.id], userNames: n.user?.name ? [n.user.name] : [] }));
    return tab === "unread" ? g.filter((n) => !n.isRead) : g;
  }, [notifications, viewingAll, tab]);

  const todayItems = grouped.filter((n) => isToday(n.createdAt));
  const earlierItems = grouped.filter((n) => !isToday(n.createdAt));

  const handleItemClick = (n) => {
    if (!n.isRead) markReadMultiple(n.ids);
    setOpen(false);
    if (n.ticket?.id) navigate(`/tickets/${n.ticket.id}`);
  };

  const renderRow = (n) => {
    const meta = TYPE_META[n.type] || TYPE_META.DEFAULT;
    return (
      <div
        key={n.id}
        onClick={() => handleItemClick(n)}
        className="nb-row"
        style={{
          display: "flex",
          gap: 11,
          padding: "11px 18px",
          cursor: "pointer",
          alignItems: "flex-start",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: dark ? "rgba(255,255,255,0.06)" : meta.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" fill="none" stroke={meta.color} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={meta.icon} />
            </svg>
          </div>
          {!n.isRead && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#9333ea,#6366f1)",
                boxShadow: `0 0 0 2px ${dark ? "#0f1c2e" : "#fff"}`,
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                fontWeight: n.isRead ? 500 : 650,
                color: dark ? "#e2e8f0" : "#181d27",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {n.title}
            </p>
            <span style={{ fontSize: 10.5, color: dark ? "#64748b" : "#9ca3af", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {timeAgo(n.createdAt)}
            </span>
          </div>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 11.5,
              lineHeight: 1.4,
              color: dark ? "#94a3b8" : "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {displayMessage(n)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        className="nav-icon-btn"
        aria-label="Notifications"
        onClick={() => (open ? setOpen(false) : openPanel())}
        style={{ position: "relative" }}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a1 1 0 10-2 0v1.341C9.67 5.165 8 7.388 8 10v4.159c0 .538-.214 1.055-.595 1.436L6 17h9z" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute", top: 2, right: 2,
              minWidth: 14, height: 14, padding: "0 3px",
              borderRadius: 7, background: "#ef4444",
              color: "#fff", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 1.5px ${dark ? "#0f172a" : "#fff"}`,
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            <style>{`
              .nb-row { transition: background 120ms ease; border-bottom: 1px solid ${dark ? "rgba(148,163,184,0.08)" : "rgba(0,0,0,0.04)"}; }
              .nb-row:hover { background: ${dark ? "rgba(255,255,255,0.03)" : "#FAFAFB"}; }
              .nb-row:last-child { border-bottom: none; }
              .nb-scroll::-webkit-scrollbar { width: 6px; }
              .nb-scroll::-webkit-scrollbar-thumb { background: ${dark ? "rgba(148,163,184,0.25)" : "rgba(0,0,0,0.12)"}; border-radius: 10px; }
              .nb-scroll::-webkit-scrollbar-track { background: transparent; }
              .nb-tab { border: none; background: none; cursor: pointer; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 7px; transition: all 120ms ease; }
              @media (prefers-reduced-motion: reduce) { .nb-panel { transition: none !important; } }
            `}</style>
            <div
              ref={panelRef}
              className="nb-panel"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 380,
                maxHeight: 480,
                display: "flex",
                flexDirection: "column",
                background: dark ? "#0f1c2e" : "#ffffff",
                border: dark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #E9EAEB",
                borderRadius: 16,
                boxShadow: dark ? "0 20px 50px rgba(0,0,0,0.5)" : "0 12px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)",
                zIndex: 9999,
                overflow: "hidden",
                fontFamily: '"Poppins", system-ui, sans-serif',
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.98)",
                transition: "opacity 140ms ease, transform 140ms ease",
                transformOrigin: "top right",
              }}
            >
              {/* Header */}
              <div style={{ padding: "14px 18px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: dark ? "#f1f5f9" : "#181d27" }}>
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, color: "#fff",
                          background: "linear-gradient(135deg,#9333ea,#6366f1)",
                          padding: "1.5px 7px", borderRadius: 20, letterSpacing: "0.2px",
                        }}
                      >
                        {unreadCount} new
                      </span>
                    )}
                    {viewingAll && (
                      <span
                        style={{
                          fontSize: 9.5, fontWeight: 700, color: "#9333ea",
                          background: dark ? "rgba(147,51,234,0.16)" : "#F5F3FF",
                          padding: "2px 7px", borderRadius: 6, letterSpacing: "0.3px",
                        }}
                      >
                        ALL USERS
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#7C3AED", padding: 0 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "inline-flex",
                    gap: 2,
                    marginTop: 12,
                    background: dark ? "rgba(255,255,255,0.04)" : "#F4F4F5",
                    padding: 3,
                    borderRadius: 9,
                  }}
                >
                  {[
                    { key: "all", label: "All" },
                    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      className="nb-tab"
                      onClick={() => setTab(t.key)}
                      style={{
                        color: tab === t.key ? (dark ? "#f1f5f9" : "#181d27") : dark ? "#94a3b8" : "#6b7280",
                        background: tab === t.key ? (dark ? "rgba(255,255,255,0.08)" : "#ffffff") : "transparent",
                        boxShadow: tab === t.key ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="nb-scroll" style={{ overflowY: "auto", flex: 1 }}>
                {loading && (
                  <div style={{ padding: 28, textAlign: "center", fontSize: 12, color: dark ? "#94a3b8" : "#9ca3af" }}>
                    Loading…
                  </div>
                )}

                {!loading && grouped.length === 0 && (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 12, margin: "0 auto 12px",
                        background: dark ? "rgba(255,255,255,0.05)" : "#F4F4F5",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <svg width="18" height="18" fill="none" stroke={dark ? "#64748b" : "#9ca3af"} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: dark ? "#e2e8f0" : "#181d27" }}>
                      {tab === "unread" ? "No unread notifications" : "You're all caught up"}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: dark ? "#94a3b8" : "#9ca3af" }}>
                      New activity on your tickets will show up here.
                    </p>
                  </div>
                )}

                {!loading && todayItems.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: "10px 18px 6px",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
                        color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase",
                      }}
                    >
                      Today
                    </div>
                    {todayItems.map(renderRow)}
                  </>
                )}

                {!loading && earlierItems.length > 0 && (
                  <>
                    <div
                      style={{
                        padding: "10px 18px 6px",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
                        color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase",
                      }}
                    >
                      Earlier
                    </div>
                    {earlierItems.map(renderRow)}
                  </>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}