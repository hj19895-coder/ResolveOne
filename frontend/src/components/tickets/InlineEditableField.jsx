import { useEffect, useMemo, useRef, useState } from "react";

import { useMasterData } from "../../hooks/Usemasterdata";
import api from "../../api/axios";

import EnterpriseAsyncSelect from "./EnterpriseAsyncSelect";


function clampToDisplay(value) {
  if (value === null || value === undefined) return "—";
  return String(value);
}

function padDueDateInputValue(dateStr) {
  // Backend PATCH expects `tat` as a date (controller converts to Date)
  // UI input is yyyy-MM-dd (date-only). We accept existing iso and map.
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function InlineEditIcon({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center w-7 h-7 rounded-xl border border-white/15 bg-white/30 backdrop-blur text-[#4318FF] opacity-0 group-hover:opacity-100 transition-opacity"
      title="Edit"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}

export function InlineEditableField({
  ticketId,
  label,
  readonlyValue,
  patchKey,
  valueKind = "text", // text | number | select | date | textarea
  patchValueFromInput,
  inputValueFromTicket,
  masterDataType,
  assignedUsers = null,
  onPatched,
  canEdit = true,
}) {
  const [mode, setMode] = useState("view");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const { options, loading: masterLoading } = useMasterData(masterDataType);

  const ticketValue = useMemo(() => {
    return inputValueFromTicket ? inputValueFromTicket(readonlyValue) : readonlyValue;
  }, [readonlyValue, inputValueFromTicket]);

  const displayText = useMemo(() => clampToDisplay(ticketValue), [ticketValue]);

  useEffect(() => {
    if (mode === "edit") {
      // init draft from current ticket value
      const base = inputValueFromTicket ? inputValueFromTicket(readonlyValue) : readonlyValue;
      setDraft(base === null || base === undefined ? "" : String(base));
      setError(null);

      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    }
  }, [mode]);

  const startEdit = () => {
    if (!canEdit) return;
    setMode("edit");
  };

  const cancel = () => {
    setMode("view");
    setDraft("");
    setError(null);
  };

  const hasChanges = () => {
    const original = String(ticketValue ?? "");
    return String(draft ?? "") !== original;
  };

  const buildPatchBody = () => {
    const patchVal = patchValueFromInput ? patchValueFromInput(draft) : draft;

    // When empty, we still send null/undefined if mapping indicates.
    // For MasterData + ids, empty should become null.
    const cleaned = patchVal === "" ? null : patchVal;

    return {
      [patchKey]: cleaned,
    };
  };

  const onSave = async () => {
    if (!canEdit || !ticketId) return;
    if (!hasChanges()) {
      cancel();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const patchBody = buildPatchBody();

      // Enforce partial update: this component sends only changed key.
      // Backend also handles history creation by comparing values.
      await api.patch(`/tickets/${ticketId}`, patchBody);

      const res = await api.get(`/tickets/${ticketId}`);
      onPatched?.(res.data);

      setMode("view");
      setDraft("");
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group">
      {mode === "view" && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#A3AED0" }}>
              {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900 break-words">{displayText}</div>
          </div>
          <InlineEditIcon onClick={startEdit} />
        </div>
      )}

      {mode === "edit" && (
        <div className="rounded-xl border border-white/20 bg-white/35 backdrop-blur px-4 py-3 shadow-[0_10px_30px_rgba(31,41,55,0.06)]">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#A3AED0" }}>
            {label}
          </div>

          <div className="mt-2">
            {valueKind === "textarea" && (
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/60 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#4318FF]/30"
                rows={4}
              />
            )}

            {valueKind === "date" && (
              <input
                ref={inputRef}
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/60 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#4318FF]/30"
              />
            )}

            {valueKind === "number" && (
              <input
                ref={inputRef}
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/60 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#4318FF]/30"
              />
            )}

            {valueKind === "select" && (
              <EnterpriseAsyncSelect
                label={label}
                placeholder={masterLoading ? "Loading…" : "Search…"}
                value={draft}
                disabled={masterLoading}
                getOptionLabel={(opt) => opt.value ?? opt.label ?? opt.name ?? String(opt.id)}
                getOptionValue={(opt) => opt.id}
                loadOptions={async () => options || []}
                onChange={(nextVal) => setDraft(nextVal ?? "")}
              />
            )}


            {valueKind === "text" && (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/60 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#4318FF]/30"
              />
            )}
          </div>

          {error && <div className="mt-2 text-xs font-semibold text-red-600">{error}</div>}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#4318FF 0%,#6c47ff 100%)", color: "#fff" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(67,24,255,0.25)", color: "#4318FF" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function dueDateInputValueFromTicket(ticketTat) {
  return padDueDateInputValue(ticketTat);
}

export function dueDatePatchValueFromInput(dateInput) {
  if (!dateInput) return null;
  // keep YYYY-MM-DD; backend controller converts new Date('YYYY-MM-DD')
  return dateInput;
}

