-- WorldForge Database Schema
-- Migration: 001_initial

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─────────────────────────────────────────
-- WORLDS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worlds (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_color TEXT DEFAULT '#c4933f',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- CUSTOM CALENDAR SCHEMA
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendars (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id    TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'World Calendar',
  schema_json TEXT NOT NULL DEFAULT '{}',
  -- schema_json shape:
  -- {
  --   eras: [{name, startYear, endYear}],
  --   months: [{name, days, intercalary}],
  --   weekdays: [{name, abbreviation}],
  --   daysPerWeek: number,
  --   leapYearRule: {every: number, extraDays: number, inMonth: string} | null,
  --   epochName: string
  -- }
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- CATEGORIES (hierarchical)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id  TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  icon      TEXT DEFAULT '📁',
  color     TEXT DEFAULT '#c4933f',
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────
-- TAGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  color    TEXT DEFAULT '#c4933f'
);

-- ─────────────────────────────────────────
-- PAGES (Notes + Wiki unified)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id      TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Untitled',
  slug          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'note', -- 'note' | 'wiki'
  template_type TEXT DEFAULT NULL,            -- 'character' | 'location' | 'faction' | 'item' | 'event' | null
  content_json  TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  infobox_json  TEXT DEFAULT '{}',            -- structured fields for wiki template types
  category_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
  is_pinned     INTEGER DEFAULT 0,
  cover_image   TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(world_id, slug)
);

-- ─────────────────────────────────────────
-- PAGE ↔ TAG junction
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_tags (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);

-- ─────────────────────────────────────────
-- WIKI LINKS (page → page)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_links (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source_id   TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  target_id   TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  anchor_text TEXT DEFAULT NULL,
  UNIQUE(source_id, target_id)
);

-- ─────────────────────────────────────────
-- MAP PROJECTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maps (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id    TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'World Map',
  canvas_json TEXT NOT NULL DEFAULT '{"layers":[],"viewport":{"x":0,"y":0,"scale":1},"width":4096,"height":2048}',
  -- canvas_json shape:
  -- {
  --   layers: [{id, name, visible, locked, objects: [...Konva objects]}],
  --   viewport: {x, y, scale},
  --   width, height
  -- }
  thumbnail   TEXT DEFAULT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Map pins that link map locations to wiki pages
CREATE TABLE IF NOT EXISTS map_pins (
  id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  map_id   TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  page_id  TEXT REFERENCES pages(id) ON DELETE SET NULL,
  x        REAL NOT NULL,
  y        REAL NOT NULL,
  label    TEXT DEFAULT '',
  icon     TEXT DEFAULT 'city',
  color    TEXT DEFAULT '#c4933f'
);

-- ─────────────────────────────────────────
-- TIMELINE EVENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  world_id     TEXT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  start_date   TEXT NOT NULL DEFAULT '{}', -- fantasy date JSON {year, month, day, era}
  end_date     TEXT DEFAULT NULL,           -- nullable for point events
  color        TEXT DEFAULT '#c4933f',
  category     TEXT DEFAULT 'event',        -- 'event' | 'era' | 'battle' | 'birth' | 'death' | custom
  linked_pages TEXT DEFAULT '[]',           -- JSON array of page IDs
  sort_index   REAL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pages_world     ON pages(world_id);
CREATE INDEX IF NOT EXISTS idx_pages_type      ON pages(type);
CREATE INDEX IF NOT EXISTS idx_pages_slug      ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_page_links_src  ON page_links(source_id);
CREATE INDEX IF NOT EXISTS idx_page_links_tgt  ON page_links(target_id);
CREATE INDEX IF NOT EXISTS idx_timeline_world  ON timeline_events(world_id);
CREATE INDEX IF NOT EXISTS idx_categories_world ON categories(world_id);

-- ─────────────────────────────────────────
-- DEFAULT SEED: sample world
-- ─────────────────────────────────────────
INSERT OR IGNORE INTO worlds (id, name, description) VALUES
  ('demo-world-0001', 'The Realm of Aethermoor', 'A high-fantasy world of ancient magic and forgotten empires.');

INSERT OR IGNORE INTO calendars (id, world_id, name, schema_json) VALUES (
  'demo-cal-0001',
  'demo-world-0001',
  'Aethermoor Calendar',
  '{
    "epochName": "Age of Stars",
    "eras": [
      {"name": "First Age", "startYear": 1, "endYear": 1000},
      {"name": "Age of Ruin", "startYear": 1001, "endYear": 2000},
      {"name": "New Dawn", "startYear": 2001, "endYear": null}
    ],
    "months": [
      {"name": "Frostmere",  "days": 30, "intercalary": false},
      {"name": "Ashveil",    "days": 28, "intercalary": false},
      {"name": "Bloomtide",  "days": 32, "intercalary": false},
      {"name": "Sunpeak",    "days": 30, "intercalary": false},
      {"name": "Goldfall",   "days": 30, "intercalary": false},
      {"name": "Dimthorn",   "days": 28, "intercalary": false},
      {"name": "The Void",   "days": 5,  "intercalary": true}
    ],
    "weekdays": [
      {"name": "Solday",   "abbreviation": "Sol"},
      {"name": "Moonday",  "abbreviation": "Mon"},
      {"name": "Starday",  "abbreviation": "Sta"},
      {"name": "Ashday",   "abbreviation": "Ash"},
      {"name": "Stormday", "abbreviation": "Str"}
    ],
    "daysPerWeek": 5,
    "leapYearRule": {"every": 4, "extraDays": 1, "inMonth": "Bloomtide"}
  }'
);

INSERT OR IGNORE INTO categories (id, world_id, name, icon, color) VALUES
  ('cat-char-001', 'demo-world-0001', 'Characters', '🧙', '#8b6fad'),
  ('cat-loc-001',  'demo-world-0001', 'Locations',  '🏔️', '#4a8c5c'),
  ('cat-fact-001', 'demo-world-0001', 'Factions',   '⚔️', '#c4933f'),
  ('cat-item-001', 'demo-world-0001', 'Items',      '💎', '#3d7ab5'),
  ('cat-note-001', 'demo-world-0001', 'Notes',      '📝', '#9a8f7e');
