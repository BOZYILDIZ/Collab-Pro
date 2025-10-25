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
import { trpc } from "@/lib/trpc";
import { Plus, ArrowLeft, MoreVertical, User } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const DEFAULT_COLUMNS = [
  { id: "todo", title: "À faire", color: "#94a3b8" },
  { id: "in_progress", title: "En cours", color: "#3b82f6" },
  { id: "review", title: "En revue", color: "#f59e0b" },
  { id: "done", title: "Terminé", color: "#10b981" },
];

export default function ProjectBoard() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const params = useParams();
  const projectId = parseInt(params.id || "0");
  
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("todo");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [assigneeId, setAssigneeId] = useState<number | undefined>();

  const utils = trpc.useUtils();

  // All hooks must be called before any conditional returns
  const { data: project } = trpc.projects.get.useQuery({ id: projectId }, {
    enabled: !!user,
  });
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery({ projectId }, {
    enabled: !!user,
  });
  const { data: members = [] } = trpc.projects.getMembers.useQuery({ projectId }, {
    enabled: !!user,
  });

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setIsCreateTaskDialogOpen(false);
      resetForm();
      toast.success("Tâche créée avec succès !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  // Early return after all hooks
  if (loading || !user) {
    return null;
  }

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeId(undefined);
  };

  const handleCreateTask = () => {
    if (!title.trim()) {
      toast.error("Le titre de la tâche est requis");
      return;
    }

    createTaskMutation.mutate({
      projectId,
      title,
      description,
      status: selectedColumn,
      priority,
      assigneeId,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId.replace("task-", ""));
    const newStatus = destination.droppableId;

    updateTaskMutation.mutate({
      id: taskId,
      status: newStatus,
      position: destination.index,
    });
  };

  const getTasksByColumn = (columnId: string) => {
    return tasks.filter((t: any) => t.task.status === columnId);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-500",
      medium: "bg-blue-500",
      high: "bg-orange-500",
      urgent: "bg-red-500",
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
    return labels[priority] || labels.medium;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{project?.name || "Projet"}</h1>
              {project?.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une tâche</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    placeholder="Titre de la tâche..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Colonne</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={selectedColumn}
                      onChange={(e) => setSelectedColumn(e.target.value)}
                    >
                      {DEFAULT_COLUMNS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Priorité</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <Label>Assigné à</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={assigneeId || ""}
                      onChange={(e) => setAssigneeId(e.target.value ? parseInt(e.target.value) : undefined)}
                    >
                      <option value="">Non assigné</option>
                      {members.map((m: any) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name || m.user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={createTaskMutation.isPending}
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
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEFAULT_COLUMNS.map((column) => (
                <div key={column.id} className="flex flex-col">
                  <div
                    className="flex items-center justify-between p-3 rounded-t-lg"
                    style={{ backgroundColor: column.color + "20", borderLeft: `4px solid ${column.color}` }}
                  >
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="secondary">{getTasksByColumn(column.id).length}</Badge>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 min-h-[200px] rounded-b-lg border border-t-0 ${
                          snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                        }`}
                      >
                        {getTasksByColumn(column.id).map((taskData: any, index: number) => {
                          const task = taskData.task;
                          const assignee = taskData.assignee;
                          
                          return (
                            <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                              {(provided, snapshot) => (
                                <Link href={`/tasks/${task.id}`}>
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? "shadow-lg" : ""
                                    }`}
                                  >
                                  <CardHeader className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-sm font-medium line-clamp-2">
                                        {task.title}
                                      </CardTitle>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0 space-y-2">
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <div
                                        className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                                        title={getPriorityLabel(task.priority)}
                                      />
                                      {assignee && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <User className="w-3 h-3" />
                                          <span className="truncate max-w-[100px]">
                                            {assignee.name || assignee.email}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                                </Link>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </DashboardLayout>
  );
}

