import React, { useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// Contrast-safety pass
//
// We do NOT strip color/background/font-family anymore — pasted content
// should render exactly as authored. The only exception: if an element's
// resolved text color is effectively invisible against its resolved
// background (the classic "black text, no explicit background, viewed on a
// dark panel" case from pasted emails), we nudge just that element's color
// to something readable. Everything else is left untouched.
// ---------------------------------------------------------------------------

const MIN_CONTRAST_RATIO = 2; // below this, text is treated as unreadable, not just "low contrast"

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const m = colorStr.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
  const [r, g, b, a = 1] = parts;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  if (a === 0) return null; // fully transparent — doesn't count as a real background
  return { r, g, b };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(rgbA, rgbB) {
  const l1 = relativeLuminance(rgbA);
  const l2 = relativeLuminance(rgbB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Walks up from `el` (within container) to find the nearest element that
// actually paints a background. Falls back to the page background behind
// the whole container if nothing inside sets one.
function findEffectiveBackground(el, container, fallbackRgb) {
  let node = el;
  while (node) {
    const bg = parseRgb(getComputedStyle(node).backgroundColor);
    if (bg) return bg;
    if (node === container) break;
    node = node.parentElement;
  }
  return fallbackRgb;
}

function fixInvisibleTextColors(container, pageBackgroundHex, readableTextHex) {
  if (!container) return;
  const pageBg = hexToRgb(pageBackgroundHex);
  const elements = [container, ...container.querySelectorAll("*")];

  elements.forEach((el) => {
    const style = getComputedStyle(el);
    const textColor = parseRgb(style.color);
    if (!textColor) return;

    // Only judge elements that actually contain their own direct text,
    // to avoid needlessly rewriting purely structural wrapper colors.
    const hasOwnText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
    );
    if (!hasOwnText) return;

    const bg = findEffectiveBackground(el, container, pageBg);
    const ratio = contrastRatio(textColor, bg);

    if (ratio < MIN_CONTRAST_RATIO) {
      el.style.setProperty("color", readableTextHex, "important");
    }
  });
}

export default function TicketHtmlRenderer({
  html,
  pageBackground = "#FFFFFF", // the actual color this content will sit on
  readableTextColor = "#0F172A", // fallback color used only when text would otherwise be invisible
}) {
  const containerRef = useRef(null);

  const sanitized = useMemo(() => {
    const raw = html ?? "<p>No description provided.</p>";

    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "caption",
        "div", "span", "p", "br", "hr",
        "b", "strong", "i", "em", "u", "s", "strike",
        "ul", "ol", "li", "a", "img", "pre", "code",
        "font", // legacy email HTML: <font color="" face="">
      ],
      ALLOWED_ATTR: [
        "style", "class", "colspan", "rowspan", "align", "valign",
        "width", "height", "src", "href", "target", "alt", "title",
        "color", "face",
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/)/i,
    });
  }, [html]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Wait a frame so computed styles reflect the freshly-injected HTML.
    const id = requestAnimationFrame(() => {
      fixInvisibleTextColors(containerRef.current, pageBackground, readableTextColor);
    });
    return () => cancelAnimationFrame(id);
  }, [sanitized, pageBackground, readableTextColor]);

  return (
    <div
      ref={containerRef}
      className="ticket-html-content"
      style={{ lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}