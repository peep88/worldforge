// src/components/calendar/CalendarModule.tsx
import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Plus, Trash2, Save, ChevronLeft,
  ChevronRight, Settings, Moon, Sun, Star
} from "lucide-react";
import { useAppStore } from "@/store";
import { calendarDb } from "@/lib/db";
import type { CalendarSchema, CalendarMonth, CalendarWeekday, CalendarEra, FantasyDate } from "@/types";

const DEFAULT_SCHEMA: CalendarSchema = {
  epochName: "Age of Stars",
  eras: [{ name: "First Age", startYear: 1, endYear: null }],
  months: [
    { name: "Frostmere",  days: 30, intercalary: false },
    { name: "Bloomtide",  days: 30, intercalary: false },
    { name: "Sunpeak",    days: 30, intercalary: false },
    { name: "Goldfall",   days: 30, intercalary: false },
    { name: "Dimthorn",   days: 30, intercalary: false },
    { name: "Snowveil",   days: 30, intercalary: false },
  ],
  weekdays: [
    { name: "Solday",   abbreviation: "Sol" },
    { name: "Moonday",  abbreviation: "Mon" },
    { name: "Starday",  abbreviation: "Sta" },
    { name: "Ashday",   abbreviation: "Ash" },
    { name: "Stormday", abbreviation: "Str" },
    { name: "Tidesday", abbreviation: "Tid" },
    { name: "Voidday",  abbreviation: "Voi" },
  ],
  daysPerWeek: 7,
  leapYearRule: null,
};

type Tab = "view" | "build";

