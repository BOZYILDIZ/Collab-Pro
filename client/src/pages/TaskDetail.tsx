import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, CheckCircle2, Circle, Paperclip, MessageSquare, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function TaskDetail() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const params = useParams();
  const taskId = parseInt(params.id || "0");
  
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [commentContent, setCommentContent] = useState("");

  const utils = trpc.useUtils();

  const { data: task, isLoading } = trpc.tasks.get.useQuery({ id: taskId }, {
    enabled: !!user,
  });
  
  const { data: subtasks = [] } = trpc.tasks.getSubtasks.useQuery({ parentTaskId: taskId }, {
    enabled: !!user && !!task,
  });
  
  const { data: comments = [] } = trpc.tasks.getComments.useQuery({ taskId }, {
    enabled: !!user && !!task,
  });

  const createSubtaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.getSubtasks.invalidate();
      setIsSubtaskDialogOpen(false);
      setSubtaskTitle("");
      toast.success("Sous-tâche créée !");
    },
  });

  const addCommentMutation = trpc.tasks.addComment.useMutation({
    onSuccess: () => {
      utils.tasks.getComments.invalidate();
      setIsCommentDialogOpen(false);
      setCommentContent("");
      toast.success("Commentaire ajouté !");
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.get.invalidate();
      utils.tasks.getSubtasks.invalidate();
    },
  });

  // Early return after all hooks
  if (loading || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Tâche introuvable</p>
          <Link href="/projects">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux projets
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreateSubtask = () => {
    if (!subtaskTitle.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    createSubtaskMutation.mutate({
      projectId: task.projectId,
      parentTaskId: taskId,
      title: subtaskTitle,
      status: "todo",
      priority: "medium",
    });
  };

  const handleAddComment = () => {
    if (!commentContent.trim()) {
      toast.error("Le commentaire ne peut pas être vide");
      return;
    }

    addCommentMutation.mutate({
      taskId,
      content: commentContent,
    });
  };

  const toggleSubtaskStatus = (subtaskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    updateTaskMutation.mutate({
      id: subtaskId,
      status: newStatus,
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-blue-600",
      medium: "text-yellow-600",
      high: "text-orange-600",
      urgent: "text-red-600",
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      urgent: "Urgente",
    };
    return labels[priority] || priority;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/projects/${task.projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="text-sm text-muted-foreground">
              Tâche #{task.id} • Créée le {task.createdAt ? format(new Date(task.createdAt), "dd MMM yyyy", { locale: fr }) : "N/A"}
            </p>
          </div>
          <Badge className={getPriorityColor(task.priority || "medium")}>
            {getPriorityLabel(task.priority || "medium")}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {task.description || "Aucune description"}
                </p>
              </CardContent>
            </Card>

            {/* Subtasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sous-tâches ({subtasks.length})</CardTitle>
                <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle sous-tâche</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subtask-title">Titre</Label>
                        <Input
                          id="subtask-title"
                          placeholder="Titre de la sous-tâche..."
                          value={subtaskTitle}
                          onChange={(e) => setSubtaskTitle(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsSubtaskDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleCreateSubtask} disabled={createSubtaskMutation.isPending}>
                          Créer
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune sous-tâche</p>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleSubtaskStatus(subtask.id, subtask.status)}
                      >
                        {subtask.status === "done" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={subtask.status === "done" ? "line-through text-muted-foreground" : ""}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Commentaires ({comments.length})</CardTitle>
                <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Commenter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouveau commentaire</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="comment">Commentaire</Label>
                        <Textarea
                          id="comment"
                          placeholder="Votre commentaire..."
                          rows={4}
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddComment} disabled={addCommentMutation.isPending}>
                          Publier
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun commentaire</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((item) => (
                      <div key={item.comment.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{item.user?.name || "Utilisateur"}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {item.comment.createdAt ? format(new Date(item.comment.createdAt), "dd MMM yyyy à HH:mm", { locale: fr }) : "N/A"}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{item.comment.content}</p>
                        {item !== comments[comments.length - 1] && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Statut</p>
                  <Badge>{task.status}</Badge>
                </div>
                
                {task.assigneeId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Assigné à</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">U</span>
                      </div>
                      <span className="text-sm">Utilisateur #{task.assigneeId}</span>
                    </div>
                  </div>
                )}

                {task.dueDate && (
                  <div>
                    <p className="text-sm font-medium mb-1">Date d'échéance</p>
                    <p className="text-sm text-muted-foreground">
                      {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy", { locale: fr }) : "Non définie"}
                    </p>
                  </div>
                )}

                {task.estimatedHours && (
                  <div>
                    <p className="text-sm font-medium mb-1">Estimation</p>
                    <p className="text-sm text-muted-foreground">{task.estimatedHours}h</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pièces jointes</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Ajouter un fichier
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Aucune pièce jointe</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

