// src/components/layout/Sidebar.tsx
import React, { useEffect } from "react";
import {
  BookOpen, Map, Clock, CalendarDays,
  FileText, Home, Plus, ChevronRight,
  Search, Settings, Globe
} from "lucide-react";
import { useAppStore } from "@/store";
import { pagesDb, categoriesDb, tagsDb } from "@/lib/db";
import type { ActiveModule } from "@/types";

const NAV_ITEMS: { id: ActiveModule; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard", icon: <Home size={16} />, label: "Dashboard" },
  { id: "notes",     icon: <FileText size={16} />, label: "Notes" },
  { id: "wiki",      icon: <BookOpen size={16} />, label: "Wiki" },
  { id: "map",       icon: <Map size={16} />, label: "Map" },
  { id: "timeline",  icon: <Clock size={16} />, label: "Timeline" },
  { id: "calendar",  icon: <CalendarDays size={16} />, label: "Calendar" },
];

export default function Sidebar() {
  const {
    activeWorld, activeModule, setActiveModule,
    pages, categories, setPages, setCategories, setTags,
    setSearchOpen, sidebarWidth,
  } = useAppStore();

  useEffect(() => {
    if (!activeWorld) return;
    loadSidebarData();
  }, [activeWorld?.id]);

  async function loadSidebarData() {
    if (!activeWorld) return;
    const [pgs, cats, tgs] = await Promise.all([
      pagesDb.getAll(activeWorld.id),
      categoriesDb.getAll(activeWorld.id),
      tagsDb.getAll(activeWorld.id),
    ]);
    setPages(pgs);
    setCategories(cats);
    setTags(tgs);
  }

  async function createPage(type: 'note' | 'wiki') {
    if (!activeWorld) return;
    const id = await pagesDb.create({
      world_id: activeWorld.id,
      title: type === 'note' ? 'New Note' : 'New Page',
      type,
    });
    const page = await pagesDb.get(id);
    if (page) {
      useAppStore.getState().upsertPage(page);
      useAppStore.getState().setActivePage(page);
      useAppStore.getState().setActiveModule(type === 'note' ? 'notes' : 'wiki');
    }
  }

  const pinnedPages = pages.filter(p => p.is_pinned);
  const recentPages = pages.slice(0, 5);

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: sidebarWidth,
        background: 'var(--forge-surface)',
        borderRight: '1px solid var(--forge-border)',
      }}
    >
      {/* World name header */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--forge-border)' }}>
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: 'var(--forge-accent)' }} />
          <span
            className="forge-title font-semibold text-sm truncate"
            style={{ color: 'var(--forge-accent)' }}
          >
            {activeWorld?.name ?? 'No World'}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-sm"
          style={{
            background: 'var(--forge-bg)',
            border: '1px solid var(--forge-border)',
            color: 'var(--forge-subtle)',
          }}
        >
          <Search size={13} />
          <span>Search pages...</span>
          <span className="ml-auto text-xs opacity-50">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium mb-0.5 transition-colors"
            style={{
              background: activeModule === item.id ? 'var(--forge-muted)' : 'transparent',
              color: activeModule === item.id ? 'var(--forge-accent)' : 'var(--forge-subtle)',
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mx-2 my-1 border-t" style={{ borderColor: 'var(--forge-border)' }} />

      {/* Quick create */}
      <div className="px-2 py-1">
        <div className="flex gap-1">
          <button
            onClick={() => createPage('note')}
            className="forge-btn forge-btn-ghost flex-1 justify-center text-xs"
          >
            <Plus size={12} /> Note
          </button>
          <button
            onClick={() => createPage('wiki')}
            className="forge-btn forge-btn-ghost flex-1 justify-center text-xs"
          >
            <Plus size={12} /> Wiki
          </button>
        </div>
      </div>

      {/* Pinned pages */}
      {pinnedPages.length > 0 && (
        <div className="px-2 mt-2">
          <div className="text-xs font-semibold uppercase tracking-wider px-1 mb-1"
               style={{ color: 'var(--forge-subtle)' }}>
            Pinned
          </div>
          {pinnedPages.map(page => (
            <PageItem key={page.id} page={page} />
          ))}
        </div>
      )}

      {/* Recent pages */}
      <div className="px-2 mt-2 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-wider px-1 mb-1"
             style={{ color: 'var(--forge-subtle)' }}>
          Recent
        </div>
        {recentPages.map(page => (
          <PageItem key={page.id} page={page} />
        ))}
        {pages.length === 0 && (
          <p className="text-xs px-1 py-2" style={{ color: 'var(--forge-muted)' }}>
            No pages yet. Create a note or wiki page to get started.
          </p>
        )}
      </div>
    </aside>
  );
}

function PageItem({ page }: { page: import("@/types").Page }) {
  const { setActivePage, setActiveModule } = useAppStore();

  return (
    <button
      onClick={() => {
        setActivePage(page);
        setActiveModule(page.type === 'note' ? 'notes' : 'wiki');
      }}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-opacity-10 transition-colors mb-0.5"
      style={{ color: 'var(--forge-text)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--forge-muted)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: 'var(--forge-subtle)' }}>
        {page.type === 'note' ? <FileText size={12} /> : <BookOpen size={12} />}
      </span>
      <span className="truncate">{page.title}</span>
    </button>
  );
}
