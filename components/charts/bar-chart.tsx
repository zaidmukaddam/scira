"use client";

import { localPoint } from "@visx/event";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { BarProps } from "./bar";
import {
  ChartProvider,
  type LineConfig,
  type Margin,
  type TooltipData,
} from "./chart-context";

export type BarOrientation = "vertical" | "horizontal";

export interface BarChartProps {
  /** Data array - each item should have an x-axis key and numeric values */
  data: Record<string, unknown>[];
  /** Key in data for the categorical axis. Default: "name" */
  xDataKey?: string;
  /** Chart margins */
  margin?: Partial<Margin>;
  /** Animation duration in milliseconds. Default: 1100 */
  animationDuration?: number;
  /** Aspect ratio as "width / height". Default: "2 / 1" */
  aspectRatio?: string;
  /** Additional class name for the container */
  className?: string;
  /** Gap between bar groups as a fraction of band width (0-1). Default: 0.2 */
  barGap?: number;
  /** Fixed bar width in pixels. If not set, bars auto-size to fill the band. */
  barWidth?: number;
  /** Bar chart orientation. Default: "vertical" */
  orientation?: BarOrientation;
  /** Whether to stack bars instead of grouping them. Default: false */
  stacked?: boolean;
  /** Gap between stacked bar segments in pixels. Default: 0 */
  stackGap?: number;
  /** Child components (Bar, Grid, ChartTooltip, etc.) */
  children: ReactNode;
}

const DEFAULT_MARGIN: Margin = { top: 40, right: 40, bottom: 40, left: 40 };

// Extract bar configs from children synchronously
function extractBarConfigs(children: ReactNode): LineConfig[] {
  const configs: LineConfig[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const childType = child.type as {
      displayName?: string;
      name?: string;
    };
    const componentName =
      typeof child.type === "function"
        ? childType.displayName || childType.name || ""
        : "";

    const props = child.props as BarProps | undefined;
    const isBarComponent =
      componentName === "Bar" ||
      (props && typeof props.dataKey === "string" && props.dataKey.length > 0);

    if (isBarComponent && props?.dataKey) {
      // Use stroke for tooltip dot color if provided, otherwise fall back to fill
      // This allows gradient/pattern fills to have a solid dot color
      const dotColor =
        props.stroke || props.fill || "var(--chart-line-primary)";
      configs.push({
        dataKey: props.dataKey,
        stroke: dotColor,
        strokeWidth: 0,
      });
    }
  });

  return configs;
}

// Check if a component should render after the mouse overlay
function isPostOverlayComponent(child: ReactElement): boolean {
  const childType = child.type as {
    displayName?: string;
    name?: string;
    __isChartMarkers?: boolean;
  };

  if (childType.__isChartMarkers) {
    return true;
  }

  const componentName =
    typeof child.type === "function"
      ? childType.displayName || childType.name || ""
      : "";

  return componentName === "ChartMarkers" || componentName === "MarkerGroup";
}

