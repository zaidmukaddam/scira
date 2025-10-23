'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ClassicLoader } from '@/components/ui/loading';
import { toast } from 'sonner';

interface DailyUsage {
  date: string;
  apiKeyId: string;
  messageCount: number;
  apiCallCount: number;
  tokensUsed: number;
}

interface RotationEvent {
  timestamp: string;
  message: string;
  metadata: {
    fromKeyId?: string;
    toKeyId?: string;
    reason?: string;
  };
}

interface StatsData {
  dailyUsage: DailyUsage[];
  rotationHistory: RotationEvent[];
  errorHistory: RotationEvent[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded p-2 shadow-lg">
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ApiKeyAnalytics() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/api-keys/stats');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <ClassicLoader />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const chartData = stats.dailyUsage.reduce(
    (acc, item) => {
      const existingDate = acc.find((d) => d.date === item.date);
      if (existingDate) {
        existingDate[`key-${item.apiKeyId}`] = item.apiCallCount;
      } else {
        acc.push({
          date: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          [`key-${item.apiKeyId}`]: item.apiCallCount,
        });
      }
      return acc;
    },
    [] as any[],
  );

  const colors = [
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
  ];

  return (
    <Tabs defaultValue="usage" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="rotation">Rotation</TabsTrigger>
        <TabsTrigger value="errors">Errors</TabsTrigger>
      </TabsList>

      <TabsContent value="usage" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Calls per Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                    max={250}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(chartData[0] || {})
                    .filter((k) => k !== 'date')
                    .map((key, idx) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={colors[idx % colors.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rotation" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rotation History</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.rotationHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rotations yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.rotationHistory.map((event, idx) => (
                  <div
                    key={idx}
                    className="border-l-2 border-blue-500 pl-3 py-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                    <p className="text-sm">
                      Rotated to key{' '}
                      <code className="bg-muted px-1 rounded text-xs">
                        {event.metadata.toKeyId?.substring(0, 8)}...
                      </code>
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {event.metadata.reason || 'automatic'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="errors" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Error History</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.errorHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No errors recorded</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.errorHistory.map((event, idx) => (
                  <div
                    key={idx}
                    className="border-l-2 border-red-500 pl-3 py-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-red-600">{event.message}</p>
                    {event.metadata.error && (
                      <code className="bg-red-50 dark:bg-red-950 px-1 rounded text-xs mt-1 block">
                        {event.metadata.error}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
