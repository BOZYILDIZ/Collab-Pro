import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MessageSquare, FileText, Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(
    { orgId: 1 }, // TODO: Get from org context
    { enabled: !!user }
  );

  if (loading || !user) {
    return null; // Will redirect to /login
  }
  
  const stats = [
    { 
      title: "Messages non lus", 
      value: statsLoading ? "..." : String(statsData?.unreadMessages || 0), 
      icon: MessageSquare, 
      color: "text-blue-500",
      href: "/chat"
    },
    { 
      title: "Notes actives", 
      value: statsLoading ? "..." : String(statsData?.activeNotes || 0), 
      icon: FileText, 
      color: "text-green-500",
      href: "/notes"
    },
    { 
      title: "Événements à venir", 
      value: statsLoading ? "..." : String(statsData?.upcomingEvents || 0), 
      icon: Calendar, 
      color: "text-purple-500",
      href: "/calendar"
    },
    { 
      title: "Rendez-vous en attente", 
      value: statsLoading ? "..." : String(statsData?.pendingAppointments || 0), 
      icon: Clock, 
      color: "text-orange-500",
      href: "/appointments"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bienvenue, {user?.name || "Utilisateur"} !
          </h1>
          <p className="text-muted-foreground mt-2">
            Voici un aperçu de votre activité collaborative
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Démarrer une conversation
              </CardTitle>
              <CardDescription>
                Créez un nouveau chat 1:1 ou un groupe de discussion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/chat">
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Aller au Chat →
                </span>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Créer une note
              </CardTitle>
              <CardDescription>
                Ajoutez une note privée ou partagée avec votre équipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/notes">
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Aller aux Notes →
                </span>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Planifier un rendez-vous
              </CardTitle>
              <CardDescription>
                Proposez des créneaux et invitez des collaborateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/appointments">
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Aller aux Rendez-vous →
                </span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <div>
                  <p className="font-medium">Nouveau message dans #équipe-dev</p>
                  <p className="text-muted-foreground text-xs">Il y a 5 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                <div>
                  <p className="font-medium">Note "Compte rendu réunion" mise à jour</p>
                  <p className="text-muted-foreground text-xs">Il y a 1 heure</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                <div>
                  <p className="font-medium">Événement "Sprint Planning" demain à 10h</p>
                  <p className="text-muted-foreground text-xs">Il y a 3 heures</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

