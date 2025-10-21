"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { pusherClient } from "@/lib/pusher-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { AgentAccessDialog } from "@/components/admin/agent-access-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { UserAvatar } from "@/components/admin/user-avatar";
import { StatsHeader } from "@/components/admin/stats-header";
import {
  MoreVertical,
  KeyRound,
  UserX,
  Trash2,
  UserCog,
  Shield,
  Circle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

async function fetchUsers() {
  const res = await fetch("/api/admin/users", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

function RowActions({
  u,
  onInvalidate,
  onManageAgents,
}: {
  u: any;
  onInvalidate: () => void;
  onManageAgents: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [tempPwd, setTempPwd] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function doReset() {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", password: tempPwd }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }
      
      toast.success(`Mot de passe réinitialisé pour ${u.name}`);
      setResetOpen(false);
      setTempPwd("");
      onInvalidate();
    } catch (e: any) {
      console.error('Erreur reset:', e);
      toast.error(e.message || "Erreur inconnue");
    }
  }

  async function doSuspend() {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend" }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }
      
      toast.success(`${u.name} a été suspendu`);
      setSuspendOpen(false);
      onInvalidate();
    } catch (e: any) {
      console.error('Erreur suspension:', e);
      toast.error(e.message || "Erreur inconnue");
    }
  }

  async function doDelete() {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: "DELETE",
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }
      
      toast.success(`${u.name} a été supprimé`);
      setDeleteOpen(false);
      onInvalidate();
    } catch (e: any) {
      console.error('Erreur suppression:', e);
      toast.error(e.message || "Erreur inconnue");
    }
  }

  async function doChangeRole(role: "user" | "admin") {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeRole", role }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }
      
      toast.success(`Rôle de ${u.name} mis à jour en ${role}`);
      onInvalidate();
    } catch (e: any) {
      console.error('Erreur changement rôle:', e);
      toast.error(e.message || "Erreur inconnue");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onManageAgents} className="gap-2">
            <Shield className="size-4" />
            Gérer les agents
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setResetOpen(true)} className="gap-2">
            <KeyRound className="size-4" />
            Réinitialiser mot de passe
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSuspendOpen(true)} className="gap-2">
            <UserX className="size-4" />
            Suspendre
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <UserCog className="size-4" />
              Changer le rôle
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => doChangeRole("user")}>
                Utilisateur
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doChangeRole("admin")}>
                Admin
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définir un mot de passe temporaire pour <strong>{u.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor={`pwd-${u.id}`}>Mot de passe temporaire</Label>
            <Input
              id={`pwd-${u.id}`}
              type="text"
              value={tempPwd}
              onChange={(e) => setTempPwd(e.target.value)}
              placeholder="Ex: Azerty123!"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 caractères. L'utilisateur devra le changer à la prochaine
              connexion.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Annuler
            </Button>
            <Button onClick={doReset} disabled={tempPwd.length < 3}>
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suspension</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong>{u.name}</strong> sera suspendu immédiatement
              et ne pourra plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doSuspend}>Suspendre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Tous les messages,
              conversations et données de <strong>{u.name}</strong> seront
              supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    refetchOnWindowFocus: true,
  });
  const [selectedUserIdForAgents, setSelectedUserIdForAgents] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe("private-admin-users");
    const onUpdate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
    channel.bind("created", onUpdate);
    channel.bind("updated", onUpdate);
    return () => {
      try {
        channel.unbind("created", onUpdate);
        channel.unbind("updated", onUpdate);
        pusherClient.unsubscribe("private-admin-users");
      } catch {}
    };
  }, [qc]);

  const users = data?.users || [];

  const activeUsers = users.filter(
    (u: any) =>
      u.lastSeen && new Date(u.lastSeen).getTime() > Date.now() - 60_000
  );
  const suspendedUsers = users.filter((u: any) => u.status === "suspended");
  const deletedUsers = users.filter((u: any) => u.status === "deleted");

  const statsForHeader = [
    { label: "Total", value: users.length, variant: "default" as const },
    {
      label: "En ligne",
      value: activeUsers.length,
      variant: "success" as const,
    },
    {
      label: "Suspendus",
      value: suspendedUsers.length,
      variant: "warning" as const,
    },
  ];

  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      label: "Utilisateur",
      sortable: true,
      width: "250px",
      render: (user) => (
        <div className="flex items-center gap-3">
          <UserAvatar username={user.name} size="sm" />
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rôle",
      sortable: true,
      width: "100px",
      render: (user) => (
        <Badge
          variant={user.role === "admin" ? "default" : "outline"}
          className="gap-1"
        >
          {user.role === "admin" && <Shield className="size-3" />}
          {user.role}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Statut",
      sortable: true,
      width: "120px",
      render: (user) => (
        <Badge
          variant={
            user.status === "active"
              ? "green"
              : user.status === "suspended"
                ? "default"
                : "destructive"
          }
        >
          {user.status === "active"
            ? "Actif"
            : user.status === "suspended"
              ? "Suspendu"
              : "Supprimé"}
        </Badge>
      ),
    },
    {
      key: "online",
      label: "Connexion",
      sortable: false,
      width: "120px",
      render: (user) => {
        const online =
          user.lastSeen &&
          new Date(user.lastSeen).getTime() > Date.now() - 60_000;
        return (
          <div className="flex items-center gap-2">
            <Circle
              className={cn(
                "size-2 fill-current",
                online ? "text-green-500" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-sm",
                online ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
              )}
            >
              {online ? "En ligne" : "Hors ligne"}
            </span>
          </div>
        );
      },
    },
    {
      key: "ipAddress",
      label: "Adresse IP",
      sortable: false,
      width: "150px",
      render: (user) => (
        <span className="font-mono text-xs">{user.ipAddress || "—"}</span>
      ),
    },
    {
      key: "lastSeen",
      label: "Dernière activité",
      sortable: true,
      width: "180px",
      render: (user) => {
        if (!user.lastSeen) return <span className="text-muted-foreground">—</span>;
        
        try {
          const date = new Date(user.lastSeen);
          const relative = formatDistanceToNow(date, {
            addSuffix: true,
            locale: fr,
          });
          
          return (
            <div className="flex items-center gap-2">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-sm">{relative}</span>
            </div>
          );
        } catch {
          return <span className="text-muted-foreground">—</span>;
        }
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <StatsHeader
        title="Gestion des utilisateurs"
        stats={statsForHeader}
        onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
        showDateTime={false}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 lg:px-6 lg:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CreateUserForm
            onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <DataTable
              columns={columns}
              data={users}
              isLoading={isLoading}
              searchKey="name"
              searchPlaceholder="Rechercher par nom..."
              filters={[
                {
                  key: "role",
                  label: "Rôle",
                  options: [
                    { value: "user", label: "Utilisateur" },
                    { value: "admin", label: "Admin" },
                  ],
                },
                {
                  key: "status",
                  label: "Statut",
                  options: [
                    { value: "active", label: "Actif" },
                    { value: "suspended", label: "Suspendu" },
                    { value: "deleted", label: "Supprimé" },
                  ],
                },
              ]}
              rowActions={(user) => (
                <RowActions
                  u={user}
                  onInvalidate={() =>
                    qc.invalidateQueries({ queryKey: ["admin-users"] })
                  }
                  onManageAgents={() => setSelectedUserIdForAgents(user.id)}
                />
              )}
              pagination
              pageSize={10}
              emptyMessage="Aucun utilisateur trouvé"
              emptyDescription="Commencez par créer votre premier utilisateur"
            />
          </Card>
        </motion.div>
      </div>

      {selectedUserIdForAgents && (
        <AgentAccessDialog
          userId={selectedUserIdForAgents}
          open={!!selectedUserIdForAgents}
          onClose={() => setSelectedUserIdForAgents(null)}
        />
      )}
    </div>
  );
}
