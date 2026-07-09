// src/pages/TemplatesPage.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Layout from "../components/layout/Layout";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useMasterData } from "../hooks/Usemasterdata";
import api from "../api/axios";
import { ChevronDown, Search } from "lucide-react";

// ─── Theme hook (same pattern as RolesPage) ──────────────────────────────────
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

function tokens(dark) {
  return {
    font: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    accent: "#7c3aed",
    accentL: dark ? "rgba(124,58,237,0.18)" : "#EDE9FE",
    accentB: dark ? "rgba(124,58,237,0.4)" : "#C4B5FD",
    border: dark ? "rgba(148,163,184,0.14)" : "#e5e7eb",
    borderS: dark ? "rgba(148,163,184,0.08)" : "#F3F4F6",
    surface: dark ? "#0f172a" : "#ffffff",
    surface2: dark ? "rgba(15,23,42,0.8)" : "#F9FAFB",
    inputBg: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
    inputBd: dark ? "rgba(255,255,255,0.12)" : "#D1D5DB",
    text1: dark ? "#f1f5f9" : "#111827",
    text2: dark ? "#94a3b8" : "#6B7280",
    text3: dark ? "#64748b" : "#9CA3AF",
    text4: dark ? "#475569" : "#374151",
    shadow: dark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.06)",
    cardBorder: dark ? "rgba(148,163,184,0.14)" : "#E5E7EB",
  };
}

const INITIAL_FORM = {
  name: "",
  notes: "",
  requesterName: "",
  subject: "",
  description: "",
  remarks: "",
  reopened: false,
  tat: "",
  assignedOn: "",
  estimatedTatHrs: "",
  assignedToId: "",
  statusId: "",
  sourceId: "",
  levelId: "",
  groupId: "",
  severityId: "",
  raisedById: "",
  siteId: "",
  ticketTypeId: "",
  clientNameId: "",
  priorityId: "",
  categoryId: "",
  subcategoryId: "",
  itemId: "",
  rootCauseCategoryId: "",
};

// ─── Simple select built on native <select>, fed by useMasterData ────────────
function SearchableDropdown({ value, onChange, options, loading, placeholder = "Select...", T, emptyLabel = "No options available" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.id === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const handleOpen = () => {
    if (loading) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const estHeight = 260;
      const flipUp = window.innerHeight - r.bottom < estHeight && r.top > estHeight;
      setPos(
        flipUp
          ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width }
          : { top: r.bottom + 6, left: r.left, width: r.width }
      );
    }
    setQuery("");
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        onClick={handleOpen}
        disabled={loading}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
          border: `1px solid ${T.inputBd}`, background: T.inputBg,
          color: selected ? T.text1 : T.text3, outline: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4" style={{ color: T.text3, marginLeft: 8, flexShrink: 0 }} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width,
            zIndex: 1002000, background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.18)", overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ position: "relative" }}>
              <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.text3 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  width: "100%", padding: "6px 10px 6px 28px", borderRadius: 8, fontSize: 12.5,
                  background: T.surface2, border: `1px solid ${T.border}`, color: T.text1, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 210, overflowY: "auto", padding: 5 }}>
            {filtered.map((opt) => {
              const isSel = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                    borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                    background: isSel ? T.accentL : "transparent",
                    color: isSel ? T.accent : T.text1,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = T.surface2; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "10px 8px", fontSize: 12.5, color: T.text3 }}>
                {options.length === 0 ? emptyLabel : "No matches"}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DynamicSelect({ label, type, value, onChange, T, placeholder = "Select..." }) {
  const { options: rawOptions, loading } = useMasterData(type);
  const options = (rawOptions || []).map((o) => ({ id: String(o.id), label: String(o.value ?? o.name ?? "") }));
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text2, marginBottom: 6 }}>{label}</label>
      <SearchableDropdown value={value} onChange={onChange} options={options} loading={loading} placeholder={placeholder} T={T} />
    </div>
  );
}

function TechnicianSelect({ value, onChange, T }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/tickets/users")
      .then((res) => setTechnicians(res.data.users || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const options = technicians.map((t) => ({
    id: String(t.id),
    label: `${t.name}${t.role?.name ? ` (${t.role.name})` : ""}`,
  }));

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text2, marginBottom: 6 }}>Assigned To</label>
      <SearchableDropdown value={value} onChange={onChange} options={options} loading={loading} placeholder="Select technician..." T={T} emptyLabel="No technicians available" />
    </div>
  );
}

