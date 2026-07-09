import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableColumnRow({
  id, label, checked, disabled, onToggle, showDragHandle, dark,
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-[2px] transition-all"
        style={{ background: "transparent" }}
        {...attributes}
      >
        {showDragHandle ? (
          <span
            className="inline-flex items-center justify-center w-4 h-4 cursor-grab active:cursor-grabbing select-none"
            style={{ color: dark ? "rgba(148,163,184,0.8)" : "rgba(100,116,139,0.8)" }}
            {...listeners}
            aria-label={`Drag to reorder column ${label}`}
            title="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
              <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
            </svg>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-4 h-4 text-transparent select-none">•</span>
        )}

        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(id)}
          className="h-3 w-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 rounded"
          style={{ accentColor: "#5B4FE8" }}
          aria-label={`Toggle column ${label}`}
        />

        <span
          className="truncate text-[11px] font-medium"
          style={{ color: disabled ? (dark ? "rgba(148,163,184,0.55)" : "rgba(51,65,85,0.55)") : (dark ? "#e5e7eb" : "rgba(30,41,59,0.85)") }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default function TableColumnSettingsModal({
  open,
  title = "Table Columns",
  columns = [],
  requiredKeySet,
  visibleColumnKeys = [],
  columnOrder = [],
  onSave,
  onCancel,
  onReset,
  anchorRef,
}) {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.dashboardTheme === "dark");
  const normalizedColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);

  useEffect(() => {
    const syncTheme = (e) => {
      const next = e?.detail;
      if (next === "dark" || next === "light") {
        setDark(next === "dark");
        return;
      }
      setDark(typeof document !== "undefined" && document.documentElement.dataset.dashboardTheme === "dark");
    };
    syncTheme();
    window.addEventListener("dashboard-theme-change", syncTheme);
    return () => window.removeEventListener("dashboard-theme-change", syncTheme);
  }, []);

  const requiredSet = useMemo(() => {
    if (requiredKeySet instanceof Set) return requiredKeySet;
    const s = new Set();
    for (const c of normalizedColumns) { if (c?.required) s.add(c.key); }
    return s;
  }, [normalizedColumns, requiredKeySet]);

  const initialVisibleKeys = useMemo(() => {
    if (Array.isArray(visibleColumnKeys) && visibleColumnKeys.length) return visibleColumnKeys;
    return normalizedColumns.filter((c) => c?.defaultVisible).map((c) => c.key);
  }, [normalizedColumns, visibleColumnKeys]);

  const [visibleKeys, setVisibleKeys]         = useState([]);
  const [draftColumnOrder, setDraftColumnOrder] = useState([]);
  const [searchQuery, setSearchQuery]           = useState("");
  const [panelStyle, setPanelStyle]             = useState({ display: "none" });

  /* ── Sync visible/order state when modal opens ── */
  useEffect(() => {
    if (!open) return;
    setVisibleKeys(initialVisibleKeys);
    const base = Array.isArray(columnOrder) && columnOrder.length
      ? columnOrder
      : normalizedColumns.map((c) => c.key);
    setDraftColumnOrder(base);
    setSearchQuery("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Position panel anchored to button, right-aligned, viewport-clamped ── */
  useEffect(() => {
    if (!open || !anchorRef?.current) return;

    const PANEL_W = 220;
    const MARGIN  = 8;

    const compute = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Right-align panel to button's right edge
      let left = rect.right - PANEL_W;
      const top  = rect.bottom + 4;

      // Clamp horizontally inside viewport
      if (left + PANEL_W > window.innerWidth - MARGIN) {
        left = window.innerWidth - PANEL_W - MARGIN;
      }
      if (left < MARGIN) left = MARGIN;

      setPanelStyle({
        position: "fixed",
        top:      Math.round(top),
        left:     Math.round(left),
        width:    PANEL_W,
        zIndex:   99999,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchorRef]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const allKeys     = useMemo(() => normalizedColumns.map((c) => c.key), [normalizedColumns]);
  const optionalKeys = useMemo(() => allKeys.filter((k) => !requiredSet.has(k)), [allKeys, requiredSet]);

  const isVisible         = (key) => visibleKeys.includes(key);
  const selectedCount     = visibleKeys.filter((k) => optionalKeys.includes(k)).length;
  const allOptionalSelected = optionalKeys.length > 0 && selectedCount === optionalKeys.length;

  const selectAllOptional = () => {
    setVisibleKeys(() => {
      const merged = new Set([
        ...visibleKeys.filter((k) => requiredSet.has(k)),
        ...optionalKeys,
      ]);
      return draftColumnOrder.filter((k) => merged.has(k));
    });
  };

  const clearOptional = () => {
    setVisibleKeys(draftColumnOrder.filter((k) => requiredSet.has(k)));
  };

  const toggleKey = (key) => {
    if (requiredSet.has(key)) return;
    setVisibleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    const requiredKeys = normalizedColumns.filter((c) => c.required).map((c) => c.key);
    const mergedVisibleKeys = Array.from(new Set([...requiredKeys, ...visibleKeys]));
    onSave?.({ visibleKeys: mergedVisibleKeys, columnOrder: draftColumnOrder });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  const q = searchQuery.trim().toLowerCase();

  const orderedAndMatchedKeys = useMemo(() => {
    const base    = draftColumnOrder.length ? draftColumnOrder : allKeys;
    const baseSet = new Set(base);
    const fullOrder = [...base, ...allKeys.filter((k) => !baseSet.has(k))];
    if (!q) return fullOrder;
    const byKey = new Map(normalizedColumns.map((c) => [c.key, c]));
    return fullOrder.filter((k) => {
      const col = byKey.get(k);
      return col && String(col.label || "").toLowerCase().includes(q);
    });
  }, [draftColumnOrder, allKeys, normalizedColumns, q]);

  const handleDragEnd = ({ active, over }) => {
    if (!active?.id || !over?.id || q) return;
    const activeKey = String(active.id);
    const overKey   = String(over.id);
    if (activeKey === overKey) return;
    setDraftColumnOrder((prev) => {
      const oi = prev.indexOf(activeKey);
      const ni = prev.indexOf(overKey);
      if (oi < 0 || ni < 0) return prev;
      return arrayMove(prev, oi, ni);
    });
  };

  if (!open) return null;

  return createPortal(
    <div style={panelStyle}>
      <div
        className="backdrop-blur-2xl backdrop-saturate-150 rounded-[14px] overflow-hidden"
        style={{
          background: dark ? "rgba(10,14,28,0.96)" : "rgba(255,255,255,0.96)",
          border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.3)",
          boxShadow: dark
            ? "0 16px 40px rgba(0,0,0,0.34), 0 2px 8px rgba(0,0,0,0.12)"
            : "0 8px 32px rgba(80,60,200,0.18),0 2px 8px rgba(0,0,0,0.07)",
        }}
        role="dialog"
        aria-label={title}
      >
        {/* Header: selected count + select all */}
        <div
          className="pt-1.5 pb-1 px-3 flex items-center justify-between gap-2"
          style={{ borderBottom: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(241 245 249)" }}
        >
          <div className="text-[11px] font-semibold" style={{ color: dark ? "#a5b4fc" : "#94a3b8" }}>
            {selectedCount} selected
          </div>
          {optionalKeys.length > 0 && (
            <button
              type="button"
              onClick={allOptionalSelected ? clearOptional : selectAllOptional}
              className="h-6 px-2 text-[11px] font-semibold rounded-md transition-all"
              style={{
                color: dark ? "#e5e7eb" : "#475569",
                background: dark ? "rgba(255,255,255,0.06)" : "rgb(241 245 249)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(226 232 240)",
              }}
            >
              {allOptionalSelected ? "Clear" : "Select All"}
            </button>
          )}
        </div>

        {/* Search */}
        <div
          className="py-1.5 px-2"
          style={{ borderBottom: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(241 245 249)" }}
        >
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3"
              style={{ color: dark ? "#94a3b8" : "#94a3b8" }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 21l-6-6" /><circle cx="11" cy="11" r="7" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search columns…"
              className="w-full pl-7 pr-2.5 h-7 text-[11px] font-medium rounded-lg focus:outline-none focus:ring-2 placeholder:text-slate-400"
              style={{
                color: dark ? "#e5e7eb" : "#0f172a",
                background: dark ? "rgba(255,255,255,0.04)" : "rgb(248 250 252)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(226 232 240)",
                boxShadow: dark ? "none" : undefined,
              }}
              aria-label="Search columns"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[220px] overflow-y-auto py-1 px-1">
          {normalizedColumns.length ? (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
              <SortableContext items={orderedAndMatchedKeys} strategy={verticalListSortingStrategy}>
                {orderedAndMatchedKeys.map((key) => {
                  const col = normalizedColumns.find((c) => c.key === key);
                  if (!col) return null;
                  return (
                      <SortableColumnRow
                        key={col.key}
                        id={col.key}
                        label={col.label}
                        checked={isVisible(col.key)}
                        disabled={requiredSet.has(col.key)}
                        onToggle={toggleKey}
                        showDragHandle={!q && !requiredSet.has(col.key)}
                        dark={dark}
                      />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : null}

          {orderedAndMatchedKeys.length === 0 && (
            <p className="text-[11px] px-3 py-2" style={{ color: dark ? "#94a3b8" : "#94a3b8" }}>No columns found.</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-3 py-2"
          style={{
            borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(241 245 249)",
            background: dark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.6)",
          }}
        >
          <button type="button" onClick={() => onReset?.()}
            className="h-7 px-3 text-[11px] font-semibold rounded-lg transition-all"
            style={{
              color: dark ? "#e5e7eb" : "#475569",
              background: dark ? "rgba(255,255,255,0.06)" : "#fff",
              border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(226 232 240)",
            }}>
            Reset
          </button>
          <button type="button" onClick={onCancel}
            className="h-7 px-3 text-[11px] font-medium rounded-lg transition-all"
            style={{
              color: dark ? "#cbd5e1" : "#64748b",
              background: dark ? "rgba(255,255,255,0.06)" : "#fff",
              border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgb(226 232 240)",
            }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="h-7 px-3 text-[11px] font-medium text-white rounded-lg transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg,#5B4FE8,#7C6FF0)" }}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
