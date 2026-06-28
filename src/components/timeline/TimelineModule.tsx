// src/components/timeline/TimelineModule.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, X, Link2, Calendar, Clock } from "lucide-react";
import { useAppStore } from "@/store";
import { timelineDb, calendarDb } from "@/lib/db";
import type { TimelineEvent, EventCategory, FantasyDate, CalendarSchema, Page } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  event:      "#c4933f",
  era:        "#8b6fad",
  battle:     "#c0392b",
  birth:      "#4a8c5c",
  death:      "#5a5a5a",
  discovery:  "#3d7ab5",
  political:  "#b5803d",
  natural:    "#3d7a5a",
  custom:     "#7a3d7a",
};

const CATEGORY_LABELS: Record<string, string> = {
  event: "Event", era: "Era", battle: "Battle", birth: "Birth",
  death: "Death", discovery: "Discovery", political: "Political",
  natural: "Natural", custom: "Custom",
};

export default function TimelineModule() {
  const { activeWorld, pages } = useAppStore();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [calendar, setCalendar] = useState<CalendarSchema | null>(null);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(() => {
    if (activeWorld) {
      loadEvents();
      loadCalendar();
    }
  }, [activeWorld?.id]);

  async function loadEvents() {
    if (!activeWorld) return;
    const list = await timelineDb.getAll(activeWorld.id);
    setEvents(list);
  }

  async function loadCalendar() {
    if (!activeWorld) return;
    const cal = await calendarDb.get(activeWorld.id);
    if (cal) {
      try { setCalendar(JSON.parse(cal.schema_json)); } catch {}
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await timelineDb.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const filtered = filterCat === "all" ? events : events.filter(e => e.category === filterCat);
  const sortedEvents = [...filtered].sort((a, b) => {
    const da = JSON.parse(a.start_date) as FantasyDate;
    const db_ = JSON.parse(b.start_date) as FantasyDate;
    return da.year !== db_.year ? da.year - db_.year :
           da.month !== db_.month ? da.month - db_.month : da.day - db_.day;
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div
        className="w-72 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--forge-surface)', borderRight: '1px solid var(--forge-border)' }}
      >
        <div className="px-3 py-2.5 border-b flex items-center justify-between"
             style={{ borderColor: 'var(--forge-border)' }}>
          <span className="forge-title text-sm font-semibold" style={{ color: 'var(--forge-text)' }}>
            Timeline
          </span>
          <button onClick={() => setShowForm(true)} className="forge-btn forge-btn-ghost p-1">
            <Plus size={14} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>

        {/* Category filter */}
        <div className="px-2 py-2 border-b flex gap-1 flex-wrap" style={{ borderColor: 'var(--forge-border)' }}>
          <FilterChip label="All" active={filterCat === "all"} onClick={() => setFilterCat("all")} />
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <FilterChip
              key={cat}
              label={label}
              active={filterCat === cat}
              color={CATEGORY_COLORS[cat]}
              onClick={() => setFilterCat(cat)}
            />
          ))}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto py-1">
          {sortedEvents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Clock size={28} className="mx-auto mb-2" style={{ color: 'var(--forge-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--forge-subtle)' }}>
                No events yet. Add one to begin chronicling history.
              </p>
            </div>
          ) : sortedEvents.map(event => (
            <EventListItem
              key={event.id}
              event={event}
              calendar={calendar}
              active={selected?.id === event.id}
              onClick={() => { setSelected(event); setEditing(false); }}
              onDelete={() => deleteEvent(event.id)}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Visual timeline */}
        <div
          className="shrink-0 overflow-x-auto p-4"
          style={{
            borderBottom: '1px solid var(--forge-border)',
            background: 'var(--forge-bg)',
            minHeight: '140px',
          }}
        >
          <VisualTimeline
            events={sortedEvents}
            calendar={calendar}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <EventForm
              calendar={calendar}
              onSave={async (data) => {
                await timelineDb.create({
                  ...data,
                  world_id: activeWorld?.id ?? "",
                  sort_index: events.length,
                });
                await loadEvents();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : selected ? (
            <EventDetail
              event={selected}
              calendar={calendar}
              pages={pages}
              editing={editing}
              onEdit={() => setEditing(true)}
              onSave={async (data) => {
                await timelineDb.update(selected.id, data);
                setEvents(prev => prev.map(e => e.id === selected.id ? { ...e, ...data } : e));
                setSelected(prev => prev ? { ...prev, ...data } : null);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
              onDelete={() => deleteEvent(selected.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--forge-muted)' }} />
                <p style={{ color: 'var(--forge-subtle)' }}>Select an event or add a new one</p>
                <button onClick={() => setShowForm(true)} className="forge-btn forge-btn-primary mt-4">
                  <Plus size={14} /> Add Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Visual Timeline ──
function VisualTimeline({ events, calendar, selected, onSelect }: {
  events: TimelineEvent[];
  calendar: CalendarSchema | null;
  selected: TimelineEvent | null;
  onSelect: (e: TimelineEvent) => void;
}) {
  if (events.length === 0) return (
    <div className="flex items-center justify-center h-20" style={{ color: 'var(--forge-muted)' }}>
      <span className="text-sm">Add events to see the timeline</span>
    </div>
  );

  const dates = events.map(e => JSON.parse(e.start_date) as FantasyDate);
  const minYear = Math.min(...dates.map(d => d.year));
  const maxYear = Math.max(...dates.map(d => d.year));
  const range = Math.max(maxYear - minYear, 1);
  const W = Math.max(800, events.length * 120);

  return (
    <div className="relative" style={{ width: W, height: 100 }}>
      {/* Spine */}
      <div className="absolute" style={{ left: 40, right: 40, top: 50, height: 2, background: 'var(--forge-border)' }} />

      {/* Year markers */}
      {Array.from({ length: Math.min(10, range + 1) }, (_, i) => {
        const year = minYear + Math.round(i * range / Math.min(9, range));
        const x = 40 + (year - minYear) / range * (W - 80);
        return (
          <div key={year} className="absolute" style={{ left: x, top: 55 }}>
            <div style={{ width: 1, height: 8, background: 'var(--forge-muted)', marginLeft: -0.5 }} />
            <div className="text-xs mt-1" style={{ color: 'var(--forge-subtle)', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {year}
            </div>
          </div>
        );
      })}

      {/* Events */}
      {events.map((event, i) => {
        const date = JSON.parse(event.start_date) as FantasyDate;
        const x = range === 0 ? W / 2 : 40 + (date.year - minYear) / range * (W - 80);
        const isAbove = i % 2 === 0;
        const color = CATEGORY_COLORS[event.category] ?? 'var(--forge-accent)';

        return (
          <button
            key={event.id}
            onClick={() => onSelect(event)}
            className="absolute flex flex-col items-center"
            style={{ left: x, top: isAbove ? 10 : 56, transform: 'translateX(-50%)' }}
          >
            {isAbove && (
              <div
                className="text-xs font-medium mb-1 whitespace-nowrap px-1.5 py-0.5 rounded"
                style={{
                  background: selected?.id === event.id ? color : 'var(--forge-elevated)',
                  color: selected?.id === event.id ? '#fff' : 'var(--forge-text)',
                  border: `1px solid ${color}`,
                  fontSize: '10px',
                }}
              >
                {event.title.length > 18 ? event.title.slice(0, 16) + "…" : event.title}
              </div>
            )}
            <div
              className="rounded-full border-2"
              style={{
                width: 12, height: 12,
                background: color,
                borderColor: selected?.id === event.id ? 'white' : color,
                boxShadow: selected?.id === event.id ? '0 0 0 2px white' : 'none',
              }}
            />
            {!isAbove && (
              <div
                className="text-xs font-medium mt-1 whitespace-nowrap px-1.5 py-0.5 rounded"
                style={{
                  background: selected?.id === event.id ? color : 'var(--forge-elevated)',
                  color: selected?.id === event.id ? '#fff' : 'var(--forge-text)',
                  border: `1px solid ${color}`,
                  fontSize: '10px',
                }}
              >
                {event.title.length > 18 ? event.title.slice(0, 16) + "…" : event.title}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Event list item ──
function EventListItem({ event, calendar, active, onClick, onDelete }: {
  event: TimelineEvent;
  calendar: CalendarSchema | null;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const date = JSON.parse(event.start_date) as FantasyDate;
  const color = CATEGORY_COLORS[event.category] ?? 'var(--forge-accent)';

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-2.5 px-3 py-2.5 cursor-pointer border-l-2 transition-colors"
      style={{
        borderLeftColor: active ? color : 'transparent',
        background: active ? 'var(--forge-muted)' : 'transparent',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--forge-elevated)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--forge-text)' }}>
          {event.title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--forge-subtle)' }}>
          {formatFantasyDate(date, calendar)} · {CATEGORY_LABELS[event.category] ?? event.category}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5"
      >
        <Trash2 size={11} style={{ color: 'var(--forge-danger)' }} />
      </button>
    </div>
  );
}

// ── Event detail ──
function EventDetail({ event, calendar, pages, editing, onEdit, onSave, onCancel, onDelete }: {
  event: TimelineEvent;
  calendar: CalendarSchema | null;
  pages: Page[];
  editing: boolean;
  onEdit: () => void;
  onSave: (d: Partial<TimelineEvent>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [category, setCategory] = useState(event.category);
  const [startDate, setStartDate] = useState<FantasyDate>(JSON.parse(event.start_date));
  const [color, setColor] = useState(event.color);

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description);
    setCategory(event.category);
    setStartDate(JSON.parse(event.start_date));
    setColor(event.color);
  }, [event.id]);

  const eventColor = CATEGORY_COLORS[event.category] ?? 'var(--forge-accent)';
  const linkedPages = JSON.parse(event.linked_pages) as string[];
  const linked = pages.filter(p => linkedPages.includes(p.id));

  if (!editing) return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: eventColor }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: eventColor }}>
              {CATEGORY_LABELS[event.category] ?? event.category}
            </span>
          </div>
          <h2 className="forge-title text-xl font-bold" style={{ color: 'var(--forge-text)' }}>
            {event.title}
          </h2>
          <div className="text-sm mt-1" style={{ color: 'var(--forge-subtle)' }}>
            <Calendar size={12} className="inline mr-1" />
            {formatFantasyDate(JSON.parse(event.start_date), calendar)}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="forge-btn forge-btn-outline text-xs">
            <Edit2 size={11} /> Edit
          </button>
          <button onClick={onDelete} className="forge-btn forge-btn-ghost text-xs">
            <Trash2 size={11} style={{ color: 'var(--forge-danger)' }} />
          </button>
        </div>
      </div>

      {event.description && (
        <div className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--forge-text)' }}>
          {event.description}
        </div>
      )}

      {linked.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forge-subtle)' }}>
            Linked Pages
          </div>
          <div className="flex flex-wrap gap-2">
            {linked.map(p => (
              <span key={p.id} className="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--forge-muted)', color: 'var(--forge-accent)' }}>
                <Link2 size={10} className="inline mr-1" />{p.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h3 className="forge-title font-semibold mb-4" style={{ color: 'var(--forge-accent)' }}>Edit Event</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Title</label>
          <input className="forge-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Category</label>
          <select className="forge-input" value={category} onChange={e => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Year</label>
            <input className="forge-input" type="number" value={startDate.year}
                   onChange={e => setStartDate(d => ({ ...d, year: +e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Month</label>
            <select className="forge-input" value={startDate.month}
                    onChange={e => setStartDate(d => ({ ...d, month: +e.target.value }))}>
              {(calendar?.months ?? []).map((m, i) => (
                <option key={i} value={i + 1}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Day</label>
            <input className="forge-input" type="number" min={1} max={31} value={startDate.day}
                   onChange={e => setStartDate(d => ({ ...d, day: +e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Description</label>
          <textarea className="forge-input" rows={4} style={{ resize: 'vertical' }}
                    value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave({ title, description, category, start_date: JSON.stringify(startDate), color })}
            className="forge-btn forge-btn-primary"
          >
            Save Changes
          </button>
          <button onClick={onCancel} className="forge-btn forge-btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── New event form ──
function EventForm({ calendar, onSave, onCancel }: {
  calendar: CalendarSchema | null;
  onSave: (d: Omit<TimelineEvent, 'id' | 'world_id' | 'created_at' | 'sort_index'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("event");
  const [year, setYear] = useState(1000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  function submit() {
    if (!title.trim()) return;
    onSave({
      title,
      description,
      category,
      start_date: JSON.stringify({ year, month, day }),
      end_date: null,
      color: CATEGORY_COLORS[category] ?? '#c4933f',
      linked_pages: "[]",
    });
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="forge-title font-semibold" style={{ color: 'var(--forge-accent)' }}>New Event</h3>
        <button onClick={onCancel}><X size={16} style={{ color: 'var(--forge-subtle)' }} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Title *</label>
          <input className="forge-input" placeholder="Event name..." value={title}
                 onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Category</label>
          <select className="forge-input" value={category} onChange={e => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Year</label>
            <input className="forge-input" type="number" value={year} onChange={e => setYear(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Month</label>
            <select className="forge-input" value={month} onChange={e => setMonth(+e.target.value)}>
              {(calendar?.months ?? Array.from({ length: 12 }, (_, i) => ({ name: `Month ${i + 1}` }))).map((m, i) => (
                <option key={i} value={i + 1}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Day</label>
            <input className="forge-input" type="number" min={1} max={31} value={day}
                   onChange={e => setDay(+e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--forge-subtle)' }}>Description</label>
          <textarea className="forge-input" rows={3} style={{ resize: 'vertical' }}
                    placeholder="What happened?" value={description}
                    onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim()} className="forge-btn forge-btn-primary">
            Add to Timeline
          </button>
          <button onClick={onCancel} className="forge-btn forge-btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Filter chip ──
function FilterChip({ label, active, color, onClick }: {
  label: string; active: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded-full border transition-colors"
      style={{
        background: active ? (color ?? 'var(--forge-accent)') : 'transparent',
        borderColor: color ?? 'var(--forge-border)',
        color: active ? '#fff' : 'var(--forge-subtle)',
        fontSize: '10px',
      }}
    >
      {label}
    </button>
  );
}

// ── Utilities ──
function formatFantasyDate(date: FantasyDate, calendar: CalendarSchema | null): string {
  if (!calendar) return `Year ${date.year}, Month ${date.month}, Day ${date.day}`;
  const month = calendar.months[date.month - 1];
  return `${month?.name ?? `Month ${date.month}`} ${date.day}, Year ${date.year}`;
}
