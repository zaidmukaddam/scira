"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { pusherClient } from "@/lib/pusher-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  UserX,
  Trash2,
  MessageSquare,
  Activity,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  TopModelsChart,
  TopUsersActivityChart,
  TopUsersCostChart,
} from "@/components/admin/dashboard-charts";
import { KpiCard } from "@/components/admin/kpi-card";
import { StatsHeader } from "@/components/admin/stats-header";
import { EmptyState } from "@/components/admin/empty-state";
import { cn } from "@/lib/utils";

async function fetchMetrics() {
  const res = await fetch("/api/admin/metrics", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function fetchHealth() {
  const res = await fetch("/api/admin/health", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function fetchOnline() {
  const res = await fetch("/api/admin/online", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function fetchEvents() {
  const res = await fetch("/api/admin/events/recent", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

export default function AdminHomePage() {
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: fetchMetrics,
    refetchInterval: 20000,
  });

  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["admin-health"],
    queryFn: fetchHealth,
    refetchInterval: 20000,
  });

  const {
    data: online,
    isLoading: onlineLoading,
    refetch: refetchOnline,
  } = useQuery({
    queryKey: ["admin-online"],
    queryFn: fetchOnline,
    refetchInterval: 15000,
  });

  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["admin-events"],
    queryFn: fetchEvents,
    refetchInterval: 20000,
  });

  const userMap = new Map<string, string>(
    (metrics?.users || []).map((u: any) => [u.id, u.name])
  );
  const usersActivityNamed = (metrics?.charts?.usersActivity || []).map(
    (x: any) => ({ userId: userMap.get(x.userId) || x.userId, count: x.count })
  );
  const usersCostNamed = (metrics?.charts?.usersCost || []).map((x: any) => ({
    userId: userMap.get(x.userId) || x.userId,
    cost: x.cost,
  }));

  useEffect(() => {
    if (!pusherClient) return;
    const chUsers = pusherClient.subscribe("private-admin-users");
    const chEvents = pusherClient.subscribe("private-admin-events");
    const chOnline = pusherClient.subscribe("presence-online");
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      qc.invalidateQueries({ queryKey: ["admin-online"] });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    };
    chUsers.bind("created", invalidate);
    chUsers.bind("updated", invalidate);
    chEvents.bind("new", invalidate);
    chOnline.bind("heartbeat", () =>
      qc.invalidateQueries({ queryKey: ["admin-online"] })
    );

    const interval = setInterval(() => {
      fetch("/api/admin/heartbeat", { method: "POST" });
    }, 35000);

    return () => {
      clearInterval(interval);
      try {
        chUsers.unbind("created", invalidate);
        chUsers.unbind("updated", invalidate);
        chEvents.unbind("new", invalidate);
        chOnline.unbind("heartbeat");
        pusherClient.unsubscribe("private-admin-users");
        pusherClient.unsubscribe("private-admin-events");
        pusherClient.unsubscribe("presence-online");
      } catch {}
    };
  }, [qc]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchMetrics(),
      refetchHealth(),
      refetchOnline(),
      refetchEvents(),
    ]);
    setIsRefreshing(false);
  };

  const kpis = metrics?.kpis;
  const isLoading = metricsLoading || healthLoading;

  const getHealthVariant = (
    status: string
  ): "default" | "success" | "warning" | "danger" => {
    if (status === "ok") return "success";
    if (status === "warn") return "warning";
    if (status === "down") return "danger";
    return "default";
  };

  const statsForHeader = [
    {
      label: "Total utilisateurs",
      value: metrics?.users?.length || 0,
      variant: "default" as const,
    },
    {
      label: "En ligne",
      value: online?.users?.length || 0,
      variant: "success" as const,
    },
    {
      label: "Messages 24h",
      value: kpis?.messages24hTotal || 0,
      variant: "default" as const,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <StatsHeader
        title="Tableau de bord"
        stats={statsForHeader}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        showDateTime
      />

      <div className="@container/main flex flex-1 flex-col gap-6 p-4 lg:px-6 lg:py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
        >
          <KpiCard
            title="Utilisateurs actifs"
            value={kpis?.activeUsers ?? "—"}
            icon={Users}
            variant="success"
            isLoading={isLoading}
            tooltip="Utilisateurs actifs dans les 60 dernières secondes"
          />
          <KpiCard
            title="Suspendus"
            value={
              kpis
                ? `${kpis.suspended.count} (${kpis.suspended.pct.toFixed(1)}%)`
                : "—"
            }
            icon={UserX}
            variant="warning"
            isLoading={isLoading}
            tooltip="Utilisateurs temporairement suspendus"
          />
          <KpiCard
            title="Supprimés"
            value={
              kpis
                ? `${kpis.deleted.count} (${kpis.deleted.pct.toFixed(1)}%)`
                : "—"
            }
            icon={Trash2}
            variant="danger"
            isLoading={isLoading}
            tooltip="Utilisateurs définitivement supprimés"
          />
          <KpiCard
            title="Messages (24h)"
            value={kpis?.messages24hTotal ?? "—"}
            icon={MessageSquare}
            variant="default"
            isLoading={isLoading}
            tooltip="Total des messages envoyés dans les dernières 24 heures"
          />
          <KpiCard
            title="Santé Système"
            value={
              health?.globalStatus === "ok"
                ? "OK"
                : health?.globalStatus === "warn"
                  ? "Warning"
                  : health?.globalStatus === "down"
                    ? "Down"
                    : "?"
            }
            icon={Activity}
            variant={
              health?.globalStatus
                ? getHealthVariant(health.globalStatus)
                : "default"
            }
            isLoading={healthLoading}
            tooltip={
              health?.avgLatency
                ? `Latence moyenne: ${health.avgLatency.toFixed(0)}ms`
                : "État de santé du système"
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        >
          <TopModelsChart data={metrics?.charts?.models || []} />
          <TopUsersActivityChart data={usersActivityNamed} />
          <TopUsersCostChart data={usersCostNamed} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        >
          <Card className="flex flex-col">
            <div className="p-6 pb-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-semibold">En ligne maintenant</h3>
              </div>
              <Badge variant="green" className="font-mono">
                {online?.users?.length || 0}
              </Badge>
            </div>
            <ScrollArea className="flex-1 max-h-[300px]">
              <div className="p-6 pt-4 space-y-3">
                {onlineLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Chargement...
                  </div>
                ) : (online?.users || []).length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Aucun utilisateur en ligne"
                    description="Aucune activité détectée dans les 60 dernières secondes"
                    compact
                  />
                ) : (
                  (online?.users || []).map((u: any, index: number) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Circle className="size-2 fill-green-500 text-green-500 flex-shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium truncate">
                            {u.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {u.ipAddress || "—"}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Actif
                      </Badge>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="flex flex-col">
            <div className="p-6 pb-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                <h3 className="font-semibold">Santé des services</h3>
              </div>
              <Badge
                variant={
                  health?.globalStatus === "ok"
                    ? "green"
                    : health?.globalStatus === "warn"
                      ? "default"
                      : "destructive"
                }
              >
                {health?.globalStatus?.toUpperCase() || "?"}
              </Badge>
            </div>
            <ScrollArea className="flex-1 max-h-[300px]">
              <div className="p-6 pt-4 space-y-3">
                {healthLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Chargement...
                  </div>
                ) : (health?.providers || []).length === 0 ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="Aucune donnée de santé"
                    description="Les métriques de santé apparaîtront ici"
                    compact
                  />
                ) : (
                  (health?.providers || []).map((p: any, index: number) => (
                    <motion.div
                      key={p.provider}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {p.provider}
                        </span>
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            p.status === "ok"
                              ? "bg-green-500"
                              : p.status === "warn"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">avg {p.avgLatency}ms</span>
                        <span className="font-mono">p95 {p.p95}ms</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="flex flex-col">
            <div className="p-6 pb-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <h3 className="font-semibold">Événements récents</h3>
              </div>
              <Badge variant="outline" className="font-mono">
                {events?.events?.length || 0}
              </Badge>
            </div>
            <ScrollArea className="flex-1 max-h-[300px]">
              <div className="p-6 pt-4 space-y-3">
                {eventsLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Chargement...
                  </div>
                ) : (events?.events || []).length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="Aucun événement"
                    description="Les événements système apparaîtront ici"
                    compact
                  />
                ) : (
                  (events?.events || []).map((e: any, index: number) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {e.category}
                        </Badge>
                        <span className="text-xs font-medium">{e.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {e.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
