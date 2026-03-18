"use client";

import { curveNatural } from "@visx/curve";
import { LinePath } from "@visx/shape";

// CurveFactory type - simplified version compatible with visx
// biome-ignore lint/suspicious/noExplicitAny: d3 curve factory type
type CurveFactory = any;

import { motion, useMotionTemplate, useSpring } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chartCssVars, useChart } from "./chart-context";

export interface LineProps {
  /** Key in data to use for y values */
  dataKey: string;
  /** Stroke color. Default: var(--chart-line-primary) */
  stroke?: string;
  /** Stroke width. Default: 2.5 */
  strokeWidth?: number;
  /** Curve function. Default: curveNatural */
  curve?: CurveFactory;
  /** Whether to animate the line. Default: true */
  animate?: boolean;
  /** Whether to fade edges with gradient. Default: true */
  fadeEdges?: boolean;
  /** Whether to show highlight segment on hover. Default: true */
  showHighlight?: boolean;
}

export function Line({
  dataKey,
  stroke = chartCssVars.linePrimary,
  strokeWidth = 2.5,
  curve = curveNatural,
  animate = true,
  fadeEdges = true,
  showHighlight = true,
}: LineProps) {
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

  // Unique gradient ID for this line
  const gradientId = useMemo(
    () => `line-gradient-${dataKey}-${Math.random().toString(36).slice(2, 9)}`,
    [dataKey]
  );

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

  // Calculate segment bounds for highlight (returns numeric values for animation)
  const segmentBounds = useMemo(() => {
    if (!(tooltipData && pathRef.current) || pathLength === 0) {
      return { startLength: 0, segmentLength: 0, isActive: false };
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
      return { startLength: 0, segmentLength: 0, isActive: false };
    }

    const startX = xScale(xAccessor(startPoint)) ?? 0;
    const endX = xScale(xAccessor(endPoint)) ?? 0;

    const startLength = findLengthAtX(startX);
    const endLength = findLengthAtX(endX);
    const segmentLength = endLength - startLength;

    return { startLength, segmentLength, isActive: true };
  }, [tooltipData, data, xScale, pathLength, xAccessor]);

  // Springs for smooth highlight animation (both offset AND segment length)
  const springConfig = { stiffness: 180, damping: 28 };
  const offsetSpring = useSpring(0, springConfig);
  const segmentLengthSpring = useSpring(0, springConfig);

  // Update springs when segment bounds change
  useEffect(() => {
    offsetSpring.set(-segmentBounds.startLength);
    segmentLengthSpring.set(segmentBounds.segmentLength);
  }, [
    segmentBounds.startLength,
    segmentBounds.segmentLength,
    offsetSpring,
    segmentLengthSpring,
  ]);

  // Create animated strokeDasharray using motion template
  const animatedDasharray = useMotionTemplate`${segmentLengthSpring} ${pathLength}`;

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
      {/* Gradient definition for fading edges */}
      {fadeEdges && (
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" style={{ stopColor: stroke, stopOpacity: 0 }} />
            <stop offset="15%" style={{ stopColor: stroke, stopOpacity: 1 }} />
            <stop offset="85%" style={{ stopColor: stroke, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: stroke, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
      )}

      {/* Clip path for grow animation - unique per line */}
      {animate && (
        <defs>
          <clipPath id={`grow-clip-${dataKey}`}>
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

      {/* Main line with clip path */}
      <g clipPath={animate ? `url(#grow-clip-${dataKey})` : undefined}>
        <motion.g
          animate={{ opacity: isHovering && showHighlight ? 0.3 : 1 }}
          initial={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <LinePath
            curve={curve}
            data={data}
            innerRef={pathRef}
            stroke={fadeEdges ? `url(#${gradientId})` : stroke}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            x={(d) => xScale(xAccessor(d)) ?? 0}
            y={getY}
          />
        </motion.g>
      </g>

      {/* Highlight segment on hover */}
      {showHighlight && isHovering && isLoaded && pathRef.current && (
        <motion.path
          animate={{ opacity: 1 }}
          d={pathRef.current.getAttribute("d") || ""}
          exit={{ opacity: 0 }}
          fill="none"
          initial={{ opacity: 0 }}
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{
            strokeDasharray: animatedDasharray,
            strokeDashoffset: offsetSpring,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      )}
    </>
  );
}

Line.displayName = "Line";

export default Line;
