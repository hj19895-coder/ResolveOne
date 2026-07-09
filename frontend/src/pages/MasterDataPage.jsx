import { useState, useEffect, useRef } from "react";
import Layout from "../components/layout/Layout";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { useMasterData } from "../hooks/Usemasterdata.js";
import api from "../api/axios";

// ─── Theme hook ───────────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.dashboardTheme === "dark"
  );
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail === "dark" || e?.detail === "light") setDark(e.detail === "dark");
      else setDark(document.documentElement.dataset.dashboardTheme === "dark");
    };
    window.addEventListener("dashboard-theme-change", handler);
    return () => window.removeEventListener("dashboard-theme-change", handler);
  }, []);
  return dark;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
function tokens(dark) {
  return {
    font:      '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    accent:    '#7c3aed',
    accentL:   dark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
    accentB:   dark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.15)',
    border:    dark ? 'rgba(148,163,184,0.14)' : '#e5e7eb',
    borderRow: dark ? 'rgba(255,255,255,0.06)' : '#EBEBF5',
    surface:   dark ? 'rgba(12,19,34,0.88)'    : '#ffffff',
    surface2:  dark ? 'rgba(15,23,42,0.74)'    : '#fafbfc',
    tableHdr:  dark ? 'rgba(10,14,28,0.98)'    : '#f1f1f1',
    rowHover:  dark ? 'rgba(255,255,255,0.03)'  : 'rgba(0,0,0,0.02)',
    inputBg:   dark ? 'rgba(255,255,255,0.05)'  : '#f8fafc',
    inputBd:   dark ? 'rgba(255,255,255,0.1)'   : '#e5e7eb',
    text1:     dark ? '#f1f5f9' : '#111827',
    text2:     dark ? '#94a3b8' : '#6b7280',
    text3:     dark ? '#64748b' : '#9ca3af',
    shadow:    dark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.06)',
    radius:    14,
  };
}

const TYPES = [
  "STATUS", "SOURCE", "LEVEL", "GROUP", "SEVERITY",
  "RAISED_BY", "SITE", "TICKET_TYPE", "CLIENT_NAME", "PRIORITY",
  "CATEGORY", "SUBCATEGORY", "ITEM", "ROOT_CAUSE_CATEGORY",
];

const TYPE_ICONS = {
  STATUS: "circle-dot", SOURCE: "world", LEVEL: "layers-difference",
  GROUP: "users-group", SEVERITY: "alert-triangle", RAISED_BY: "user-circle",
  SITE: "building", TICKET_TYPE: "tag", CLIENT_NAME: "briefcase",
  PRIORITY: "flag", CATEGORY: "folder", SUBCATEGORY: "folder-open",
  ITEM: "cube", ROOT_CAUSE_CATEGORY: "analyze",
};

