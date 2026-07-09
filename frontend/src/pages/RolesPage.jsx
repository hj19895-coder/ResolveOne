import { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useRoles } from "../hooks/useRoles";
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
    accentL:   dark ? 'rgba(124,58,237,0.18)' : '#EDE9FE',
    accentB:   dark ? 'rgba(124,58,237,0.4)'  : '#C4B5FD',
    border:    dark ? 'rgba(148,163,184,0.14)' : '#e5e7eb',
    borderS:   dark ? 'rgba(148,163,184,0.08)' : '#F3F4F6',
    surface:   dark ? '#0f172a'                : '#ffffff',
    surface2:  dark ? 'rgba(15,23,42,0.8)'    : '#F9FAFB',
    surface3:  dark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
    rowHover:  dark ? 'rgba(124,58,237,0.08)'  : '#F5F3FF',
    inputBg:   dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    inputBd:   dark ? 'rgba(255,255,255,0.12)' : '#D1D5DB',
    text1:     dark ? '#f1f5f9' : '#111827',
    text2:     dark ? '#94a3b8' : '#6B7280',
    text3:     dark ? '#64748b' : '#9CA3AF',
    text4:     dark ? '#475569' : '#374151',
    shadow:    dark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.06)',
    cardBorder:dark ? 'rgba(148,163,184,0.14)' : '#E5E7EB',
    cardBorderSystem: dark ? 'rgba(124,58,237,0.3)' : '#EDE9FE',
  };
}

// ─── Permission color palette ─────────────────────────────────────────────────
const PERM_COLOR = {
  canView:   "#3B82F6",
  canCreate: "#10B981",
  canEdit:   "#F59E0B",
  canDelete: "#EF4444",
};

const ALL_PAGES = [
  { key: "dashboard",   label: "Dashboard",  icon: "layout-dashboard" },
  { key: "tickets",     label: "Tickets",     icon: "ticket"           },
  { key: "users",       label: "Users",       icon: "users"            },
  { key: "master-data", label: "Master Data", icon: "database"         },
  { key: "reports",     label: "Reports",     icon: "chart-bar"        },
  { key: "templates",   label: "Templates",   icon: "layout-list"      },

];

const ACTIONS = [
  { key: "canView",   label: "View"   },
  { key: "canCreate", label: "Create" },
  { key: "canEdit",   label: "Edit"   },
  { key: "canDelete", label: "Delete" },
];

function emptyPermissions() {
  return ALL_PAGES.map(p => ({
    page: p.key, canView: false, canCreate: false, canEdit: false, canDelete: false,
  }));
}

