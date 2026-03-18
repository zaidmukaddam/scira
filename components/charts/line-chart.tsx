"use client";

import { localPoint } from "@visx/event";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { bisector } from "d3-array";
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
import {
  ChartProvider,
  type LineConfig,
  type Margin,
  type TooltipData,
} from "./chart-context";
import { Line, type LineProps } from "./line";

// Check if a component should render after the mouse overlay (markers need to be on top for interaction)
function isPostOverlayComponent(child: ReactElement): boolean {
  const childType = child.type as {
    displayName?: string;
    name?: string;
    __isChartMarkers?: boolean;
  };

  // Check for static marker property (more reliable than displayName)
  if (childType.__isChartMarkers) {
    return true;
  }

  // Fallback to displayName check
  const componentName =
    typeof child.type === "function"
      ? childType.displayName || childType.name || ""
      : "";

  return componentName === "ChartMarkers" || componentName === "MarkerGroup";
}

export interface LineChartProps {
  /** Data array - each item should have a date field and numeric values */
  data: Record<string, unknown>[];
  /** Key in data for the x-axis (date). Default: "date" */
  xDataKey?: string;
  /** Chart margins */
  margin?: Partial<Margin>;
  /** Animation duration in milliseconds. Default: 1100 */
  animationDuration?: number;
  /** Aspect ratio as "width / height". Default: "2 / 1" */
  aspectRatio?: string;
  /** Additional class name for the container */
  className?: string;
  /** Child components (Line, Grid, ChartTooltip, etc.) */
  children: ReactNode;
}

const DEFAULT_MARGIN: Margin = { top: 40, right: 40, bottom: 40, left: 40 };

// Extract line configs from children synchronously to avoid render timing issues
function extractLineConfigs(children: ReactNode): LineConfig[] {
  const configs: LineConfig[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    // Check if it's a Line component by displayName, function reference, or props structure
    const childType = child.type as {
      displayName?: string;
      name?: string;
    };
    const componentName =
      typeof child.type === "function"
        ? childType.displayName || childType.name || ""
        : "";

    // Check by displayName, or by props having dataKey (duck typing)
    const props = child.props as LineProps | undefined;
    const isLineComponent =
      componentName === "Line" ||
      child.type === Line ||
      (props && typeof props.dataKey === "string" && props.dataKey.length > 0);

    if (isLineComponent && props?.dataKey) {
      configs.push({
        dataKey: props.dataKey,
        stroke: props.stroke || "var(--chart-line-primary)",
        strokeWidth: props.strokeWidth || 2.5,
      });
    }
  });

  return configs;
}

