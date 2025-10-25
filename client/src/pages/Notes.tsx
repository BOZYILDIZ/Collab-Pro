import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Search, Star, Pin, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Notes() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"private" | "public">("private");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Create note form state
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteIsPublic, setNewNoteIsPublic] = useState(false);

  const utils = trpc.useUtils();

  // Fetch notes
  const { data: notes, isLoading } = trpc.notes.list.useQuery({
    orgId: 1, // TODO: Get from org context
    isPublic: activeTab === "public" ? true : false,
  });

  // Fetch selected note
  const { data: selectedNote } = trpc.notes.getById.useQuery(
    { id: selectedNoteId! },
    { enabled: !!selectedNoteId }
  );

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setIsCreateDialogOpen(false);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteIsPublic(false);
    },
  });

  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.getById.invalidate();
    },
  });

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) return;

    createNoteMutation.mutate({
      orgId: 1, // TODO: Get from org context
      title: newNoteTitle,
      contentMarkdown: newNoteContent,
      isPublic: newNoteIsPublic,
    });
  };

  const handleToggleFavorite = (noteId: number, currentValue: boolean) => {
    updateNoteMutation.mutate({
      id: noteId,
      isFavorite: !currentValue,
    });
  };

  const handleTogglePin = (noteId: number, currentValue: boolean) => {
    updateNoteMutation.mutate({
      id: noteId,
      isPinned: !currentValue,
    });
  };

  const handleNoteClick = (noteId: number) => {
    setSelectedNoteId(noteId);
    setIsViewDialogOpen(true);
  };

  const handleUpdateNote = () => {
    if (!selectedNote || !selectedNoteId) return;

    updateNoteMutation.mutate({
      id: selectedNoteId,
      title: selectedNote.title,
      contentMarkdown: selectedNote.contentMarkdown || "",
      isPublic: selectedNote.isPublic,
    });
  };

  const filteredNotes = notes?.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.contentMarkdown?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notes</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    placeholder="Titre de la note..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Contenu (Markdown)</Label>
                  <Textarea
                    id="content"
                    placeholder="Écrivez votre note en Markdown..."
                    rows={10}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={newNoteIsPublic}
                    onCheckedChange={setNewNoteIsPublic}
                  />
                  <Label htmlFor="public">Note publique (visible par toute l'équipe)</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateNote}
                    disabled={!newNoteTitle.trim() || createNoteMutation.isPending}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "private" | "public")}>
          <TabsList>
            <TabsTrigger value="private" className="gap-2">
              <Lock className="w-4 h-4" />
              Privées
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2">
              <Globe className="w-4 h-4" />
              Publiques
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Chargement...</p>
            ) : filteredNotes && filteredNotes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer relative"
                    onClick={() => handleNoteClick(note.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(note.id, note.isPinned || false);
                            }}
                          >
                            <Pin
                              className={`w-4 h-4 ${note.isPinned ? "fill-current" : ""}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(note.id, note.isFavorite || false);
                            }}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                note.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                              }`}
                            />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {note.contentMarkdown || "Aucun contenu"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(note.updatedAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                        {note.isPublic && (
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="w-3 h-3" />
                            Public
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchQuery
                      ? "Aucune note trouvée"
                      : `Aucune note ${activeTab === "private" ? "privée" : "publique"}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog pour afficher/éditer une note */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Note</DialogTitle>
            </DialogHeader>
            {selectedNote ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="view-title">Titre</Label>
                  <Input
                    id="view-title"
                    value={selectedNote.title}
                    onChange={(e) => {
                      // Update in place for editing
                      const updated = { ...selectedNote, title: e.target.value };
                      utils.notes.getById.setData({ id: selectedNoteId! }, updated);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="view-content">Contenu (Markdown)</Label>
                  <Textarea
                    id="view-content"
                    rows={15}
                    value={selectedNote.contentMarkdown || ""}
                    onChange={(e) => {
                      // Update in place for editing
                      const updated = { ...selectedNote, contentMarkdown: e.target.value };
                      utils.notes.getById.setData({ id: selectedNoteId! }, updated);
                    }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="view-public"
                    checked={selectedNote.isPublic}
                    onCheckedChange={(checked) => {
                      // Update in place for editing
                      const updated = { ...selectedNote, isPublic: checked };
                      utils.notes.getById.setData({ id: selectedNoteId! }, updated);
                    }}
                  />
                  <Label htmlFor="view-public">Note publique (visible par toute l'équipe)</Label>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Dernière modification : {formatDistanceToNow(new Date(selectedNote.updatedAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Fermer
                    </Button>
                    <Button
                      onClick={handleUpdateNote}
                      disabled={updateNoteMutation.isPending}
                    >
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Chargement...</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

