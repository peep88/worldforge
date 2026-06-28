# 🌍 WorldForge

A fully offline, desktop-first worldbuilding application built with **Tauri + React + SQLite**.  
No account needed. Your data lives on your machine.

---

## Features

| Module | What it does |
|---|---|
| 📝 **Notes** | Quick rich-text notes with auto-save and pinning |
| 📖 **Wiki** | Structured wiki pages with templates (Character, Location, Faction, Item, Event) |
| 🔗 **Wiki Links** | `[[PageTitle]]` syntax links pages together with backlink tracking |
| 🗂️ **Categories & Tags** | Hierarchical categories + freeform tags for organizing everything |
| 🗺️ **Map Editor** | Multi-layer canvas drawing tool (freehand, shapes, text) with zoom/pan |
| ⏱️ **Timeline** | Visual event timeline with fantasy date support and category filters |
| 📅 **Calendar** | Fully customizable calendar: custom months, weekdays, eras, leap year rules |

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Desktop shell:** Tauri 2 (Rust)
- **Database:** SQLite via `tauri-plugin-sql`
- **Rich text editor:** TipTap 2 (with wiki-link mention extension)
- **Map canvas:** React Konva (Konva.js)
- **State management:** Zustand
- **Typography:** Cinzel (titles) + Inter (body) — fantasy parchment aesthetic

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| Rust | stable | https://rustup.rs |
| Tauri CLI | v2 | `cargo install tauri-cli` |
| System deps (Linux) | — | See below |

### Linux system dependencies

```bash
sudo apt install \
  libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

### macOS
Xcode Command Line Tools required:
```bash
xcode-select --install
```

### Windows
Visual Studio Build Tools with C++ workload required.

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/yourname/worldforge
cd worldforge

# 2. Install JS dependencies
npm install

# 3. Run in development (opens desktop window)
npm run tauri:dev

# 4. Build distributable app
npm run tauri:build
```

The SQLite database (`worldforge.db`) is automatically created on first launch in your OS app data directory:
- **Linux:** `~/.local/share/worldforge/`
- **macOS:** `~/Library/Application Support/worldforge/`
- **Windows:** `%APPDATA%\worldforge\`

---

## Project Structure

```
worldforge/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/               # App shell, sidebar, topbar, dashboard
│   │   ├── notes/                # Notes module
│   │   ├── wiki/                 # Wiki module + backlinks
│   │   ├── map/                  # Konva canvas map editor
│   │   ├── timeline/             # Timeline + event management
│   │   ├── calendar/             # Calendar builder + viewer
│   │   └── shared/               # ForgeEditor (TipTap), shared UI
│   ├── lib/
│   │   └── db.ts                 # All SQLite queries (worldsDb, pagesDb, etc.)
│   ├── store/
│   │   └── index.ts              # Zustand global state
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces for all data
│   └── styles/
│       └── globals.css           # Tailwind + forge design system
│
├── src-tauri/                    # Rust/Tauri backend
│   ├── src/main.rs               # Tauri app bootstrap
│   ├── migrations/
│   │   └── 001_initial.sql       # Full DB schema + seed data
│   └── tauri.conf.json           # Window config, plugin config
│
├── tailwind.config.js            # Forge color tokens
└── vite.config.ts                # Vite + Tauri dev server
```

---

## Data Model Overview

```
World
 ├─ Calendar (1 per world — custom month/weekday/era schema)
 ├─ Categories (hierarchical tree)
 ├─ Tags (freeform, colored)
 ├─ Pages (Notes + Wiki unified)
 │   ├─ content_json (TipTap document)
 │   ├─ infobox_json (template fields)
 │   └─ PageLinks (source → target, extracted from [[mentions]])
 ├─ Maps
 │   ├─ canvas_json (Konva layer stack)
 │   └─ MapPins (x/y → linked Page)
 └─ TimelineEvents
     ├─ start_date / end_date (FantasyDate JSON)
     └─ linked_pages (array of Page IDs)
```

---

## Roadmap (next features)

- [ ] Global search with fuzzy matching (Fuse.js)
- [ ] Knowledge graph view (React Flow — all wiki links visualized)
- [ ] Map pins linked to wiki pages (click pin → open page)
- [ ] Export world to PDF or Markdown
- [ ] Image uploads for page covers and map icons
- [ ] Multiple worlds with world-switcher
- [ ] Infobox template editor (custom fields per entity type)
- [ ] Mobile companion app (read-only, Tauri mobile)
- [ ] Theming (light parchment mode, dark arcane mode)

---

## Design Philosophy

WorldForge uses a **dark parchment fantasy aesthetic** — warm near-blacks, cream text, gold accents. The Cinzel serif typeface is used for all display headings to evoke ancient manuscripts. All color tokens are in `tailwind.config.js` under the `forge` namespace and in `globals.css` as CSS variables.

---

## Contributing

PRs welcome. The codebase is intentionally structured so each module is self-contained in its own folder under `src/components/`. Adding a new module means:

1. Create `src/components/yourmodule/YourModule.tsx`
2. Add a route in `App.tsx`
3. Add an entry to `NAV_ITEMS` in `Sidebar.tsx`
4. Add a DB table in `migrations/001_initial.sql` + queries in `lib/db.ts`
5. Add types to `types/index.ts`

---

## License

MIT
