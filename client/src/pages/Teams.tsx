import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Plus, Users, MessageSquare, Trash2, UserPlus } from "lucide-react";

export default function Teams() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3B82F6");
  const [createChat, setCreateChat] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const { data: teams, refetch: refetchTeams } = trpc.teams.list.useQuery({ orgId: 1 });
  const { data: allUsers } = trpc.users.list.useQuery({ orgId: 1 });
  const { data: selectedTeam, refetch: refetchSelectedTeam } = trpc.teams.get.useQuery(
    { teamId: selectedTeamId! },
    { enabled: !!selectedTeamId }
  );

  const createTeamMutation = trpc.teams.create.useMutation({
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      setNewTeamName("");
      setNewTeamDescription("");
      setNewTeamColor("#3B82F6");
      setCreateChat(true);
      refetchTeams();
    },
  });

  const addMemberMutation = trpc.teams.addMember.useMutation({
    onSuccess: () => {
      setIsAddMemberDialogOpen(false);
      setSelectedMembers([]);
      refetchSelectedTeam();
      refetchTeams();
    },
  });

  const removeMemberMutation = trpc.teams.removeMember.useMutation({
    onSuccess: () => {
      refetchSelectedTeam();
      refetchTeams();
    },
  });

  const deleteTeamMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      setSelectedTeamId(null);
      refetchTeams();
    },
  });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    createTeamMutation.mutate({
      orgId: 1,
      name: newTeamName,
      description: newTeamDescription,
      color: newTeamColor,
      createChat,
    }, {
      onSuccess: (data) => {
        // Ajouter les membres sélectionnés à l'équipe
        if (data.id && selectedMembers.length > 0) {
          selectedMembers.forEach((userId) => {
            addMemberMutation.mutate({
              teamId: data.id,
              userId,
              role: "member",
            });
          });
        }
        // Réinitialiser le formulaire
        setNewTeamName("");
        setNewTeamDescription("");
        setNewTeamColor("#3B82F6");
        setCreateChat(true);
        setSelectedMembers([]);
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleAddMembers = () => {
    if (!selectedTeamId || selectedMembers.length === 0) return;

    selectedMembers.forEach((userId) => {
      addMemberMutation.mutate({
        teamId: selectedTeamId,
        userId,
        role: "member",
      });
    });
  };

  const handleRemoveMember = (userId: number) => {
    if (!selectedTeamId) return;
    if (confirm("Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?")) {
      removeMemberMutation.mutate({
        teamId: selectedTeamId,
        userId,
      });
    }
  };

  const handleDeleteTeam = (teamId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est irréversible.")) {
      deleteTeamMutation.mutate({ teamId });
    }
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const teamMembers = selectedTeam?.members || [];
  const availableUsers = allUsers?.filter(
    (u: any) => !teamMembers.some((m: any) => m.user?.id === u.id)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Équipes</h1>
            <p className="text-muted-foreground mt-1">
              Organisez votre organisation en équipes
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle équipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une équipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Nom de l'équipe</Label>
                  <Input
                    id="teamName"
                    placeholder="Développement, Comptabilité, Vente..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="teamDescription">Description</Label>
                  <Textarea
                    id="teamDescription"
                    placeholder="Description de l'équipe..."
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="teamColor">Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="teamColor"
                      type="color"
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <Label>Sélectionner les membres</Label>
                  <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                    {allUsers?.map((u) => (
                      <div key={u.user.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id={`create-user-${u.user.id}`}
                          checked={selectedMembers.includes(u.user.id)}
                          onCheckedChange={() => toggleMember(u.user.id)}
                        />
                        <Label htmlFor={`create-user-${u.user.id}`} className="cursor-pointer">
                          {u.user.name} ({u.user.email})
                        </Label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createChat"
                    checked={createChat}
                    onCheckedChange={(checked) => setCreateChat(checked as boolean)}
                  />
                  <Label htmlFor="createChat">Créer un chat d'équipe</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams?.map((team) => (
            <Card
              key={team.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTeamId(team.id)}
              style={{ borderLeft: `4px solid ${team.color || '#3B82F6'}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${team.color || '#3B82F6'}20` }}
                  >
                    <Users className="w-6 h-6" style={{ color: team.color || '#3B82F6' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{team.name}</h3>
                  </div>
                </div>
                {team.chatId && (
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground mb-4">{team.description}</p>
              )}
            </Card>
          ))}
        </div>

        {selectedTeamId && selectedTeam && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                {selectedTeam.description && (
                  <p className="text-muted-foreground mt-1">{selectedTeam.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Ajouter des membres
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter des membres à {selectedTeam.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <ScrollArea className="h-64 border rounded-md p-2">
                        {availableUsers && availableUsers.length > 0 ? (
                          availableUsers.map((user: any) => (
                            <div key={user.id} className="flex items-center space-x-2 py-2">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedMembers.includes(user.id)}
                                onCheckedChange={() => toggleMember(user.id)}
                              />
                              <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                                {user.name} ({user.email})
                              </Label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Tous les utilisateurs sont déjà membres de cette équipe
                          </p>
                        )}
                      </ScrollArea>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddMemberDialogOpen(false);
                            setSelectedMembers([]);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleAddMembers}
                          disabled={addMemberMutation.isPending || selectedMembers.length === 0}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteTeam(selectedTeamId)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer l'équipe
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">
                Membres ({teamMembers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.map(({ member, user }) => (
                  <Card key={member.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user?.name || "Utilisateur inconnu"}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                          {member.role === "leader" ? "Chef d'équipe" : "Membre"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(user!.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

