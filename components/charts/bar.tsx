"use client";

import { motion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { chartCssVars, useChart } from "./chart-context";

export type BarLineCap = "round" | "butt" | number;
export type BarAnimationType = "grow" | "fade";

export interface BarProps {
  /** Key in data to use for y values */
  dataKey: string;
  /** Fill color for the bar. Can be a color, gradient url, or pattern url. Default: var(--chart-line-primary) */
  fill?: string;
  /** Color for tooltip dot. Use when fill is a gradient/pattern. Default: uses fill value */
  stroke?: string;
  /** Line cap style for bar ends: "round", "butt", or a number for custom radius. Default: "round" */
  lineCap?: BarLineCap;
  /** Whether to animate the bars. Default: true */
  animate?: boolean;
  /** Animation type: "grow" (height) or "fade" (opacity + blur). Default: "grow" */
  animationType?: BarAnimationType;
  /** Opacity when not hovered (when another bar is hovered). Default: 0.3 */
  fadedOpacity?: number;
  /** Stagger delay between bars in seconds. Auto-calculated if not provided. */
  staggerDelay?: number;
  /** Gap between stacked bars in pixels. Default: 0 */
  stackGap?: number;
}

// Same easing as Line chart for consistent animation feel
const BAR_EASING = "cubic-bezier(0.85, 0, 0.15, 1)";

interface AnimatedBarProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx: number;
  ry: number;
  index: number;
  isFaded: boolean;
  animationType: BarAnimationType;
  innerHeight: number;
  fadedOpacity: number;
  staggerDelay: number;
  animationDuration: number;
  isHorizontal: boolean;
}

function AnimatedBar({
  x,
  y,
  width,
  height,
  fill,
  rx,
  ry,
  index,
  isFaded,
  animationType,
  innerHeight,
  fadedOpacity,
  staggerDelay,
  animationDuration,
  isHorizontal,
}: AnimatedBarProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger animation after stagger delay
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setIsAnimated(true);
      },
      index * staggerDelay * 1000
    );
    return () => clearTimeout(timeout);
  }, [index, staggerDelay]);

  // Calculate the duration for this bar's animation
  // Each bar gets a proportional share of the remaining time
  const barDuration = animationDuration * 0.6; // 60% of total duration for the animation itself

  // Calculate opacity for fade animation (avoid nested ternary)
  const getFadeOpacity = () => {
    if (isFaded) {
      return fadedOpacity;
    }
    return isAnimated ? 1 : 0;
  };

  if (animationType === "fade") {
    return (
      <motion.rect
        animate={{
          opacity: getFadeOpacity(),
          filter: isAnimated ? "blur(0px)" : "blur(2px)",
        }}
        fill={fill}
        height={height}
        initial={{ opacity: 0, filter: "blur(2px)" }}
        rx={rx}
        ry={ry}
        style={{
          transition: `opacity ${barDuration}ms ${BAR_EASING}, filter ${barDuration}ms ${BAR_EASING}`,
        }}
        transition={{
          opacity: { duration: 0.15 },
        }}
        width={width}
        x={x}
        y={y}
      />
    );
  }

  // "grow" animation - bars grow from origin using CSS transitions
  const animatedProps = isHorizontal
    ? {
        width: isAnimated ? width : 0,
        height,
        x: 0,
        y,
      }
    : {
        width,
        height: isAnimated ? height : 0,
        x,
        y: isAnimated ? y : innerHeight,
      };

  return (
    <motion.rect
      animate={{
        opacity: isFaded ? fadedOpacity : 1,
      }}
      fill={fill}
      height={animatedProps.height}
      rx={rx}
      ry={ry}
      style={{
        transition: `width ${barDuration}ms ${BAR_EASING}, height ${barDuration}ms ${BAR_EASING}, x ${barDuration}ms ${BAR_EASING}, y ${barDuration}ms ${BAR_EASING}`,
      }}
      transition={{
        opacity: { duration: 0.15 },
      }}
      width={animatedProps.width}
      x={animatedProps.x}
      y={animatedProps.y}
    />
  );
}

