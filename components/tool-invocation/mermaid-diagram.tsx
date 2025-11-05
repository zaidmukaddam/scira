"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "lucide-react";

type MermaidModule = typeof import("mermaid").default;

let mermaidModule: MermaidModule | null = null;

const loadMermaid = async () => {
  if (!mermaidModule) {
    mermaidModule = (await import("mermaid")).default;
  }
  return mermaidModule;
};

function createDebounce() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function debounce(fn: () => void, delay: number) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  }
  debounce.clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  return debounce;
}

interface MermaidDiagramProps {
  chart?: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const { theme } = useTheme();
  const [state, setState] = useState({
    svg: "",
    error: null as string | null,
    loading: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const previousChartRef = useRef<string>(chart ?? "");
  const debounce = useMemo(() => createDebounce(), []);

  useEffect(() => {
    if (previousChartRef.current !== chart) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      previousChartRef.current = chart ?? "";
    }

    debounce(async () => {
      const trimmed = chart?.trim();
      if (!trimmed) {
        setState({ svg: "", error: null, loading: false });
        return;
      }

      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
        });

        await mermaid.parse(trimmed);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, trimmed);

        setState({ svg, error: null, loading: false });
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        setState({
          svg: "",
          error: error instanceof Error ? error.message : "Failed to render diagram",
          loading: false,
        });
      }
    }, 500);

    return () => {
      debounce.clear();
    };
  }, [chart, theme, debounce]);

  if (state.loading) {
    return (
      <div className="px-6 overflow-auto">
        <div className="flex items-center justify-center h-20 w-full">
          <div className="text-muted-foreground flex items-center gap-2">
            Rendering diagram <Loader className="size-4 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="px-6 pb-6 overflow-auto">
        <div className="text-destructive p-4">
          <p>Error rendering Mermaid diagram:</p>
          <pre className="mt-2 p-2 bg-destructive/10 dark:bg-destructive/20 rounded text-xs overflow-auto">
            {state.error}
          </pre>
          <pre className="mt-2 p-2 bg-accent/10 dark:bg-accent/20 rounded text-xs overflow-auto">
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 overflow-auto">
      <div
        ref={containerRef}
        className="flex justify-center transition-opacity duration-200 overflow-auto"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </div>
  );
}