// ─── Role Form Modal ──────────────────────────────────────────────────────────
function RoleFormModal({ role, onClose, onSaved }) {
  const dark  = useDark();
  const T     = tokens(dark);
  const isEdit = !!role;

  const [name, setName]         = useState(role?.name ?? "");
  const [description, setDesc]  = useState(role?.description ?? "");
  const [permissions, setPerms] = useState(
    isEdit
      ? ALL_PAGES.map(p => {
          const existing = role.permissions?.find(x => x.page === p.key);
          return existing ?? { page: p.key, canView: false, canCreate: false, canEdit: false, canDelete: false };
        })
      : emptyPermissions()
  );
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const toggle = (pageKey, actionKey) =>
    setPerms(prev => prev.map(p => p.page === pageKey ? { ...p, [actionKey]: !p[actionKey] } : p));

  const toggleAllActions = (pageKey) => {
    const p = permissions.find(x => x.page === pageKey);
    const allOn = ACTIONS.every(a => p[a.key]);
    setPerms(prev => prev.map(x =>
      x.page === pageKey
        ? { ...x, canView: !allOn, canCreate: !allOn, canEdit: !allOn, canDelete: !allOn }
        : x
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Role name is required"); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) await api.put(`/roles/${role.id}`, { name, description, permissions });
      else        await api.post("/roles", { name, description, permissions });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save role");
    } finally { setSaving(false); }
  };

  const inputSx = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
    border: `1px solid ${T.inputBd}`, outline: "none", boxSizing: "border-box",
    background: T.inputBg, color: T.text1, fontFamily: T.font,
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background: T.surface, borderRadius: 20, width: "100%", maxWidth: 640, boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(0,0,0,0.18)", fontFamily: T.font, maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${T.border}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text1 }}>
              {isEdit ? "Edit Role" : "Create Role"}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: T.text3 }}>
              {isEdit ? "Update role name and permissions" : "Define a new role and its access permissions"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.text3 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {error && (
            <div style={{ background: dark ? "rgba(220,38,38,0.15)" : "#FEF2F2", border: `1px solid ${dark ? "rgba(220,38,38,0.35)" : "#FECACA"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: dark ? "#fca5a5" : "#DC2626", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}

          {/* Name + description */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
            <div>
              <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Role Name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SUPPORT_AGENT"
                disabled={role?.isSystem}
                style={{ ...inputSx, background: role?.isSystem ? T.surface2 : T.inputBg }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.inputBd} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Description</label>
              <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Brief description…"
                style={inputSx}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.inputBd} />
            </div>
          </div>

          {/* Permissions matrix */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Page Permissions</div>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>

              {/* Matrix header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px 40px 40px 36px", background: T.surface2, padding: "8px 14px", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Page</span>
                {ACTIONS.map(a => (
                  <span key={a.key} style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>{a.label}</span>
                ))}
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", textAlign: "center" }}>All</span>
              </div>

              {/* Matrix rows */}
              {ALL_PAGES.map((pg, idx) => {
                const perm  = permissions.find(x => x.page === pg.key);
                const allOn = ACTIONS.every(a => perm?.[a.key]);
                const evenBg = dark ? "rgba(255,255,255,0.01)" : "#fff";
                const oddBg  = dark ? "rgba(255,255,255,0.03)" : "#FAFAFA";
                return (
                  <div key={pg.key}
                    style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px 40px 40px 36px", padding: "10px 14px", alignItems: "center", borderBottom: idx < ALL_PAGES.length - 1 ? `1px solid ${T.borderS}` : "none", background: idx % 2 === 0 ? evenBg : oddBg, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? evenBg : oddBg}>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={`ti ti-${pg.icon}`} style={{ fontSize: 13, color: "#7C3AED", opacity: 0.7 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: T.text4 }}>{pg.label}</span>
                    </div>

                    {ACTIONS.map(action => (
                      <div key={action.key} style={{ display: "flex", justifyContent: "center" }}>
                        <input type="checkbox" checked={perm?.[action.key] ?? false}
                          onChange={() => toggle(pg.key, action.key)}
                          disabled={role?.isSystem}
                          style={{ width: 15, height: 15, accentColor: "#7C3AED", cursor: role?.isSystem ? "not-allowed" : "pointer" }} />
                      </div>
                    ))}

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button onClick={() => toggleAllActions(pg.key)} disabled={role?.isSystem}
                        style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${allOn ? "#7C3AED" : T.inputBd}`, background: allOn ? "#7C3AED" : T.inputBg, cursor: role?.isSystem ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                        title={allOn ? "Remove all" : "Grant all"}>
                        {allOn
                          ? <svg width="11" height="11" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          : <svg width="10" height="10" fill="none" stroke={dark ? "#64748b" : "#9CA3AF"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 12, fontWeight: 600, color: T.text2, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || role?.isSystem}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving ? "#A78BFA" : "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving || role?.isSystem ? "not-allowed" : "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(109,61,245,0.3)" }}>
            {saving && <svg width="13" height="13" fill="none" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/><path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────
function DeleteDialog({ target, onConfirm, onCancel, deleting, T, dark }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.surface, borderRadius: 16, padding: 28, maxWidth: 400, width: "90%", textAlign: "center", fontFamily: T.font, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", border: `1px solid ${T.border}` }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: dark ? "rgba(220,38,38,0.15)" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <svg width="22" height="22" fill="none" stroke="#EF4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: T.text1 }}>Delete "{target.name}"?</h3>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: T.text2, lineHeight: 1.5 }}>This cannot be undone. Users assigned this role will need to be reassigned.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 12, fontWeight: 600, color: T.text2, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: T.font, opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting…" : "Delete Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ role, onEdit, onDelete, T }) {
  return (
    <div style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${role.isSystem ? T.cardBorderSystem : T.cardBorder}`, boxShadow: T.shadow, overflow: "hidden", fontFamily: T.font, transition: "box-shadow 0.2s, border-color 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(109,61,245,0.15)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.borderColor = role.isSystem ? T.cardBorderSystem : T.cardBorder; }}>

      {/* Card header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${T.borderS}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text1, letterSpacing: "-0.01em" }}>{role.name}</span>
            {role.isSystem && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: T.accentL, color: "#7C3AED", letterSpacing: "0.05em", textTransform: "uppercase", border: `1px solid ${T.accentB}` }}>System</span>
            )}
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: T.text3 }}>{role.description || "No description"}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, background: T.surface2, padding: "3px 8px", borderRadius: 20, border: `1px solid ${T.border}`, flexShrink: 0 }}>
          {role._count?.users ?? 0} users
        </span>
      </div>

      {/* Permissions */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Permissions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {ALL_PAGES.map(pg => {
            const perm    = role.permissions?.find(x => x.page === pg.key);
            if (!perm) return null;
            const granted = ACTIONS.filter(a => perm[a.key]);
            return (
              <div key={pg.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, color: T.text4, fontWeight: 500 }}>{pg.label}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {granted.length === 0
                    ? <span style={{ fontSize: 10, color: T.text3, fontStyle: "italic" }}>No access</span>
                    : granted.map(a => (
                        <span key={a.key} style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: `${PERM_COLOR[a.key]}${T.surface === "#ffffff" ? "18" : "28"}`, color: PERM_COLOR[a.key], letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          {a.label}
                        </span>
                      ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {!role.isSystem && (
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.borderS}`, display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(role)}
            style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 11.5, fontWeight: 600, color: T.text2, cursor: "pointer", fontFamily: T.font, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accentL; e.currentTarget.style.color = "#7c3aed"; e.currentTarget.style.borderColor = T.accentB; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text2; e.currentTarget.style.borderColor = T.border; }}>
            Edit
          </button>
          <button onClick={() => onDelete(role)}
            style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${T.surface === "#ffffff" ? "#FEE2E2" : "rgba(239,68,68,0.25)"}`, background: T.surface2, fontSize: 11.5, fontWeight: 600, color: "#EF4444", cursor: "pointer", fontFamily: T.font, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface === "#ffffff" ? "#FEF2F2" : "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface2; }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const darkMode = useDark();
  const T = tokens(darkMode);
  const { roles, loading, error, refetch } = useRoles();
  const [modalRole, setModalRole]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/roles/${deleteTarget.id}`); refetch(); setDeleteTarget(null); }
    catch (err) { alert(err.response?.data?.message ?? "Delete failed"); }
    finally { setDeleting(false); }
  };

  return (
    <Layout>
      <Header
        actions={
          <button onClick={() => setModalRole(false)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(109,61,245,0.35)", fontFamily: T.font }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Create Role
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: T.font }}>
        {error && (
          <div style={{ background: darkMode ? "rgba(220,38,38,0.15)" : "#FEF2F2", border: `1px solid ${darkMode ? "rgba(220,38,38,0.3)" : "#FECACA"}`, borderRadius: 12, padding: "10px 16px", fontSize: 12, color: darkMode ? "#fca5a5" : "#DC2626" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: "80px 0" }}><LoadingSpinner text="Loading roles…" /></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {roles.map(role => (
              <RoleCard key={role.id} role={role} onEdit={setModalRole} onDelete={setDeleteTarget} T={T} />
            ))}
          </div>
        )}
      </div>

      {modalRole !== null && (
        <RoleFormModal role={modalRole || null} onClose={() => setModalRole(null)} onSaved={() => { setModalRole(null); refetch(); }} />
      )}

      {deleteTarget && (
        <DeleteDialog target={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} T={T} dark={darkMode} />
      )}
    </Layout>
  );
}