function FormSection({ title, T, children, first }) {
  return (
    <div style={{ paddingTop: first ? 0 : 18, marginTop: first ? 0 : 18, borderTop: first ? "none" : `1px solid ${T.borderS}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Create/Edit Template Modal ──────────────────────────────────────────────
function TemplateFormModal({ template, onClose, onSaved, T, dark }) {
  const isEdit = !!template;
  const [form, setForm] = useState(() => {
    if (!template) return INITIAL_FORM;
    const next = { ...INITIAL_FORM };
    Object.keys(INITIAL_FORM).forEach((k) => {
      if (template[k] !== undefined && template[k] !== null) {
        next[k] = k === "tat" || k === "assignedOn" ? String(template[k]).slice(0, 10) : template[k];
      }
    });
    return next;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === "checkbox" ? checked : value);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Template name is required"); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (isEdit) await api.put(`/templates/${template.id}`, payload);
      else await api.post("/templates", payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save template");
    } finally { setSaving(false); }
  };

  const inputSx = { width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13, border: `1px solid ${T.inputBd}`, outline: "none", background: T.inputBg, color: T.text1, boxSizing: "border-box" };
  const labelSx = { display: "block", fontSize: 11, fontWeight: 600, color: T.text2, marginBottom: 6 };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 20, width: "100%", maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${T.border}`, boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(0,0,0,0.18)", fontFamily: T.font }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${T.border}` }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text1 }}>{isEdit ? "Edit Template" : "Create Template"}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, cursor: "pointer", color: T.text3 }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {error && (
            <div style={{ background: dark ? "rgba(220,38,38,0.15)" : "#FEF2F2", border: `1px solid ${dark ? "rgba(220,38,38,0.35)" : "#FECACA"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: dark ? "#fca5a5" : "#DC2626" }}>{error}</div>
          )}

          <FormSection title="Template Info" T={T} first>
            <div style={grid2}>
              <div>
                <label style={labelSx}>Template Name *</label>
                <input name="name" value={form.name} onChange={handleChange} style={inputSx} placeholder="e.g. Password Reset Request" />
              </div>
              <div>
                <label style={labelSx}>Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} style={inputSx} placeholder="Internal note about this template" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Basic Information" T={T}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelSx}>Requester Name</label>
                <input name="requesterName" value={form.requesterName} onChange={handleChange} style={inputSx} placeholder="Default requester name (optional)" />
              </div>
              <div>
                <label style={labelSx}>Subject</label>
                <input name="subject" value={form.subject} onChange={handleChange} style={inputSx} placeholder="Default subject" />
              </div>
              <div>
                <label style={labelSx}>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} style={inputSx} placeholder="Default description" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Assignment" T={T}>
            <div style={grid2}>
              <DynamicSelect label="Group" type="GROUP" value={form.groupId} onChange={(v) => set("groupId", v)} T={T} />
              <TechnicianSelect value={form.assignedToId} onChange={(v) => set("assignedToId", v)} T={T} />
              <DynamicSelect label="Level" type="LEVEL" value={form.levelId} onChange={(v) => set("levelId", v)} T={T} />
              <div>
                <label style={labelSx}>Assigned On</label>
                <input name="assignedOn" type="date" value={form.assignedOn} onChange={handleChange} style={inputSx} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Classification" T={T}>
            <div style={grid2}>
              <DynamicSelect label="Site" type="SITE" value={form.siteId} onChange={(v) => set("siteId", v)} T={T} />
              <DynamicSelect label="Ticket Type" type="TICKET_TYPE" value={form.ticketTypeId} onChange={(v) => set("ticketTypeId", v)} T={T} />
              <DynamicSelect label="Client Name" type="CLIENT_NAME" value={form.clientNameId} onChange={(v) => set("clientNameId", v)} T={T} />
              <DynamicSelect label="Priority" type="PRIORITY" value={form.priorityId} onChange={(v) => set("priorityId", v)} T={T} />
              <DynamicSelect label="Category" type="CATEGORY" value={form.categoryId} onChange={(v) => set("categoryId", v)} T={T} />
              <DynamicSelect label="Subcategory" type="SUBCATEGORY" value={form.subcategoryId} onChange={(v) => set("subcategoryId", v)} T={T} />
              <DynamicSelect label="Item" type="ITEM" value={form.itemId} onChange={(v) => set("itemId", v)} T={T} />
              <DynamicSelect label="Root Cause Category" type="ROOT_CAUSE_CATEGORY" value={form.rootCauseCategoryId} onChange={(v) => set("rootCauseCategoryId", v)} T={T} />
            </div>
          </FormSection>

          <FormSection title="Additional Details" T={T}>
            <div style={grid2}>
              <DynamicSelect label="Status" type="STATUS" value={form.statusId} onChange={(v) => set("statusId", v)} T={T} />
              <DynamicSelect label="Source" type="SOURCE" value={form.sourceId} onChange={(v) => set("sourceId", v)} T={T} />
              <DynamicSelect label="Severity" type="SEVERITY" value={form.severityId} onChange={(v) => set("severityId", v)} T={T} />
              <DynamicSelect label="Raised By" type="RAISED_BY" value={form.raisedById} onChange={(v) => set("raisedById", v)} T={T} />
              <div>
                <label style={labelSx}>Reopened</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.inputBd}`, background: T.inputBg, cursor: "pointer" }}>
                  <input type="checkbox" name="reopened" checked={form.reopened} onChange={handleChange} style={{ accentColor: T.accent }} />
                  <span style={{ fontSize: 13, color: T.text2 }}>Mark as reopened</span>
                </label>
              </div>
              <div>
                <label style={labelSx}>Remarks</label>
                <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2} style={inputSx} placeholder="Default remarks" />
              </div>
              <div>
                <label style={labelSx}>TAT</label>
                <input name="tat" type="date" value={form.tat} onChange={handleChange} style={inputSx} />
              </div>
              <div>
                <label style={labelSx}>Estimated TAT (hrs)</label>
                <input name="estimatedTatHrs" type="number" value={form.estimatedTatHrs} onChange={handleChange} style={inputSx} step="0.1" min="0" />
              </div>
            </div>
          </FormSection>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 12, fontWeight: 600, color: T.text2, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving ? "#A78BFA" : "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ target, onConfirm, onCancel, deleting, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.surface, borderRadius: 16, padding: 28, maxWidth: 380, width: "90%", textAlign: "center", fontFamily: T.font, border: `1px solid ${T.border}` }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: T.text1 }}>Delete "{target.name}"?</h3>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: T.text2 }}>This cannot be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 12, fontWeight: 600, color: T.text2, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete, T }) {
  return (
    <div style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.cardBorder}`, boxShadow: T.shadow, overflow: "hidden", fontFamily: T.font }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${T.borderS}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{template.name}</div>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: T.text3 }}>{template.notes || "No description"}</p>
      </div>
      <div style={{ padding: "12px 16px", fontSize: 11.5, color: T.text4 }}>
        {template.subject && <div style={{ marginBottom: 4 }}><strong>Subject:</strong> {template.subject}</div>}
        <div style={{ color: T.text3 }}>Created by {template.createdBy?.name ?? "—"}</div>
      </div>
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.borderS}`, display: "flex", gap: 8 }}>
        <button onClick={() => onEdit(template)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 11.5, fontWeight: 600, color: T.text2, cursor: "pointer" }}>Edit</button>
        <button onClick={() => onDelete(template)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid rgba(239,68,68,0.25)`, background: T.surface2, fontSize: 11.5, fontWeight: 600, color: "#EF4444", cursor: "pointer" }}>Delete</button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const darkMode = useDark();
  const T = tokens(darkMode);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalTemplate, setModalTemplate] = useState(null); // null=closed, false=create, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get("/templates");
      setTemplates(res.data.templates || []);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to load templates");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.delete(`/templates/${deleteTarget.id}`); await fetchTemplates(); setDeleteTarget(null); }
    catch (err) { alert(err.response?.data?.message ?? "Delete failed"); }
    finally { setDeleting(false); }
  };

  return (
    <Layout>
      <Header
        actions={
          <button onClick={() => setModalTemplate(false)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>
            + Create Template
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: T.font }}>
        {error && (
          <div style={{ background: darkMode ? "rgba(220,38,38,0.15)" : "#FEF2F2", border: `1px solid ${darkMode ? "rgba(220,38,38,0.3)" : "#FECACA"}`, borderRadius: 12, padding: "10px 16px", fontSize: 12, color: darkMode ? "#fca5a5" : "#DC2626" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: "80px 0" }}><LoadingSpinner text="Loading templates…" /></div>
        ) : templates.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: T.text3, fontSize: 13 }}>
            No templates yet. Click "Create Template" to add one.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onEdit={setModalTemplate} onDelete={setDeleteTarget} T={T} />
            ))}
          </div>
        )}
      </div>

      {modalTemplate !== null && (
        <TemplateFormModal
          template={modalTemplate || null}
          onClose={() => setModalTemplate(null)}
          onSaved={() => { setModalTemplate(null); fetchTemplates(); }}
          T={T}
          dark={darkMode}
        />
      )}

      {deleteTarget && (
        <DeleteDialog target={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} T={T} />
      )}
    </Layout>
  );
}