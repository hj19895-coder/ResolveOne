import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";


/**
 * Enterprise-style searchable async dropdown.
 *
 * Constraints:
 * - NO native <select>.
 * - Supports keyboard navigation.
 * - Accepts async loading via `loadOptions` callback.
 *
 * Notes:
 * - This implementation uses an accessible combobox pattern.
 * - It is intentionally lightweight (no react-select dependency).
 */

function normalizeString(v) {
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function EnterpriseAsyncSelect({
  label,
  placeholder = "Search...",
  value,
  onChange,
  loadOptions,
  getOptionLabel,
  getOptionValue,
  disabled = false,
  required = false,
  searchable = true,
  maxMenuHeight = 240,
  compact = false,
}) {

  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState(null);

  const selectedOption = useMemo(() => {
    if (!options.length) return null;
    return options.find((o) => getOptionValue(o) === value) || null;
  }, [options, value, getOptionValue]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = normalizeString(query);
    return options.filter((o) => normalizeString(getOptionLabel(o)).includes(q));
  }, [options, query, searchable, getOptionLabel]);

  const load = async () => {
    if (!loadOptions || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loadOptions(query);
      setOptions(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load options");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const rect = inputRef.current?.getBoundingClientRect?.();
    if (rect) {
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
        maxHeight: maxMenuHeight,
      });
    }

    // load immediately when opening
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  useEffect(() => {
    if (!open) return;

    const onReposition = () => {
      const rect = inputRef.current?.getBoundingClientRect?.();
      if (rect) {
        setMenuStyle({
          position: "fixed",
          left: rect.left,
          top: rect.bottom,
          width: rect.width,
          maxHeight: maxMenuHeight,
        });
      }
    };

    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);

    // debounce load
    const t = setTimeout(() => {
      load();
    }, 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);


  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open, filteredOptions.length]);

  const menuRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (isMenuInteractingRef.current) {
        // Ignore this mousedown; it belongs to the portal menu interaction.
        return;
      }

      const rootEl = rootRef.current;
      const menuEl = menuRef.current;
      const t = e.target;

      if (rootEl && rootEl.contains(t)) return;
      if (menuEl && menuEl.contains(t)) return;

      setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);


  const commitSelection = (opt) => {
    const nextVal = getOptionValue(opt);
    // Fire onChange immediately; parent decides when/if to patch and close.
    onChange?.(nextVal);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  // Prevent portal menu interaction from being treated as an outside click.
  const isMenuInteractingRef = useRef(false);

  useEffect(() => {
    if (!open) isMenuInteractingRef.current = false;
  }, [open]);

  // Clear the interaction guard shortly after selection starts.
  useEffect(() => {
    if (!open) return;
    isMenuInteractingRef.current = false;
  }, [open]);

  const onKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const opt = filteredOptions[activeIndex];
      if (opt) commitSelection(opt);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => clamp(i + 1, 0, Math.max(0, filteredOptions.length - 1)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => clamp(i - 1, 0, Math.max(0, filteredOptions.length - 1)));
      return;
    }

    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
  };

  const displayValue = useMemo(() => {
    if (!open) {
      if (selectedOption) return getOptionLabel(selectedOption);
      return "";
    }
    return query;
  }, [open, selectedOption, query, getOptionLabel]);

  return (
    <div ref={rootRef} className={compact ? "" : "space-y-2"}>

      {label && (
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#A3AED0" }}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </div>
      )}

      <div
        className={`relative rounded-xl border border-white/15 bg-white/60 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#4318FF]/30 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <input

          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={open ? placeholder : placeholder}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={
            compact
              ? "w-full rounded-md bg-transparent px-2 py-1 text-xs font-semibold text-gray-900 outline-none"
              : "w-full rounded-xl bg-transparent px-3 py-2 text-sm font-semibold text-gray-900 outline-none"
          }

          aria-expanded={open}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {open &&
          createPortal(
            (
              <div
                ref={menuRef}
                className={
                  compact
                    ? "rounded-md border border-white/20 bg-white/95 backdrop-blur shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden"
                    : "absolute left-0 right-0 mt-2 rounded-xl border border-white/20 bg-white/95 backdrop-blur shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden"
                }

                style={
                  compact
                    ? {
                        ...(menuStyle ?? { maxHeight: maxMenuHeight }),
                        zIndex: 99999,
                        position: "fixed",
                      }
                    : { maxHeight: maxMenuHeight, zIndex: 99999 }
                }
                role="listbox"
                onMouseDown={(e) => {
                  isMenuInteractingRef.current = true;
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  isMenuInteractingRef.current = true;
                  e.stopPropagation();
                }}
              >
                {loading ? (
                  <div
                    className={
                      compact
                        ? "px-2 py-2 text-xs font-semibold text-gray-600"
                        : "px-3 py-2 text-sm font-semibold text-gray-600"
                    }
                  >
                    Loading…
                  </div>
                ) : error ? (
                  <div
                    className={
                      compact
                        ? "px-2 py-2 text-xs font-semibold text-red-600"
                        : "px-3 py-2 text-sm font-semibold text-red-600"
                    }
                  >
                    {error}
                  </div>
                ) : filteredOptions.length ? (
                  <div className="overflow-auto">
                    {filteredOptions.map((opt, idx) => {
                      const selected = getOptionValue(opt) === value;
                      const active = idx === activeIndex;
                      return (
                        <button

                          key={String(getOptionValue(opt))}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(e) => {
                            isMenuInteractingRef.current = true;
                            e.stopPropagation();
                          }}
                          onPointerDown={(e) => {
                            isMenuInteractingRef.current = true;
                            e.stopPropagation();
                          }}
                          onClick={() => commitSelection(opt)}
                          style={{
                            fontSize: 12,
                            minHeight: 26,
                            paddingTop: 4,
                            paddingBottom: 4,
                            paddingLeft: compact ? 10 : 12,
                            paddingRight: compact ? 10 : 12,
                            width: "100%",
                            backgroundColor: active
                              ? "#f5f7ff"
                              : selected
                                ? "#eef2ff"
                                : "#ffffff",
                            color: "#111827",

                            cursor: "pointer",
                            textAlign: "left",
                            fontWeight: 700,
                            border: "none",
                          }}
                          className={`w-full text-left transition-all ${
                            compact ? "text-xs" : "text-sm"
                          }`}
                        >
                          {getOptionLabel(opt)}
                        </button>

                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={
                      compact
                        ? "px-2 py-2 text-xs font-semibold text-gray-500"
                        : "px-3 py-2 text-sm font-semibold text-gray-500"
                    }
                  >
                    No results
                  </div>
                )}
              </div>
            ),
            document.body
          )}
      </div>
    </div>
  );
}

