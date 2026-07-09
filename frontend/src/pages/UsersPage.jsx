import { useState, useEffect, useRef } from "react";
import Layout from "../components/layout/Layout";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
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
    font:     '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    accent:   '#7c3aed',
    accentL:  dark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
    accentB:  dark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.15)',
    border:   dark ? 'rgba(148,163,184,0.14)' : '#e5e7eb',
    borderRow:dark ? 'rgba(255,255,255,0.06)' : '#EBEBF5',
    surface:  dark ? 'rgba(12,19,34,0.88)'   : '#ffffff',
    surface2: dark ? 'rgba(15,23,42,0.74)'   : '#fafbfc',
    tableHdr: dark ? 'rgba(10,14,28,0.98)'   : '#f1f1f1',
    rowHover: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    text1:    dark ? '#f1f5f9' : '#111827',
    text2:    dark ? '#94a3b8' : '#6b7280',
    text3:    dark ? '#64748b' : '#9ca3af',
    inputBg:  dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    inputBd:  dark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb',
    shadow:   dark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.06)',
    radius:   14,
  };
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_GRADS = [
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#059669,#34d399)",
  "linear-gradient(135deg,#d97706,#fbbf24)",
  "linear-gradient(135deg,#2563eb,#60a5fa)",
  "linear-gradient(135deg,#dc2626,#f87171)",
  "linear-gradient(135deg,#db2777,#f472b6)",
];
function avatarGrad(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length];
}

