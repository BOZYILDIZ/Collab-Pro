import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Users, Search, UserPlus, Circle } from "lucide-react";
import { useState } from "react";

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: members } = trpc.organizations.getMembers.useQuery({
    orgId: 1, // TODO: Get from org context
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      owner: { variant: "default", label: "Propriétaire" },
      admin: { variant: "secondary", label: "Admin" },
      member: { variant: "outline", label: "Membre" },
      guest: { variant: "outline", label: "Invité" },
    };
    const config = variants[role] || variants.member;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: "text-green-500",
      offline: "text-gray-400",
      away: "text-yellow-500",
      busy: "text-red-500",
    };
    return colors[status] || "text-gray-400";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      online: "En ligne",
      offline: "Hors ligne",
      away: "Absent",
      busy: "Occupé",
    };
    return labels[status] || "Hors ligne";
  };

  const filteredMembers = members?.filter(({ user }) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Équipe</h1>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter un membre
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredMembers && filteredMembers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map(({ membership, user }) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-primary">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{user.name || "Utilisateur"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rôle</span>
                      {getRoleBadge(membership.role)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      <div className="flex items-center gap-2">
                        <Circle className={`w-2 h-2 fill-current ${getStatusColor(user.status || "offline")}`} />
                        <span className="text-sm">{getStatusLabel(user.status || "offline")}</span>
                      </div>
                    </div>
                    {user.customStatus && (
                      <div className="pt-2 border-t">
                        <p className="text-sm italic text-muted-foreground">
                          "{user.customStatus}"
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "Aucun membre trouvé" : "Aucun membre dans l'équipe"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

