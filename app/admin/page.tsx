'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  Database,
  Users,
  MessageSquare,
  Server,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  responseTime?: number;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers24h: number;
  totalSearches: number;
  searches24h: number;
  avgResponseTime: number;
  successRate: number;
}

import { PRIMARY_ADMIN_EMAILS } from '@/lib/admin-constants';

// Helper function to check if email is admin (matches server-side logic)
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  // Check primary admins (hardcoded list)
  if (PRIMARY_ADMIN_EMAILS.includes(email)) {
    return true;
  }

  // Check ADMIN_EMAIL env var
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (adminEmail && email === adminEmail) {
    return true;
  }

  // Check ADMIN_EMAILS env var (comma-separated)
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  if (adminEmails.includes(email)) {
    return true;
  }

  return false;
}

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (!isPending && !isAdmin) {
      window.location.href = '/';
      return;
    }

    if (isAdmin) {
      fetchData();
    }
  }, [session, isPending, isAdmin]);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);

      // Fetch service health and metrics in parallel
      const [healthResponse, metricsResponse] = await Promise.all([
        fetch('/api/admin/service-health'),
        fetch('/api/admin/system-metrics'),
      ]);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setServices(healthData.services || []);
      }

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch admin data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage SCX.ai</p>
        </div>
        <Button onClick={fetchData} disabled={isRefreshing}>
          <RotateCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {metrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">{metrics.activeUsers24h} active in last 24h</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalSearches}</div>
                  <p className="text-xs text-muted-foreground">{metrics.searches24h} in last 24h</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(1)}s</div>
                  <p className="text-xs text-muted-foreground">{metrics.successRate.toFixed(1)}% success rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">System health</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>Monitor the status of all services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">{service.message}</div>
                      </div>
                    </div>
                    <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>{service.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>Detailed system performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                      <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Active Users (24h)</div>
                      <div className="text-2xl font-bold">{metrics.activeUsers24h}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Searches</div>
                      <div className="text-2xl font-bold">{metrics.totalSearches}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Searches (24h)</div>
                      <div className="text-2xl font-bold">{metrics.searches24h}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
