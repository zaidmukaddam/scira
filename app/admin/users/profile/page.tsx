"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsHeader } from "@/components/admin/stats-header";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { UserAvatar } from "@/components/admin/user-avatar";
import { UserProfileDialog } from "@/components/admin/user-profile-dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart as RBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/admin/orcish/ui/chart";
import { ChartCard } from "@/components/admin/chart-card";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

async function fetchRanking() {
  const res = await fetch("/api/admin/users/ranking", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch ranking");
  return res.json();
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function TopProfilePage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: topUsers, isLoading } = useQuery({
    queryKey: ["top-users-ranking"],
    queryFn: fetchRanking,
    refetchInterval: 30000,
  });

  const details = topUsers?.details || [];
  const ranking = (topUsers?.ranking || []).slice(0, 20);

  const activeNow = useMemo(
    () =>
      details.filter(
        (u: any) => u.lastSeen && new Date(u.lastSeen).getTime() > Date.now() - 60_000
      ).length,
    [details]
  );

  const active24hUsersCount = useMemo(
    () => details.filter((u: any) => (u.messages24h || 0) > 0).length,
    [details]
  );

  const tableData = useMemo(
    () =>
      details.map((u: any, idx: number) => {
        const online =
          u.lastSeen && new Date(u.lastSeen).getTime() > Date.now() - 60_000;
        const activity = (u.messages24h || 0) > 0 ? "active" : "inactive";
        return { ...u, rank: idx + 1, online: online ? "online" : "offline", activity };
      }),
    [details]
  );

  const columns: DataTableColumn<any>[] = [
    {
      key: "rank",
      label: "#",
      width: "56px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.rank <= 3 && (
            <Trophy
              className={cn(
                "size-4",
                row.rank === 1 && "text-yellow-500",
                row.rank === 2 && "text-gray-400",
                row.rank === 3 && "text-amber-700"
              )}
            />
          )}
          <span className="font-medium">{row.rank}</span>
        </div>
      ),
    },
    {
      key: "name",
      label: "Utilisateur",
      sortable: true,
      width: "280px",
      render: (user) => (
        <div className="flex items-center gap-3">
          <UserAvatar username={user.name} size="sm" />
          <div className="flex flex-col">
            <span className="font-medium truncate max-w-[200px]">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">
              {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "totalMessages",
      label: "Messages Totaux",
      sortable: true,
      width: "140px",
    },
    {
      key: "messages24h",
      label: "Messages 24h",
      sortable: true,
      width: "140px",
      render: (user) => (
        <span className={cn("font-medium", (user.messages24h || 0) > 0 ? "text-foreground" : "text-muted-foreground")}>{user.messages24h}</span>
      ),
    },
    {
      key: "favoriteAgent",
      label: "Agent préféré",
      width: "160px",
      render: (user) => <Badge variant="outline">{user.favoriteAgent}</Badge>,
    },
    {
      key: "lastSeen",
      label: "Dernière activité",
      sortable: true,
      width: "180px",
      render: (user) => {
        if (!user.lastSeen) return <span className="text-muted-foreground">Jamais</span>;
        try {
          const date = new Date(user.lastSeen);
          const relative = formatDistanceToNow(date, { addSuffix: true, locale: fr });
          return <span className="text-sm">{relative}</span>;
        } catch {
          return <span className="text-muted-foreground">—</span>;
        }
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <StatsHeader
        title="Top Profil Utilisateurs"
        stats={[
          { label: "Total profilés", value: details.length, variant: "default" },
          { label: "Actifs 24h", value: active24hUsersCount, variant: "success" },
          { label: "En ligne", value: activeNow, variant: "success" },
        ]}
        showDateTime={false}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 lg:px-6 lg:py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ChartCard
            title="Top 20 par nombre de messages"
            description="Classement des utilisateurs les plus actifs"
            isLoading={isLoading}
            isEmpty={!isLoading && ranking.length === 0}
          >
            <ChartContainer
              config={{ value: { label: "Messages", color: "hsl(var(--chart-1))" } }}
              className="aspect-auto h-[360px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RBarChart data={ranking} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="messageCount" radius={[0, 4, 4, 0]} animationDuration={800}>
                    {ranking.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </RBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ChartCard
            title="Détails des utilisateurs"
            description="Informations et actions rapides"
            isLoading={isLoading}
            isEmpty={!isLoading && tableData.length === 0}
          >
            <DataTable
              columns={columns}
              data={tableData}
              isLoading={isLoading}
              searchKey="name"
              searchPlaceholder="Rechercher un utilisateur..."
              filters={[
                {
                  key: "activity",
                  label: "Activité 24h",
                  options: [
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" },
                  ],
                },
                {
                  key: "online",
                  label: "Connexion",
                  options: [
                    { value: "online", label: "En ligne" },
                    { value: "offline", label: "Hors ligne" },
                  ],
                },
              ]}
              rowActions={(row) => (
                <Button size="sm" variant="outline" onClick={() => setSelectedUserId(row.id)}>
                  Voir profil
                </Button>
              )}
              pagination
              pageSize={10}
              emptyMessage="Aucun utilisateur"
              emptyDescription="Les meilleurs utilisateurs apparaîtront ici"
            />
          </ChartCard>
        </motion.div>
      </div>

      {selectedUserId && (
        <UserProfileDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
