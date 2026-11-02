// src/components/layout/TopBar.tsx
import { PanelLeft, Globe, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  notes: "Notes",
  wiki: "Wiki",
  map: "Map",
  timeline: "Timeline",
  calendar: "Calendar",
  graph: "Knowledge Graph",
};

export default function TopBar() {
  const { activeWorld, activeModule, activePage, setSidebarOpen, sidebarOpen } = useAppStore();

  return (
    <header
      className="flex items-center gap-3 px-4 h-11 shrink-0"
      style={{
        background: 'var(--forge-surface)',
        borderBottom: '1px solid var(--forge-border)',
      }}
    >
      {/* Toggle sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="forge-btn forge-btn-ghost p-1.5"
        title="Toggle Sidebar"
      >
        <PanelLeft size={15} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Globe size={13} style={{ color: 'var(--forge-accent)' }} />
        <span className="forge-title" style={{ color: 'var(--forge-accent)', fontSize: '13px' }}>
          {activeWorld?.name}
        </span>
        <ChevronRight size={12} style={{ color: 'var(--forge-muted)' }} />
        <span style={{ color: 'var(--forge-subtle)' }}>
          {MODULE_LABELS[activeModule]}
        </span>
        {activePage && (
          <>
            <ChevronRight size={12} style={{ color: 'var(--forge-muted)' }} />
            <span style={{ color: 'var(--forge-text)' }}>{activePage.title}</span>
          </>
        )}
      </div>
    </header>
  );
}
