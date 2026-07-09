import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/axios";
import EnterpriseAsyncSelect from "./EnterpriseAsyncSelect";
import { useMasterData } from "../../hooks/Usemasterdata";

function clampToDisplay(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function useOnClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return;
    const onDown = (e) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      handler?.(e);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export default function TicketPropertyRow({
  ticket,
  label,
  value,
  type = "text", // text | select | textarea | date | number
  patchKey,
  editable = true,
  masterDataType,
  // One-row edit coordination
  isEditing,
  onRequestEdit,
  // Patch input mapping
  parseInput,
  formatInputFromTicket,
  onTicketUpdated, // callback to update ticket in parent after successful patch
  T, // design tokens from parent (TicketDetailsPage)
  onInterceptStatusChange,
}) {
  const ticketId = ticket?.id;
  const [hovered, setHovered] = useState(false);

  const { options, loading: masterLoading } = useMasterData(masterDataType);

  const displayText = useMemo(() => {
    // READ MODE: always render formatted label from persisted value.
    // Never use draft here (draft may temporarily contain a raw id).
    const raw = formatInputFromTicket ? formatInputFromTicket(value) : value;
    return clampToDisplay(raw);
  }, [value, formatInputFromTicket]);

  // Local draft lives only while editing this row.
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);

  useOnClickOutside(
    editorRef,
    async () => {
      if (!isEditing) return;
      if (saving) return;

      try {
        await patchIfChanged();
      } finally {
        setError(null);
        onRequestEdit?.(null);
      }
    },
    Boolean(isEditing && type !== "textarea")
  );

  // Keep draft aligned when row enters edit mode.
  useEffect(() => {
    if (!isEditing) return;
    const next = value === null || value === undefined ? "" : String(value);
    setDraft(next);
    setError(null);
    setSaving(false);
    // Focus happens after paint.
    requestAnimationFrame(() => {
      editorRef.current?.querySelector?.("input,textarea")?.focus?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, patchKey]);

  const canEdit = Boolean(editable && ticketId);

  function toEndOfDayISOString(dateOnlyString) {
    // dateOnlyString like "2026-07-10" — build local end-of-day time
    // so backend doesn't shift it to the previous/next day via UTC conversion.
    const [year, month, day] = dateOnlyString.split("-").map(Number);
    if (!year || !month || !day) return null;
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    return d.toISOString();
  }

  const commitToValue = () => {
    if (!patchKey) return { [patchKey]: null };
    const cleaned = draft === "" ? null : draft;

    if (parseInput) return { [patchKey]: parseInput(cleaned) };

    // TAT is a deadline field — always store it as end-of-day local time,
    // not raw UTC midnight, so the displayed time doesn't drift to 05:30 AM.
    if (type === "date" && patchKey === "tat" && cleaned) {
      return { [patchKey]: toEndOfDayISOString(cleaned) };
    }

    return { [patchKey]: cleaned };
  };

  const patchIfChanged = async () => {
    if (!canEdit || !isEditing) return;
    if (saving) return;
    if (!patchKey) return;

    const original = value === null || value === undefined ? "" : String(value);
    if (String(draft) === original) {
      onRequestEdit?.(null);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await api.patch(
        `/tickets/${ticketId}`,
        commitToValue()
      );

      onRequestEdit?.(null);
      onTicketUpdated?.(response.data);
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const patchSelectValue = async (nextVal) => {
    if (!canEdit || !isEditing) return;
    if (saving) return;
    if (!patchKey) return;

    const original = value === null || value === undefined ? "" : String(value);
    const normalizedNext = nextVal ?? "";
    if (String(normalizedNext) === original) {
      onRequestEdit?.(null);
      return;
    }

    // Build patch payload from provided value.
    const cleaned = normalizedNext === "" ? null : normalizedNext;
    // Some backend validations require related master-data keys.
    // For example: when PATCHing statusId, backend requires priorityId too.
    const payload = parseInput ? { [patchKey]: parseInput(cleaned) } : { [patchKey]: cleaned };
    if (patchKey === "statusId" && payload.statusId !== null && payload.statusId !== undefined) {
      // Ensure we always send the current priorityId along with statusId.
      const priorityId = ticket?.priority?.id ?? ticket?.priorityId;
      if (priorityId) payload.priorityId = priorityId;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await api.patch(`/tickets/${ticketId}`, payload);

      onTicketUpdated?.(response.data);
      onRequestEdit?.(null);
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // Fallback tokens in case a caller forgets to pass T (keeps component from crashing).
  const tokens = T || {
    border: "#E5E7EB",
    borderSoft: "#EEF0F3",
    bg: "#FFFFFF",
    bgMuted: "#F8FAFC",
    text: "#0F172A",
    textMuted: "#64748B",
    textFaint: "#A3AED0",
    accent: "#7C3AED",
    accentSoft: "#F5F3FF",
    danger: "#EF4444",
    radius: 10,
    radiusSm: 8,
    font: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const inputStyle = {
    width: "100%",
    minWidth: 0, 
    fontFamily: tokens.font,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text,
    padding: "6px 9px",
    border: `1px solid ${tokens.accent}`,
    borderRadius: tokens.radiusSm,
    outline: "none",
    background: tokens.bg,
    boxSizing: "border-box",
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: isEditing ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 2px",
        borderBottom: `1px solid ${tokens.borderSoft}`,
        minHeight: 34,
        minWidth: 0,
        fontFamily: tokens.font,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: tokens.textMuted,
          flexShrink: 0,
          width: 148,
          paddingTop: isEditing ? 6 : 0,
        }}
      >
        {label}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!isEditing && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => canEdit && onRequestEdit?.(patchKey)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              width: "100%",
              background: canEdit && hovered ? tokens.bgMuted : "transparent",
              border: "none",
              cursor: canEdit ? "pointer" : "default",
              padding: "4px 6px",
              borderRadius: tokens.radiusSm,
              fontFamily: tokens.font,
              transition: "background 120ms ease",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: tokens.text,
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {displayText}
            </span>
            {canEdit && hovered ? (
              <span
                style={{
                  color: tokens.textFaint,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
                aria-hidden="true"
              >
                <PencilIcon />
              </span>
            ) : null}
          </button>
        )}

        {isEditing && (
          <div ref={editorRef} style={{ width: "100%" }}>
            {type === "textarea" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                <textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      patchIfChanged();
                    }
                  }}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={patchIfChanged}
                    disabled={saving}
                    style={{
                      fontFamily: tokens.font,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: tokens.radiusSm,
                      border: "none",
                      background: tokens.accent,
                      color: "#fff",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}

            {type === "date" && (
              <input
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={patchIfChanged}
                onKeyDown={(e) => {
                  if (e.key === "Enter") patchIfChanged();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setError(null);
                    onRequestEdit?.(null);
                  }
                }}
                style={inputStyle}
              />
            )}

            {type === "number" && (
              <input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={patchIfChanged}
                onKeyDown={(e) => {
                  if (e.key === "Enter") patchIfChanged();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setError(null);
                    onRequestEdit?.(null);
                  }
                }}
                style={inputStyle}
              />
            )}

            {type === "select" && (
              <div style={{ width: "100%", fontFamily: tokens.font, fontSize: 13 }}>
                <EnterpriseAsyncSelect
                  label={null}
                  compact
                  placeholder={masterLoading ? "Loading…" : "Search…"}
                  value={draft}
                  disabled={masterLoading}
                  getOptionLabel={(opt) => opt.value ?? opt.label ?? opt.name ?? String(opt.id)}
                  getOptionValue={(opt) => opt.id}
                  loadOptions={async () => options || []}
                  onChange={(nextVal) => {
                    const normalized = nextVal ?? "";
                    if (patchKey === "statusId" && onInterceptStatusChange) {
                      const intercepted = onInterceptStatusChange(nextVal);
                      if (intercepted) {
                        onRequestEdit?.(null); // close inline editor; modal takes over
                        return;
                      }
                    }
                    setDraft(normalized);
                    patchSelectValue(nextVal).catch(() => {});
                  }}
                />
              </div>
            )}

            {type === "text" && (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={patchIfChanged}
                onKeyDown={(e) => {
                  if (e.key === "Enter") patchIfChanged();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setError(null);
                    onRequestEdit?.(null);
                  }
                }}
                style={inputStyle}
              />
            )}

            {error ? (
              <div style={{ marginTop: 4, fontSize: 11, color: tokens.danger }}>{error}</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}