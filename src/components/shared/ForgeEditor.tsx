// src/components/shared/ForgeEditor.tsx
// TipTap editor with [[WikiLink]] support, mentions, and full formatting

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { useAppStore } from "@/store";
import { pagesDb } from "@/lib/db";
import type { Page } from "@/types";

// ── Toolbar ──
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Undo, Redo
} from "lucide-react";

interface Props {
  content: string; // TipTap JSON string
  onChange: (json: string) => void;
  placeholder?: string;
  onLinksChange?: (pageIds: string[]) => void;
}

export default function ForgeEditor({ content, onChange, placeholder, onLinksChange }: Props) {
  const { pages, activeWorld } = useAppStore();
  const onLinksRef = useRef(onLinksChange);
  onLinksRef.current = onLinksChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Typography,
      Placeholder.configure({
        placeholder: placeholder ?? "Begin writing...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "wiki-link" },
      }),
      // Wiki link mention — [[PageTitle]] syntax
      Mention.configure({
        HTMLAttributes: { class: "wiki-link" },
        renderLabel({ node }) {
          return `[[${node.attrs.label ?? node.attrs.id}]]`;
        },
        suggestion: {
          char: "[[",
          allowSpaces: true,
          items: async ({ query }) => {
            if (!activeWorld) return [];
            if (query.length < 1) return pages.slice(0, 10);
            return pages
              .filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 10);
          },
          render: () => {
            let component: ReactRenderer;
            let popup: Instance[];

            return {
              onStart(props) {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });
                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate(props) {
                component.updateProps(props);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },
              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup[0].hide();
                  return true;
                }
                return (component.ref as any)?.onKeyDown(props) ?? false;
              },
              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      onChange(json);

      // Extract wiki links (mention nodes)
      const doc = editor.getJSON();
      const mentionIds: string[] = [];
      function walk(node: any) {
        if (node.type === "mention" && node.attrs?.id) mentionIds.push(node.attrs.id);
        node.content?.forEach(walk);
      }
      walk(doc);
      onLinksRef.current?.(mentionIds);
    },
  });

  // Sync external content changes (e.g. switching pages)
  useEffect(() => {
    if (!editor || !content) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== content) {
      editor.commands.setContent(JSON.parse(content), false);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-3 py-1.5 shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--forge-border)', background: 'var(--forge-surface)' }}
      >
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <Code size={13} />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
          <Heading1 size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
          <Heading2 size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3">
          <Heading3 size={13} />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus size={13} />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={13} />
        </ToolBtn>
        <div className="ml-auto text-xs" style={{ color: 'var(--forge-muted)' }}>
          Type [[ to link a page
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

// ── Mention dropdown list ──
import { forwardRef, useImperativeHandle, useState as useS } from "react";
import { FileText, BookOpen } from "lucide-react";

const MentionList = forwardRef((props: any, ref) => {
  const [selected, setSelected] = useS(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelected(s => Math.max(0, s - 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected(s => Math.min(props.items.length - 1, s + 1));
        return true;
      }
      if (event.key === "Enter") {
        if (props.items[selected]) selectItem(selected);
        return true;
      }
      return false;
    },
  }));

  function selectItem(idx: number) {
    const item: Page = props.items[idx];
    if (item) {
      props.command({ id: item.id, label: item.title });
    }
  }

  if (!props.items.length) return null;

  return (
    <div className="mention-dropdown">
      {props.items.map((item: Page, i: number) => (
        <button
          key={item.id}
          onClick={() => selectItem(i)}
          className={`mention-item w-full ${i === selected ? "selected" : ""}`}
        >
          {item.type === 'note' ? <FileText size={12} /> : <BookOpen size={12} />}
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
});

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors"
      style={{
        background: active ? 'var(--forge-muted)' : 'transparent',
        color: active ? 'var(--forge-accent)' : 'var(--forge-subtle)',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--forge-muted)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <div className="w-px h-4 mx-1" style={{ background: 'var(--forge-border)' }} />
  );
}
