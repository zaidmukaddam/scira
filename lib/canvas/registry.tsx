"use client";

import { Fragment } from "react";
import { defineRegistry } from "@json-render/react";
import { Cambio } from "cambio";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import {
  Area,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import {
  TableProvider,
  TableHeader,
  TableHeaderGroup,
  TableColumnHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/kibo-ui/table";
import type { ColumnDef } from "@/components/kibo-ui/table";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Info,
  Lightbulb,
  AlertTriangle,
  Star,
  AlertCircle,
  X as XIcon,
} from "lucide-react";

import {
  Timeline as ReuiTimeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { canvasCatalog } from "./catalog";
import { cn } from "../utils";

// =============================================================================
// Registry — styled to match Scira's design language
// =============================================================================

export const { registry, handlers } = defineRegistry(canvasCatalog, {
  components: {
    // =========================================================================
    // Layout
    // =========================================================================

    Stack: ({ props, children }) => {
      const gapClass =
        { sm: "gap-1.5", md: "gap-3", lg: "gap-4" }[props.gap ?? "md"] ?? "gap-3";
      return (
        <div
          className={`flex ${props.direction === "horizontal" ? "flex-row flex-wrap" : "flex-col"} ${props.wrap ? "flex-wrap" : ""} ${gapClass}`}
        >
          {children}
        </div>
      );
    },

    Card: ({ props, children }) => (
      <div className="rounded-xl border border-border/60 bg-card/30 flex flex-col overflow-hidden">
        {(props.title || props.description) && (
          <div className="px-3.5 py-2.5 min-w-0">
            {props.title && (
              <h3 className="text-xs font-medium text-foreground wrap-break-word">{stripLinks(props.title)}</h3>
            )}
            {props.description && (
              <p
                className="text-[10px] text-muted-foreground mt-0.5 wrap-break-word line-clamp-2"
                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(props.description) }}
              />
            )}
          </div>
        )}
        <div className="empty:hidden border-t border-border/40 p-3 flex flex-col gap-3 flex-1 min-w-0 overflow-x-auto">
          {children}
        </div>
      </div>
    ),

    Grid: ({ props, children }) => {
      const colsClass =
        {
          "1": "grid-cols-1",
          "2": "grid-cols-1 md:grid-cols-2",
          "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        }[props.columns ?? "3"] ?? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      const gapClass =
        { sm: "gap-2", md: "gap-3", lg: "gap-4" }[props.gap ?? "md"] ?? "gap-3";
      return <div className={`grid ${colsClass} ${gapClass}`}>{children}</div>;
    },

    // =========================================================================
    // Typography
    // =========================================================================

    Heading: ({ props }) => {
      const Tag = (props.level ?? "h2") as "h1" | "h2" | "h3" | "h4";
      const sizeClass = {
        h1: "text-lg font-semibold text-foreground tracking-tight",
        h2: "text-base font-semibold text-foreground tracking-tight",
        h3: "text-sm font-medium text-foreground",
        h4: "text-xs font-medium text-foreground uppercase tracking-wider",
      }[props.level ?? "h2"];
      return <Tag className={sizeClass}>{props.text}</Tag>;
    },

    Text: ({ props }) => (
      <p
        className={`text-sm leading-relaxed ${props.muted ? "text-muted-foreground" : "text-foreground"}`}
        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(props.content).replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1") }}
      />
    ),

    // =========================================================================
    // Data Display
    // =========================================================================

    Badge: ({ props }) => {
      const variantClass = {
        default: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-muted text-muted-foreground border-border/50",
        destructive: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        outline: "bg-transparent text-foreground border-border",
      }[props.variant ?? "default"];
      return (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${variantClass}`}
        >
          {props.text}
        </span>
      );
    },

    Alert: ({ props }) => {
      const isDestructive = props.variant === "destructive";
      return (
        <div
          className={`rounded-lg border px-4 py-3 ${isDestructive
            ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
            : "border-border/60 bg-muted/20 text-foreground"
            }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${isDestructive ? "" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium">{props.title}</p>
              {props.description && (
                <p className={`text-xs mt-1 ${isDestructive ? "text-red-600/80 dark:text-red-400/80" : "text-muted-foreground"}`}>
                  {props.description}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    },

    Separator: () => (
      <div className="flex items-center justify-center gap-2 py-3">
        <div className="h-[2px] w-16 bg-border/40 rounded-full" />
        <div className="h-[2px] w-6 bg-border/60 rounded-full" />
        <div className="h-[3px] w-3 bg-primary/50 rounded-full" />
        <div className="h-[2px] w-6 bg-border/60 rounded-full" />
        <div className="h-[2px] w-16 bg-border/40 rounded-full" />
      </div>
    ),

    Metric: ({ props }) => {
      const TrendIcon =
        props.trend === "up"
          ? TrendingUp
          : props.trend === "down"
            ? TrendingDown
            : Activity;
      const trendColor =
        props.trend === "up"
          ? "text-emerald-600 dark:text-emerald-400"
          : props.trend === "down"
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground/50";

      // Parse numeric part for count-up animation
      const numMatch = props.value.match(/^([^0-9]*?)(\d+)(.*)$/);
      const canAnimate = numMatch !== null;
      const prefix = numMatch?.[1] ?? "";
      const numValue = numMatch ? parseInt(numMatch[2], 10) : 0;
      const suffix = numMatch?.[3] ?? "";

      return (
        <div className="rounded-lg border border-border/40 bg-muted/10 p-3 flex flex-col justify-between min-h-[88px]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider leading-tight wrap-break-word">
              {props.label}
            </p>
            <TrendIcon className={`h-3.5 w-3.5 shrink-0 ${trendColor}`} />
          </div>
          <div className="mt-auto pt-1.5">
            <p className="text-sm font-semibold text-foreground tabular-nums wrap-break-word">
              {canAnimate ? (
                <>
                  {prefix}<span className="canvas-count-up" style={{ "--target": numValue } as React.CSSProperties} />{suffix}
                </>
              ) : (
                props.value
              )}
            </p>
            {props.detail && (
              <p className={`text-[10px] mt-0.5 tabular-nums leading-tight wrap-break-word ${props.trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : props.trend === "down"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground/60"
                }`}>
                {props.detail}
              </p>
            )}
          </div>
        </div>
      );
    },

    Table: ({ props }) => {
      const rawData = props.data;
      const items: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
          : [];

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-xs text-muted-foreground">
            {props.emptyMessage ?? "No data"}
          </div>
        );
      }

      const columns: ColumnDef<Record<string, unknown>>[] = props.columns.map((col) => ({
        accessorKey: col.key,
        header: ({ column }) => (
          <TableColumnHeader
            column={column as never}
            title={col.label || col.key.replace(/_/g, " ")}
            className="text-[10px] uppercase tracking-wider"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {String(row.getValue(col.key) ?? "")}
          </span>
        ),
      }));

      return (
        <div className="rounded-lg border border-border/40 overflow-hidden">
          <TableProvider columns={columns as never} data={items}>
            <TableHeader className="bg-muted/20">
              {({ headerGroup }) => (
                <TableHeaderGroup headerGroup={headerGroup as never}>
                  {({ header }) => <TableHead header={header as never} className="h-9 px-3" />}
                </TableHeaderGroup>
              )}
            </TableHeader>
            <TableBody>
              {({ row }) => (
                <TableRow row={row as never} className="border-border/20 hover:bg-muted/10">
                  {({ cell }) => <TableCell cell={cell as never} className="px-3 py-2" />}
                </TableRow>
              )}
            </TableBody>
          </TableProvider>
        </div>
      );
    },

    Link: ({ props }) => {
      let domain = "";
      try { domain = new URL(props.href).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors text-[11px] text-foreground no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
            alt=""
            width={12}
            height={12}
            className="rounded-sm shrink-0"
          />
          <span className="text-muted-foreground">{domain || props.text}</span>
        </a>
      );
    },

    Image: ({ props }) => (
      <figure className="w-full">
        <Cambio.Root motion="smooth">
          <Cambio.Trigger className="w-full rounded-lg border border-border/40 overflow-hidden bg-muted/10 cursor-zoom-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.src}
              alt={props.alt}
              className="w-full h-auto"
              loading="lazy"
            />
          </Cambio.Trigger>
          <Cambio.Portal>
            <Cambio.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
            <Cambio.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={props.src}
                  alt={props.alt}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                />
                <Cambio.Close className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors">
                  <XIcon className="h-3.5 w-3.5" />
                </Cambio.Close>
              </div>
            </Cambio.Popup>
          </Cambio.Portal>
        </Cambio.Root>
        {props.caption && (
          <figcaption className="mt-1.5 text-[10px] text-muted-foreground/60 text-center">
            {props.caption}
          </figcaption>
        )}
      </figure>
    ),

    // =========================================================================
    // Charts
    // =========================================================================

    BarChart: ({ props }) => {
      const rawData = props.data;
      const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
          : [];

      // Multi-series: use yKeys if provided, otherwise single yKey. Cap at 3 for readability.
      const seriesKeys = ((props.yKeys && props.yKeys.length > 0) ? props.yKeys : [props.yKey]).slice(0, 3);
      const isMulti = seriesKeys.length > 1;

      // For single series, process through aggregation; for multi, just ensure numeric + add label
      const items = isMulti
        ? rawItems.map((item) => {
          const row: Record<string, unknown> = { label: String(item[props.xKey] ?? "") };
          for (const key of seriesKeys) {
            row[key] = toNumeric(item[key]);
          }
          return row;
        })
        : processChartData(rawItems, props.xKey, props.yKey, props.aggregate).items;

      const needsAngle = shouldAngleLabels(items);
      const yWidth = yAxisWidth(items, seriesKeys[0] ?? props.yKey);

      // Build config + colors for each series
      const seriesColors = seriesKeys.map((key, i) => pickChartColor(key + (props.title ?? "")));
      const chartConfig: ChartConfig = {};
      seriesKeys.forEach((key, i) => {
        chartConfig[key] = { label: key, color: seriesColors[i] };
      });

      if (items.length === 0) {
        return <div className="text-center py-4 text-xs text-muted-foreground">No data available</div>;
      }

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-xs font-medium text-foreground mb-2">{props.title}</p>
          )}
          {isMulti && (
            <div className="flex items-center gap-4 mb-2">
              {seriesKeys.map((key, i) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seriesColors[i] }} />
                  <span className="text-[10px] text-muted-foreground">{key}</span>
                </div>
              ))}
            </div>
          )}
          <ChartContainer
            config={chartConfig}
            className="w-full [&_svg]:overflow-visible"
            style={{ height: props.height ?? 240 }}
          >
            <RechartsBarChart
              accessibilityLayer
              data={items}
              margin={{ top: 8, right: 8, bottom: needsAngle ? 56 : 8, left: 0 }}
            >
              <defs>
                <pattern id="canvas-bar-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="currentColor" className="text-muted dark:text-muted/40" />
                </pattern>
                {seriesColors.map((color, i) => (
                  <linearGradient key={i} id={`bar-grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <rect x="0" y="0" width="100%" height="85%" fill="url(#canvas-bar-dots)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="text-[9px]! fill-muted-foreground"
                angle={needsAngle ? -25 : 0}
                textAnchor={needsAngle ? "end" : "middle"}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={yWidth}
                className="text-[9px]! fill-muted-foreground"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const idx = seriesKeys.indexOf(name as string);
                      const color = idx >= 0 ? seriesColors[idx] : "#888";
                      return (
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums ml-auto">{(value as number).toLocaleString()}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {seriesKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`url(#bar-grad-${seriesColors[i].replace(/[^a-z0-9]/gi, "")})`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={isMulti ? 32 : 48}
                />
              ))}
            </RechartsBarChart>
          </ChartContainer>
        </div>
      );
    },

    LineChart: ({ props }) => {
      const rawData = props.data;
      const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
          : [];

      const { items, valueKey } = processChartData(rawItems, props.xKey, props.yKey, props.aggregate);
      const chartColor = pickChartColor(props.title ?? props.yKey);
      const needsAngle = shouldAngleLabels(items);
      const lyWidth = yAxisWidth(items, valueKey);

      const chartConfig = {
        [valueKey]: { label: props.title ?? valueKey, color: chartColor },
      } satisfies ChartConfig;

      if (items.length === 0) {
        return <div className="text-center py-4 text-xs text-muted-foreground">No data available</div>;
      }

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-xs font-medium text-foreground mb-2">{props.title}</p>
          )}
          <ChartContainer
            config={chartConfig}
            className="w-full [&_svg]:overflow-visible"
            style={{ height: props.height ?? 240 }}
          >
            <ComposedChart
              accessibilityLayer
              data={items}
              margin={{ top: 8, right: needsAngle ? 8 : Math.min(60, (String(items[items.length - 1]?.label ?? "").length * 4)), bottom: needsAngle ? 56 : 8, left: 0 }}
            >
              <defs>
                <linearGradient id={`line-grad-${chartColor.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/20" />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="text-[9px]! fill-muted-foreground"
                angle={needsAngle ? -25 : 0}
                textAnchor={needsAngle ? "end" : "middle"}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={lyWidth}
                className="text-[9px]! fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey={valueKey}
                fill={`url(#line-grad-${chartColor.replace(/[^a-z0-9]/gi, "")})`}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey={valueKey}
                stroke={chartColor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: chartColor, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      );
    },

    PieChart: ({ props }) => {
      const rawData = props.data;
      const items: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
          : [];

      if (items.length === 0) {
        return <div className="text-center py-4 text-xs text-muted-foreground">No data available</div>;
      }

      const pieData = items
        .map((item, i) => ({
          name: String(item[props.nameKey] ?? `Segment ${i + 1}`),
          value: toNumeric(item[props.valueKey]),
          fill: PIE_COLORS[i % PIE_COLORS.length],
        }))
        .filter((d) => d.value > 0); // skip zero-value segments

      const chartConfig: ChartConfig = {};
      pieData.forEach((d) => {
        chartConfig[d.name] = { label: d.name, color: d.fill };
      });

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-xs font-medium text-foreground mb-2">{props.title}</p>
          )}
          <ChartContainer
            config={chartConfig}
            className="mx-auto w-full"
            style={{ height: props.height ?? 240 }}
          >
            <RechartsPieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={30}
                cornerRadius={8}
                paddingAngle={4}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                <LabelList
                  dataKey="value"
                  stroke="none"
                  fontSize={11}
                  fontWeight={500}
                  fill="hsl(var(--background))"
                  formatter={(v: number) => v.toLocaleString()}
                />
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
              />
            </RechartsPieChart>
          </ChartContainer>
        </div>
      );
    },

    // =========================================================================
    // Structure
    // =========================================================================


    Callout: ({ props }) => {
      const iconMap = { info: Info, tip: Lightbulb, warning: AlertTriangle, important: Star };
      const Icon = iconMap[props.type ?? "info"] ?? Info;
      // Warning uses a distinct amber tone; all others use the theme's primary/muted tokens
      const isWarning = props.type === "warning";
      return (
        <div
          className={`rounded-lg px-3.5 py-2.5 border ${isWarning
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-primary/15 bg-primary/5"
            }`}
        >
          <div className="flex items-start gap-2.5">
            <Icon
              className={`h-4 w-4 mt-0.5 shrink-0 ${isWarning ? "text-amber-600 dark:text-amber-400" : "text-primary"
                }`}
            />
            <div className="flex-1 min-w-0">
              {props.title && (
                <p className="text-xs font-medium text-foreground mb-0.5">{props.title}</p>
              )}
              <p
                className="text-xs text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(props.content) }}
              />
            </div>
          </div>
        </div>
      );
    },

    Accordion: ({ props }) => (
      <div className="flex flex-col gap-2.5">
        {(props.items ?? []).map((item, i) => (
          <div key={i} className="rounded-lg border border-border/40 px-3.5 py-2.5">
            <p className="text-xs font-medium text-foreground">{item.title}</p>
            <p
              className="text-[11px] text-muted-foreground leading-relaxed mt-1"
              dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item.content) }}
            />
          </div>
        ))}
      </div>
    ),

    Timeline: ({ props }) => {
      const items = props.items ?? [];
      const currentIndex = items.findIndex((it) => it.status === "current");
      const defaultValue =
        currentIndex >= 0 ? currentIndex + 1 : items.length;
      return (
        <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden px-4 py-3">
          <ReuiTimeline
            defaultValue={defaultValue}
            orientation="vertical"
            className="w-full"
          >
            {items.map((item, i) => (
              <TimelineItem key={i} step={i + 1}>
                <TimelineIndicator />
                <TimelineHeader>
                  <TimelineTitle>{item.title}</TimelineTitle>
                  {item.date != null && item.date !== "" && (
                    <TimelineDate>{item.date}</TimelineDate>
                  )}
                </TimelineHeader>
                {item.description != null && item.description !== "" && (
                  <TimelineContent>{item.description}</TimelineContent>
                )}
                <TimelineSeparator className="-left-6!" />
              </TimelineItem>
            ))}
          </ReuiTimeline>
        </div>
      );
    },

    // =========================================================================
    // Comparison & Attribution
    // =========================================================================

    StatComparison: ({ props }) => {
      const trendColor =
        props.trend === "up"
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          : props.trend === "down"
            ? "text-red-600 dark:text-red-400 bg-red-500/10"
            : "text-muted-foreground bg-muted";
      return (
        <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden p-3 flex flex-col gap-2">
          {/* Labels */}
          <div className="flex justify-between gap-3">
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider leading-tight">{props.labelA}</p>
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider leading-tight text-right">{props.labelB}</p>
          </div>
          {/* Delta pill centered */}
          <div className="flex justify-center">
            {props.delta ? (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${trendColor}`}>
                {props.delta}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">vs</span>
            )}
          </div>
          {/* Values */}
          <div className="flex justify-between gap-3">
            <p className="text-sm font-semibold text-foreground tabular-nums">{props.valueA}</p>
            <p className="text-sm font-semibold text-foreground tabular-nums text-right">{props.valueB}</p>
          </div>
        </div>
      );
    },

    Quote: ({ props }) => (
      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3.5">
        <p className="text-sm text-foreground leading-relaxed">
          &ldquo;{props.text}&rdquo;
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-primary">{props.author.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-[11px] font-medium text-foreground">{props.author}</span>
          {props.source && (
            <>
              <span className="text-muted-foreground/30">&middot;</span>
              {props.href ? (
                <a
                  href={props.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {props.source}
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">{props.source}</span>
              )}
            </>
          )}
        </div>
      </div>
    ),

    KPIRow: ({ props }) => {
      const items = props.items ?? [];
      // Cap at 4 per row; if more, let them wrap naturally
      const cols = Math.min(items.length, 4);
      return (
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <div
            className="grid gap-x-4 gap-y-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {items.map((item, i) => {
              const isFirstInRow = i % cols === 0;
              return (
                <div key={i} className={`flex flex-col gap-0.5 min-w-0 ${!isFirstInRow ? "border-l border-primary/10 pl-4" : ""}`}>
                  <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider truncate">{item.label}</p>
                  <p className="text-base font-semibold text-foreground tabular-nums">{item.value}</p>
                  {item.detail && (
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    },

    LayerCard: ({ props }) => {
      const card = (
        <LayerCard className="w-full h-full flex flex-col [--color-kumo-base:var(--muted)] [--color-kumo-elevated:var(--card)] [--color-kumo-fill:var(--accent)] [--color-kumo-fill-hover:var(--accent)] [--text-color-kumo-strong:var(--foreground)] [--text-color-kumo-subtle:var(--muted-foreground)] [--color-kumo-line:var(--border)] [&>div:last-child]:flex-1">
          <LayerCard.Secondary>{props.label}</LayerCard.Secondary>
          <LayerCard.Primary>{props.title}</LayerCard.Primary>
        </LayerCard>
      );
      if (props.href) {
        return (
          <a href={props.href} target="_blank" rel="noopener noreferrer" className="block h-full">
            {card}
          </a>
        );
      }
      return card;
    },

    SourceCard: ({ props }) => {
      let domain = "";
      try {
        domain = new URL(props.url).hostname.replace(/^www\./, "");
      } catch { /* ignore */ }
      return (
        <a
          href={props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            width={16}
            height={16}
            className="mt-0.5 rounded-sm shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {props.title}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{domain}</p>
            {props.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {props.description}
              </p>
            )}
          </div>
        </a>
      );
    },
  },

  actions: {},
});

// =============================================================================
// Chart Helpers
// =============================================================================

// Vibrant, distinct palette for pie/donut charts and multi-series data
const PIE_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
];

// Bright colors for bar/line charts — always used (AI-provided colors are ignored
// because models often pick colors that are invisible in dark mode)
const CHART_COLORS = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#a78bfa", // violet-400
  "#f87171", // red-400
  "#2dd4bf", // teal-400
  "#fb923c", // orange-400
  "#f472b6", // pink-400
];

/** Pick a random chart color, stable per component instance via key */
function pickChartColor(seed?: string): string {
  if (!seed) return CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)];
  // Simple hash for deterministic pick based on title/key
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

/** Strip markdown links and return plain text */
function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1").replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1");
}

/** Allow only safe inline HTML tags + markdown links, strip everything else */
function sanitizeInlineHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Restore only safe inline tags
    .replace(/&lt;(\/?(strong|em|b|i|code|br|mark|u|s|sub|sup))&gt;/gi, "<$1>")
    // Convert markdown links [text](url) to pill anchors with favicon
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_match, label, url) => {
      let domain = "";
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
      const favicon = domain
        ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&amp;sz=128" width="12" height="12" style="border-radius:50%;display:inline;vertical-align:middle;margin-right:3px" alt="" />`
        : "";
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-1.5 py-0.25 rounded-md border border-border/40 bg-muted/30 text-[11px] text-foreground hover:bg-muted/60 no-underline transition-colors align-baseline">${favicon}${label}</a>`;
    });
}

/** Decide if x-axis labels should be angled based on count and label length */
function shouldAngleLabels(items: Array<Record<string, unknown>>): boolean {
  if (items.length > 5) return true;
  const maxLen = items.reduce((max, item) => Math.max(max, String(item.label ?? "").length), 0);
  return maxLen > 14 || (items.length > 3 && maxLen > 10);
}

/** Estimate Y-axis width from the largest formatted value (6px per char + 8px padding) */
function yAxisWidth(items: Array<Record<string, unknown>>, valueKey: string): number {
  const maxVal = items.reduce((max, item) => {
    const v = typeof item[valueKey] === "number" ? item[valueKey] as number : 0;
    return Math.max(max, v);
  }, 0);
  const label = maxVal >= 1000 ? maxVal.toLocaleString() : String(Math.round(maxVal));
  return Math.max(36, label.length * 7 + 8);
}

function toNumeric(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[%$,]/g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function processChartData(
  items: Array<Record<string, unknown>>,
  xKey: string,
  yKey: string,
  aggregate: "sum" | "count" | "avg" | null | undefined,
): { items: Array<Record<string, unknown>>; valueKey: string } {
  if (items.length === 0) {
    return { items: [], valueKey: yKey };
  }

  if (!aggregate) {
    const formatted = items.map((item) => ({
      ...item,
      label: String(item[xKey] ?? ""),
      [yKey]: toNumeric(item[yKey]),
    }));
    return { items: formatted, valueKey: yKey };
  }

  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const item of items) {
    const groupKey = String(item[xKey] ?? "unknown");
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }

  const valueKey = aggregate === "count" ? "count" : yKey;
  const aggregated: Array<Record<string, unknown>> = [];
  const sortedKeys = Array.from(groups.keys()).sort();

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    let value: number;

    if (aggregate === "count") {
      value = group.length;
    } else if (aggregate === "sum") {
      value = group.reduce((sum, item) => sum + toNumeric(item[yKey]), 0);
    } else {
      const sum = group.reduce((s, item) => s + toNumeric(item[yKey]), 0);
      value = group.length > 0 ? sum / group.length : 0;
    }

    aggregated.push({ label: key, [valueKey]: value });
  }

  return { items: aggregated, valueKey };
}

// =============================================================================
// Fallback
// =============================================================================

export function Fallback({ type }: { type: string }) {
  return (
    <div className="px-3.5 py-2 rounded-lg border border-dashed border-border/40 text-[11px] text-muted-foreground">
      Unknown component: {type}
    </div>
  );
}
