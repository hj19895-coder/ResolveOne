import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api/axios";
import { useMasterData } from "../hooks/Usemasterdata";
import { X, Check, Loader2, ChevronDown, Search, RotateCcw } from "lucide-react";
import HtmlDescriptionEditor from "../components/tickets/HtmlDescriptionEditor";
import Toast from "../components/ui/Toast";
import { Zap } from "lucide-react";


const INITIAL_STATE = {
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


// ─── Theme helper (unchanged) ────────────────────────────────────────────────
const isDashboardDark = () =>
  typeof document !== "undefined" && document.documentElement.dataset.dashboardTheme === "dark";

function useDashboardTheme() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("dashboard-theme") || "light";
  });

  useEffect(() => {
    const handler = (e: any) => {
      const next = e?.detail;
      if (next === "dark" || next === "light") setTheme(next);
      else setTheme(isDashboardDark() ? "dark" : "light");
    };
    window.addEventListener("dashboard-theme-change", handler);
    return () => window.removeEventListener("dashboard-theme-change", handler);
  }, []);

  return theme === "dark";
}

// ─── Color tokens (unchanged, + modal-specific additions) ───────────────────
function tokens(dark: boolean) {
  return {
    cardBg:      dark ? "rgb(20,28,46)"          : "#ffffff",
    cardBorder:  dark ? "rgba(148,163,184,0.24)" : "#e5e7eb",
    headerBg:    dark ? "rgba(15,23,42,0.74)"    : "#f9fafb",
    headerBorder:dark ? "rgba(148,163,184,0.12)" : "#f3f4f6",
    text:        dark ? "#e5edf7"                : "#111827",
    textSoft:    dark ? "#9fb0c7"                : "#6b7280",
    muted:       dark ? "#74839a"                : "#9ca3af",
    inputBg:     dark ? "rgba(15,23,42,0.55)"    : "#ffffff",
    inputBorder: dark ? "rgba(148,163,184,0.2)"  : "#e5e7eb",
    hoverBg:     dark ? "rgba(255,255,255,0.05)" : "#f9fafb",
    placeholder: dark ? "#64748b"                : "#9ca3af",
    btnSecondaryBg: dark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
    btnSecondaryBgHover: dark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    menuBg:      dark ? "rgba(10,14,28,0.98)"    : "rgba(255,255,255,0.98)",
    menuBorder:  dark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    menuShadow:  dark ? "0 16px 40px rgba(0,0,0,0.4)" : "0 8px 36px rgba(80,60,200,0.16)",
    // modal-only
    backdrop:    dark ? "rgba(2,6,16,0.72)" : "rgba(15,23,42,0.55)",
    divider:     dark ? "rgba(148,163,184,0.12)" : "#f0f1f4",
  };
}

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]*>/g, "").trim();
}

// ─── Generic searchable dropdown (unchanged) ─────────────────────────────────
interface SearchableOption { id: string; label: string; }

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
  dark: boolean;
  emptyLabel?: string;
}

function SearchableSelect({
  value, onChange, options, loading = false, error = null,
  placeholder = "Select...", dark, emptyLabel = "No options available",
}: SearchableSelectProps) {
  const t = tokens(dark);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const handleOpen = () => {
    if (loading) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const estHeight = 280;
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
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: selected ? t.text : t.placeholder }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "Loading…" : error ? "Error loading" : selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: t.muted, marginLeft: 8 }} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width,
            zIndex: 1000000, // above the modal itself (modal sits at 999999)
            background: t.menuBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${t.menuBorder}`,
            borderRadius: 13,
            boxShadow: t.menuShadow,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${t.menuBorder}` }}>
            <div style={{ position: "relative" }}>
              <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: t.muted }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  width: "100%", padding: "6px 10px 6px 28px", borderRadius: 9,
                  fontSize: 12.5, background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                  border: `1px solid ${t.menuBorder}`, color: t.text, outline: "none",
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: 5 }}>
            {filtered.map((opt) => {
              const isSel = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", width: "100%", textAlign: "left",
                    padding: "7px 10px", borderRadius: 9, fontSize: 13, border: "none", cursor: "pointer",
                    background: isSel ? (dark ? "rgba(167,139,250,0.14)" : "rgba(91,79,232,0.08)") : "transparent",
                    color: isSel ? (dark ? "#ddd6fe" : "#4f46e5") : t.text,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = t.hoverBg; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "10px 8px", fontSize: 12.5, color: t.muted }}>
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

interface SimpleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
  dark: boolean;
  disabled?: boolean;
}

