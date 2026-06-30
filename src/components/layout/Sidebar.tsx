// src/components/layout/Sidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Map as MapIcon, Clock, CalendarDays,
  FileText, Home, Plus, ChevronRight,
  Search, Globe, Folder, FolderOpen, Copy, ClipboardPaste, Scissors
} from "lucide-react";
import { useAppStore } from "@/store";
import { pagesDb, categoriesDb, tagsDb } from "@/lib/db";
import type { ActiveModule, Category, Page, PageType } from "@/types";

const NAV_ITEMS: { id: ActiveModule; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard", icon: <Home size={16} />, label: "Dashboard" },
  { id: "notes",     icon: <FileText size={16} />, label: "Notes" },
  { id: "wiki",      icon: <BookOpen size={16} />, label: "Wiki" },
  { id: "map",       icon: <MapIcon size={16} />, label: "Map" },
  { id: "timeline",  icon: <Clock size={16} />, label: "Timeline" },
  { id: "calendar",  icon: <CalendarDays size={16} />, label: "Calendar" },
];

type CategoryNode = Omit<Category, 'children'> & { children: CategoryNode[] };
type PageClipboard = { mode: 'copy' | 'move'; page: Page } | null;

export default function Sidebar() {
  const {
    activeWorld, activeModule, setActiveModule,
    pages, categories, setPages, setCategories, setTags,
    setSearchOpen, sidebarWidth,
  } = useAppStore();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ uncategorized: true });
  const [pageClipboard, setPageClipboard] = useState<PageClipboard>(null);

  useEffect(() => {
    if (!activeWorld) return;
    loadSidebarData();
  }, [activeWorld?.id]);

  useEffect(() => {
    setExpandedFolders((current) => {
      const next: Record<string, boolean> = { ...current, uncategorized: true };
      for (const category of categories) {
        if (next[category.id] === undefined) next[category.id] = true;
      }
      return next;
    });
  }, [categories]);

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

  async function createPage(type: PageType, categoryId: string | null = null) {
    if (!activeWorld) return;
    const id = await pagesDb.create({
      world_id: activeWorld.id,
      title: type === 'note' ? 'New Note' : 'New Page',
      type,
      category_id: categoryId,
    });
    const page = await pagesDb.get(id);
    if (page) {
      useAppStore.getState().upsertPage(page);
      useAppStore.getState().setActiveModule(type === 'note' ? 'notes' : 'wiki');
      useAppStore.getState().setActivePage(page);
      if (categoryId) setExpandedFolders((current) => ({ ...current, [categoryId]: true }));
      else setExpandedFolders((current) => ({ ...current, uncategorized: true }));
    }
  }

  async function createFolder(parentId: string | null = null) {
    if (!activeWorld) return;
    const folderName = prompt(parentId ? 'Subfolder name' : 'Folder name', 'New Folder')?.trim();
    if (!folderName) return;

    const siblingCount = categories.filter((category) => category.parent_id === parentId).length;
    const id = await categoriesDb.create({
      world_id: activeWorld.id,
      name: folderName,
      icon: 'folder',
      color: activeWorld.cover_color || '#c4933f',
      parent_id: parentId,
      sort_order: siblingCount,
    });
    const nextCategory: Category = {
      id,
      world_id: activeWorld.id,
      name: folderName,
      icon: 'folder',
      color: activeWorld.cover_color || '#c4933f',
      parent_id: parentId,
      sort_order: siblingCount,
    };
    useAppStore.getState().upsertCategory(nextCategory);
    setExpandedFolders((current) => ({
      ...current,
      [id]: true,
      ...(parentId ? { [parentId]: true } : {}),
    }));
  }


  async function pastePage(categoryId: string | null) {
    if (!pageClipboard) return;

    if (pageClipboard.mode === 'move') {
      const updatedPage = { ...pageClipboard.page, category_id: categoryId };
      await pagesDb.update(pageClipboard.page.id, { category_id: categoryId });
      useAppStore.getState().upsertPage(updatedPage);
      if (useAppStore.getState().activePage?.id === updatedPage.id) {
        useAppStore.getState().setActivePage(updatedPage);
      }
      setPageClipboard(null);
    } else {
      const source = pageClipboard.page;
      const id = await pagesDb.create({
        world_id: source.world_id,
        title: source.title + ' Copy',
        type: source.type,
        template_type: source.template_type,
        category_id: categoryId,
      });
      await pagesDb.update(id, {
        content_json: source.content_json,
        infobox_json: source.infobox_json,
        cover_image: source.cover_image,
        is_pinned: 0,
      });
      const copiedPage = await pagesDb.get(id);
      if (copiedPage) {
        useAppStore.getState().upsertPage(copiedPage);
        useAppStore.getState().setActiveModule(copiedPage.type === 'note' ? 'notes' : 'wiki');
        useAppStore.getState().setActivePage(copiedPage);
      }
    }

    if (categoryId) setExpandedFolders((current) => ({ ...current, [categoryId]: true }));
    else setExpandedFolders((current) => ({ ...current, uncategorized: true }));
  }

  const folderTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const pagesByCategory = useMemo(() => groupPagesByCategory(pages), [pages]);
  const uncategorizedPages = pagesByCategory.get(null) ?? [];
  const pinnedPages = pages.filter(p => p.is_pinned);

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: sidebarWidth,
        background: 'var(--forge-surface)',
        borderRight: '1px solid var(--forge-border)',
      }}
    >
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
          <span className="ml-auto text-xs opacity-50">Ctrl K</span>
        </button>
      </div>

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

      <div className="px-2 py-1">
        <div className="flex gap-1">
          <button
            onClick={() => createFolder(null)}
            className="forge-btn forge-btn-ghost flex-1 justify-center text-xs"
            title="New folder"
          >
            <Plus size={12} /> Folder
          </button>
          <button
            onClick={() => createPage('note')}
            className="forge-btn forge-btn-ghost flex-1 justify-center text-xs"
            title="New note"
          >
            <Plus size={12} /> Note
          </button>
          <button
            onClick={() => createPage('wiki')}
            className="forge-btn forge-btn-ghost flex-1 justify-center text-xs"
            title="New wiki page"
          >
            <Plus size={12} /> Wiki
          </button>
        </div>
      </div>

      {pinnedPages.length > 0 && (
        <div className="px-2 mt-2">
          <SectionLabel>Pinned</SectionLabel>
          {pinnedPages.map(page => (
            <PageItem key={page.id} page={page} clipboard={pageClipboard} setClipboard={setPageClipboard} />
          ))}
        </div>
      )}

      <div className="px-2 mt-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-1 mb-1">
          <SectionLabel>World Library</SectionLabel>
          <button
            onClick={() => createFolder(null)}
            className="forge-btn forge-btn-ghost p-1"
            title="New folder"
          >
            <Plus size={12} />
          </button>
        </div>

        {folderTree.map((category) => (
          <FolderNode
            key={category.id}
            category={category}
            depth={0}
            pagesByCategory={pagesByCategory}
            expandedFolders={expandedFolders}
            toggleFolder={(id) => setExpandedFolders((current) => ({ ...current, [id]: !current[id] }))}
            createFolder={createFolder}
            createPage={createPage}
            clipboard={pageClipboard}
            setClipboard={setPageClipboard}
            pastePage={pastePage}
          />
        ))}

        {(uncategorizedPages.length > 0 || pages.length === 0) && (
          <div className="mt-1">
            <FolderRow
              id="uncategorized"
              label="Uncategorized"
              depth={0}
              expanded={expandedFolders.uncategorized}
              color="var(--forge-subtle)"
              onToggle={() => setExpandedFolders((current) => ({ ...current, uncategorized: !current.uncategorized }))}
              onCreateFolder={() => createFolder(null)}
              onCreateNote={() => createPage('note')}
              onCreateWiki={() => createPage('wiki')}
              canPaste={!!pageClipboard}
              pasteMode={pageClipboard?.mode ?? null}
              onPaste={() => pastePage(null)}
            />
            {expandedFolders.uncategorized && (
              <div>
                {uncategorizedPages.map((page) => (
                  <PageItem key={page.id} page={page} depth={1} clipboard={pageClipboard} setClipboard={setPageClipboard} />
                ))}
                {pages.length === 0 && (
                  <p className="text-xs px-2 py-2" style={{ color: 'var(--forge-muted)' }}>
                    Create folders, notes, or wiki pages to start organizing this world.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function FolderNode({
  category,
  depth,
  pagesByCategory,
  expandedFolders,
  toggleFolder,
  createFolder,
  createPage,
  clipboard,
  setClipboard,
  pastePage,
}: {
  category: CategoryNode;
  depth: number;
  pagesByCategory: Map<string | null, Page[]>;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  createFolder: (parentId: string | null) => void;
  createPage: (type: PageType, categoryId: string | null) => void;
  clipboard: PageClipboard;
  setClipboard: React.Dispatch<React.SetStateAction<PageClipboard>>;
  pastePage: (categoryId: string | null) => void;
}) {
  const pages = pagesByCategory.get(category.id) ?? [];
  const expanded = expandedFolders[category.id] ?? true;

  return (
    <div className="mb-0.5">
      <FolderRow
        id={category.id}
        label={category.name}
        depth={depth}
        expanded={expanded}
        color={category.color}
        onToggle={() => toggleFolder(category.id)}
        onCreateFolder={() => createFolder(category.id)}
        onCreateNote={() => createPage('note', category.id)}
        onCreateWiki={() => createPage('wiki', category.id)}
        canPaste={!!clipboard}
        pasteMode={clipboard?.mode ?? null}
        onPaste={() => pastePage(category.id)}
      />
      {expanded && (
        <div>
          {category.children.map((child) => (
            <FolderNode
              key={child.id}
              category={child}
              depth={depth + 1}
              pagesByCategory={pagesByCategory}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              createFolder={createFolder}
              createPage={createPage}
              clipboard={clipboard}
              setClipboard={setClipboard}
              pastePage={pastePage}
            />
          ))}
          {pages.map((page) => (
            <PageItem key={page.id} page={page} depth={depth + 1} clipboard={clipboard} setClipboard={setClipboard} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderRow({
  label,
  depth,
  expanded,
  color,
  onToggle,
  onCreateFolder,
  onCreateNote,
  onCreateWiki,
  canPaste = false,
  pasteMode,
  onPaste,
}: {
  id?: string;
  label: string;
  depth: number;
  expanded: boolean;
  color: string;
  onToggle: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onCreateWiki: () => void;
  canPaste?: boolean;
  pasteMode?: 'copy' | 'move' | null;
  onPaste?: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-1 rounded px-1 py-1 text-xs"
      style={{ color: 'var(--forge-text)', paddingLeft: 4 + depth * 12 }}
    >
      <button
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        title={label}
      >
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform"
          style={{ color: 'var(--forge-subtle)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        <span style={{ color }}>
          {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        </span>
        <span className="truncate font-medium">{label}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton title="New subfolder" onClick={onCreateFolder}><Folder size={11} /></IconButton>
        <IconButton title="New note" onClick={onCreateNote}><FileText size={11} /></IconButton>
        <IconButton title="New wiki page" onClick={onCreateWiki}><BookOpen size={11} /></IconButton>
        {canPaste && onPaste && (
          <IconButton title={pasteMode === 'move' ? 'Paste moved page here' : 'Paste copied page here'} onClick={onPaste}>
            <ClipboardPaste size={11} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="rounded p-1"
      title={title}
      style={{ color: 'var(--forge-subtle)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--forge-muted)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function PageItem({
  page,
  depth = 0,
  clipboard,
  setClipboard,
}: {
  page: Page;
  depth?: number;
  clipboard: PageClipboard;
  setClipboard: React.Dispatch<React.SetStateAction<PageClipboard>>;
}) {
  const { activePage, setActivePage, setActiveModule } = useAppStore();
  const active = activePage?.id === page.id;
  const clipboardMode = clipboard?.page.id === page.id ? clipboard.mode : null;

  return (
    <div
      className="group flex items-center gap-1 rounded text-xs transition-colors mb-0.5"
      style={{
        color: active ? 'var(--forge-accent)' : 'var(--forge-text)',
        background: active ? 'var(--forge-muted)' : 'transparent',
        paddingLeft: 20 + depth * 12,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--forge-muted)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <button
        onClick={() => {
          setActiveModule(page.type === 'note' ? 'notes' : 'wiki');
          setActivePage(page);
        }}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left"
        title={page.title}
      >
        <span className="shrink-0" style={{ color: 'var(--forge-subtle)' }}>
          {page.type === 'note' ? <FileText size={12} /> : <BookOpen size={12} />}
        </span>
        <span className="truncate">{page.title}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton
          title={clipboardMode === 'move' ? 'Marked to move' : 'Move'}
          onClick={() => setClipboard({ mode: 'move', page })}
        >
          <Scissors size={11} />
        </IconButton>
        <IconButton
          title={clipboardMode === 'copy' ? 'Marked to copy' : 'Copy'}
          onClick={() => setClipboard({ mode: 'copy', page })}
        >
          <Copy size={11} />
        </IconButton>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ color: 'var(--forge-subtle)' }}
    >
      {children}
    </div>
  );
}

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] });
  }

  for (const category of categories) {
    const node = nodes.get(category.id)!;
    if (category.parent_id && nodes.has(category.parent_id)) {
      nodes.get(category.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: CategoryNode[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);

  return roots;
}

function groupPagesByCategory(pages: Page[]): Map<string | null, Page[]> {
  const grouped = new Map<string | null, Page[]>();
  for (const page of pages) {
    const key = page.category_id ?? null;
    const group = grouped.get(key) ?? [];
    group.push(page);
    grouped.set(key, group);
  }
  for (const group of grouped.values()) {
    group.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.title.localeCompare(b.title));
  }
  return grouped;
}
