// src/components/notes/NotesModule.tsx
import React, { useCallback, useRef } from "react";
import { Plus, Pin, PinOff, Trash2, FileText } from "lucide-react";
import { useAppStore } from "@/store";
import { pagesDb } from "@/lib/db";
import ForgeEditor from "@/components/shared/ForgeEditor";
import type { Page } from "@/types";

export default function NotesModule() {
  const { activeWorld, pages, activePage, setActivePage, upsertPage, removePage } = useAppStore();
  const notes = pages.filter(p => p.type === 'note');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  async function createNote() {
    if (!activeWorld) return;
    const id = await pagesDb.create({
      world_id: activeWorld.id,
      title: "New Note",
      type: "note",
    });
    const note = await pagesDb.get(id);
    if (note) {
      upsertPage(note);
      setActivePage(note);
    }
  }

  const handleContentChange = useCallback(async (content: string) => {
    if (!activePage) return;
    const updated = { ...activePage, content_json: content };
    upsertPage(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await pagesDb.update(activePage.id, { content_json: content });
    }, 800);
  }, [activePage]);

  const handleTitleChange = useCallback(async (title: string) => {
    if (!activePage) return;
    const updated = { ...activePage, title };
    upsertPage(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await pagesDb.update(activePage.id, { title });
    }, 800);
  }, [activePage]);

  async function togglePin(note: Page, e: React.MouseEvent) {
    e.stopPropagation();
    const pinned = note.is_pinned ? 0 : 1;
    await pagesDb.update(note.id, { is_pinned: pinned });
    upsertPage({ ...note, is_pinned: pinned });
  }

  async function deleteNote(note: Page, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${note.title}"?`)) return;
    await pagesDb.delete(note.id);
    removePage(note.id);
    if (activePage?.id === note.id) setActivePage(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Note list */}
      <div
        className="w-64 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--forge-surface)', borderRight: '1px solid var(--forge-border)' }}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--forge-border)' }}>
          <span className="forge-title text-sm font-semibold" style={{ color: 'var(--forge-text)' }}>
            Notes
          </span>
          <button onClick={createNote} className="forge-btn forge-btn-ghost p-1" title="New note">
            <Plus size={14} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {notes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--forge-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--forge-subtle)' }}>
                No notes yet.<br />Create one to begin.
              </p>
            </div>
          )}
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setActivePage(note)}
              className="group flex items-start gap-2 px-3 py-2 cursor-pointer"
              style={{
                background: activePage?.id === note.id ? 'var(--forge-muted)' : 'transparent',
                borderLeft: activePage?.id === note.id ? '2px solid var(--forge-accent)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (activePage?.id !== note.id)
                  (e.currentTarget as HTMLElement).style.background = 'var(--forge-elevated)';
              }}
              onMouseLeave={e => {
                if (activePage?.id !== note.id)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--forge-text)' }}>
                  {note.title}
                </div>
                <div className="text-xs" style={{ color: 'var(--forge-subtle)' }}>
                  {new Date(note.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 mt-0.5">
                <button onClick={e => togglePin(note, e)} title={note.is_pinned ? "Unpin" : "Pin"}>
                  {note.is_pinned
                    ? <PinOff size={11} style={{ color: 'var(--forge-accent)' }} />
                    : <Pin size={11} style={{ color: 'var(--forge-subtle)' }} />}
                </button>
                <button onClick={e => deleteNote(note, e)} title="Delete">
                  <Trash2 size={11} style={{ color: 'var(--forge-danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activePage ? (
          <>
            {/* Title */}
            <div className="px-8 pt-6 pb-2 shrink-0">
              <input
                className="w-full bg-transparent border-none outline-none forge-title text-2xl font-bold"
                style={{ color: 'var(--forge-text)', fontSize: '1.75rem' }}
                value={activePage.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Note title..."
              />
              <div className="text-xs mt-1" style={{ color: 'var(--forge-subtle)' }}>
                Last edited {new Date(activePage.updated_at).toLocaleString()}
              </div>
            </div>
            <div className="px-4 flex-1 overflow-hidden">
              <ForgeEditor
                key={activePage.id}
                content={activePage.content_json}
                onChange={handleContentChange}
                placeholder="Write your note..."
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--forge-muted)' }} />
              <p style={{ color: 'var(--forge-subtle)' }}>Select a note or create a new one</p>
              <button onClick={createNote} className="forge-btn forge-btn-primary mt-4">
                <Plus size={14} /> New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
