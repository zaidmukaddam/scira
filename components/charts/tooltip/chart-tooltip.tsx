"use client";

import { motion, useSpring } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { chartCssVars, useChart } from "../chart-context";
import { DateTicker } from "./date-ticker";
import { TooltipBox } from "./tooltip-box";
import { TooltipContent, type TooltipRow } from "./tooltip-content";
import { TooltipDot } from "./tooltip-dot";
import { TooltipIndicator } from "./tooltip-indicator";

// Spring config for crosshair
const crosshairSpringConfig = { stiffness: 300, damping: 30 };

export interface ChartTooltipProps {
  /** Whether to show the date pill at bottom. Default: true */
  showDatePill?: boolean;
  /** Whether to show the vertical crosshair line. Default: true */
  showCrosshair?: boolean;
  /** Whether to show dots on the lines. Default: true */
  showDots?: boolean;
  /** Custom content renderer for the tooltip box */
  content?: (props: {
    point: Record<string, unknown>;
    index: number;
  }) => React.ReactNode;
  /** Custom row renderer - return array of TooltipRow */
  rows?: (point: Record<string, unknown>) => TooltipRow[];
  /** Additional content to show below rows (e.g., markers) */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export function ChartTooltip({
  showDatePill = true,
  showCrosshair = true,
  showDots = true,
  content,
  rows: rowsRenderer,
  children,
  className = "",
}: ChartTooltipProps) {
  const {
    tooltipData,
    width,
    height,
    innerHeight,
    margin,
    columnWidth,
    lines,
    xAccessor,
    dateLabels,
    containerRef,
    orientation,
    barXAccessor,
  } = useChart();

  const isHorizontal = orientation === "horizontal";

  const [mounted, setMounted] = useState(false);

  // Only render portals on client side after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const visible = tooltipData !== null;
  const x = tooltipData?.x ?? 0;
  const xWithMargin = x + margin.left;

  // For horizontal charts, get the y position from the first line's yPosition (center of bar)
  const firstLineDataKey = lines[0]?.dataKey;
  const firstLineY = firstLineDataKey
    ? (tooltipData?.yPositions[firstLineDataKey] ?? 0)
    : 0;
  const yWithMargin = firstLineY + margin.top;

  // Animated crosshair position
  const animatedX = useSpring(xWithMargin, crosshairSpringConfig);

  useEffect(() => {
    animatedX.set(xWithMargin);
  }, [xWithMargin, animatedX]);

  // Generate rows from lines
  const tooltipRows = useMemo(() => {
    if (!tooltipData) {
      return [];
    }

    if (rowsRenderer) {
      return rowsRenderer(tooltipData.point);
    }

    // Default: generate rows from registered lines
    return lines.map((line) => ({
      color: line.stroke,
      label: line.dataKey,
      value: (tooltipData.point[line.dataKey] as number) ?? 0,
    }));
  }, [tooltipData, lines, rowsRenderer]);

  // Title from date or category
  const title = useMemo(() => {
    if (!tooltipData) {
      return undefined;
    }
    if (isHorizontal && barXAccessor) {
      // For horizontal bar charts, use the category name
      return barXAccessor(tooltipData.point);
    }
    // For vertical charts, use the date
    return xAccessor(tooltipData.point).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [tooltipData, isHorizontal, barXAccessor, xAccessor]);

  // Use portal to render into the chart container
  // Only render after mount on client side
  const container = containerRef.current;
  if (!(mounted && container)) {
    return null;
  }

  // Dynamic import to avoid SSR issues
  const { createPortal } = require("react-dom") as typeof import("react-dom");

  const tooltipContent = (
    <>
      {/* Crosshair indicator - rendered as SVG overlay */}
      {showCrosshair && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          height="100%"
          width="100%"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            <TooltipIndicator
              colorEdge={chartCssVars.crosshair}
              colorMid={chartCssVars.crosshair}
              columnWidth={columnWidth}
              fadeEdges
              height={innerHeight}
              visible={visible}
              width="line"
              x={x}
            />
          </g>
        </svg>
      )}

      {/* Dots on bars/lines - show for vertical charts only */}
      {showDots && visible && !isHorizontal && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          height="100%"
          width="100%"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {lines.map((line) => (
              <TooltipDot
                color={line.stroke}
                key={line.dataKey}
                strokeColor={chartCssVars.background}
                visible={visible}
                x={tooltipData?.xPositions?.[line.dataKey] ?? x}
                y={tooltipData?.yPositions[line.dataKey] ?? 0}
              />
            ))}
          </g>
        </svg>
      )}

      {/* Tooltip Box */}
      <TooltipBox
        className={className}
        containerHeight={height}
        containerRef={containerRef}
        containerWidth={width}
        top={isHorizontal ? undefined : margin.top}
        visible={visible}
        x={xWithMargin}
        y={isHorizontal ? yWithMargin : margin.top}
      >
        {content ? (
          content({
            point: tooltipData?.point ?? {},
            index: tooltipData?.index ?? 0,
          })
        ) : (
          <TooltipContent rows={tooltipRows} title={title}>
            {children}
          </TooltipContent>
        )}
      </TooltipBox>

      {/* Date/Category Ticker - only show for vertical charts */}
      {showDatePill && dateLabels.length > 0 && visible && !isHorizontal && (
        <motion.div
          className="pointer-events-none absolute z-50"
          style={{
            left: animatedX,
            transform: "translateX(-50%)",
            bottom: 4,
          }}
        >
          <DateTicker
            currentIndex={tooltipData?.index ?? 0}
            labels={dateLabels}
            visible={visible}
          />
        </motion.div>
      )}
    </>
  );

  return createPortal(tooltipContent, container);
}

ChartTooltip.displayName = "ChartTooltip";

export default ChartTooltip;
