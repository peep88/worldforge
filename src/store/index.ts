// src/store/index.ts — Zustand global app store

import { create } from "zustand";
import type { World, Page, Category, Tag, ActiveModule } from "@/types";

interface AppStore {
  // ── Active context ──
  activeWorldId: string | null;
  activeWorld: World | null;
  activeModule: ActiveModule;
  activePage: Page | null;

  // ── Sidebar ──
  sidebarOpen: boolean;
  sidebarWidth: number;

  // ── Cached data (world-scoped) ──
  pages: Page[];
  categories: Category[];
  tags: Tag[];

  // ── Search ──
  searchQuery: string;
  searchOpen: boolean;

  // ── Actions ──
  setActiveWorld: (world: World | null) => void;
  setActiveModule: (module: ActiveModule) => void;
  setActivePage: (page: Page | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (w: number) => void;
  setPages: (pages: Page[]) => void;
  setCategories: (cats: Category[]) => void;
  setTags: (tags: Tag[]) => void;
  setSearchQuery: (q: string) => void;
  setSearchOpen: (open: boolean) => void;

  // Optimistic updates
  upsertPage: (page: Page) => void;
  removePage: (id: string) => void;
  upsertCategory: (cat: Category) => void;
  removeCategory: (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeWorldId: null,
  activeWorld: null,
  activeModule: "dashboard",
  activePage: null,

  sidebarOpen: true,
  sidebarWidth: 260,

  pages: [],
  categories: [],
  tags: [],

  searchQuery: "",
  searchOpen: false,

  setActiveWorld: (world) =>
    set({ activeWorld: world, activeWorldId: world?.id ?? null }),

  setActiveModule: (module) =>
    set({ activeModule: module, activePage: null }),

  setActivePage: (page) =>
    set({ activePage: page }),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  setSidebarWidth: (w) =>
    set({ sidebarWidth: Math.max(180, Math.min(400, w)) }),

  setPages: (pages) => set({ pages }),
  setCategories: (categories) => set({ categories }),
  setTags: (tags) => set({ tags }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ searchOpen: open }),

  upsertPage: (page) =>
    set((s) => ({
      pages: s.pages.find((p) => p.id === page.id)
        ? s.pages.map((p) => (p.id === page.id ? page : p))
        : [page, ...s.pages],
    })),

  removePage: (id) =>
    set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),

  upsertCategory: (cat) =>
    set((s) => ({
      categories: s.categories.find((c) => c.id === cat.id)
        ? s.categories.map((c) => (c.id === cat.id ? cat : c))
        : [...s.categories, cat],
    })),

  removeCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
}));
