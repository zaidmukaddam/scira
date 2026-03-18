"use client";

import { useMemo, type ReactNode } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { registry, Fallback } from "./registry";

// =============================================================================
// CanvasRenderer
// =============================================================================

interface CanvasRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

/** Ensure all element children fields are arrays (AI sometimes outputs a single string) */
function sanitizeSpec(spec: Spec): Spec {
  const elements = { ...spec.elements };
  for (const key of Object.keys(elements)) {
    const el = elements[key];
    if (el && el.children != null && !Array.isArray(el.children)) {
      elements[key] = { ...el, children: [el.children as unknown as string] };
    }
  }
  return { ...spec, elements };
}

export function CanvasRenderer({
  spec,
  loading,
}: CanvasRendererProps): ReactNode {
  const safeSpec = useMemo(() => (spec ? sanitizeSpec(spec) : null), [spec]);

  if (!safeSpec) return null;

  return (
    <StateProvider initialState={safeSpec.state ?? {}}>
      <VisibilityProvider>
        <ActionProvider>
          <div className={loading ? "" : "canvas-stagger"}>
            <Renderer
              spec={safeSpec}
              registry={registry}
              fallback={fallback}
              loading={loading}
            />
          </div>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
