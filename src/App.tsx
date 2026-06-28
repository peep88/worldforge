// src/App.tsx
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { worldsDb } from "@/lib/db";
import type { World } from "@/types";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Dashboard from "@/components/layout/Dashboard";
import WorldPicker from "@/components/layout/WorldPicker";
import NotesModule from "@/components/notes/NotesModule";
import WikiModule from "@/components/wiki/WikiModule";
import MapModule from "@/components/map/MapModule";
import TimelineModule from "@/components/timeline/TimelineModule";
import CalendarModule from "@/components/calendar/CalendarModule";

export default function App() {
  const { activeWorld, activeModule, setActiveWorld, sidebarOpen } = useAppStore();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorlds();
  }, []);

  async function loadWorlds() {
    try {
      const list = await worldsDb.getAll();
      setWorlds(list);
      if (list.length > 0 && !activeWorld) {
        setActiveWorld(list[0]);
      }
    } catch (e) {
      console.error("Failed to load worlds:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--forge-bg)' }}>
        <div className="text-center">
          <div className="forge-title text-3xl mb-2" style={{ color: 'var(--forge-accent)' }}>
            WorldForge
          </div>
          <div style={{ color: 'var(--forge-subtle)' }}>Loading your worlds...</div>
        </div>
      </div>
    );
  }

  if (!activeWorld) {
    return <WorldPicker worlds={worlds} onWorldCreated={(w) => {
      setWorlds(prev => [w, ...prev]);
      setActiveWorld(w);
    }} />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case "notes":    return <NotesModule />;
      case "wiki":     return <WikiModule />;
      case "map":      return <MapModule />;
      case "timeline": return <TimelineModule />;
      case "calendar": return <CalendarModule />;
      default:         return <Dashboard worlds={worlds} onWorldChange={setActiveWorld} />;
    }
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--forge-bg)' }}>
      {sidebarOpen && <Sidebar />}

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