interface ChartInnerProps {
  width: number;
  height: number;
  data: Record<string, unknown>[];
  xDataKey: string;
  margin: Margin;
  animationDuration: number;
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
  children,
  containerRef,
}: ChartInnerProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract line configs synchronously from children
  const lines = useMemo(() => extractLineConfigs(children), [children]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // X accessor function
  const xAccessor = useCallback(
    (d: Record<string, unknown>): Date => {
      const value = d[xDataKey];
      return value instanceof Date ? value : new Date(value as string | number);
    },
    [xDataKey]
  );

  // Create bisector for finding nearest data point
  const bisectDate = useMemo(
    () => bisector<Record<string, unknown>, Date>((d) => xAccessor(d)).left,
    [xAccessor]
  );

  // X scale (time) - use exact data domain for tight fit
  const xScale = useMemo(() => {
    const dates = data.map((d) => xAccessor(d));
    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));

    return scaleTime({
      range: [0, innerWidth],
      domain: [minTime, maxTime],
    });
  }, [innerWidth, data, xAccessor]);

  // Calculate column width (spacing between data points)
  const columnWidth = useMemo(() => {
    if (data.length < 2) {
      return 0;
    }
    return innerWidth / (data.length - 1);
  }, [innerWidth, data.length]);

  // Y scale - computed from extracted line configs (available immediately)
  const yScale = useMemo(() => {
    // Find max value across all line dataKeys
    let maxValue = 0;
    for (const line of lines) {
      for (const d of data) {
        const value = d[line.dataKey];
        if (typeof value === "number" && value > maxValue) {
          maxValue = value;
        }
      }
    }

    // Ensure we have a valid domain even if no data
    if (maxValue === 0) {
      maxValue = 100;
    }

    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, maxValue * 1.1], // Add 10% padding
      nice: true,
    });
  }, [innerHeight, data, lines]);

  // Pre-compute date labels for ticker animation
  const dateLabels = useMemo(
    () =>
      data.map((d) =>
        xAccessor(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      ),
    [data, xAccessor]
  );

  // Animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, animationDuration);
    return () => clearTimeout(timer);
  }, [animationDuration]);

  // Mouse move handler - works on the parent <g> element
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      const point = localPoint(event);
      if (!point) {
        return;
      }

      // localPoint returns coordinates relative to the SVG root, so subtract margin
      const x0 = xScale.invert(point.x - margin.left);
      const index = bisectDate(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];

      if (!d0) {
        return;
      }

      // Find closest point
      let d = d0;
      let finalIndex = index - 1;
      if (d1) {
        const d0Time = xAccessor(d0).getTime();
        const d1Time = xAccessor(d1).getTime();
        if (x0.getTime() - d0Time > d1Time - x0.getTime()) {
          d = d1;
          finalIndex = index;
        }
      }

      // Calculate y positions for each line
      const yPositions: Record<string, number> = {};
      for (const line of lines) {
        const value = d[line.dataKey];
        if (typeof value === "number") {
          yPositions[line.dataKey] = yScale(value) ?? 0;
        }
      }

      setTooltipData({
        point: d,
        index: finalIndex,
        x: xScale(xAccessor(d)) ?? 0,
        yPositions,
      });
    },
    [xScale, yScale, data, lines, margin.left, xAccessor, bisectDate]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  // Early return if dimensions not ready
  if (width < 10 || height < 10) {
    return null;
  }

  const canInteract = isLoaded;

  // Separate children into pre-overlay (Grid, Line) and post-overlay (ChartMarkers)
  const preOverlayChildren: ReactElement[] = [];
  const postOverlayChildren: ReactElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (isPostOverlayComponent(child)) {
      postOverlayChildren.push(child);
    } else {
      preOverlayChildren.push(child);
    }
  });

  const contextValue = {
    data,
    xScale,
    yScale,
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
    xAccessor,
    dateLabels,
  };

  return (
    <ChartProvider value={contextValue}>
      <svg aria-hidden="true" height={height} width={width}>
        <defs>
          {/* Clip path for grow animation */}
          <clipPath id="chart-grow-clip">
            <rect
              height={innerHeight + 20}
              style={{
                transition: isLoaded
                  ? "none"
                  : `width ${animationDuration}ms cubic-bezier(0.85, 0, 0.15, 1)`,
              }}
              width={isLoaded ? innerWidth : 0}
              x={0}
              y={0}
            />
          </clipPath>
        </defs>

        <rect fill="transparent" height={height} width={width} x={0} y={0} />

        {/* biome-ignore lint/a11y/noStaticElementInteractions: Chart interaction area */}
        <g
          onMouseLeave={canInteract ? handleMouseLeave : undefined}
          onMouseMove={canInteract ? handleMouseMove : undefined}
          style={{ cursor: canInteract ? "crosshair" : "default" }}
          transform={`translate(${margin.left},${margin.top})`}
        >
          {/* Background rect for mouse event detection - markers rendered after this will receive events on top */}
          <rect
            fill="transparent"
            height={innerHeight}
            width={innerWidth}
            x={0}
            y={0}
          />

          {/* SVG children rendered before markers (Grid, Line, etc.) */}
          {preOverlayChildren}

          {/* Markers rendered last so they're on top for interaction */}
          {postOverlayChildren}
        </g>
      </svg>
    </ChartProvider>
  );
}

export function LineChart({
  data,
  xDataKey = "date",
  margin: marginProp,
  animationDuration = 1100,
  aspectRatio = "2 / 1",
  className = "",
  children,
}: LineChartProps) {
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
            containerRef={containerRef}
            data={data}
            height={height}
            margin={margin}
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

// Re-export Line for convenience
export { Line, type LineProps } from "./line";

export default LineChart;