export function Bar({
  dataKey,
  fill = chartCssVars.linePrimary,
  lineCap = "round",
  animate = true,
  animationType = "grow",
  fadedOpacity = 0.3,
  staggerDelay,
  stackGap = 0,
}: BarProps) {
  const {
    data,
    yScale,
    innerHeight,
    isLoaded,
    barScale,
    bandWidth,
    hoveredBarIndex,
    setHoveredBarIndex,
    barXAccessor,
    lines,
    orientation,
    stacked,
    stackOffsets,
    animationDuration,
  } = useChart();

  // Calculate stagger delay automatically if not provided
  // Total animation duration is ~1200ms, with 40% for stagger spread and 60% for bar animation
  const totalAnimDuration = animationDuration || 1100;
  const staggerSpread = totalAnimDuration * 0.4; // 40% of time for stagger spread
  const calculatedStaggerDelay =
    staggerDelay ?? (data.length > 1 ? staggerSpread / 1000 / data.length : 0);
  const uniqueId = useId();

  const isHorizontal = orientation === "horizontal";

  // Find the index of this bar series among all bar series
  const seriesIndex = useMemo(() => {
    const idx = lines.findIndex((l) => l.dataKey === dataKey);
    return idx >= 0 ? idx : 0;
  }, [lines, dataKey]);

  const seriesCount = lines.length;
  const isLastSeries = seriesIndex === seriesCount - 1;

  // Calculate the width for each bar within a group (for non-stacked)
  const barWidth = useMemo(() => {
    if (!bandWidth || seriesCount === 0) {
      return 0;
    }
    if (stacked) {
      // Stacked bars use full band width
      return bandWidth;
    }
    // Leave a small gap between grouped bars
    const groupGap = seriesCount > 1 ? 4 : 0;
    return (bandWidth - groupGap * (seriesCount - 1)) / seriesCount;
  }, [bandWidth, seriesCount, stacked]);

  // Calculate corner radius based on lineCap
  const cornerRadius = useMemo(() => {
    if (typeof lineCap === "number") {
      return lineCap;
    }
    if (lineCap === "round" && barWidth) {
      return Math.min(barWidth / 2, 8);
    }
    return 0;
  }, [lineCap, barWidth]);

  // Early return if bar scale not available (not in BarChart)
  if (!(barScale && bandWidth && barXAccessor)) {
    console.warn("Bar component must be used within a BarChart");
    return null;
  }

  return (
    <g className={`bar-series-${uniqueId}`}>
      {data.map((d, i) => {
        const value = d[dataKey];
        if (typeof value !== "number") {
          return null;
        }

        const categoryValue = barXAccessor(d);
        const bandPos = barScale(categoryValue) ?? 0;

        let x: number;
        let y: number;
        let barHeight: number;
        let barW: number;

        if (isHorizontal) {
          // Horizontal bars: category on y-axis, value on x-axis
          const valuePos = yScale(value) ?? 0;
          barW = valuePos; // Width is the value position (grows from left)
          barHeight = barWidth;

          if (stacked && stackOffsets) {
            const offset = stackOffsets.get(i)?.get(dataKey) ?? 0;
            x = yScale(offset) ?? 0;
            barW = valuePos - x;
            // Apply stack gap for horizontal: shift right and reduce width
            const gapOffset = seriesIndex * stackGap;
            x += gapOffset;
            if (!isLastSeries && stackGap > 0) {
              barW = Math.max(0, barW - stackGap);
            }
          } else {
            x = 0;
            // For grouped bars, offset y position
            const groupGap = seriesCount > 1 ? 4 : 0;
            y = bandPos + seriesIndex * (barWidth + groupGap);
          }
          y = stacked
            ? bandPos
            : bandPos + seriesIndex * (barWidth + (seriesCount > 1 ? 4 : 0));
        } else {
          // Vertical bars: category on x-axis, value on y-axis
          const valuePos = yScale(value) ?? 0;
          barHeight = innerHeight - valuePos;
          barW = barWidth;

          if (stacked && stackOffsets) {
            const offset = stackOffsets.get(i)?.get(dataKey) ?? 0;
            const offsetY = yScale(offset) ?? innerHeight;
            // Apply stack gap: shift up and reduce height
            const gapOffset = seriesIndex * stackGap;
            y = offsetY - barHeight - gapOffset;
            // Reduce height slightly for non-last bars to create visual gap
            if (!isLastSeries && stackGap > 0) {
              barHeight = Math.max(0, barHeight - stackGap);
            }
          } else {
            y = valuePos;
            // For grouped bars, offset x position
            const groupGap = seriesCount > 1 ? 4 : 0;
            x = bandPos + seriesIndex * (barWidth + groupGap);
          }
          x = stacked
            ? bandPos
            : bandPos + seriesIndex * (barWidth + (seriesCount > 1 ? 4 : 0));
        }

        const isFaded = hoveredBarIndex !== null && hoveredBarIndex !== i;

        // Use categoryValue as key since it's the unique identifier from data
        const barKey = `bar-${dataKey}-${categoryValue}`;

        // Apply rounded corners:
        // - For non-stacked: always apply
        // - For stacked with gap: apply to all bars
        // - For stacked without gap: only apply to the last series
        const applyRounding = !stacked || stackGap > 0 || isLastSeries;
        const effectiveRx = applyRounding ? cornerRadius : 0;
        const effectiveRy = applyRounding ? cornerRadius : 0;

        if (animate && !isLoaded) {
          return (
            <AnimatedBar
              animationDuration={totalAnimDuration}
              animationType={animationType}
              fadedOpacity={fadedOpacity}
              fill={fill}
              height={barHeight}
              index={i}
              innerHeight={innerHeight}
              isFaded={isFaded}
              isHorizontal={isHorizontal}
              key={barKey}
              rx={effectiveRx}
              ry={effectiveRy}
              staggerDelay={calculatedStaggerDelay}
              width={barW}
              x={x}
              y={y}
            />
          );
        }

        // Static bar after animation completes
        return (
          <motion.rect
            animate={{
              opacity: isFaded ? fadedOpacity : 1,
            }}
            fill={fill}
            height={barHeight}
            key={barKey}
            onMouseEnter={() => setHoveredBarIndex?.(i)}
            onMouseLeave={() => setHoveredBarIndex?.(null)}
            rx={effectiveRx}
            ry={effectiveRy}
            style={{
              cursor: "pointer",
            }}
            transition={{
              opacity: { duration: 0.15 },
            }}
            width={barW}
            x={x}
            y={y}
          />
        );
      })}
    </g>
  );
}

Bar.displayName = "Bar";

export default Bar;
