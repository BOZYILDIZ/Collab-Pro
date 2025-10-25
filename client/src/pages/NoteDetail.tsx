import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Trash2, Star, Pin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function NoteDetail() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute("/notes/:id");
  const [, setLocation] = useLocation();
  const noteId = params?.id ? parseInt(params.id) : null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const utils = trpc.useUtils();

  const { data: note, isLoading } = trpc.notes.getById.useQuery(
    { id: noteId! },
    { enabled: !!noteId && !!user }
  );

  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.getById.invalidate({ id: noteId! });
      toast.success("Note mise à jour !");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      toast.success("Note supprimée !");
      setLocation("/notes");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.contentMarkdown || "");
      setTags(Array.isArray(note.tags) ? note.tags.join(", ") : "");
      setIsPublic(note.isPublic);
      setIsPinned(note.isPinned || false);
      setIsFavorite(note.isFavorite || false);
    }
  }, [note]);

  const handleSave = () => {
    if (!noteId) return;

    updateNoteMutation.mutate({
      id: noteId,
      title,
      contentMarkdown: content,
      tags: tags.split(",").map(t => t.trim()).filter(t => t),
      isPublic,
      isPinned,
      isFavorite,
    });
  };

  const handleDelete = () => {
    if (!noteId) return;

    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      deleteNoteMutation.mutate({ noteId });
    }
  };

  if (loading || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!note) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Note introuvable</p>
          <Button onClick={() => setLocation("/notes")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux notes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/notes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux notes
          </Button>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            <Button onClick={handleSave} disabled={updateNoteMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateNoteMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Modifier la note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la note"
              />
            </div>

            <div>
              <Label htmlFor="content">Contenu (Markdown)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contenu de la note en Markdown..."
                className="min-h-[400px] font-mono"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="travail, important, idée"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="public">Note publique</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="pinned"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
                <Pin className="w-4 h-4" />
                <Label htmlFor="pinned">Épingler</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="favorite"
                  checked={isFavorite}
                  onCheckedChange={setIsFavorite}
                />
                <Star className="w-4 h-4" />
                <Label htmlFor="favorite">Favori</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prévisualisation */}
        <Card>
          <CardHeader>
            <CardTitle>Prévisualisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <h1>{title}</h1>
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