function typeColor(type, dark) {
  const MAP = {
    STATUS:      { light: { bg: "rgba(37,99,235,0.08)",   color: "#2563eb", dot: "#3b82f6" }, dark: { bg: "rgba(37,99,235,0.16)",   color: "#93c5fd", dot: "#60a5fa" } },
    PRIORITY:    { light: { bg: "rgba(220,38,38,0.08)",   color: "#dc2626", dot: "#ef4444" }, dark: { bg: "rgba(220,38,38,0.16)",   color: "#fca5a5", dot: "#f87171" } },
    GROUP:       { light: { bg: "rgba(5,150,105,0.08)",   color: "#059669", dot: "#10b981" }, dark: { bg: "rgba(5,150,105,0.16)",   color: "#6ee7b7", dot: "#34d399" } },
    CATEGORY:    { light: { bg: "rgba(124,58,237,0.08)",  color: "#7c3aed", dot: "#a78bfa" }, dark: { bg: "rgba(124,58,237,0.16)",  color: "#c4b5fd", dot: "#a78bfa" } },
    CLIENT_NAME: { light: { bg: "rgba(217,119,6,0.08)",   color: "#d97706", dot: "#fbbf24" }, dark: { bg: "rgba(217,119,6,0.16)",   color: "#fde68a", dot: "#fbbf24" } },
  };
  const entry = MAP[type];
  if (entry) return dark ? entry.dark : entry.light;
  return dark
    ? { bg: "rgba(100,116,139,0.16)", color: "#94a3b8", dot: "#64748b" }
    : { bg: "rgba(107,114,128,0.08)", color: "#6b7280", dot: "#9ca3af" };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#111827" : "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8, animation: "toastIn 0.2s cubic-bezier(0.16,1,0.3,1)", whiteSpace: "nowrap" }}>
      <style>{`@keyframes toastIn{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
      {toast.ok
        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
        : <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      }
      {toast.msg}
    </div>
  );
}

// ─── Delete confirm popover ───────────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel, loading, T }) {
  return (
    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100, background: T.surface === "rgba(12,19,34,0.88)" ? "#0f172a" : "#fff", border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: "14px 16px", width: 230, animation: "popIn 0.13s cubic-bezier(0.16,1,0.3,1)", fontFamily: T.font }}>
      <style>{`@keyframes popIn{from{transform:scale(0.95) translateY(-4px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text1, marginBottom: 4 }}>Delete "{label}"?</div>
      <div style={{ fontSize: 11.5, color: T.text2, marginBottom: 12 }}>This cannot be undone and may affect existing tickets.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "6px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: T.inputBg, border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "6px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(220,38,38,0.9)", border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: T.font, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────
function DataRow({ id, value, tc, onDelete, canDelete, T }) {
  const [hovered, setHovered]   = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    if (!confirm) return;
    const h = (e) => { if (rowRef.current && !rowRef.current.contains(e.target)) setConfirm(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [confirm]);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(id);
    setDeleting(false); setConfirm(false);
  };

  return (
    <tr ref={rowRef} style={{ borderBottom: `1px solid ${T.borderRow}`, transition: "background 0.1s" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={{ padding: "9px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: tc.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text1, fontFamily: T.font }}>{value}</span>
        </div>
      </td>
      <td style={{ padding: "9px 20px", textAlign: "right" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          {canDelete && (
            <button onClick={() => setConfirm(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, color: hovered ? "#dc2626" : T.text3, background: hovered ? "rgba(220,38,38,0.08)" : "transparent", border: hovered ? "1px solid rgba(220,38,38,0.2)" : "1px solid transparent", cursor: "pointer", transition: "all 0.14s", fontFamily: T.font, opacity: hovered ? 1 : 0 }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}
          {confirm && <DeleteConfirm label={value} loading={deleting} onConfirm={handleDelete} onCancel={() => setConfirm(false)} T={T} />}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MasterDataPage() {
  const dark = useDark();
  const T    = tokens(dark);
  const { isSuperAdmin, canCreate, canDelete } = useAuth();
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [newValue, setNewValue]         = useState("");
  const [error, setError]               = useState(null);
  const [toast, setToast]               = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const inputRef = useRef(null);

  const { options: data, loading, error: fetchError } = useMasterData(selectedType);
  const tc  = typeColor(selectedType, dark);
  const icon = TYPE_ICONS[selectedType] || "database";

  useEffect(() => { setError(null); setToast(null); }, [selectedType]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!newValue.trim()) return setError("Value is required");
    setSubmitting(true); setError(null);
    try {
      await api.post("/master-data", { type: selectedType, value: newValue.trim() });
      setNewValue("");
      showToast(`"${newValue.trim()}" added`);
      inputRef.current?.focus();
    } catch (err) { setError(err.response?.data?.message || "Failed to add value"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/master-data/${id}`); showToast("Entry deleted"); }
    catch (err) { showToast(err.response?.data?.message || "Failed to delete", false); }
  };

  const canAct = isSuperAdmin || canCreate("master-data");

  // Solid bg for panel interiors (avoids rgba bleed through modals)
  const panelBg = dark ? "#0f172a" : "#ffffff";

  return (
    <Layout>
      <Header />
      <Toast toast={toast} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: T.font }}>
        {fetchError && (
          <div style={{ background: dark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: dark ? "#fca5a5" : "#dc2626", display: "flex", gap: 8, alignItems: "center" }}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {fetchError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }}>

          {/* ── Left: type selector ──────────────────────────────────────── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", boxShadow: T.shadow }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Data Types</div>
            </div>
            <div style={{ padding: "6px" }}>
              {TYPES.map(type => {
                const active = type === selectedType;
                const tc2    = typeColor(type, dark);
                const ico    = TYPE_ICONS[type] || "database";
                return (
                  <button key={type} onClick={() => setSelectedType(type)}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: active ? T.accentL : "transparent", color: active ? "#7c3aed" : T.text2, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: "pointer", textAlign: "left", transition: "all 0.12s", fontFamily: T.font }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.inputBg; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    <i className={`ti ti-${ico}`} style={{ fontSize: 13, color: active ? "#7c3aed" : tc2.dot, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{type}</span>
                    {active && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, background: T.accentL, color: "#7c3aed", padding: "1px 7px", borderRadius: 20, border: `1px solid ${T.accentB}`, flexShrink: 0 }}>
                        {data.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right panel ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Add form */}
            {canAct && (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", boxShadow: T.shadow }}>
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface2, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ti-${icon}`} style={{ fontSize: 13, color: tc.color }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text1 }}>Add to {selectedType}</span>
                  <span style={{ fontSize: 11.5, color: T.text3 }}>— new lookup value</span>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  {error && (
                    <div style={{ background: dark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12.5, color: dark ? "#fca5a5" : "#dc2626", display: "flex", gap: 7, alignItems: "center" }}>
                      <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Value</div>
                      <input ref={inputRef}
                        style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1px solid ${T.inputBd}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: T.text1, outline: "none", fontFamily: T.font, transition: "border-color 0.15s" }}
                        placeholder={`Enter ${selectedType} value…`}
                        value={newValue}
                        onChange={e => { setNewValue(e.target.value); setError(null); }}
                        onFocus={e => e.target.style.borderColor = "#7c3aed"}
                        onBlur={e => e.target.style.borderColor = T.inputBd} />
                    </div>
                    <button type="submit" disabled={submitting || !newValue.trim()}
                      style={{ padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: submitting || !newValue.trim() ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "#fff", cursor: submitting || !newValue.trim() ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.3)", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {submitting ? "Adding…" : <><svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Add Value</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", boxShadow: T.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{selectedType}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color, padding: "2px 8px", borderRadius: 20, border: `1px solid ${tc.dot}22` }}>
                    {data.length} {data.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: "56px 0" }}><LoadingSpinner text={`Loading ${selectedType}…`} /></div>
              ) : data.length === 0 ? (
                <div style={{ padding: "56px 0", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentL, border: `1px solid ${T.accentB}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <i className={`ti ti-${icon}`} style={{ fontSize: 20, color: "#7c3aed" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>No {selectedType} values yet</div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Add your first value using the form above.</div>
                </div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: T.font }}>
                    <thead>
                      <tr style={{ background: T.tableHdr }}>
                        <th style={{ padding: "0 20px", height: 34, textAlign: "left",  fontSize: 10.5, fontWeight: 700, color: dark ? "rgba(226,232,240,0.55)" : "rgba(0,0,0,0.55)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Value</th>
                        <th style={{ padding: "0 20px", height: 34, textAlign: "right", fontSize: 10.5, fontWeight: 700, color: dark ? "rgba(226,232,240,0.55)" : "rgba(0,0,0,0.55)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(({ id, value }) => (
                        <DataRow key={id} id={id} value={value} tc={tc} onDelete={handleDelete} canDelete={isSuperAdmin || canDelete("master-data")} T={T} />
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.borderRow}`, background: T.surface2 }}>
                    <span style={{ fontSize: 11, color: T.text3 }}>
                      <strong style={{ color: T.text2 }}>{data.length}</strong> {data.length === 1 ? "entry" : "entries"} in <strong style={{ color: T.text2 }}>{selectedType}</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}