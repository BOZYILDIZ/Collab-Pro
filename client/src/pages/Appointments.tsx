import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Clock, CheckCircle, XCircle, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function Appointments() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [slot1Date, setSlot1Date] = useState("");
  const [slot1Time, setSlot1Time] = useState("");
  const [slot2Date, setSlot2Date] = useState("");
  const [slot2Time, setSlot2Time] = useState("");
  const [slot3Date, setSlot3Date] = useState("");
  const [slot3Time, setSlot3Time] = useState("");

  const utils = trpc.useUtils();

  const { data: appointments, isLoading } = trpc.appointments.list.useQuery(
    { orgId: 1 },
    { enabled: !!user }
  );

  const { data: users } = trpc.users.list.useQuery(
    { orgId: 1 },
    { enabled: !!user }
  );

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Rendez-vous créé !");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const confirmMutation = trpc.appointments.confirm.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      toast.success("Rendez-vous confirmé et ajouté à l'agenda !");
    },
  });

  const declineMutation = trpc.appointments.decline.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      toast.success("Rendez-vous refusé");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetUserId("");
    setSlot1Date("");
    setSlot1Time("");
    setSlot2Date("");
    setSlot2Time("");
    setSlot3Date("");
    setSlot3Time("");
  };

  const handleCreate = () => {
    if (!title || !targetUserId || !slot1Date || !slot1Time) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const slots = [];
    
    if (slot1Date && slot1Time) {
      slots.push({
        start: new Date(`${slot1Date}T${slot1Time}`).toISOString(),
        end: new Date(new Date(`${slot1Date}T${slot1Time}`).getTime() + 60 * 60 * 1000).toISOString(),
      });
    }
    
    if (slot2Date && slot2Time) {
      slots.push({
        start: new Date(`${slot2Date}T${slot2Time}`).toISOString(),
        end: new Date(new Date(`${slot2Date}T${slot2Time}`).getTime() + 60 * 60 * 1000).toISOString(),
      });
    }
    
    if (slot3Date && slot3Time) {
      slots.push({
        start: new Date(`${slot3Date}T${slot3Time}`).toISOString(),
        end: new Date(new Date(`${slot3Date}T${slot3Time}`).getTime() + 60 * 60 * 1000).toISOString(),
      });
    }

    createMutation.mutate({
      orgId: 1,
      title,
      description,
      targetUserId: parseInt(targetUserId),
      proposedSlotsJson: JSON.stringify(slots),
    });
  };

  const handleConfirm = (id: number, slot: { start: string; end: string }) => {
    confirmMutation.mutate({
      id,
      decidedSlot: new Date(slot.start),
    });
  };

  const handleDecline = (id: number) => {
    declineMutation.mutate({ id });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      confirmed: { variant: "default", label: "Confirmé" },
      declined: { variant: "destructive", label: "Refusé" },
      cancelled: { variant: "outline", label: "Annulé" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rendez-vous</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau rendez-vous
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un rendez-vous</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Réunion, Discussion, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Détails du rendez-vous..."
                  />
                </div>

                <div>
                  <Label htmlFor="targetUser">Avec *</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.user.id !== user.id).map((u) => (
                        <SelectItem key={u.user.id} value={String(u.user.id)}>
                          {u.user.name} ({u.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Créneau 1 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={slot1Date}
                      onChange={(e) => setSlot1Date(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={slot1Time}
                      onChange={(e) => setSlot1Time(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Créneau 2 (optionnel)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={slot2Date}
                      onChange={(e) => setSlot2Date(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={slot2Time}
                      onChange={(e) => setSlot2Time(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Créneau 3 (optionnel)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={slot3Date}
                      onChange={(e) => setSlot3Date(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={slot3Time}
                      onChange={(e) => setSlot3Time(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Création..." : "Créer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : appointments && appointments.length > 0 ? (
          <div className="grid gap-4">
            {appointments.map(({ appointment, invitees }) => {
              const proposedSlots = JSON.parse(appointment.proposedSlotsJson);
              
              return (
                <Card key={appointment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{appointment.title}</CardTitle>
                        {appointment.description && (
                          <CardDescription className="mt-2">
                            {appointment.description}
                          </CardDescription>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          Demandeur ID: {appointment.requesterId}
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Créneaux proposés :</h4>
                        <div className="grid gap-2 md:grid-cols-2">
                          {proposedSlots.map((slot: { start: string; end: string }, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(slot.start), "PPP", { locale: fr })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                                  </p>
                                </div>
                              </div>
                              {appointment.status === "pending" && appointment.requesterId !== user.id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirm(appointment.id, slot)}
                                  disabled={confirmMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirmer
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {appointment.status === "pending" && appointment.requesterId !== user.id && (
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDecline(appointment.id)}
                            disabled={declineMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}

                      {appointment.status === "confirmed" && appointment.decidedSlot && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Rendez-vous confirmé pour le {format(new Date(appointment.decidedSlot), "PPP 'à' HH:mm", { locale: fr })}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Un événement a été automatiquement ajouté à votre agenda
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Aucun rendez-vous</p>
              <p className="text-muted-foreground mb-4">
                Créez votre premier rendez-vous pour commencer
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un rendez-vous
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

