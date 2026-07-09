import React, { useEffect } from "react";
import "./HtmlDescriptionEditor.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader as BaseTableHeader } from "@tiptap/extension-table-header";
import { TableCell as BaseTableCell } from "@tiptap/extension-table-cell";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Table as TableIcon, Undo, Redo,
} from "lucide-react";

// Excel/pasted-table cells carry their color as inline style="background-color:..."
// The base Tiptap table extensions don't declare that attribute, so ProseMirror
// silently drops it on paste. Extending with a `backgroundColor` attribute makes
// it survive both parseHTML (paste) and renderHTML (getHTML() output/save).
const TableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor || element.getAttribute("bgcolor") || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
    };
  },
});

const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor || element.getAttribute("bgcolor") || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
    };
  },
});




function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // don't steal focus from the editor selection
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="tiptap-toolbar-btn"
      data-active={active ? "true" : "false"}
    >
      {children}
    </button>
  );
}

export default function HtmlDescriptionEditor({
  value,
  onChange,
  dark = false,
  placeholder = "Describe the issue...",
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap" },
      transformPastedHTML(html) {
        const div = document.createElement("div");
        div.innerHTML = html;

        div.querySelectorAll("td, th, table, col").forEach((el) => {
          el.removeAttribute("width");
          el.removeAttribute("align");
          if (el.style) {
            el.style.removeProperty("width");
            el.style.removeProperty("text-align");
          }
        });

        return div.innerHTML;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep in sync when the parent resets the form (e.g. "Reset Form" button)
  useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();
    const incoming = value || "";

    // Prevent infinite update loop
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="tiptap-wrapper" data-theme={dark ? "dark" : "light"}>
      <div className="tiptap-toolbar">
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="tiptap-toolbar-divider" />
        <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="tiptap-toolbar-divider" />
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Insert table" onClick={insertTable}>
          <TableIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <span className="tiptap-toolbar-divider" />
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}