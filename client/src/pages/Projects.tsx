import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, FolderKanban, Calendar, Users, Archive } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Projects() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team" | "public">("team");
  const [color, setColor] = useState("#3b82f6");

  const utils = trpc.useUtils();

  // All hooks must be called before any conditional returns
  const { data: projects, isLoading } = trpc.projects.list.useQuery({
    orgId: 1, // TODO: Get from org context
  }, {
    enabled: !!user, // Only run query if user is authenticated
  });

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Projet créé avec succès !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Early return after all hooks
  if (loading || !user) {
    return null;
  }

  const resetForm = () => {
    setName("");
    setDescription("");
    setVisibility("team");
    setColor("#3b82f6");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Le nom du projet est requis");
      return;
    }

    createMutation.mutate({
      orgId: 1, // TODO: Get from org context
      name,
      description,
      visibility,
      color,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Actif" },
      archived: { variant: "secondary", label: "Archivé" },
      completed: { variant: "outline", label: "Terminé" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "private": return "🔒";
      case "team": return "👥";
      case "public": return "🌐";
      default: return "👥";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projets</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un projet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du projet</Label>
                  <Input
                    id="name"
                    placeholder="Mon projet..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description du projet..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="visibility">Visibilité</Label>
                    <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">🔒 Privé</SelectItem>
                        <SelectItem value="team">👥 Équipe</SelectItem>
                        <SelectItem value="public">🌐 Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="color">Couleur</Label>
                    <Input
                      id="color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color || "#3b82f6" }}
                        />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getVisibilityIcon(project.visibility)}
                        {project.visibility === "private" && "Privé"}
                        {project.visibility === "team" && "Équipe"}
                        {project.visibility === "public" && "Public"}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-4 h-4" />
                        Kanban
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun projet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer votre premier projet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

