"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsHeader } from "@/components/admin/stats-header";
import { toast } from "sonner";
import {
  Settings,
  User,
  Shield,
  Bell,
  Server,
  Palette,
  Key,
  Code,
  Save,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  HardDrive,
  Cpu,
  Zap,
  Database,
  Globe,
  Moon,
  Sun,
  Laptop,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

async function fetchSystemInfo() {
  // Simuler l'API - remplacer par vrai endpoint
  return {
    uptime: Date.now() - 86400000 * 3, // 3 jours
    diskUsage: 65,
    memoryUsage: 42,
    cpuUsage: 28,
    dbSize: "2.3 GB",
    cacheSize: "156 MB",
    version: "2.0.0",
  };
}

async function fetchActiveSessions() {
  // Simuler l'API
  return [
    {
      id: "1",
      device: "Chrome sur Windows",
      location: "Paris, France",
      ip: "192.168.1.100",
      lastActive: new Date(Date.now() - 300000),
      current: true,
    },
    {
      id: "2",
      device: "Safari sur iPhone",
      location: "Lyon, France",
      ip: "192.168.1.101",
      lastActive: new Date(Date.now() - 3600000),
      current: false,
    },
  ];
}

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: systemInfo } = useQuery({
    queryKey: ["system-info"],
    queryFn: fetchSystemInfo,
    refetchInterval: 10000,
  });

  const { data: sessions } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: fetchActiveSessions,
    refetchInterval: 30000,
  });

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Admin Dashboard",
    siteUrl: "https://admin.example.com",
    adminEmail: "admin@example.com",
    language: "fr",
    timezone: "Europe/Paris",
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5,
    ipWhitelist: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    newUserAlert: true,
    systemAlerts: true,
    dailyReport: false,
    weeklyReport: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    autoBackup: true,
    backupFrequency: "daily",
    logRetention: 30,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    defaultTheme: "default",
    defaultMode: "system",
    compactMode: false,
    animationsEnabled: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simuler sauvegarde
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("Paramètres sauvegardés avec succès");
    setIsSaving(false);
    setHasChanges(false);
  };

  const handleClearCache = async () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Nettoyage du cache...",
        success: "Cache nettoyé avec succès",
        error: "Erreur lors du nettoyage",
      }
    );
  };

  const handleExportSettings = () => {
    const settings = {
      general: generalSettings,
      security: securitySettings,
      notifications: notificationSettings,
      system: systemSettings,
      appearance: appearanceSettings,
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settings-${Date.now()}.json`;
    a.click();
    toast.success("Paramètres exportés");
  };

  const updateSetting = (section: string, key: string, value: any) => {
    setHasChanges(true);
    if (section === "general") {
      setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    } else if (section === "security") {
      setSecuritySettings((prev) => ({ ...prev, [key]: value }));
    } else if (section === "notifications") {
      setNotificationSettings((prev) => ({ ...prev, [key]: value }));
    } else if (section === "system") {
      setSystemSettings((prev) => ({ ...prev, [key]: value }));
    } else if (section === "appearance") {
      setAppearanceSettings((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <StatsHeader
        title="Paramètres"
        stats={[
          {
            label: "Version",
            value: systemInfo?.version || "—",
            variant: "default",
          },
          {
            label: "Uptime",
            value: systemInfo
              ? formatDistanceToNow(new Date(systemInfo.uptime), { locale: fr })
              : "—",
            variant: "success",
          },
          {
            label: "CPU",
            value: systemInfo ? `${systemInfo.cpuUsage}%` : "—",
            variant: "default",
          },
        ]}
        showDateTime={false}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 lg:px-6 lg:py-6">
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-6 z-50"
            >
              <Card className="p-4 shadow-lg border-primary bg-background">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-sm font-medium">
                    Vous avez des modifications non sauvegardées
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="size-3 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="size-3" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general" className="gap-2">
              <User className="size-4" />
              <span className="hidden sm:inline">Général</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="size-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="size-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="size-4" />
              <span className="hidden sm:inline">Système</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="size-4" />
              <span className="hidden sm:inline">Apparence</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="size-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Code className="size-4" />
              <span className="hidden sm:inline">Avancé</span>
            </TabsTrigger>
          </TabsList>

          {/* GÉNÉRAL */}
          <TabsContent value="general" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Paramètres généraux
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configuration de base de votre plateforme
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Nom du site</Label>
                      <Input
                        id="siteName"
                        value={generalSettings.siteName}
                        onChange={(e) =>
                          updateSetting("general", "siteName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteUrl">URL du site</Label>
                      <Input
                        id="siteUrl"
                        type="url"
                        value={generalSettings.siteUrl}
                        onChange={(e) =>
                          updateSetting("general", "siteUrl", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email administrateur</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={generalSettings.adminEmail}
                      onChange={(e) =>
                        updateSetting("general", "adminEmail", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Adresse email pour les notifications importantes
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">Langue</Label>
                      <Select
                        value={generalSettings.language}
                        onValueChange={(value) =>
                          updateSetting("general", "language", value)
                        }
                      >
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuseau horaire</Label>
                      <Select
                        value={generalSettings.timezone}
                        onValueChange={(value) =>
                          updateSetting("general", "timezone", value)
                        }
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Paris">
                            Europe/Paris (UTC+1)
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            America/New_York (UTC-5)
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">
                            Asia/Tokyo (UTC+9)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* SÉCURITÉ */}
          <TabsContent value="security" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Shield className="size-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Authentification</h3>
                    <p className="text-sm text-muted-foreground">
                      Sécurité des connexions
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="2fa" className="cursor-pointer">
                        Authentification à deux facteurs
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sécurité renforcée pour tous les comptes
                      </p>
                    </div>
                    <Switch
                      id="2fa"
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        updateSetting("security", "twoFactorEnabled", checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timeout de session (minutes)</Label>
                    <Input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) =>
                        updateSetting(
                          "security",
                          "sessionTimeout",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration mot de passe (jours)</Label>
                    <Input
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) =>
                        updateSetting(
                          "security",
                          "passwordExpiry",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tentatives de connexion max</Label>
                    <Input
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) =>
                        updateSetting(
                          "security",
                          "loginAttempts",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Monitor className="size-5 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Sessions actives</h3>
                    <p className="text-sm text-muted-foreground">
                      {sessions?.length || 0} sessions en cours
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        session.current
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {session.device.includes("iPhone") ||
                          session.device.includes("Android") ? (
                            <Smartphone className="size-4 text-muted-foreground" />
                          ) : (
                            <Monitor className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {session.device}
                          </span>
                        </div>
                        {session.current && (
                          <Badge variant="green" className="text-xs">
                            <Check className="size-3 mr-1" />
                            Actuelle
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3" />
                          {session.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="size-3" />
                          {session.ip}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-3" />
                          {formatDistanceToNow(session.lastActive, {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Bell className="size-5 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Préférences de notifications
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gérer les alertes et rappels
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "emailNotifications",
                      label: "Notifications par email",
                      description: "Recevoir les alertes importantes par email",
                    },
                    {
                      key: "newUserAlert",
                      label: "Alerte nouveau utilisateur",
                      description:
                        "Notification lors de la création d'un compte",
                    },
                    {
                      key: "systemAlerts",
                      label: "Alertes système",
                      description: "Problèmes techniques et maintenances",
                    },
                    {
                      key: "dailyReport",
                      label: "Rapport quotidien",
                      description: "Résumé d'activité envoyé chaque jour",
                    },
                    {
                      key: "weeklyReport",
                      label: "Rapport hebdomadaire",
                      description: "Statistiques détaillées chaque semaine",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <Label
                          htmlFor={item.key}
                          className="cursor-pointer font-medium"
                        >
                          {item.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <Switch
                        id={item.key}
                        checked={
                          notificationSettings[
                            item.key as keyof typeof notificationSettings
                          ]
                        }
                        onCheckedChange={(checked) =>
                          updateSetting("notifications", item.key, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* SYSTÈME */}
          <TabsContent value="system" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Server className="size-5 text-purple-600 dark:text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Configuration système
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Options avancées
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="maintenance" className="cursor-pointer">
                        Mode maintenance
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Désactiver l'accès public temporairement
                      </p>
                    </div>
                    <Switch
                      id="maintenance"
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) =>
                        updateSetting("system", "maintenanceMode", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="debug" className="cursor-pointer">
                        Mode debug
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Activer les logs détaillés (dev only)
                      </p>
                    </div>
                    <Switch
                      id="debug"
                      checked={systemSettings.debugMode}
                      onCheckedChange={(checked) =>
                        updateSetting("system", "debugMode", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="autobackup" className="cursor-pointer">
                        Sauvegardes automatiques
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Backup régulier de la base de données
                      </p>
                    </div>
                    <Switch
                      id="autobackup"
                      checked={systemSettings.autoBackup}
                      onCheckedChange={(checked) =>
                        updateSetting("system", "autoBackup", checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fréquence des backups</Label>
                    <Select
                      value={systemSettings.backupFrequency}
                      onValueChange={(value) =>
                        updateSetting("system", "backupFrequency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Toutes les heures</SelectItem>
                        <SelectItem value="daily">Quotidien</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleClearCache}
                    >
                      <Trash2 className="size-4" />
                      Vider le cache système
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <HardDrive className="size-5 text-cyan-600 dark:text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">État du système</h3>
                    <p className="text-sm text-muted-foreground">
                      Ressources et performance
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <HardDrive className="size-4 text-muted-foreground" />
                        <span>Utilisation disque</span>
                      </div>
                      <span className="font-medium">
                        {systemInfo?.diskUsage}%
                      </span>
                    </div>
                    <Progress
                      value={systemInfo?.diskUsage || 0}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-muted-foreground" />
                        <span>Utilisation CPU</span>
                      </div>
                      <span className="font-medium">
                        {systemInfo?.cpuUsage}%
                      </span>
                    </div>
                    <Progress
                      value={systemInfo?.cpuUsage || 0}
                      className="h-2"
                      indicatorClassName="bg-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="size-4 text-muted-foreground" />
                        <span>Mémoire RAM</span>
                      </div>
                      <span className="font-medium">
                        {systemInfo?.memoryUsage}%
                      </span>
                    </div>
                    <Progress
                      value={systemInfo?.memoryUsage || 0}
                      className="h-2"
                      indicatorClassName="bg-purple-500"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Database className="size-4" />
                        <span className="text-xs">Base de données</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {systemInfo?.dbSize}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Server className="size-4" />
                        <span className="text-xs">Cache</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {systemInfo?.cacheSize}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* APPARENCE */}
          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Palette className="size-5 text-pink-600 dark:text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Personnalisation</h3>
                    <p className="text-sm text-muted-foreground">
                      Thème et affichage
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Thème par défaut</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: "default", label: "Défaut", color: "bg-blue-500" },
                        { value: "blue", label: "Bleu", color: "bg-blue-600" },
                        { value: "green", label: "Vert", color: "bg-green-500" },
                        { value: "amber", label: "Ambre", color: "bg-amber-500" },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() =>
                            updateSetting("appearance", "defaultTheme", theme.value)
                          }
                          className={cn(
                            "p-4 rounded-lg border-2 transition-all hover:scale-105",
                            appearanceSettings.defaultTheme === theme.value
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted/50 hover:border-muted"
                          )}
                        >
                          <div className={cn("size-12 rounded-full mb-2 mx-auto", theme.color)} />
                          <p className="text-sm font-medium">{theme.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Mode couleur</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", label: "Clair", icon: Sun },
                        { value: "dark", label: "Sombre", icon: Moon },
                        { value: "system", label: "Système", icon: Laptop },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <button
                            key={mode.value}
                            onClick={() =>
                              updateSetting("appearance", "defaultMode", mode.value)
                            }
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all hover:scale-105",
                              appearanceSettings.defaultMode === mode.value
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:border-muted"
                            )}
                          >
                            <Icon className="size-6 mx-auto mb-2" />
                            <p className="text-sm font-medium">{mode.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="compact" className="cursor-pointer">
                        Mode compact
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Réduire les espacements pour plus de densité
                      </p>
                    </div>
                    <Switch
                      id="compact"
                      checked={appearanceSettings.compactMode}
                      onCheckedChange={(checked) =>
                        updateSetting("appearance", "compactMode", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <Label htmlFor="animations" className="cursor-pointer">
                        Animations activées
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Désactiver si problèmes de performance
                      </p>
                    </div>
                    <Switch
                      id="animations"
                      checked={appearanceSettings.animationsEnabled}
                      onCheckedChange={(checked) =>
                        updateSetting("appearance", "animationsEnabled", checked)
                      }
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* API */}
          <TabsContent value="api" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Key className="size-5 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Clés API</h3>
                    <p className="text-sm text-muted-foreground">
                      Gestion des accès API
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium mb-2">
                      Clé API principale
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        value="sk_live_••••••••••••••••••••"
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="sm">
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Dernière utilisation: il y a 2 heures
                    </p>
                  </div>

                  <Button variant="outline" className="w-full gap-2">
                    <Key className="size-4" />
                    Générer une nouvelle clé
                  </Button>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* AVANCÉ */}
          <TabsContent value="advanced" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Code className="size-5 text-red-600 dark:text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Paramètres avancés
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Options techniques et export
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="gap-2 justify-start"
                      onClick={handleExportSettings}
                    >
                      <Download className="size-4" />
                      Exporter les paramètres
                    </Button>
                    <Button variant="outline" className="gap-2 justify-start">
                      <Upload className="size-4" />
                      Importer les paramètres
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Rétention des logs (jours)</Label>
                    <Input
                      type="number"
                      value={systemSettings.logRetention}
                      onChange={(e) =>
                        updateSetting(
                          "system",
                          "logRetention",
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Les logs plus anciens seront automatiquement supprimés
                    </p>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-2">
                      Zone dangereuse
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ces actions sont irréversibles
                    </p>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="size-4" />
                      Réinitialiser tous les paramètres
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