function roleBadge(roleName = "", dark) {
  const n = roleName.toUpperCase();
  if (n.includes("SUPER"))  return { bg: dark ? "rgba(124,58,237,0.18)"  : "rgba(124,58,237,0.1)",  color: dark ? "#c4b5fd" : "#7c3aed",  border: dark ? "rgba(124,58,237,0.35)" : "rgba(124,58,237,0.25)" };
  if (n.includes("ADMIN"))  return { bg: dark ? "rgba(37,99,235,0.18)"   : "rgba(37,99,235,0.1)",   color: dark ? "#93c5fd" : "#2563eb",  border: dark ? "rgba(37,99,235,0.35)"  : "rgba(37,99,235,0.25)"  };
  if (n.includes("AGENT") || n.includes("SUPPORT"))
                             return { bg: dark ? "rgba(5,150,105,0.18)"   : "rgba(5,150,105,0.1)",   color: dark ? "#6ee7b7" : "#059669",  border: dark ? "rgba(5,150,105,0.35)"  : "rgba(5,150,105,0.25)"  };
  return                            { bg: dark ? "rgba(100,116,139,0.18)" : "rgba(107,114,128,0.1)", color: dark ? "#94a3b8" : "#6b7280",  border: dark ? "rgba(100,116,139,0.3)" : "rgba(107,114,128,0.2)" };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 34, radius = 10 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, background: avatarGrad(name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      {initials(name)}
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
function inputSx(T) {
  return {
    width: "100%", boxSizing: "border-box",
    background: T.inputBg, border: `1px solid ${T.inputBd}`,
    borderRadius: 9, padding: "9px 12px",
    fontSize: 13, color: T.text1, outline: "none",
    fontFamily: T.font, transition: "border-color 0.15s",
  };
}

// ─── Edit Side Panel ──────────────────────────────────────────────────────────
function EditUserPanel({ user, roles, onClose, onSaved }) {
  const dark = useDark();
  const T    = tokens(dark);
  const [form, setForm]       = useState({ name: user.name || "", email: user.email || "", password: "", roleId: user.role?.id || "" });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const iSx = inputSx(T);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, roleId: form.roleId };
      if (form.password.trim()) payload.password = form.password;
      await api.patch(`/users/${user.id}`, payload);
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (err) { setError(err.response?.data?.message || "Failed to update user"); }
    finally { setSaving(false); }
  };

  const field = (label, content) => (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      {content}
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: dark ? "#0f172a" : "#ffffff", zIndex: 50, display: "flex", flexDirection: "column", borderLeft: `1px solid ${T.border}`, boxShadow: "-12px 0 48px rgba(0,0,0,0.2)", animation: "panelSlide 0.22s cubic-bezier(0.16,1,0.3,1)", fontFamily: T.font }}>
        <style>{`@keyframes panelSlide{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={user.name} size={38} radius={11} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{user.name}</div>
              <div style={{ fontSize: 11.5, color: T.text3, marginTop: 1 }}>Edit account details</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.text3 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {error && <Alert type="error" msg={error} dark={dark} />}
          {success && <Alert type="success" msg="Updated successfully" dark={dark} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {field("Full Name",    <input style={iSx} value={form.name}     placeholder="Full name"              onChange={e => setForm({ ...form, name: e.target.value })}     onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.inputBd} />)}
            {field("Email",        <input style={iSx} value={form.email}    placeholder="email@example.com" type="email" onChange={e => setForm({ ...form, email: e.target.value })}    onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.inputBd} />)}
            {field("New Password", <input style={iSx} value={form.password} placeholder="Leave blank to keep"   type="password" onChange={e => setForm({ ...form, password: e.target.value })} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.inputBd} />)}
            {field("Role",
              <select style={{ ...iSx, cursor: "pointer" }} value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.inputBd}>
                <option value="" style={{ background: dark ? "#0f172a" : "#fff" }}>Select a role…</option>
                {roles.map(r => <option key={r.id} value={r.id} style={{ background: dark ? "#0f172a" : "#fff" }}>{r.name}{r.description ? ` — ${r.description}` : ""}</option>)}
              </select>
            )}
            <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>User ID</div>
              <div style={{ fontFamily: "monospace", fontSize: 11.5, color: T.text2 }}>{user.id}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: T.inputBg, border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || success} style={{ flex: 2, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: saving || success ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "#fff", cursor: saving || success ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(124,58,237,0.3)", fontFamily: T.font }}>
            {saving ? "Saving…" : success ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ roles, onClose, onCreated }) {
  const dark = useDark();
  const T    = tokens(dark);
  const [form, setForm]             = useState({ name: "", email: "", password: "", roleId: "" });
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const iSx = inputSx(T);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.email || !form.password) return setError("Name, email and password are required");
    if (!form.roleId) return setError("Please select a role");
    setSubmitting(true);
    try { await api.post("/users", form); onCreated(); onClose(); }
    catch (err) { setError(err.response?.data?.message || "Failed to create user"); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, background: dark ? "#0f172a" : "#ffffff", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: dark ? "0 24px 64px rgba(0,0,0,0.5)" : "0 24px 64px rgba(0,0,0,0.14)", zIndex: 50, fontFamily: T.font, animation: "modalPop 0.2s cubic-bezier(0.16,1,0.3,1)" }}>
        <style>{`@keyframes modalPop{from{transform:translate(-50%,-50%) scale(0.95);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentL, border: `1px solid ${T.accentB}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" fill="none" stroke="#7c3aed" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Create New User</div>
              <div style={{ fontSize: 11.5, color: T.text3, marginTop: 1 }}>Add a team member to your workspace</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.text3 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {error && <Alert type="error" msg={error} dark={dark} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Full Name *",  key: "name",     type: "text",     placeholder: "Name"           },
              { label: "Email *",      key: "email",    type: "email",    placeholder: "user@company.com"   },
              { label: "Password *",   key: "password", type: "password", placeholder: "Min. 6 characters"  },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
                <input style={iSx} type={type} placeholder={placeholder} value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.inputBd} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Role *</div>
              <select style={{ ...iSx, cursor: "pointer" }} value={form.roleId}
                onChange={e => setForm({ ...form, roleId: e.target.value })}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.inputBd}>
                <option value="" style={{ background: dark ? "#0f172a" : "#fff" }}>Select a role…</option>
                {roles.filter(r => !r.isSystem).map(r => <option key={r.id} value={r.id} style={{ background: dark ? "#0f172a" : "#fff" }}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: T.inputBg, border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: submitting ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.3)", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6 }}>
            {submitting ? "Creating…" : <><svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Create User</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Alert helper ─────────────────────────────────────────────────────────────
function Alert({ type, msg, dark }) {
  const ok = type === "success";
  return (
    <div style={{ background: ok ? (dark ? "rgba(5,150,105,0.15)" : "rgba(5,150,105,0.06)") : (dark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.06)"), border: `1px solid ${ok ? (dark ? "rgba(5,150,105,0.35)" : "rgba(5,150,105,0.2)") : (dark ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.2)")}`, borderRadius: 9, padding: "10px 14px", marginBottom: 18, fontSize: 12.5, color: ok ? (dark ? "#6ee7b7" : "#059669") : (dark ? "#fca5a5" : "#dc2626"), display: "flex", gap: 8, alignItems: "center" }}>
      {ok
        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        : <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      }
      {msg}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const dark = useDark();
  const T    = tokens(dark);
  const { isSuperAdmin, canCreate } = useAuth();
  const [users, setUsers]           = useState([]);
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
    api.get("/roles").then(res => setRoles(res.data.roles ?? [])).catch(() => {});
  }, []);

  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try { const res = await api.get("/users"); setUsers(res.data.users || []); }
    catch (err) { setError(err.response?.data?.message || "Failed to load users"); }
    finally { setLoading(false); }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <Header/>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: T.font }}>
        {error && <Alert type="error" msg={error} dark={dark} />}

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden", boxShadow: T.shadow }}>

          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>Team Members</div>
              <div style={{ fontSize: 11.5, color: T.text3, marginTop: 1 }}>{loading ? "Loading…" : `${filtered.length} of ${users.length} users`}</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Create User button */}
              {(isSuperAdmin || canCreate("users")) && (
                <button onClick={() => setShowCreate(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.3)", fontFamily: T.font, flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Create User
                </button>
              )}

              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" fill="none" stroke={T.text3} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" /></svg>
                <input style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, width: 200, fontSize: 12.5, background: T.inputBg, border: `1px solid ${T.inputBd}`, borderRadius: 9, color: T.text1, outline: "none", fontFamily: T.font }}
                  placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.inputBd} />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: "64px 0" }}><LoadingSpinner text="Loading users…" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>No users found</div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Try a different search term</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: T.font }}>
                  <thead>
                    <tr style={{ background: T.tableHdr }}>
                      {["User", "Email", "Role", "ID", ...(isSuperAdmin ? [""] : [])].map((h, i) => (
                        <th key={i} style={{ padding: "0 20px", height: 34, textAlign: i >= 3 ? "right" : "left", fontSize: 10.5, fontWeight: 700, color: dark ? "rgba(226,232,240,0.55)" : "rgba(0,0,0,0.55)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const badge = roleBadge(u.role?.name || "", dark);
                      return (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${T.borderRow}`, transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "6px 20px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar name={u.name} size={26} radius={7} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "6px 20px", fontSize: 12.5, color: T.text2 }}>{u.email}</td>
                          <td style={{ padding: "6px 20px" }}>
                            <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                              {u.role?.name || "USER"}
                            </span>
                          </td>
                          <td style={{ padding: "6px 20px", textAlign: "right" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: T.text3, background: T.inputBg, padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.border}` }}>
                              {u.id.slice(0, 12)}…
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td style={{ padding: "6px 20px", textAlign: "right" }}>
                              <button onClick={() => setEditingUser(u)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, color: T.text2, background: T.inputBg, border: `1px solid ${T.border}`, cursor: "pointer", transition: "all 0.14s", fontFamily: T.font }}
                                onMouseEnter={e => { e.currentTarget.style.background = T.accentL; e.currentTarget.style.color = "#7c3aed"; e.currentTarget.style.borderColor = T.accentB; }}
                                onMouseLeave={e => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.text2; e.currentTarget.style.borderColor = T.border; }}>
                                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "8px 20px", borderTop: `1px solid ${T.borderRow}`, background: T.surface2 }}>
                <span style={{ fontSize: 11, color: T.text3 }}>
                  Showing <strong style={{ color: T.text2 }}>{filtered.length}</strong> of <strong style={{ color: T.text2 }}>{users.length}</strong> users
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} onCreated={fetchUsers} />}
      {editingUser && <EditUserPanel user={editingUser} roles={roles} onClose={() => setEditingUser(null)} onSaved={fetchUsers} />}
    </Layout>
  );
}