"use client";

import { curveMonotoneX } from "@visx/curve";
import { AreaClosed, LinePath } from "@visx/shape";

// CurveFactory type - simplified version compatible with visx
// biome-ignore lint/suspicious/noExplicitAny: d3 curve factory type
type CurveFactory = any;

import { motion, useSpring } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { chartCssVars, useChart } from "./chart-context";

export interface AreaProps {
  /** Key in data to use for y values */
  dataKey: string;
  /** Fill color for the area gradient start. Default: var(--chart-line-primary) */
  fill?: string;
  /** Fill opacity at the top of the area. Default: 0.4 */
  fillOpacity?: number;
  /** Stroke color for the line. Default: same as fill */
  stroke?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Curve function. Default: curveMonotoneX */
  curve?: CurveFactory;
  /** Whether to animate the area. Default: true */
  animate?: boolean;
  /** Whether to show the stroke line. Default: true */
  showLine?: boolean;
  /** Whether to show highlight segment on hover. Default: true */
  showHighlight?: boolean;
  /** Gradient opacity at bottom (0 = fully transparent). Default: 0 */
  gradientToOpacity?: number;
  /** Whether to fade the area fill at left/right edges. Default: false */
  fadeEdges?: boolean;
}

export function Area({
  dataKey,
  fill = chartCssVars.linePrimary,
  fillOpacity = 0.4,
  stroke,
  strokeWidth = 2,
  curve = curveMonotoneX,
  animate = true,
  showLine = true,
  showHighlight = true,
  gradientToOpacity = 0,
  fadeEdges = false,
}: AreaProps) {
  const {
    data,
    xScale,
    yScale,
    innerHeight,
    innerWidth,
    tooltipData,
    isLoaded,
    animationDuration,
    xAccessor,
  } = useChart();

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [clipWidth, setClipWidth] = useState(0);

  // Unique IDs for this area
  const uniqueId = useId();
  const gradientId = useMemo(
    () => `area-gradient-${dataKey}-${Math.random().toString(36).slice(2, 9)}`,
    [dataKey]
  );
  const strokeGradientId = useMemo(
    () =>
      `area-stroke-gradient-${dataKey}-${Math.random().toString(36).slice(2, 9)}`,
    [dataKey]
  );
  const edgeMaskId = `area-edge-mask-${dataKey}-${uniqueId}`;
  const edgeGradientId = `${edgeMaskId}-gradient`;

  // Resolved stroke color (defaults to fill)
  const resolvedStroke = stroke || fill;

  // Measure path length and trigger animation
  useEffect(() => {
    if (pathRef.current && animate) {
      const len = pathRef.current.getTotalLength();
      if (len > 0) {
        setPathLength(len);
        if (!isLoaded) {
          requestAnimationFrame(() => {
            setClipWidth(innerWidth);
          });
        }
      }
    }
  }, [animate, innerWidth, isLoaded]);

  // Calculate dash props for highlight segment
  const getDashProps = useCallback(() => {
    if (!(tooltipData && pathRef.current) || pathLength === 0) {
      return { strokeDasharray: "none", strokeDashoffset: 0 };
    }

    const idx = tooltipData.index;
    const startIdx = Math.max(0, idx - 1);
    const endIdx = Math.min(data.length - 1, idx + 1);

    const path = pathRef.current;

    // Binary search to find length at X
    const findLengthAtX = (targetX: number): number => {
      let low = 0;
      let high = pathLength;
      const tolerance = 0.5;

      while (high - low > tolerance) {
        const mid = (low + high) / 2;
        const point = path.getPointAtLength(mid);
        if (point.x < targetX) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return (low + high) / 2;
    };

    const startPoint = data[startIdx];
    const endPoint = data[endIdx];
    if (!(startPoint && endPoint)) {
      return { strokeDasharray: "none", strokeDashoffset: 0 };
    }

    const startX = xScale(xAccessor(startPoint)) ?? 0;
    const endX = xScale(xAccessor(endPoint)) ?? 0;

    const startLength = findLengthAtX(startX);
    const endLength = findLengthAtX(endX);
    const segmentLength = endLength - startLength;

    return {
      strokeDasharray: `${segmentLength} ${pathLength}`,
      strokeDashoffset: -startLength,
    };
  }, [tooltipData, data, xScale, pathLength, xAccessor]);

  const dashProps = getDashProps();

  // Spring for smooth highlight animation
  const dashSpringConfig = { stiffness: 180, damping: 28 };
  const offsetSpring = useSpring(dashProps.strokeDashoffset, dashSpringConfig);

  useEffect(() => {
    offsetSpring.set(dashProps.strokeDashoffset);
  }, [dashProps.strokeDashoffset, offsetSpring]);

  // Get y value for a data point
  const getY = useCallback(
    (d: Record<string, unknown>) => {
      const value = d[dataKey];
      return typeof value === "number" ? (yScale(value) ?? 0) : 0;
    },
    [dataKey, yScale]
  );

  const isHovering = tooltipData !== null;
  const easing = "cubic-bezier(0.85, 0, 0.15, 1)";

  return (
    <>
      {/* Gradient definitions */}
      <defs>
        {/* Fill gradient - fades from fillOpacity at top to gradientToOpacity at bottom */}
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop
            offset="0%"
            style={{ stopColor: fill, stopOpacity: fillOpacity }}
          />
          <stop
            offset="100%"
            style={{ stopColor: fill, stopOpacity: gradientToOpacity }}
          />
        </linearGradient>

        {/* Stroke gradient - fades at edges */}
        <linearGradient id={strokeGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop
            offset="0%"
            style={{ stopColor: resolvedStroke, stopOpacity: 0 }}
          />
          <stop
            offset="15%"
            style={{ stopColor: resolvedStroke, stopOpacity: 1 }}
          />
          <stop
            offset="85%"
            style={{ stopColor: resolvedStroke, stopOpacity: 1 }}
          />
          <stop
            offset="100%"
            style={{ stopColor: resolvedStroke, stopOpacity: 0 }}
          />
        </linearGradient>

        {/* Edge fade mask for area fill */}
        {fadeEdges && (
          <>
            <linearGradient
              id={edgeGradientId}
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              <stop
                offset="0%"
                style={{ stopColor: "white", stopOpacity: 0 }}
              />
              <stop
                offset="20%"
                style={{ stopColor: "white", stopOpacity: 1 }}
              />
              <stop
                offset="80%"
                style={{ stopColor: "white", stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "white", stopOpacity: 0 }}
              />
            </linearGradient>
            <mask id={edgeMaskId}>
              <rect
                fill={`url(#${edgeGradientId})`}
                height={innerHeight}
                width={innerWidth}
                x="0"
                y="0"
              />
            </mask>
          </>
        )}
      </defs>

      {/* Clip path for grow animation - unique per area */}
      {animate && (
        <defs>
          <clipPath id={`grow-clip-area-${dataKey}`}>
            <rect
              height={innerHeight + 20}
              style={{
                transition:
                  !isLoaded && clipWidth > 0
                    ? `width ${animationDuration}ms ${easing}`
                    : "none",
              }}
              width={isLoaded ? innerWidth : clipWidth}
              x={0}
              y={0}
            />
          </clipPath>
        </defs>
      )}

      {/* Main area with clip path */}
      <g clipPath={animate ? `url(#grow-clip-area-${dataKey})` : undefined}>
        <motion.g
          animate={{ opacity: isHovering && showHighlight ? 0.6 : 1 }}
          initial={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Area fill */}
          <g mask={fadeEdges ? `url(#${edgeMaskId})` : undefined}>
            <AreaClosed
              curve={curve}
              data={data}
              fill={`url(#${gradientId})`}
              x={(d) => xScale(xAccessor(d)) ?? 0}
              y={getY}
              yScale={yScale}
            />
          </g>

          {/* Stroke line on top of area */}
          {showLine && (
            <LinePath
              curve={curve}
              data={data}
              innerRef={pathRef}
              stroke={`url(#${strokeGradientId})`}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              x={(d) => xScale(xAccessor(d)) ?? 0}
              y={getY}
            />
          )}
        </motion.g>
      </g>

      {/* Highlight segment on hover */}
      {showHighlight &&
        showLine &&
        isHovering &&
        isLoaded &&
        pathRef.current && (
          <motion.path
            animate={{ opacity: 1 }}
            d={pathRef.current.getAttribute("d") || ""}
            exit={{ opacity: 0 }}
            fill="none"
            initial={{ opacity: 0 }}
            stroke={resolvedStroke}
            strokeDasharray={dashProps.strokeDasharray}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            style={{ strokeDashoffset: offsetSpring }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        )}
    </>
  );
}

Area.displayName = "Area";

export default Area;
