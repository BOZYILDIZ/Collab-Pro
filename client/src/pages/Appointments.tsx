import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Appointments() {
  const { data: appointments, isLoading } = trpc.appointments.list.useQuery({
    orgId: 1, // TODO: Get from org context
  });

  const confirmMutation = trpc.appointments.confirm.useMutation();
  const declineMutation = trpc.appointments.decline.useMutation();

  const handleConfirm = (id: number, slot: Date) => {
    confirmMutation.mutate({ id, decidedSlot: slot });
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rendez-vous</h1>
          <Button>
            <Clock className="w-4 h-4 mr-2" />
            Nouveau rendez-vous
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : appointments && appointments.length > 0 ? (
          <div className="grid gap-4">
            {appointments.map(({ appointment }) => {
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
                                  <p className="text-sm font-medium">
                                    {format(new Date(slot.start), "PPP", { locale: fr })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                                  </p>
                                </div>
                              </div>
                              {appointment.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirm(appointment.id, new Date(slot.start))}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {appointment.status === "pending" && (
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDecline(appointment.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Refuser
                          </Button>
                        </div>
                      )}

                      {appointment.decidedSlot && (
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <p className="text-sm font-medium text-primary">
                            Créneau confirmé : {format(new Date(appointment.decidedSlot), "PPP 'à' HH:mm", { locale: fr })}
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
              <Clock className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun rendez-vous</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

