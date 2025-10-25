import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { User, Camera, Save, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [profileColor, setProfileColor] = useState("#3B82F6");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Profil mis à jour !");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const updatePasswordMutation = trpc.users.updatePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe modifié !");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || "");
      setEmail(user.email || "");
      setJobTitle((user as any).jobTitle || "");
      setProfileColor((user as any).profileColor || "#3B82F6");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      displayName,
      email,
      jobTitle,
      profileColor,
      avatarUrl,
    });
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Créer une URL temporaire pour l'aperçu
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !user) {
    return null;
  }

  const initials = (displayName || user.name || user.email || "U")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et vos préférences
          </p>
        </div>

        {/* Photo de profil */}
        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Choisissez une image qui vous représente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24" style={{ backgroundColor: profileColor }}>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-2xl text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent w-fit">
                    <Camera className="w-4 h-4" />
                    <span>Changer la photo</span>
                  </div>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </Label>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG ou GIF. Max 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Mettez à jour vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Nom d'affichage</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">Domaine / Métier</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex: Comptable, Développeur, Designer..."
                />
              </div>

              <div>
                <Label htmlFor="profileColor">Couleur de profil</Label>
                <div className="flex gap-2">
                  <Input
                    id="profileColor"
                    type="color"
                    value={profileColor}
                    onChange={(e) => setProfileColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={profileColor}
                    onChange={(e) => setProfileColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
            <CardDescription>
              Modifiez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleUpdatePassword} 
                disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword}
                variant="outline"
              >
                <Lock className="w-4 h-4 mr-2" />
                {updatePasswordMutation.isPending ? "Modification..." : "Changer le mot de passe"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations du compte */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID utilisateur:</span>
                <span className="font-mono">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rôle:</span>
                <span className="capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membre depuis:</span>
                <span>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière connexion:</span>
                <span>{new Date(user.lastSignedIn).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