function SimpleSelect({ value, onChange, options, placeholder = "Select...", dark, disabled = false }: SimpleSelectProps) {
  const t = tokens(dark);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const handleOpen = () => {
    if (disabled) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const estHeight = Math.min(options.length * 34 + 10, 220);
      const flipUp = window.innerHeight - r.bottom < estHeight && r.top > estHeight;
      setPos(
        flipUp
          ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: Math.max(r.width, 140) }
          : { top: r.bottom + 6, left: r.left, width: Math.max(r.width, 140) }
      );
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: selected ? t.text : t.placeholder, maxWidth: 140 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {disabled ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.muted }} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width,
            zIndex: 1000000,
            background: t.menuBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${t.menuBorder}`,
            borderRadius: 11,
            boxShadow: t.menuShadow,
            overflow: "hidden",
          }}
        >
          <div style={{ maxHeight: 220, overflowY: "auto", padding: 5 }}>
            {options.map((opt) => {
              const isSel = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", width: "100%", textAlign: "left",
                    padding: "7px 10px", borderRadius: 8, fontSize: 12.5, border: "none", cursor: "pointer",
                    background: isSel ? (dark ? "rgba(167,139,250,0.14)" : "rgba(91,79,232,0.08)") : "transparent",
                    color: isSel ? (dark ? "#ddd6fe" : "#4f46e5") : t.text,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = t.hoverBg; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface DynamicSelectProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  dark: boolean;
}

function DynamicSelect({ label, name, type, value, onChange, required = false, placeholder = "Select...", dark }: DynamicSelectProps) {
  const { options: rawOptions, loading, error } = useMasterData(type);
  const t = tokens(dark);
  const options: SearchableOption[] = (rawOptions || []).map((o: any) => ({
    id: String(o.id),
    label: String(o.value ?? o.name ?? ""),
  }));

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        loading={loading}
        error={error}
        placeholder={placeholder}
        dark={dark}
      />
    </div>
  );
}

interface TechnicianSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  dark: boolean;
}

interface Technician {
  id: string | number;
  name: string;
  email?: string;
  role?: { name?: string };
}

function TechnicianSelect({ label, name, value, onChange, required = false, placeholder = "Select technician...", dark }: TechnicianSelectProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = tokens(dark);

  useEffect(() => {
    api.get("/tickets/users")
      .then((res) => {
        const list = res.data.users || res.data || [];
        setTechnicians(Array.isArray(list) ? list : []);
      })
      .catch(() => setError("Failed to load technicians."))
      .finally(() => setLoading(false));
  }, []);

  const options: SearchableOption[] = technicians.map((tech) => ({
    id: String(tech.id),
    label: `${tech.name}${tech.role?.name ? ` (${tech.role.name})` : ""}`,
  }));

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        loading={loading}
        error={error}
        placeholder={placeholder}
        dark={dark}
        emptyLabel="No technicians available"
      />
    </div>
  );
}

// ─── Flat section header (replaces the old boxed SectionCard) ───────────────
interface SectionProps {
  title: string;
  dark: boolean;
  children: React.ReactNode;
  first?: boolean;
}

function Section({ title, dark, children, first = false }: SectionProps) {
  const t = tokens(dark);
  return (
    <div
      className="py-5"
      style={{ borderTop: first ? "none" : `1px solid ${t.divider}` }}
    >
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: t.muted }}>
        <span style={{ width: 14, height: 2, borderRadius: 2, background: dark ? "#7C6FF0" : "#4f46e5", flexShrink: 0 }} />
        {title}
      </h3>
      {children}
    </div>
  );
}
interface GrammarSuggestionPopupProps {
  dark: boolean;
  original: string;
  suggested: string;
  onCancel: () => void;
  onReplace: () => void;
}

function GrammarSuggestionPopup({ dark, original, suggested, onCancel, onReplace }: GrammarSuggestionPopupProps) {
  const t = tokens(dark);
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000002,
        background: t.backdrop,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="rounded-2xl w-full flex flex-col overflow-hidden"
        style={{
          background: t.cardBg,
          maxWidth: 520,
          maxHeight: "calc(100vh - 80px)",
          boxShadow: dark
            ? "0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.35)"
            : "0 24px 60px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.1)",
          position: "relative",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #4318FF, #7C3AED, #6c47ff)",
        }} />

        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.cardBorder}` }}
        >
          <h2 className="text-base font-semibold" style={{ color: t.text }}>
            Grammar Suggestion
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: t.textSoft }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: t.muted }}>
              Original
            </p>
            <div
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textSoft, whiteSpace: "pre-wrap" }}
            >
              {stripHtml(original) || "—"}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: dark ? "#a78bfa" : "#7C3AED" }}>
              Suggested
            </p>
            <div
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={{
                background: dark ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.06)",
                border: `1px solid ${dark ? "rgba(167,139,250,0.3)" : "rgba(124,58,237,0.25)"}`,
                color: t.text,
                whiteSpace: "pre-wrap",
              }}
            >
              {suggested || "—"}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.cardBorder}` }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-xl transition-all"
            style={{ color: t.textSoft, background: t.btnSecondaryBg, border: `1px solid ${t.cardBorder}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.btnSecondaryBgHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = t.btnSecondaryBg)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center justify-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #4318FF 0%, #6c47ff 100%)",
              boxShadow: "0 4px 14px rgba(67,24,255,0.3)",
            }}
          >
            <Check className="w-4 h-4" />
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // e.g. refetch ticket list in the parent
  dark?: boolean;
}

