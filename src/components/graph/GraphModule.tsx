import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BookOpen, ExternalLink, GitBranch, RefreshCw } from "lucide-react";
import { pagesDb } from "@/lib/db";
import { useAppStore } from "@/store";
import type { Page } from "@/types";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 76;
const COLUMN_GAP = 80;
const ROW_GAP = 34;
const COLUMNS = 4;

type GraphNodeData = {
  label: string;
  template: Page["template_type"];
  connections: number;
};

type GraphNode = Node<GraphNodeData, "page">;
const nodeTypes = { page: GraphNode };

export default function GraphModule() {
  const { activeWorld, pages, setActiveModule, setActivePage } = useAppStore();
  const wikiPages = useMemo(() => pages.filter(page => page.type === "wiki"), [pages]);
  const [links, setLinks] = useState<{ source_id: string; target_id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!activeWorld) return;
    setLoading(true);
    try {
      setLinks(await pagesDb.getLinks(activeWorld.id));
    } catch (error) {
      console.error("Failed to load knowledge graph links:", error);
    } finally {
      setLoading(false);
    }
  }, [activeWorld]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks, wikiPages.length]);

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of links) {
      counts.set(link.source_id, (counts.get(link.source_id) ?? 0) + 1);
      counts.set(link.target_id, (counts.get(link.target_id) ?? 0) + 1);
    }
    return counts;
  }, [links]);

  const nodes = useMemo<GraphNode[]>(() => {
    return wikiPages.map((page, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      return {
        id: page.id,
        type: "page",
        position: {
          x: column * (NODE_WIDTH + COLUMN_GAP),
          y: row * (NODE_HEIGHT + ROW_GAP),
        },
        data: {
          label: page.title,
          template: page.template_type,
          connections: connectionCounts.get(page.id) ?? 0,
        },
        style: {
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          padding: 0,
          border: "1px solid var(--forge-border)",
          borderRadius: 6,
          background: "var(--forge-surface)",
          color: "var(--forge-text)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
        },
      };
    });
  }, [connectionCounts, wikiPages]);

  const edges = useMemo<Edge[]>(() => {
    return links.map((link, index) => ({
      id: `${link.source_id}-${link.target_id}-${index}`,
      source: link.source_id,
      target: link.target_id,
      type: "smoothstep",
      animated: false,
      style: { stroke: "var(--forge-accent)", strokeWidth: 1.5 },
      markerEnd: { type: "arrowclosed", color: "var(--forge-accent)" },
    }));
  }, [links]);

  const openPage = useCallback<NodeMouseHandler<GraphNode>>((_event, node) => {
    const page = wikiPages.find(item => item.id === node.id);
    if (!page) return;
    setActivePage(page);
    setActiveModule("wiki");
  }, [setActiveModule, setActivePage, wikiPages]);

  if (!activeWorld) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--forge-border)", background: "var(--forge-surface)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={16} style={{ color: "var(--forge-accent)" }} />
            <h1 className="forge-title text-base font-semibold" style={{ color: "var(--forge-text)" }}>
              Knowledge Graph
            </h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--forge-subtle)" }}>
            {wikiPages.length} {wikiPages.length === 1 ? "page" : "pages"} · {links.length} {links.length === 1 ? "link" : "links"}
          </p>
        </div>
        <button
          onClick={() => void loadLinks()}
          className="forge-btn forge-btn-ghost"
          disabled={loading}
          title="Refresh graph"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {wikiPages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3" style={{ color: "var(--forge-muted)" }} />
              <p style={{ color: "var(--forge-subtle)" }}>Create wiki pages to grow your knowledge graph.</p>
              <button
                onClick={() => setActiveModule("wiki")}
                className="forge-btn forge-btn-primary mt-4"
              >
                Open Wiki
              </button>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={openPage}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.8}
            colorMode="dark"
          >
            <Background color="var(--forge-border)" gap={24} size={1} />
            <Controls />
            <MiniMap
              nodeColor="var(--forge-accent)"
              maskColor="rgba(15, 14, 12, 0.75)"
              pannable
              zoomable
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export function GraphNode({ data }: { data: GraphNodeData }) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <BookOpen size={14} className="mt-0.5 shrink-0" style={{ color: "var(--forge-accent)" }} />
        <span className="truncate text-sm font-medium" title={data.label}>{data.label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: "var(--forge-subtle)" }}>
        <span>{data.template ?? "wiki page"}</span>
        <span className="flex items-center gap-1"><ExternalLink size={10} /> {data.connections}</span>
      </div>
    </div>
  );
}
