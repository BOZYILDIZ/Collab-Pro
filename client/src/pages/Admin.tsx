import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  const seedMutation = trpc.admin.seedData.useMutation({
    onSuccess: (data) => {
      setIsSeeding(false);
      setSeedResult(data);
      toast.success("Données de test initialisées avec succès !");
    },
    onError: (error) => {
      setIsSeeding(false);
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const handleSeedData = () => {
    if (confirm("Êtes-vous sûr de vouloir initialiser les données de test ? Cela créera des équipes, projets, tâches, notes, événements et messages.")) {
      setIsSeeding(true);
      setSeedResult(null);
      seedMutation.mutate({ orgId: 1 }); // TODO: Get from org context
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Outils d'administration et de gestion
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Initialiser les données de test
            </CardTitle>
            <CardDescription>
              Créez automatiquement des données de démonstration pour tester la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Cette action créera :
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>2 équipes (Développement et Marketing)</li>
                <li>1 projet avec 5 tâches</li>
                <li>5 notes d'exemple</li>
                <li>1 calendrier avec 3 événements</li>
                <li>1 chat d'équipe avec 3 messages</li>
              </ul>
            </div>

            <Button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="w-full sm:w-auto"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initialisation en cours...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Initialiser les données
                </>
              )}
            </Button>

            {seedResult && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Données initialisées avec succès !
                    </p>
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <p>Résumé :</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>{seedResult.data.teams.length} équipes créées</li>
                        <li>1 projet avec {seedResult.data.tasksCount} tâches</li>
                        <li>{seedResult.data.notesCount} notes</li>
                        <li>1 calendrier avec {seedResult.data.eventsCount} événements</li>
                        <li>1 chat avec {seedResult.data.messagesCount} messages</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Informations importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Les données de test sont créées pour votre compte utilisateur actuel
            </p>
            <p>
              • Vous pouvez exécuter cette action plusieurs fois, mais cela créera des doublons
            </p>
            <p>
              • Pour supprimer les données, utilisez l'interface normale de l'application
            </p>
            <p>
              • Cette fonctionnalité est utile pour tester et démontrer les fonctionnalités de la plateforme
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