interface ChartInnerProps {
  width: number;
  height: number;
  data: Record<string, unknown>[];
  xDataKey: string;
  margin: Margin;
  animationDuration: number;
  barGap: number;
  barWidthProp?: number;
  orientation: BarOrientation;
  stacked: boolean;
  stackGap: number;
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function ChartInner({
  width,
  height,
  data,
  xDataKey,
  margin,
  animationDuration,
  barGap,
  barWidthProp,
  orientation,
  stacked,
  stackGap,
  children,
  containerRef,
}: ChartInnerProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const isHorizontal = orientation === "horizontal";

  // Extract bar configs synchronously from children
  const lines = useMemo(() => extractBarConfigs(children), [children]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Category accessor function - returns string for categorical scale
  const categoryAccessor = useCallback(
    (d: Record<string, unknown>): string => {
      const value = d[xDataKey];
      if (value instanceof Date) {
        return value.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      return String(value ?? "");
    },
    [xDataKey]
  );

  // For compatibility with ChartContext, provide a Date-based xAccessor
  const xAccessorDate = useCallback(
    (d: Record<string, unknown>): Date => {
      const value = d[xDataKey];
      if (value instanceof Date) {
        return value;
      }
      return new Date();
    },
    [xDataKey]
  );

  // Category scale (band) - for the categorical axis
  const categoryScale = useMemo(() => {
    const domain = data.map((d) => categoryAccessor(d));
    const range: [number, number] = isHorizontal
      ? [0, innerHeight]
      : [0, innerWidth];
    return scaleBand<string>({
      range,
      domain,
      padding: barGap,
    });
  }, [innerWidth, innerHeight, data, categoryAccessor, barGap, isHorizontal]);

  // Band width for bars - use prop if provided, otherwise use scale's bandwidth
  const bandWidth = barWidthProp ?? categoryScale.bandwidth();

  // Compute max value considering stacking
  const maxValue = useMemo(() => {
    if (stacked) {
      // For stacked bars, sum all values at each data point
      let max = 0;
      for (const d of data) {
        let sum = 0;
        for (const line of lines) {
          const value = d[line.dataKey];
          if (typeof value === "number") {
            sum += value;
          }
        }
        if (sum > max) {
          max = sum;
        }
      }
      return max || 100;
    }
    // For grouped bars, find max single value
    let max = 0;
    for (const line of lines) {
      for (const d of data) {
        const value = d[line.dataKey];
        if (typeof value === "number" && value > max) {
          max = value;
        }
      }
    }
    return max || 100;
  }, [data, lines, stacked]);

  // Value scale (linear) - for the value axis
  const valueScale = useMemo(() => {
    const range = isHorizontal ? [0, innerWidth] : [innerHeight, 0];
    return scaleLinear({
      range,
      domain: [0, maxValue * 1.1],
      nice: true,
    });
  }, [innerWidth, innerHeight, maxValue, isHorizontal]);

  // Compute stack offsets for stacked bars
  const stackOffsets = useMemo(() => {
    if (!stacked) {
      return undefined;
    }
    const offsets = new Map<number, Map<string, number>>();
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (!d) {
        continue;
      }
      const pointOffsets = new Map<string, number>();
      let cumulative = 0;
      for (const line of lines) {
        pointOffsets.set(line.dataKey, cumulative);
        const value = d[line.dataKey];
        if (typeof value === "number") {
          cumulative += value;
        }
      }
      offsets.set(i, pointOffsets);
    }
    return offsets;
  }, [data, lines, stacked]);

  // Column width for tooltip indicator
  const columnWidth = useMemo(() => {
    if (data.length < 1) {
      return 0;
    }
    return isHorizontal ? innerHeight / data.length : innerWidth / data.length;
  }, [innerWidth, innerHeight, data.length, isHorizontal]);

  // Pre-compute labels for ticker animation
  const dateLabels = useMemo(
    () => data.map((d) => categoryAccessor(d)),
    [data, categoryAccessor]
  );

  // Create a fake time scale for compatibility with ChartContext
  const fakeTimeScale = useMemo(() => {
    const now = Date.now();
    const start = now - data.length * 24 * 60 * 60 * 1000;
    const scale = {
      ...categoryScale,
      domain: () => [new Date(start), new Date(now)],
      range: () => [0, innerWidth] as [number, number],
      invert: (x: number) => new Date(start + (x / innerWidth) * (now - start)),
      copy: () => scale,
    };
    return scale;
  }, [categoryScale, innerWidth, data.length]);

  // Animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, animationDuration);
    return () => clearTimeout(timer);
  }, [animationDuration]);

  // Mouse move handler
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      const point = localPoint(event);
      if (!point) {
        return;
      }

      const pos = isHorizontal ? point.y - margin.top : point.x - margin.left;

      // Find which band the mouse is over
      const bandIndex = Math.floor(pos / columnWidth);
      const clampedIndex = Math.max(0, Math.min(data.length - 1, bandIndex));
      const d = data[clampedIndex];

      if (!d) {
        return;
      }

      // Calculate positions for each bar
      const yPositions: Record<string, number> = {};
      const xPositions: Record<string, number> = {};
      const barPos = categoryScale(categoryAccessor(d)) ?? 0;

      if (isHorizontal) {
        // Horizontal bars: dots at end of bar (x = value), centered vertically in band
        const seriesCount = lines.length;
        const groupGap = seriesCount > 1 ? 4 : 0;
        const individualBarHeight =
          seriesCount > 0
            ? (bandWidth - groupGap * (seriesCount - 1)) / seriesCount
            : bandWidth;

        if (stacked) {
          // Stacked horizontal: all bars same y, x at cumulative end
          let cumulative = 0;
          for (const line of lines) {
            const value = d[line.dataKey];
            if (typeof value === "number") {
              cumulative += value;
              xPositions[line.dataKey] = valueScale(cumulative) ?? 0;
              yPositions[line.dataKey] = barPos + bandWidth / 2;
            }
          }
        } else {
          // Grouped horizontal: each bar at its own y position
          lines.forEach((line, idx) => {
            const value = d[line.dataKey];
            if (typeof value === "number") {
              xPositions[line.dataKey] = valueScale(value) ?? 0;
              yPositions[line.dataKey] =
                barPos +
                idx * (individualBarHeight + groupGap) +
                individualBarHeight / 2;
            }
          });
        }
      } else if (stacked) {
        // Vertical stacked bars
        let cumulative = 0;
        let seriesIdx = 0;
        for (const line of lines) {
          const value = d[line.dataKey];
          if (typeof value === "number") {
            cumulative += value;
            const gapOffset = seriesIdx * stackGap;
            yPositions[line.dataKey] =
              (valueScale(cumulative) ?? 0) - gapOffset;
            seriesIdx++;
          }
        }
      } else {
        // Vertical grouped bars
        const seriesCount = lines.length;
        const groupGap = seriesCount > 1 ? 4 : 0;
        const individualBarWidth =
          seriesCount > 0
            ? (bandWidth - groupGap * (seriesCount - 1)) / seriesCount
            : bandWidth;

        lines.forEach((line, idx) => {
          const value = d[line.dataKey];
          if (typeof value === "number") {
            yPositions[line.dataKey] = valueScale(value) ?? 0;
            xPositions[line.dataKey] =
              barPos +
              idx * (individualBarWidth + groupGap) +
              individualBarWidth / 2;
          }
        });
      }

