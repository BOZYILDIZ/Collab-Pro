import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Search, Tag, Star, Pin, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function NotesV2() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "private" | "public">("all");

  const utils = trpc.useUtils();

  const { data: notes = [], isLoading: notesLoading } = trpc.notes.list.useQuery(
    { orgId: 1, isPublic: activeTab === "public" ? true : activeTab === "private" ? false : undefined },
    { enabled: !!user }
  );

  const { data: templates = [] } = trpc.notes.templates.useQuery(undefined, {
    enabled: !!user,
  });

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setIsCreateDialogOpen(false);
      setIsTemplateDialogOpen(false);
      setNoteTitle("");
      setNoteContent("");
      setNoteTags("");
      setSelectedTemplate(null);
      toast.success("Note créée !");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création de la note");
      console.error(error);
    },
  });

  const handleCreateNote = () => {
    if (!noteTitle.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    const tags = noteTags.split(",").map(t => t.trim()).filter(Boolean);

    createNoteMutation.mutate({
      orgId: 1,
      title: noteTitle,
      contentMarkdown: noteContent,
      isPublic,
      tags,
    });
  };

  const handleCreateFromTemplate = (template: any) => {
    setSelectedTemplate(template);
    setNoteTitle(template.name);
    setNoteContent(template.contentMarkdown);
    setIsTemplateDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(search) ||
      (note.contentMarkdown && note.contentMarkdown.toLowerCase().includes(search))
    );
  });

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notes</h1>
            <p className="text-muted-foreground">Organisez vos idées et connaissances</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Utiliser un template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choisir un template</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {templates.map((template: any) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{template.icon}</span>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      {template.category && (
                        <CardContent>
                          <Badge variant="secondary">{template.category}</Badge>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTemplate ? `Créer une note depuis "${selectedTemplate.name}"` : "Nouvelle note"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Titre de la note"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Contenu (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Écrivez votre note en Markdown..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input
                      id="tags"
                      value={noteTags}
                      onChange={(e) => setNoteTags(e.target.value)}
                      placeholder="travail, projet, important"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer">
                      Note publique (visible par toute l'équipe)
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNoteTitle("");
                        setNoteContent("");
                        setNoteTags("");
                        setSelectedTemplate(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                      {createNoteMutation.isPending ? "Création..." : "Créer"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans vos notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="private">Privées</TabsTrigger>
            <TabsTrigger value="public">Publiques</TabsTrigger>
          </TabsList>
        </Tabs>

        {notesLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Aucune note</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Aucune note ne correspond à votre recherche" : "Créez votre première note pour commencer"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note: any) => (
              <Link key={note.id} href={`/notes/${note.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                      <div className="flex gap-1">
                        {note.isPinned && <Pin className="h-4 w-4 text-primary" />}
                        {note.isFavorite && <Star className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>
                    {note.contentMarkdown && (
                      <CardDescription className="line-clamp-3">
                        {note.contentMarkdown.substring(0, 150)}...
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {note.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        {note.tags && JSON.parse(note.tags).slice(0, 2).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

