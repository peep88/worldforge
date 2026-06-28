// src/components/layout/Dashboard.tsx
import { BookOpen, Map, Clock, CalendarDays, FileText, Plus } from "lucide-react";
import { useAppStore } from "@/store";
import type { World, ActiveModule } from "@/types";

interface Props {
  worlds: World[];
  onWorldChange: (w: World) => void;
}

export default function Dashboard({ worlds, onWorldChange }: Props) {
  const { activeWorld, pages, setActiveModule } = useAppStore();
  const noteCount = pages.filter(p => p.type === 'note').length;
  const wikiCount = pages.filter(p => p.type === 'wiki').length;

  const modules: { id: ActiveModule; icon: React.ReactNode; label: string; desc: string; stat?: string }[] = [
    { id: "notes",    icon: <FileText size={24} />, label: "Notes",    desc: "Quick notes and lore drafts",   stat: `${noteCount} notes` },
    { id: "wiki",     icon: <BookOpen size={24} />, label: "Wiki",     desc: "Characters, locations, factions", stat: `${wikiCount} pages` },
    { id: "map",      icon: <Map size={24} />,      label: "Map",      desc: "Draw and annotate your world",  stat: "Map editor" },
    { id: "timeline", icon: <Clock size={24} />,    label: "Timeline", desc: "Chronicle your world's history", stat: "Events & eras" },
    { id: "calendar", icon: <CalendarDays size={24} />, label: "Calendar", desc: "Custom fantasy calendar system", stat: "Date system" },
  ];

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="forge-title text-3xl mb-1" style={{ color: 'var(--forge-accent)' }}>
          {activeWorld?.name}
        </h1>
        <p style={{ color: 'var(--forge-subtle)' }}>
          {activeWorld?.description || "Your world awaits."}
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-2 gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className="forge-panel p-5 text-left transition-all hover:border-opacity-80 cursor-pointer"
            style={{ borderColor: 'var(--forge-border)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--forge-accent)';
              (e.currentTarget as HTMLElement).style.background = 'var(--forge-elevated)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--forge-border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--forge-surface)';
            }}
          >
            <div className="mb-3" style={{ color: 'var(--forge-accent)' }}>{mod.icon}</div>
            <div className="forge-title font-semibold mb-1" style={{ color: 'var(--forge-text)' }}>
              {mod.label}
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--forge-subtle)' }}>{mod.desc}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--forge-accent)' }}>{mod.stat}</div>
          </button>
        ))}
      </div>

      {/* Other worlds */}
      {worlds.length > 1 && (
        <div>
          <h2 className="forge-title text-sm font-semibold mb-3" style={{ color: 'var(--forge-subtle)' }}>
            OTHER WORLDS
          </h2>
          <div className="flex gap-2 flex-wrap">
            {worlds.filter(w => w.id !== activeWorld?.id).map(w => (
              <button
                key={w.id}
                onClick={() => onWorldChange(w)}
                className="forge-btn forge-btn-outline text-sm"
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
