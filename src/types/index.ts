// src/types/index.ts — WorldForge shared types

// ─────────────────────────────────────────
// WORLD
// ─────────────────────────────────────────
export interface World {
  id: string;
  name: string;
  description: string;
  cover_color: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────
export interface CalendarEra {
  name: string;
  startYear: number;
  endYear: number | null;
}

export interface CalendarMonth {
  name: string;
  days: number;
  intercalary: boolean; // true = "void" days, not part of normal weeks
}

export interface CalendarWeekday {
  name: string;
  abbreviation: string;
}

export interface CalendarSchema {
  epochName: string;
  eras: CalendarEra[];
  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  daysPerWeek: number;
  leapYearRule: {
    every: number;
    extraDays: number;
    inMonth: string;
  } | null;
}

export interface Calendar {
  id: string;
  world_id: string;
  name: string;
  schema_json: string; // JSON string of CalendarSchema
}

// Parsed fantasy date
export interface FantasyDate {
  year: number;
  month: number; // 1-indexed
  day: number;
  era?: string;
}

// ─────────────────────────────────────────
// CATEGORY & TAGS
// ─────────────────────────────────────────
export interface Category {
  id: string;
  world_id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  sort_order: number;
  children?: Category[]; // populated client-side
}

export interface Tag {
  id: string;
  world_id: string;
  name: string;
  color: string;
}

// ─────────────────────────────────────────
// PAGES (Notes + Wiki)
// ─────────────────────────────────────────
export type PageType = 'note' | 'wiki';
export type TemplateType = 'character' | 'location' | 'faction' | 'item' | 'event' | null;

export interface Page {
  id: string;
  world_id: string;
  title: string;
  slug: string;
  type: PageType;
  template_type: TemplateType;
  content_json: string; // TipTap JSON doc as string
  infobox_json: string; // structured fields as JSON string
  category_id: string | null;
  is_pinned: number; // SQLite bool
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  tags?: Tag[];
  category?: Category;
  backlinks?: Page[];
}

export interface PageLink {
  id: string;
  source_id: string;
  target_id: string;
  anchor_text: string | null;
}

// Infobox templates per entity type
export interface CharacterInfobox {
  aliases: string;
  species: string;
  age: string;
  gender: string;
  occupation: string;
  affiliation: string;
  birthdate: string;
  status: 'alive' | 'deceased' | 'unknown';
  traits: string;
}

export interface LocationInfobox {
  type: string;
  region: string;
  population: string;
  ruler: string;
  founded: string;
  climate: string;
  notable_features: string;
}

// ─────────────────────────────────────────
// MAP
// ─────────────────────────────────────────
export type MapIconType =
  | 'city' | 'town' | 'village' | 'castle' | 'ruin'
  | 'mountain' | 'forest' | 'dungeon' | 'portal' | 'custom';

export interface MapPin {
  id: string;
  map_id: string;
  page_id: string | null;
  x: number;
  y: number;
  label: string;
  icon: MapIconType;
  color: string;
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: KonvaObject[];
}

export interface KonvaObject {
  id: string;
  type: 'line' | 'rect' | 'ellipse' | 'text' | 'image' | 'polygon' | 'terrain' | 'icon';
  attrs: Record<string, unknown>;
}

export interface MapViewport {
  x: number;
  y: number;
  scale: number;
}

export interface MapCanvas {
  layers: MapLayer[];
  viewport: MapViewport;
  width: number;
  height: number;
}

export interface WorldMap {
  id: string;
  world_id: string;
  name: string;
  canvas_json: string;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────
export type EventCategory =
  | 'event' | 'era' | 'battle' | 'birth' | 'death'
  | 'discovery' | 'political' | 'natural' | 'custom';

export interface TimelineEvent {
  id: string;
  world_id: string;
  title: string;
  description: string;
  start_date: string; // JSON string of FantasyDate
  end_date: string | null;
  color: string;
  category: EventCategory;
  linked_pages: string; // JSON array of page IDs
  sort_index: number;
  created_at: string;
}

// ─────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────
export type ActiveModule =
  | 'dashboard'
  | 'notes'
  | 'wiki'
  | 'map'
  | 'timeline'
  | 'calendar'
  | 'graph';

export interface AppState {
  activeWorldId: string | null;
  activeModule: ActiveModule;
  sidebarOpen: boolean;
}
