import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Toast({ open, onClose, title, message, type = "success", dark = false, duration = 4000 }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setLeaving(false);
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 250);
  };

  if (!visible) return null;

  const styles = {
    success: {
      bg: dark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.09)",
      border: dark ? "rgba(74,222,128,0.3)" : "rgba(34,197,94,0.25)",
      color: dark ? "#4ade80" : "#16a34a",
      progress: dark ? "#4ade80" : "#22c55e",
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },

    warning: {
      bg: dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.10)",
      border: dark ? "rgba(251,191,36,0.35)" : "rgba(245,158,11,0.25)",
      color: dark ? "#fbbf24" : "#d97706",
      progress: dark ? "#fbbf24" : "#f59e0b",
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4" />
          <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.29 3.86L1.82 18A2 2 0 003.53 21h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },

    error: {
      bg: dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.10)",
      border: dark ? "rgba(248,113,113,0.35)" : "rgba(239,68,68,0.25)",
      color: dark ? "#f87171" : "#dc2626",
      progress: dark ? "#f87171" : "#ef4444",
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };

  const current = styles[type] || styles.success;

  return createPortal(
    <>
      <style>{`
        @keyframes toastSlideIn {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastSlideOut {
            from { opacity: 1; transform: translateX(0); }
            to   { opacity: 0; transform: translateX(40px); }
        }
        @keyframes toastCheckPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div
        style={{
            position: "fixed",
            bottom: 30,
            right: 20,
            zIndex: 9999999,
            width: "min(400px, calc(100vw - 32px))",
            animation: `${leaving ? "toastSlideOut" : "toastSlideIn"} 0.28s cubic-bezier(0.16,1,0.3,1) both`,
        }}
        >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 14,
            background: dark ? "rgba(14,20,38,0.98)" : "#ffffff",
            border: `1px solid ${dark ? "rgba(148,163,184,0.18)" : "#e5e7eb"}`,
            boxShadow: dark
              ? "0 20px 50px rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.3)"
              : "0 20px 50px rgba(15,23,42,0.12), 0 4px 14px rgba(15,23,42,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Icon */}
          <div
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: current.bg,
              border: `1px solid ${current.border}`,
              color: current.color,
              animation: "toastCheckPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
            }}
          >
            {current.icon}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <p style={{
              margin: 0, fontSize: 13.5, fontWeight: 700,
              color: dark ? "#f8fafc" : "#111827",
              fontFamily: "'Poppins', -apple-system, sans-serif",
            }}>
              {title}
            </p>
            {message && (
              <p style={{
                margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5,
                color: dark ? "#94a3b8" : "#6b7280",
                fontFamily: "'Poppins', -apple-system, sans-serif",
              }}>
                {message}
              </p>
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: 7,
              border: "none",
              background: "transparent",
              color: dark ? "#64748b" : "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress bar */}
          <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2.5,
            background: current.progress,
            animation: `toastProgress ${duration}ms linear forwards`,
          }}
        />
        </div>
      </div>
    </>,
    document.body
  );
}