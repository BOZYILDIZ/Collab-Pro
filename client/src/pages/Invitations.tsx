import { useState } from "react";
import { trpc } from "../lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Copy, Mail, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Invitations() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "guest">("member");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: invitations, refetch } = trpc.invitations.list.useQuery({ orgId: 1 });
  const createInvitation = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      toast.success("Invitation créée avec succès !");
      refetch();
      setEmail("");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const revokeInvitation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation révoquée");
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitation.mutate({ orgId: 1, email, role });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      expired: "bg-gray-100 text-gray-800",
      revoked: "bg-red-100 text-red-800",
    };
    const labels = {
      pending: "En attente",
      accepted: "Acceptée",
      expired: "Expirée",
      revoked: "Révoquée",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-gray-600 mt-2">Invitez vos collègues à rejoindre la plateforme</p>
        </div>

        {/* Formulaire d'invitation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Créer une invitation</CardTitle>
            <CardDescription>
              Entrez l'email de la personne que vous souhaitez inviter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="collegue@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membre</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="guest">Invité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={createInvitation.isPending}>
                <Mail className="w-4 h-4 mr-2" />
                {createInvitation.isPending ? "Création..." : "Créer l'invitation"}
              </Button>
            </form>

            {/* Lien d'invitation généré */}
            {inviteUrl && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Lien d'invitation généré :
                </p>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="bg-white"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Copiez ce lien et envoyez-le à votre collègue par email, WhatsApp, etc.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Invitations envoyées</CardTitle>
            <CardDescription>
              Gérez les invitations que vous avez créées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!invitations || invitations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Aucune invitation pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {invitations.map((item) => (
                  <div
                    key={item.invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{item.invitation.email}</span>
                        {getStatusBadge(item.invitation.status)}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span>Rôle: {item.invitation.role}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expire le {format(new Date(item.invitation.expiresAt), "d MMM yyyy", { locale: fr })}
                        </span>
                        {item.inviter && (
                          <span>Invité par {item.inviter.name || item.inviter.email}</span>
                        )}
                      </div>
                    </div>
                    {item.invitation.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitation.mutate({ id: item.invitation.id })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Révoquer
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