export default function CreateTicketModal({ open, onClose, onCreated, dark: darkProp }: CreateTicketModalProps) {
  const internalDark = useDashboardTheme();
  const dark = typeof darkProp === "boolean" ? darkProp : internalDark;
  const t = tokens(dark);
  const [form, setForm] = useState(INITIAL_STATE);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    if (!open) return;
    setTemplatesLoading(true);
    api.get("/templates")
      .then((res) => setTemplates(res.data.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [open]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Grammar Fix feature state
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [descAnim, setDescAnim] = useState<"idle" | "out" | "in">("idle");
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "success" | "warning" | "error";
  }>({ open: false, title: "", message: "", type: "success" });

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape (but not while a nested dropdown is capturing it —
  // SearchableSelect's own Escape handler runs first via event order and
  // calls stopPropagation implicitly through its own open-state change,
  // so this is safe to keep simple)
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Reset form state each time the modal is freshly opened
  useEffect(() => {
    if (open) {
      setForm(INITIAL_STATE);
      setServerError(null);
      setSelectedTemplateId("");
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
      setForm((prev) => ({ ...prev, [name]: value }));
    };
    const TEMPLATE_FIELDS = [
    "requesterName", "subject", "description", "remarks", "reopened",
    "tat", "assignedOn", "estimatedTatHrs", "assignedToId",
    "statusId", "sourceId", "levelId", "groupId", "severityId", "raisedById",
    "siteId", "ticketTypeId", "clientNameId", "priorityId", "categoryId",
    "subcategoryId", "itemId", "rootCauseCategoryId",
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    setForm((prev) => {
      const next: any = { ...prev };
      TEMPLATE_FIELDS.forEach((key) => {
        if (tpl[key] === undefined || tpl[key] === null || tpl[key] === "") return;
        if (key === "tat" || key === "assignedOn") {
          next[key] = String(tpl[key]).slice(0, 10);
        } else {
          next[key] = tpl[key];
        }
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          payload[k] = v;
        }
      });
      await api.post('/tickets', payload);
      onCreated?.();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message ?? err.message ?? 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrammarFix = async () => {
    if (grammarLoading) return; // no duplicate requests

    const plainText = stripHtml(form.description);
    if (!plainText) {
      setToast({
        open: true,
        title: "Description Required",
        message: "Please enter a description before using Grammar Fix.",
        type: "warning",
      });
      return;
    }

    setGrammarLoading(true);
    try {
      const res = await api.post("/ai/grammar-fix", { text: plainText });
      console.log("Corrected:", res.data.text);
      if (!res.data?.success) throw new Error("Grammar fix unsuccessful");
      const corrected = res.data.text;
      setDescAnim("out"); // dismantle current text
      setTimeout(() => {
        setForm((p) => ({ ...p, description: corrected }));
        setDescAnim("in"); // reassemble new text
      setToast({
        open: true,
        title: "Grammar Fixed",
        message: "Description updated with corrected grammar.",
        type: "success",
      });
      setTimeout(() => setDescAnim("idle"), 380);
    }, 320);  

    } catch (err) {
      setToast({
        open: true,
        title: "Grammar Fix Failed",
        message: "Unable to improve grammar. Please try again.",
        type: "error",
      });
    } finally {
      setGrammarLoading(false);
    }
  };

  const dynSelect = (label: string, name: string, type: string, required = false, placeholder = "Select...") => (
    <DynamicSelect
      label={label}
      name={name}
      type={type}
      value={form[name as keyof typeof form] as string}
      onChange={(value) => handleSelectChange(name, value)}
      required={required}
      placeholder={placeholder}
      dark={dark}
    />
  );

  const inputStyle: React.CSSProperties = {
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    color: t.text,
  };

  return (
    <>
      {createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 999999,
            background: t.backdrop,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "40px 20px",
            overflowY: "auto",
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div
            className="rounded-2xl w-full flex flex-col overflow-hidden"
            style={{
              background: t.cardBg,
              maxWidth: 760,
              maxHeight: "calc(100vh - 80px)",
              boxShadow: dark
                ? "0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset"
                : "0 24px 60px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.1)",
              position: "relative",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, #4318FF, #7C3AED, #6c47ff)",
            }} />
            {/* Sticky header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{
                borderBottom: `1px solid ${t.cardBorder}`,
                background: dark ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <h1 className="text-lg font-semibold" style={{ color: t.text }}>Create Ticket</h1>
              <div className="flex items-center gap-3">
                <SimpleSelect
                  value={selectedTemplateId}
                  onChange={handleTemplateSelect}
                  options={templates.map((tpl) => ({ id: tpl.id, label: tpl.name }))}
                  placeholder="Template"
                  dark={dark}
                  disabled={templatesLoading}
                />
                <button
                  type="button"
                  onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: t.textSoft }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X className="w-4.5 h-4.5" />
              </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable body */}
                <div ref={bodyRef} className="px-6 overflow-y-auto flex-1" style={{ minHeight: 0 }}>

                {serverError && (
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-3 mt-5"
                    style={{
                      background: dark ? "rgba(127,29,29,0.26)" : "#fef2f2",
                      border: `1px solid ${dark ? "rgba(248,113,113,0.24)" : "#fecaca"}`,
                      color: dark ? "#fca5a5" : "#b91c1c",
                    }}
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: dark ? "rgba(248,113,113,0.18)" : "#fee2e2" }}>
                      <X className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium">{serverError}</span>
                  </div>
                )}

                <Section title="Basic Information" dark={dark} first>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>
                        Requester Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="requesterName"
                        value={form.requesterName}
                        onChange={handleChange}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                        placeholder="Enter requester name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                        placeholder="Enter subject"
                        required
                      />
                    </div>
                    
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium" style={{ color: t.textSoft }}>
                          Description <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGrammarFix}
                          disabled={grammarLoading}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{
                            color: dark ? "#a78bfa" : "#7C3AED",
                            background: dark ? "rgba(167,139,250,0.1)" : "rgba(124,58,237,0.08)",
                            border: `1px solid ${dark ? "rgba(167,139,250,0.28)" : "rgba(124,58,237,0.22)"}`,
                          }}
                          onMouseEnter={(e) => {
                            if (!grammarLoading)
                              e.currentTarget.style.background = dark ? "rgba(167,139,250,0.18)" : "rgba(124,58,237,0.14)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = dark ? "rgba(167,139,250,0.1)" : "rgba(124,58,237,0.08)";
                          }}
                        >
                          {grammarLoading ? (
                            <>⏳ Fixing...</>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Zap size={13} style={{ color: "#7c3aed" }} />
                              AI Fix
                            </span>
                          )}
                        </button>
                      </div>

                      <style>{`
                        @keyframes dfDismantleOut {
                          0%   { opacity: 1; filter: blur(0px); transform: scale(1) rotate(0deg) translateY(0); }
                          100% { opacity: 0; filter: blur(5px); transform: scale(0.94) rotate(-1.5deg) translateY(-6px); }
                        }
                        @keyframes dfDismantleIn {
                          0%   { opacity: 0; filter: blur(5px); transform: scale(1.05) rotate(1.5deg) translateY(6px); }
                          100% { opacity: 1; filter: blur(0px); transform: scale(1) rotate(0deg) translateY(0); }
                        }
                      `}</style>
                      <div
                        style={{
                          transformOrigin: "center",
                          animation:
                            descAnim === "out"
                              ? "dfDismantleOut 0.32s cubic-bezier(0.4,0,0.6,1) both"
                              : descAnim === "in"
                              ? "dfDismantleIn 0.38s cubic-bezier(0.16,1,0.3,1) both"
                              : "none",
                        }}
                      >
                        <HtmlDescriptionEditor
                          value={form.description}
                          onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                          dark={dark}
                        />
                      </div>
                    </div>
                </Section>

                <Section title="Assignment" dark={dark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynSelect("Group", "groupId", "GROUP", false, "Select group")}
                    <TechnicianSelect
                      label="Assigned To"
                      name="assignedToId"
                      value={form.assignedToId}
                      onChange={(value) => handleSelectChange("assignedToId", value)}
                      dark={dark}
                    />
                    {dynSelect("Level", "levelId", "LEVEL", false, "Select level")}
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>Assigned On</label>
                      <input
                        name="assignedOn"
                        type="date"
                        value={form.assignedOn}
                        onChange={handleChange}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Classification" dark={dark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynSelect("Site", "siteId", "SITE")}
                    {dynSelect("Ticket Type", "ticketTypeId", "TICKET_TYPE")}
                    {dynSelect("Client Name", "clientNameId", "CLIENT_NAME")}
                    {dynSelect("Priority", "priorityId", "PRIORITY", true)}
                    {dynSelect("Category", "categoryId", "CATEGORY")}
                    {dynSelect("Subcategory", "subcategoryId", "SUBCATEGORY")}
                    {dynSelect("Item", "itemId", "ITEM")}
                    {dynSelect("Root Cause Category", "rootCauseCategoryId", "ROOT_CAUSE_CATEGORY")}
                  </div>
                </Section>

                <Section title="Additional Details" dark={dark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynSelect("Status", "statusId", "STATUS", true)}
                    {dynSelect("Source", "sourceId", "SOURCE")}
                    {dynSelect("Severity", "severityId", "SEVERITY")}
                    {dynSelect("Raised By", "raisedById", "RAISED_BY")}
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>Reopened</label>
                      <label
                        className="inline-flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-xl transition-all w-full"
                        style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = t.inputBg)}
                      >
                        <input
                          type="checkbox"
                          name="reopened"
                          checked={form.reopened}
                          onChange={handleChange}
                          className="rounded w-4 h-4"
                          style={{ accentColor: dark ? "#818cf8" : "#4f46e5" }}
                        />
                        <span className="text-sm" style={{ color: t.textSoft }}>Mark as reopened</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>Remarks</label>
                      <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                        placeholder="Enter remarks"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>TAT</label>
                      <input
                        name="tat"
                        type="date"
                        value={form.tat}
                        onChange={handleChange}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: t.textSoft }}>Estimated TAT (hrs)</label>
                      <input
                        name="estimatedTatHrs"
                        type="number"
                        value={form.estimatedTatHrs}
                        onChange={handleChange}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                        style={inputStyle}
                        placeholder="Enter hours"
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                </Section>

              </div>

              {/* Sticky footer — mirrors Jira's "Create another" + Cancel/Create layout */}
              <div
                className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0"
                style={{ borderTop: `1px solid ${t.cardBorder}` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setForm(INITIAL_STATE);
                    setServerError(null);
                    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all"
                  style={{ color: t.textSoft, background: t.btnSecondaryBg, border: `1px solid ${t.cardBorder}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.btnSecondaryBgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = t.btnSecondaryBg)}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-xl transition-all"
                    style={{ color: t.textSoft, background: t.btnSecondaryBg, border: `1px solid ${t.cardBorder}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.btnSecondaryBgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = t.btnSecondaryBg)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #4318FF 0%, #6c47ff 100%)',
                      boxShadow: '0 4px 14px rgba(67,24,255,0.3)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
       </div>,
        document.body
      )}

      <Toast
        open={toast.open}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        dark={dark}
      />
    </>
  );
}