export default function CalendarModule() {
  const { activeWorld } = useAppStore();
  const [tab, setTab] = useState<Tab>("view");
  const [schema, setSchema] = useState<CalendarSchema>(DEFAULT_SCHEMA);
  const [calendarName, setCalendarName] = useState("World Calendar");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  // Calendar view state
  const [currentYear, setCurrentYear] = useState(1000);
  const [currentMonthIdx, setCurrentMonthIdx] = useState(0);

  useEffect(() => {
    if (activeWorld) loadCalendar();
  }, [activeWorld?.id]);

  async function loadCalendar() {
    if (!activeWorld) return;
    const cal = await calendarDb.get(activeWorld.id);
    if (cal) {
      setCalendarName(cal.name);
      try { setSchema(JSON.parse(cal.schema_json)); } catch {}
    }
    setLoaded(true);
  }

  async function saveCalendar() {
    if (!activeWorld) return;
    await calendarDb.upsert(activeWorld.id, calendarName, JSON.stringify(schema));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const visibleMonths = schema.months.filter(m => !m.intercalary);
  const currentMonth = schema.months[currentMonthIdx];

  function prevMonth() {
    if (currentMonthIdx === 0) {
      setCurrentMonthIdx(visibleMonths.length - 1);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonthIdx(i => i - 1);
    }
  }

  function nextMonth() {
    if (currentMonthIdx >= visibleMonths.length - 1) {
      setCurrentMonthIdx(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonthIdx(i => i + 1);
    }
  }

  const currentEra = schema.eras.find(e =>
    currentYear >= e.startYear && (e.endYear === null || currentYear <= e.endYear)
  );

  if (!loaded) return (
    <div className="flex items-center justify-center h-full">
      <span style={{ color: 'var(--forge-subtle)' }}>Loading calendar...</span>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: settings/builder */}
      <div
        className="w-80 shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--forge-surface)', borderRight: '1px solid var(--forge-border)' }}
      >
        {/* Tab header */}
        <div className="flex border-b" style={{ borderColor: 'var(--forge-border)' }}>
          {([["view", "Calendar View"], ["build", "Build & Configure"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: tab === t ? 'var(--forge-accent)' : 'var(--forge-subtle)',
                borderBottom: tab === t ? '2px solid var(--forge-accent)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "build" ? (
            <CalendarBuilder schema={schema} onChange={setSchema} name={calendarName} onNameChange={setCalendarName} />
          ) : (
            <CalendarStats schema={schema} year={currentYear} monthIdx={currentMonthIdx} />
          )}
        </div>

        {/* Save */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--forge-border)' }}>
          <button onClick={saveCalendar} className="forge-btn forge-btn-primary w-full justify-center">
            <Save size={13} />
            {saved ? "Saved!" : "Save Calendar"}
          </button>
        </div>
      </div>

      {/* Right: Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--forge-border)' }}
        >
          <button onClick={prevMonth} className="forge-btn forge-btn-ghost p-2">
            <ChevronLeft size={16} />
          </button>

          <div className="text-center">
            <div className="forge-title text-2xl font-bold" style={{ color: 'var(--forge-accent)' }}>
              {currentMonth?.name}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--forge-subtle)' }}>
              Year {currentYear}
              {currentEra && ` · ${currentEra.name}`}
            </div>
          </div>

          <button onClick={nextMonth} className="forge-btn forge-btn-ghost p-2">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Year navigation */}
        <div
          className="flex items-center gap-2 px-6 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--forge-border)', background: 'var(--forge-surface)' }}
        >
          <span className="text-xs" style={{ color: 'var(--forge-subtle)' }}>Year:</span>
          <button onClick={() => setCurrentYear(y => y - 1)} className="forge-btn forge-btn-ghost py-0.5 px-2 text-xs">−</button>
          <input
            type="number"
            value={currentYear}
            onChange={e => setCurrentYear(+e.target.value)}
            className="forge-input text-center text-xs"
            style={{ width: 80 }}
          />
          <button onClick={() => setCurrentYear(y => y + 1)} className="forge-btn forge-btn-ghost py-0.5 px-2 text-xs">+</button>

          <div className="mx-4 w-px h-4" style={{ background: 'var(--forge-border)' }} />

          {/* Month tabs */}
          <div className="flex gap-1 overflow-x-auto flex-1">
            {schema.months.filter(m => !m.intercalary).map((m, i) => (
              <button
                key={i}
                onClick={() => setCurrentMonthIdx(i)}
                className="text-xs px-2 py-1 rounded whitespace-nowrap transition-colors"
                style={{
                  background: currentMonthIdx === i ? 'var(--forge-accent)' : 'transparent',
                  color: currentMonthIdx === i ? '#0f0e0c' : 'var(--forge-subtle)',
                }}
              >
                {m.name.slice(0, 6)}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentMonth ? (
            <MonthGrid
              month={currentMonth}
              weekdays={schema.weekdays}
              year={currentYear}
              monthIdx={currentMonthIdx}
              daysPerWeek={schema.daysPerWeek}
            />
          ) : (
            <div className="flex items-center justify-center h-40">
              <p style={{ color: 'var(--forge-subtle)' }}>Configure months in the builder</p>
            </div>
          )}

          {/* Intercalary days */}
          {schema.months.filter(m => m.intercalary).length > 0 && (
            <div className="mt-6">
              <h3 className="forge-title text-sm font-semibold mb-3" style={{ color: 'var(--forge-subtle)' }}>
                INTERCALARY DAYS
              </h3>
              <div className="flex gap-3 flex-wrap">
                {schema.months.filter(m => m.intercalary).map((m, i) => (
                  <div key={i} className="forge-panel px-4 py-3 text-center">
                    <Star size={16} className="mx-auto mb-1" style={{ color: 'var(--forge-accent)' }} />
                    <div className="text-sm font-medium forge-title" style={{ color: 'var(--forge-text)' }}>{m.name}</div>
                    <div className="text-xs" style={{ color: 'var(--forge-subtle)' }}>{m.days} day{m.days !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Month grid ──
function MonthGrid({ month, weekdays, year, monthIdx, daysPerWeek }: {
  month: CalendarMonth;
  weekdays: CalendarWeekday[];
  year: number;
  monthIdx: number;
  daysPerWeek: number;
}) {
  const days = Array.from({ length: month.days }, (_, i) => i + 1);
  // Deterministic offset: use year + monthIdx to create a consistent start day
  const startOffset = (year * 12 + monthIdx) % daysPerWeek;
  const cells = [...Array(startOffset).fill(null), ...days];
  const weeks = Math.ceil(cells.length / daysPerWeek);
  const paddedCells = [...cells, ...Array(weeks * daysPerWeek - cells.length).fill(null)];
  const displayWeekdays = weekdays.slice(0, daysPerWeek);

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid mb-2" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, 1fr)` }}>
        {displayWeekdays.map((wd, i) => (
          <div key={i} className="text-center text-xs font-semibold py-2"
               style={{ color: 'var(--forge-subtle)' }}>
            {wd.abbreviation}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, 1fr)` }}>
        {paddedCells.map((day, i) => (
          <div
            key={i}
            className="rounded text-center py-2 text-sm transition-colors"
            style={{
              background: day ? 'var(--forge-surface)' : 'transparent',
              color: day ? 'var(--forge-text)' : 'transparent',
              border: day ? '1px solid var(--forge-border)' : '1px solid transparent',
              minHeight: '40px',
              cursor: day ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { if (day) (e.currentTarget.style.borderColor = 'var(--forge-accent)'); }}
            onMouseLeave={e => { if (day) (e.currentTarget.style.borderColor = 'var(--forge-border)'); }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats panel ──
function CalendarStats({ schema, year, monthIdx }: {
  schema: CalendarSchema; year: number; monthIdx: number;
}) {
  const normalMonths = schema.months.filter(m => !m.intercalary);
  const intercalaryMonths = schema.months.filter(m => m.intercalary);
  const totalDays = schema.months.reduce((sum, m) => sum + m.days, 0);
  const currentEra = schema.eras.find(e =>
    year >= e.startYear && (e.endYear === null || year <= e.endYear)
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="forge-title text-sm font-semibold mb-1" style={{ color: 'var(--forge-subtle)' }}>CALENDAR</h3>
        <div className="text-sm font-semibold" style={{ color: 'var(--forge-text)' }}>{schema.epochName}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Months" value={normalMonths.length} />
        <StatCard label="Days/Year" value={totalDays} />
        <StatCard label="Days/Week" value={schema.daysPerWeek} />
        <StatCard label="Eras" value={schema.eras.length} />
      </div>

      {currentEra && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--forge-subtle)' }}>
            CURRENT ERA
          </h3>
          <div className="forge-panel px-3 py-2 text-sm" style={{ color: 'var(--forge-accent)' }}>
            {currentEra.name}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forge-subtle)' }}>
          MONTHS
        </h3>
        {schema.months.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b text-sm"
               style={{ borderColor: 'var(--forge-border)' }}>
            <div className="flex items-center gap-2">
              {m.intercalary ? <Star size={10} style={{ color: 'var(--forge-accent)' }} /> : <Moon size={10} style={{ color: 'var(--forge-subtle)' }} />}
              <span style={{ color: m.intercalary ? 'var(--forge-accent)' : 'var(--forge-text)' }}>{m.name}</span>
            </div>
            <span style={{ color: 'var(--forge-subtle)' }}>{m.days}d</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forge-subtle)' }}>
          WEEKDAYS
        </h3>
        {schema.weekdays.slice(0, schema.daysPerWeek).map((w, i) => (
          <div key={i} className="flex items-center justify-between py-1 text-sm">
            <span style={{ color: 'var(--forge-text)' }}>{w.name}</span>
            <span className="text-xs" style={{ color: 'var(--forge-subtle)' }}>{w.abbreviation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="forge-panel px-3 py-2 text-center">
      <div className="text-lg font-bold forge-title" style={{ color: 'var(--forge-accent)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--forge-subtle)' }}>{label}</div>
    </div>
  );
}

// ── Calendar Builder ──
function CalendarBuilder({ schema, onChange, name, onNameChange }: {
  schema: CalendarSchema;
  onChange: (s: CalendarSchema) => void;
  name: string;
  onNameChange: (n: string) => void;
}) {
  function updateMonth(idx: number, field: keyof CalendarMonth, value: string | number | boolean) {
    onChange({
      ...schema,
      months: schema.months.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    });
  }

  function addMonth() {
    onChange({
      ...schema,
      months: [...schema.months, { name: `Month ${schema.months.length + 1}`, days: 30, intercalary: false }],
    });
  }

  function removeMonth(idx: number) {
    onChange({ ...schema, months: schema.months.filter((_, i) => i !== idx) });
  }

  function updateWeekday(idx: number, field: keyof CalendarWeekday, value: string) {
    onChange({
      ...schema,
      weekdays: schema.weekdays.map((w, i) => i === idx ? { ...w, [field]: value } : w),
    });
  }

  function addWeekday() {
    onChange({
      ...schema,
      weekdays: [...schema.weekdays, { name: `Day ${schema.weekdays.length + 1}`, abbreviation: `D${schema.weekdays.length + 1}` }],
      daysPerWeek: schema.daysPerWeek + 1,
    });
  }

  function removeWeekday(idx: number) {
    const newDays = schema.weekdays.filter((_, i) => i !== idx);
    onChange({ ...schema, weekdays: newDays, daysPerWeek: newDays.length });
  }

  function updateEra(idx: number, field: keyof CalendarEra, value: string | number | null) {
    onChange({
      ...schema,
      eras: schema.eras.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    });
  }

  function addEra() {
    onChange({
      ...schema,
      eras: [...schema.eras, { name: `New Era`, startYear: 1, endYear: null }],
    });
  }

  return (
    <div className="p-4 space-y-5">
      {/* Basic info */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--forge-subtle)' }}>
          Calendar Name
        </label>
        <input className="forge-input" value={name} onChange={e => onNameChange(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--forge-subtle)' }}>
          Epoch Name
        </label>
        <input className="forge-input" value={schema.epochName}
               onChange={e => onChange({ ...schema, epochName: e.target.value })} />
      </div>

      {/* Months */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forge-subtle)' }}>
            Months ({schema.months.length})
          </label>
          <button onClick={addMonth} className="forge-btn forge-btn-ghost p-0.5">
            <Plus size={12} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>
        <div className="space-y-2">
          {schema.months.map((m, i) => (
            <div key={i} className="forge-panel p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <input
                  className="forge-input flex-1 text-xs py-1"
                  value={m.name}
                  onChange={e => updateMonth(i, 'name', e.target.value)}
                  placeholder="Month name"
                />
                <input
                  className="forge-input text-xs py-1"
                  style={{ width: 52 }}
                  type="number" min={1} max={100}
                  value={m.days}
                  onChange={e => updateMonth(i, 'days', +e.target.value)}
                />
                <button onClick={() => removeMonth(i)} className="shrink-0">
                  <Trash2 size={11} style={{ color: 'var(--forge-danger)' }} />
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--forge-subtle)' }}>
                <input type="checkbox" checked={m.intercalary}
                       onChange={e => updateMonth(i, 'intercalary', e.target.checked)} />
                Intercalary (void days)
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Weekdays */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forge-subtle)' }}>
            Weekdays ({schema.daysPerWeek})
          </label>
          <button onClick={addWeekday} className="forge-btn forge-btn-ghost p-0.5">
            <Plus size={12} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>
        <div className="space-y-1.5">
          {schema.weekdays.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="forge-input flex-1 text-xs py-1"
                value={w.name}
                onChange={e => updateWeekday(i, 'name', e.target.value)}
                placeholder="Day name"
              />
              <input
                className="forge-input text-xs py-1"
                style={{ width: 52 }}
                value={w.abbreviation}
                onChange={e => updateWeekday(i, 'abbreviation', e.target.value.slice(0, 4))}
                placeholder="Abbr"
              />
              <button onClick={() => removeWeekday(i)}>
                <Trash2 size={11} style={{ color: 'var(--forge-danger)' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Eras */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forge-subtle)' }}>
            Eras
          </label>
          <button onClick={addEra} className="forge-btn forge-btn-ghost p-0.5">
            <Plus size={12} style={{ color: 'var(--forge-accent)' }} />
          </button>
        </div>
        <div className="space-y-2">
          {schema.eras.map((era, i) => (
            <div key={i} className="forge-panel p-2 space-y-1.5">
              <input
                className="forge-input text-xs py-1 w-full"
                value={era.name}
                onChange={e => updateEra(i, 'name', e.target.value)}
                placeholder="Era name"
              />
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <div className="text-xs mb-0.5" style={{ color: 'var(--forge-subtle)' }}>Start year</div>
                  <input className="forge-input text-xs py-1 w-full" type="number"
                         value={era.startYear} onChange={e => updateEra(i, 'startYear', +e.target.value)} />
                </div>
                <div className="flex-1">
                  <div className="text-xs mb-0.5" style={{ color: 'var(--forge-subtle)' }}>End year (blank = ongoing)</div>
                  <input className="forge-input text-xs py-1 w-full" type="number"
                         value={era.endYear ?? ""}
                         onChange={e => updateEra(i, 'endYear', e.target.value ? +e.target.value : null)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leap year rule */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--forge-subtle)' }}>
          Leap Year Rule
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2" style={{ color: 'var(--forge-text)' }}>
          <input
            type="checkbox"
            checked={!!schema.leapYearRule}
            onChange={e => onChange({
              ...schema,
              leapYearRule: e.target.checked
                ? { every: 4, extraDays: 1, inMonth: schema.months[0]?.name ?? "" }
                : null,
            })}
          />
          Enable leap years
        </label>
        {schema.leapYearRule && (
          <div className="forge-panel p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--forge-subtle)' }}>Every N years</div>
                <input className="forge-input text-xs py-1" type="number" min={2}
                       value={schema.leapYearRule.every}
                       onChange={e => onChange({ ...schema, leapYearRule: { ...schema.leapYearRule!, every: +e.target.value } })} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--forge-subtle)' }}>Extra days</div>
                <input className="forge-input text-xs py-1" type="number" min={1}
                       value={schema.leapYearRule.extraDays}
                       onChange={e => onChange({ ...schema, leapYearRule: { ...schema.leapYearRule!, extraDays: +e.target.value } })} />
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--forge-subtle)' }}>Add extra days to month</div>
              <select className="forge-input text-xs py-1"
                      value={schema.leapYearRule.inMonth}
                      onChange={e => onChange({ ...schema, leapYearRule: { ...schema.leapYearRule!, inMonth: e.target.value } })}>
                {schema.months.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
