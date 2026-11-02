// src/lib/db.ts — SQLite database layer via Tauri plugin-sql

import Database from "@tauri-apps/plugin-sql";
import type {
  World, Calendar, Category, Tag, Page,
  WorldMap, MapPin, TimelineEvent
} from "@/types";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    try {
      _db = await Database.load("sqlite:worldforge.db");
    } catch (e) {
      console.error("DB connection failed:", e);
      throw e;
    }
  }
  return _db;
}

// ─────────────────────────────────────────
// WORLDS
// ─────────────────────────────────────────
export const worldsDb = {
  async getAll(): Promise<World[]> {
    const db = await getDb();
    return db.select<World[]>("SELECT * FROM worlds ORDER BY created_at DESC");
  },

  async get(id: string): Promise<World | null> {
    const db = await getDb();
    const rows = await db.select<World[]>("SELECT * FROM worlds WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async create(name: string, description = ""): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO worlds (id, name, description) VALUES ($1, $2, $3)",
      [id, name, description]
    );
    return id;
  },

  async update(id: string, data: Partial<Pick<World, 'name' | 'description' | 'cover_color'>>): Promise<void> {
    const db = await getDb();
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.execute(
      `UPDATE worlds SET ${fields}, updated_at = datetime('now') WHERE id = $1`,
      [id, ...Object.values(data)]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM worlds WHERE id = $1", [id]);
  },
};

// ─────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────
export const pagesDb = {
  async getAll(worldId: string, type?: 'note' | 'wiki'): Promise<Page[]> {
    const db = await getDb();
    let query = "SELECT * FROM pages WHERE world_id = $1";
    const params: unknown[] = [worldId];
    if (type) {
      query += " AND type = $2";
      params.push(type);
    }
    query += " ORDER BY is_pinned DESC, updated_at DESC";
    return db.select<Page[]>(query, params);
  },

  async get(id: string): Promise<Page | null> {
    const db = await getDb();
    const rows = await db.select<Page[]>("SELECT * FROM pages WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async getBySlug(worldId: string, slug: string): Promise<Page | null> {
    const db = await getDb();
    const rows = await db.select<Page[]>(
      "SELECT * FROM pages WHERE world_id = $1 AND slug = $2",
      [worldId, slug]
    );
    return rows[0] ?? null;
  },

  async search(worldId: string, query: string): Promise<Page[]> {
    const db = await getDb();
    return db.select<Page[]>(
      "SELECT * FROM pages WHERE world_id = $1 AND (title LIKE $2) ORDER BY updated_at DESC LIMIT 20",
      [worldId, `%${query}%`]
    );
  },

  async create(data: {
    world_id: string;
    title: string;
    type: 'note' | 'wiki';
    template_type?: string | null;
    category_id?: string | null;
  }): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const slug = slugify(data.title) + '-' + id.slice(0, 8);
    await db.execute(
      `INSERT INTO pages (id, world_id, title, slug, type, template_type, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.world_id, data.title, slug, data.type, data.template_type ?? null, data.category_id ?? null]
    );
    return id;
  },

  async update(id: string, data: Partial<Pick<Page, 'title' | 'content_json' | 'infobox_json' | 'category_id' | 'is_pinned' | 'cover_image'>>): Promise<void> {
    const db = await getDb();
    const keys = Object.keys(data);
    const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.execute(
      `UPDATE pages SET ${fields}, updated_at = datetime('now') WHERE id = $1`,
      [id, ...Object.values(data)]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM pages WHERE id = $1", [id]);
  },

  async getBacklinks(pageId: string): Promise<Page[]> {
    const db = await getDb();
    return db.select<Page[]>(
      `SELECT p.* FROM pages p
       JOIN page_links l ON l.source_id = p.id
       WHERE l.target_id = $1`,
      [pageId]
    );
  },

  async getLinks(worldId: string): Promise<{ source_id: string; target_id: string }[]> {
    const db = await getDb();
    return db.select<{ source_id: string; target_id: string }[]>(
      `SELECT l.source_id, l.target_id
       FROM page_links l
       JOIN pages source ON source.id = l.source_id
       JOIN pages target ON target.id = l.target_id
       WHERE source.world_id = $1
         AND target.world_id = source.world_id
         AND source.type = 'wiki'
         AND target.type = 'wiki'`,
      [worldId]
    );
  },

  async syncLinks(sourceId: string, targetIds: string[]): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM page_links WHERE source_id = $1", [sourceId]);
    for (const targetId of targetIds) {
      if (targetId !== sourceId) {
        await db.execute(
          "INSERT OR IGNORE INTO page_links (id, source_id, target_id) VALUES ($1, $2, $3)",
          [crypto.randomUUID(), sourceId, targetId]
        );
      }
    }
  },
};

// ─────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────
export const categoriesDb = {
  async getAll(worldId: string): Promise<Category[]> {
    const db = await getDb();
    return db.select<Category[]>(
      "SELECT * FROM categories WHERE world_id = $1 ORDER BY sort_order ASC",
      [worldId]
    );
  },

  async create(data: Omit<Category, 'id' | 'children' | 'sort_order'> & { sort_order?: number }): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO categories (id, world_id, name, icon, color, parent_id, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, data.world_id, data.name, data.icon, data.color, data.parent_id, data.sort_order ?? 0]
    );
    return id;
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM categories WHERE id = $1", [id]);
  },
};

// ─────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────
export const tagsDb = {
  async getAll(worldId: string): Promise<Tag[]> {
    const db = await getDb();
    return db.select<Tag[]>("SELECT * FROM tags WHERE world_id = $1", [worldId]);
  },

  async getForPage(pageId: string): Promise<Tag[]> {
    const db = await getDb();
    return db.select<Tag[]>(
      "SELECT t.* FROM tags t JOIN page_tags pt ON pt.tag_id = t.id WHERE pt.page_id = $1",
      [pageId]
    );
  },

  async create(worldId: string, name: string, color: string): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO tags (id, world_id, name, color) VALUES ($1,$2,$3,$4)",
      [id, worldId, name, color]
    );
    return id;
  },

  async setPageTags(pageId: string, tagIds: string[]): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM page_tags WHERE page_id = $1", [pageId]);
    for (const tagId of tagIds) {
      await db.execute(
        "INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES ($1, $2)",
        [pageId, tagId]
      );
    }
  },
};

// ─────────────────────────────────────────
// MAPS
// ─────────────────────────────────────────
export const mapsDb = {
  async getAll(worldId: string): Promise<WorldMap[]> {
    const db = await getDb();
    return db.select<WorldMap[]>("SELECT * FROM maps WHERE world_id = $1", [worldId]);
  },

  async get(id: string): Promise<WorldMap | null> {
    const db = await getDb();
    const rows = await db.select<WorldMap[]>("SELECT * FROM maps WHERE id = $1", [id]);
    return rows[0] ?? null;
  },

  async create(worldId: string, name: string): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO maps (id, world_id, name) VALUES ($1, $2, $3)",
      [id, worldId, name]
    );
    return id;
  },

  async save(id: string, canvasJson: string, thumbnail?: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      "UPDATE maps SET canvas_json = $2, thumbnail = $3, updated_at = datetime('now') WHERE id = $1",
      [id, canvasJson, thumbnail ?? null]
    );
  },

  async getPins(mapId: string): Promise<MapPin[]> {
    const db = await getDb();
    return db.select<MapPin[]>("SELECT * FROM map_pins WHERE map_id = $1", [mapId]);
  },

  async upsertPin(pin: Omit<MapPin, 'id'>): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO map_pins (id, map_id, page_id, x, y, label, icon, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, pin.map_id, pin.page_id, pin.x, pin.y, pin.label, pin.icon, pin.color]
    );
    return id;
  },

  async deletePin(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM map_pins WHERE id = $1", [id]);
  },
};

// ─────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────
export const timelineDb = {
  async getAll(worldId: string): Promise<TimelineEvent[]> {
    const db = await getDb();
    return db.select<TimelineEvent[]>(
      "SELECT * FROM timeline_events WHERE world_id = $1 ORDER BY sort_index ASC",
      [worldId]
    );
  },

  async create(data: Omit<TimelineEvent, 'id' | 'created_at'>): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO timeline_events
       (id, world_id, title, description, start_date, end_date, color, category, linked_pages, sort_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, data.world_id, data.title, data.description,
       data.start_date, data.end_date, data.color, data.category,
       data.linked_pages, data.sort_index]
    );
    return id;
  },

  async update(id: string, data: Partial<Omit<TimelineEvent, 'id' | 'world_id' | 'created_at'>>): Promise<void> {
    const db = await getDb();
    const keys = Object.keys(data);
    const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.execute(
      `UPDATE timeline_events SET ${fields} WHERE id = $1`,
      [id, ...Object.values(data)]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM timeline_events WHERE id = $1", [id]);
  },
};

// ─────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────
export const calendarDb = {
  async get(worldId: string): Promise<Calendar | null> {
    const db = await getDb();
    const rows = await db.select<Calendar[]>(
      "SELECT * FROM calendars WHERE world_id = $1 LIMIT 1",
      [worldId]
    );
    return rows[0] ?? null;
  },

  async upsert(worldId: string, name: string, schemaJson: string): Promise<void> {
    const db = await getDb();
    const existing = await calendarDb.get(worldId);
    if (existing) {
      await db.execute(
        "UPDATE calendars SET name = $2, schema_json = $3, updated_at = datetime('now') WHERE world_id = $1",
        [worldId, name, schemaJson]
      );
    } else {
      const id = crypto.randomUUID();
      await db.execute(
        "INSERT INTO calendars (id, world_id, name, schema_json) VALUES ($1,$2,$3,$4)",
        [id, worldId, name, schemaJson]
      );
    }
  },
};

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}