      // Tooltip position: for horizontal, position at max bar end; for vertical, center of band
      let tooltipX: number;
      if (isHorizontal) {
        // Position tooltip at the end of the longest bar
        const maxX = Math.max(...Object.values(xPositions), 0);
        tooltipX = maxX;
      } else {
        tooltipX = barPos + bandWidth / 2;
      }

      setTooltipData({
        point: d,
        index: clampedIndex,
        x: tooltipX,
        yPositions,
        xPositions: Object.keys(xPositions).length > 0 ? xPositions : undefined,
      });
      setHoveredBarIndex(clampedIndex);
    },
    [
      categoryScale,
      valueScale,
      data,
      lines,
      margin.left,
      margin.top,
      categoryAccessor,
      columnWidth,
      bandWidth,
      isHorizontal,
      stacked,
      stackGap,
    ]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
    setHoveredBarIndex(null);
  }, []);

  // Early return if dimensions not ready
  if (width < 10 || height < 10) {
    return null;
  }

  const canInteract = isLoaded;

  // Helper to check if a component is a gradient or pattern definition
  const isDefsComponent = (child: ReactElement): boolean => {
    const displayName =
      (child.type as { displayName?: string })?.displayName ||
      (child.type as { name?: string })?.name ||
      "";
    return (
      displayName.includes("Gradient") ||
      displayName.includes("Pattern") ||
      displayName === "LinearGradient" ||
      displayName === "RadialGradient"
    );
  };

  // Separate children into defs, pre-overlay, and post-overlay
  const defsChildren: ReactElement[] = [];
  const preOverlayChildren: ReactElement[] = [];
  const postOverlayChildren: ReactElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (isDefsComponent(child)) {
      defsChildren.push(child);
    } else if (isPostOverlayComponent(child)) {
      postOverlayChildren.push(child);
    } else {
      preOverlayChildren.push(child);
    }
  });

  const contextValue = {
    data,
    xScale: fakeTimeScale as unknown as ReturnType<
      typeof import("@visx/scale").scaleTime<number>
    >,
    yScale: valueScale,
    width,
    height,
    innerWidth,
    innerHeight,
    margin,
    columnWidth,
    tooltipData,
    setTooltipData,
    containerRef,
    lines,
    isLoaded,
    animationDuration,
    xAccessor: xAccessorDate,
    dateLabels,
    // Bar-specific properties
    barScale: categoryScale,
    bandWidth,
    hoveredBarIndex,
    setHoveredBarIndex,
    barXAccessor: categoryAccessor,
    orientation,
    stacked,
    stackOffsets,
  };

  return (
    <ChartProvider value={contextValue}>
      <svg aria-hidden="true" height={height} width={width}>
        {/* Gradient and pattern definitions */}
        {defsChildren.length > 0 && <defs>{defsChildren}</defs>}

        <rect fill="transparent" height={height} width={width} x={0} y={0} />

        {/* biome-ignore lint/a11y/noStaticElementInteractions: Chart interaction area */}
        <g
          onMouseLeave={canInteract ? handleMouseLeave : undefined}
          onMouseMove={canInteract ? handleMouseMove : undefined}
          style={{ cursor: canInteract ? "crosshair" : "default" }}
          transform={`translate(${margin.left},${margin.top})`}
        >
          {/* Background rect for mouse event detection */}
          <rect
            fill="transparent"
            height={innerHeight}
            width={innerWidth}
            x={0}
            y={0}
          />

          {/* SVG children rendered before markers */}
          {preOverlayChildren}

          {/* Markers rendered last so they're on top for interaction */}
          {postOverlayChildren}
        </g>
      </svg>
    </ChartProvider>
  );
}

export function BarChart({
  data,
  xDataKey = "name",
  margin: marginProp,
  animationDuration = 1100,
  aspectRatio = "2 / 1",
  className = "",
  barGap = 0.2,
  barWidth,
  orientation = "vertical",
  stacked = false,
  stackGap = 0,
  children,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const margin = { ...DEFAULT_MARGIN, ...marginProp };

  return (
    <div
      className={cn("relative w-full", className)}
      ref={containerRef}
      style={{ aspectRatio }}
    >
      <ParentSize debounceTime={10}>
        {({ width, height }) => (
          <ChartInner
            animationDuration={animationDuration}
            barGap={barGap}
            barWidthProp={barWidth}
            containerRef={containerRef}
            data={data}
            height={height}
            margin={margin}
            orientation={orientation}
            stacked={stacked}
            stackGap={stackGap}
            width={width}
            xDataKey={xDataKey}
          >
            {children}
          </ChartInner>
        )}
      </ParentSize>
    </div>
  );
}

BarChart.displayName = "BarChart";

export default BarChart;
