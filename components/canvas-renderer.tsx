"use client";

import React, { memo } from "react";
import { type Spec } from "@json-render/react";
import { CanvasRenderer as CanvasRendererCore } from "@/lib/canvas/renderer";

interface CanvasRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

export const CanvasRendererView = memo(function CanvasRendererView({
  spec,
  loading,
}: CanvasRendererProps) {
  if (!spec && !loading) return null;

  if (spec) {
    return <CanvasRendererCore spec={spec} loading={loading} />;
  }

  // Loading skeleton
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
      <div className="h-48 bg-muted rounded" />
    </div>
  );
});
