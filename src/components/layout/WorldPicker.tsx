// src/components/layout/WorldPicker.tsx
import { useState } from "react";
import { Plus, Globe } from "lucide-react";
import { worldsDb } from "@/lib/db";
import type { World } from "@/types";

interface Props {
  worlds: World[];
  onWorldCreated: (w: World) => void;
}

export default function WorldPicker({ worlds, onWorldCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const id = await worldsDb.create(name.trim(), desc.trim());
    const world = await worldsDb.get(id);
    if (world) onWorldCreated(world);
    setLoading(false);
  }

  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ background: 'var(--forge-bg)' }}
    >
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Globe size={48} className="mx-auto mb-3" style={{ color: 'var(--forge-accent)' }} />
          <h1 className="forge-title text-4xl mb-2" style={{ color: 'var(--forge-accent)' }}>
            WorldForge
          </h1>
          <p style={{ color: 'var(--forge-subtle)' }}>
            Build your world. Chronicle its history.
          </p>
        </div>

        {worlds.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--forge-subtle)' }}>
              Your Worlds
            </h2>
            <div className="space-y-2">
              {worlds.map(w => (
                <button
                  key={w.id}
                  onClick={() => onWorldCreated(w)}
                  className="w-full forge-panel p-4 text-left hover:border-forge-accent transition-colors"
                >
                  <div className="font-semibold forge-title" style={{ color: 'var(--forge-text)' }}>
                    {w.name}
                  </div>
                  {w.description && (
                    <div className="text-xs mt-1" style={{ color: 'var(--forge-subtle)' }}>
                      {w.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="forge-btn forge-btn-primary w-full justify-center py-3"
          >
            <Plus size={16} /> Create New World
          </button>
        ) : (
          <div className="forge-panel p-4 space-y-3">
            <h3 className="forge-title font-semibold" style={{ color: 'var(--forge-accent)' }}>
              New World
            </h3>
            <input
              className="forge-input"
              placeholder="World name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <textarea
              className="forge-input"
              placeholder="Description (optional)..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              style={{ resize: 'none' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || loading}
                className="forge-btn forge-btn-primary flex-1 justify-center"
              >
                {loading ? "Creating..." : "Create World"}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="forge-btn forge-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
