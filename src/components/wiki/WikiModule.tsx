// src/components/wiki/WikiModule.tsx
import { useState, useCallback, useRef } from "react";
import {
  Plus, BookOpen, Users, MapPin, Shield, Package,
  Link2, Trash2, ChevronRight, ArrowLeft
} from "lucide-react";
import { useAppStore } from "@/store";
import { pagesDb } from "@/lib/db";
import ForgeEditor from "@/components/shared/ForgeEditor";
import type { Page, TemplateType } from "@/types";

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  character: <Users size={14} />,
  location:  <MapPin size={14} />,
  faction:   <Shield size={14} />,
  item:      <Package size={14} />,
  event:     <Link2 size={14} />,
};

const TEMPLATES: { type: TemplateType; label: string }[] = [
  { type: 'character', label: 'Character' },
  { type: 'location',  label: 'Location' },
  { type: 'faction',   label: 'Faction' },
  { type: 'item',      label: 'Item' },
  { type: 'event',     label: 'Event' },
  { type: null,        label: 'Blank Page' },
];

export default function WikiModule() {
  const { activeWorld, pages, activePage, setActivePage, upsertPage, removePage, categories } = useAppStore();
  const wikiPages = pages.filter(p => p.type === 'wiki');
  const [showNew, setShowNew] = useState(false);
  const [backlinks, setBacklinks] = useState<Page[]>([]);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const grouped = groupByCategory(wikiPages, categories);

  async function createPage(template: TemplateType, title: string) {
    if (!activeWorld) return;
    const id = await pagesDb.create({
      world_id: activeWorld.id,
      title: title || template || 'New Page',
      type: 'wiki',
      template_type: template,
    });
    const page = await pagesDb.get(id);
    if (page) {
      upsertPage(page);
      setActivePage(page);
      setShowNew(false);
      loadBacklinks(id);
    }
  }

  async function loadBacklinks(pageId: string) {
    const links = await pagesDb.getBacklinks(pageId);
    setBacklinks(links);
  }

  const openPage = async (page: Page) => {
    setActivePage(page);
    await loadBacklinks(page.id);
  };

  const handleContentChange = useCallback(async (content: string) => {
    if (!activePage) return;
    upsertPage({ ...activePage, content_json: content });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await pagesDb.update(activePage.id, { content_json: content });
    }, 800);
  }, [activePage]);

  const handleLinksChange = useCallback(async (pageIds: string[]) => {
    if (!activePage) return;
    await pagesDb.syncLinks(activePage.id, pageIds);
  }, [activePage]);

  const handleTitleChange = useCallback(async (title: string) => {
    if (!activePage) return;
    upsertPage({ ...activePage, title });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await pagesDb.update(activePage.id, { title });
    }, 800);
  }, [activePage]);

  async function deletePage(page: Page) {
    if (!confirm(`Delete "${page.title}"?`)) return;
    await pagesDb.delete(page.id);
    removePage(page.id);
    setActivePage(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Page tree */}
      <div
        className="w-64 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--forge-surface)', borderRight: '1px solid var(--forge-border)' }}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--forge-border)' }}>
          <span className="forge-title text-sm font-semibold" style={{ color: 'var(--forge-text)' }}>Wiki</span>
          <button onClick={() => setShowNew(true)} className="forge-btn forge-btn-ghost p-1" title="New page">
            <Plus size={14} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {Object.entries(grouped).map(([catName, catPages]) => (
            <div key={catName} className="mb-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <ChevronRight size={11} style={{ color: 'var(--forge-subtle)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forge-subtle)' }}>
                  {catName}
                </span>
              </div>
              {catPages.map(page => (
                <WikiPageItem
                  key={page.id}
                  page={page}
                  active={activePage?.id === page.id}
                  onClick={() => openPage(page)}
                />
              ))}
            </div>
          ))}

          {wikiPages.length === 0 && (
            <div className="px-4 py-6 text-center">
              <BookOpen size={24} className="mx-auto mb-2" style={{ color: 'var(--forge-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--forge-subtle)' }}>
                No wiki pages yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editor / New page panel */}
      <div className="flex-1 flex overflow-hidden">
        {showNew ? (
          <NewPagePanel onCancel={() => setShowNew(false)} onCreate={createPage} />
        ) : activePage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Wiki header */}
            <div
              className="flex items-center justify-between px-6 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--forge-border)' }}
            >
              <div className="flex items-center gap-2 flex-1">
                {activePage.template_type && (
                  <span style={{ color: 'var(--forge-accent)' }}>
                    {TEMPLATE_ICONS[activePage.template_type]}
                  </span>
                )}
                <input
                  className="bg-transparent border-none outline-none forge-title font-bold flex-1"
                  style={{ color: 'var(--forge-text)', fontSize: '1.25rem' }}
                  value={activePage.title}
                  onChange={e => handleTitleChange(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBacklinks(!showBacklinks)}
                  className="forge-btn forge-btn-ghost text-xs"
                  style={{ color: backlinks.length > 0 ? 'var(--forge-accent)' : 'var(--forge-subtle)' }}
                >
                  <Link2 size={12} /> {backlinks.length} links
                </button>
                <button
                  onClick={() => deletePage(activePage)}
                  className="forge-btn forge-btn-ghost p-1.5"
                >
                  <Trash2 size={13} style={{ color: 'var(--forge-danger)' }} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <ForgeEditor
                  key={activePage.id}
                  content={activePage.content_json}
                  onChange={handleContentChange}
                  onLinksChange={handleLinksChange}
                  placeholder="Write the lore..."
                />
              </div>

              {/* Backlinks panel */}
              {showBacklinks && (
                <div
                  className="w-56 shrink-0 overflow-y-auto p-3"
                  style={{ borderLeft: '1px solid var(--forge-border)', background: 'var(--forge-surface)' }}
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--forge-subtle)' }}>
                    Linked from
                  </h3>
                  {backlinks.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>No pages link here yet.</p>
                  ) : backlinks.map(link => (
                    <button
                      key={link.id}
                      onClick={() => openPage(link)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded mb-1 hover:bg-opacity-50"
                      style={{ color: 'var(--forge-accent)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--forge-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      ← {link.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--forge-muted)' }} />
              <p style={{ color: 'var(--forge-subtle)' }}>Select a page or create a new one</p>
              <button onClick={() => setShowNew(true)} className="forge-btn forge-btn-primary mt-4">
                <Plus size={14} /> New Wiki Page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──
function WikiPageItem({ page, active, onClick }: { page: Page; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-1.5 text-left text-xs transition-colors"
      style={{
        background: active ? 'var(--forge-muted)' : 'transparent',
        borderLeft: active ? '2px solid var(--forge-accent)' : '2px solid transparent',
        color: active ? 'var(--forge-accent)' : 'var(--forge-text)',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget.style.background = 'var(--forge-elevated)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'; }}
    >
      {page.template_type && <span style={{ color: 'var(--forge-subtle)' }}>{TEMPLATE_ICONS[page.template_type]}</span>}
      <span className="truncate">{page.title}</span>
    </button>
  );
}

function NewPagePanel({
  onCancel, onCreate
}: {
  onCancel: () => void;
  onCreate: (type: TemplateType, title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<TemplateType>(null);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={onCancel} className="forge-btn forge-btn-ghost p-1">
            <ArrowLeft size={14} />
          </button>
          <h2 className="forge-title font-semibold" style={{ color: 'var(--forge-text)' }}>
            New Wiki Page
          </h2>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--forge-subtle)' }}>
            Page Title
          </label>
          <input
            className="forge-input"
            placeholder="e.g. Elandria Moonwhisper"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--forge-subtle)' }}>
            Template (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={String(t.type)}
                onClick={() => setTemplate(t.type)}
                className="flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors"
                style={{
                  background: template === t.type ? 'var(--forge-muted)' : 'transparent',
                  borderColor: template === t.type ? 'var(--forge-accent)' : 'var(--forge-border)',
                  color: template === t.type ? 'var(--forge-accent)' : 'var(--forge-text)',
                }}
              >
                {t.type ? TEMPLATE_ICONS[t.type] : <BookOpen size={14} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onCreate(template, title)}
            disabled={!title.trim()}
            className="forge-btn forge-btn-primary flex-1 justify-center"
          >
            Create Page
          </button>
          <button onClick={onCancel} className="forge-btn forge-btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function groupByCategory(pages: Page[], categories: import("@/types").Category[]) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const groups: Record<string, Page[]> = { Uncategorized: [] };
  for (const page of pages) {
    const cat = page.category_id ? (catMap[page.category_id] ?? 'Uncategorized') : 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(page);
  }
  return groups;
}

function useState<T>(initial: T): [T, (v: T) => void] {
  const s = require("react").useState(initial);
  return s;
}
