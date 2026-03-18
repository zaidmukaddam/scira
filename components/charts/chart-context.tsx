"use client";

import type { scaleBand, scaleLinear, scaleTime } from "@visx/scale";

type ScaleLinear<Output, _Input = number> = ReturnType<
  typeof scaleLinear<Output>
>;
type ScaleTime<Output, _Input = Date | number> = ReturnType<
  typeof scaleTime<Output>
>;
type ScaleBand<Domain extends { toString(): string }> = ReturnType<
  typeof scaleBand<Domain>
>;

import {
  createContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useContext,
} from "react";

// CSS variable references for theming
export const chartCssVars = {
  background: "var(--chart-background)",
  foreground: "var(--chart-foreground)",
  foregroundMuted: "var(--chart-foreground-muted)",
  label: "var(--chart-label)",
  linePrimary: "var(--chart-line-primary)",
  lineSecondary: "var(--chart-line-secondary)",
  crosshair: "var(--chart-crosshair)",
  grid: "var(--chart-grid)",
  markerBackground: "var(--chart-marker-background)",
  markerBorder: "var(--chart-marker-border)",
  markerForeground: "var(--chart-marker-foreground)",
  badgeBackground: "var(--chart-marker-badge-background)",
  badgeForeground: "var(--chart-marker-badge-foreground)",
};

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TooltipData {
  /** The data point being hovered */
  point: Record<string, unknown>;
  /** Index in the data array */
  index: number;
  /** X position in pixels (relative to chart area) */
  x: number;
  /** Y positions for each line, keyed by dataKey */
  yPositions: Record<string, number>;
  /** X positions for each series (for grouped bars), keyed by dataKey */
  xPositions?: Record<string, number>;
}

export interface LineConfig {
  dataKey: string;
  stroke: string;
  strokeWidth: number;
}

export interface ChartContextValue {
  // Data
  data: Record<string, unknown>[];

  // Scales
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;

  // Dimensions
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;

  // Column width for spacing calculations
  columnWidth: number;

  // Tooltip state
  tooltipData: TooltipData | null;
  setTooltipData: Dispatch<SetStateAction<TooltipData | null>>;

  // Container ref for portals
  containerRef: RefObject<HTMLDivElement | null>;

  // Line configurations (extracted from children)
  lines: LineConfig[];

  // Animation state
  isLoaded: boolean;
  animationDuration: number;

  // X accessor - how to get the x value from data points
  xAccessor: (d: Record<string, unknown>) => Date;

  // Pre-computed date labels for ticker animation
  dateLabels: string[];

  // Bar chart specific (optional - only present in BarChart)
  /** Band scale for categorical x-axis (bar charts) */
  barScale?: ScaleBand<string>;
  /** Width of each bar band */
  bandWidth?: number;
  /** Index of currently hovered bar */
  hoveredBarIndex?: number | null;
  /** Setter for hovered bar index */
  setHoveredBarIndex?: (index: number | null) => void;
  /** X accessor for bar charts (returns string instead of Date) */
  barXAccessor?: (d: Record<string, unknown>) => string;
  /** Bar chart orientation */
  orientation?: "vertical" | "horizontal";
  /** Whether bars are stacked */
  stacked?: boolean;
  /** Stack offsets: Map of data index -> Map of dataKey -> cumulative offset */
  stackOffsets?: Map<number, Map<string, number>>;
}

const ChartContext = createContext<ChartContextValue | null>(null);

export function ChartProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChartContextValue;
}) {
  return (
    <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
  );
}

export function useChart(): ChartContextValue {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error(
      "useChart must be used within a ChartProvider. " +
        "Make sure your component is wrapped in <LineChart>, <AreaChart>, or <BarChart>."
    );
  }
  return context;
}

export default ChartContext;
