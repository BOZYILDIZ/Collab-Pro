# Plateforme Collaborative Professionnelle

Une plateforme collaborative complète et moderne permettant aux équipes de travailler ensemble efficacement avec chat temps réel, gestion de notes, agenda partagé et système de prise de rendez-vous.

## 🚀 Fonctionnalités

### 💬 Chat en temps réel
- Conversations 1:1 et groupes
- Statuts de présence (en ligne, hors ligne, absent, occupé)
- Indicateurs de lecture
- Pièces jointes et réponses
- Historique des messages

### 📝 Bloc-notes collaboratif
- Notes privées et publiques
- Éditeur Markdown
- Système de versioning
- Recherche plein texte
- Épinglage et favoris
- Tags et organisation

### 📅 Agenda et événements
- Calendriers privés et publics
- Événements récurrents
- Invitations et gestion des participants
- Rappels automatiques
- Vue mensuelle interactive

### 🤝 Prise de rendez-vous
- Proposition de créneaux multiples
- Système de confirmation
- Gestion des disponibilités
- Notifications automatiques

### 🔔 Notifications
- Centre de notifications in-app
- Support PWA pour notifications push
- Catégorisation par type
- Marquage lu/non lu

### 👥 Gestion d'équipe
- Système de rôles (Owner, Admin, Member, Guest)
- Profils utilisateurs
- Statuts personnalisés
- Recherche de membres

## 🛠️ Stack technique

### Frontend
- **React 19** avec TypeScript
- **Tailwind CSS 4** pour le styling
- **tRPC 11** pour l'API type-safe
- **Wouter** pour le routing
- **shadcn/ui** pour les composants UI
- **date-fns** pour la gestion des dates
- **PWA** avec manifest et service worker

### Backend
- **Node.js** avec TypeScript
- **Express 4** comme serveur HTTP
- **tRPC 11** pour l'API
- **Drizzle ORM** pour la base de données
- **MySQL/TiDB** comme base de données
- **S3** pour le stockage de fichiers

### Infrastructure
- **Vercel** pour le déploiement
- **JWT** pour l'authentification
- **OAuth** (Manus Auth) pour la connexion

## 📦 Installation

### Prérequis
- Node.js 22+
- pnpm 10+
- Une base de données MySQL/TiDB
- Un bucket S3 (configuré automatiquement avec Manus)

### Configuration

1. Cloner le projet
```bash
git clone <repository-url>
cd plateforme-collaborative-pro
```

2. Installer les dépendances
```bash
pnpm install
```

3. Configurer les variables d'environnement

Les variables suivantes sont automatiquement injectées par la plateforme Manus :
- `DATABASE_URL` - URL de connexion à la base de données
- `JWT_SECRET` - Secret pour les tokens JWT
- `OAUTH_SERVER_URL` - URL du serveur OAuth
- `VITE_OAUTH_PORTAL_URL` - URL du portail OAuth (frontend)
- `OWNER_OPEN_ID` - ID du propriétaire
- `VITE_APP_ID` - ID de l'application
- `VITE_APP_TITLE` - Titre de l'application
- `VITE_APP_LOGO` - URL du logo
- `BUILT_IN_FORGE_API_URL` - URL des APIs internes
- `BUILT_IN_FORGE_API_KEY` - Clé API pour les services internes

4. Appliquer les migrations de base de données
```bash
pnpm db:push
```

5. (Optionnel) Générer des données de démonstration
```bash
pnpm seed
```

## 🚀 Développement

### Démarrer le serveur de développement
```bash
pnpm dev
```

L'application sera accessible sur `http://localhost:3000`

### Build de production
```bash
pnpm build
```

### Lancer les tests
```bash
pnpm test
```

### Vérification TypeScript
```bash
pnpm check
```

## 📁 Structure du projet

```
plateforme-collaborative-pro/
├── client/                    # Application frontend
│   ├── public/               # Fichiers statiques
│   │   └── manifest.json    # Manifest PWA
│   └── src/
│       ├── components/      # Composants réutilisables
│       │   ├── ui/         # Composants shadcn/ui
│       │   └── DashboardLayout.tsx
│       ├── pages/          # Pages de l'application
│       │   ├── Home.tsx
│       │   ├── Chat.tsx
│       │   ├── Notes.tsx
│       │   ├── Calendar.tsx
│       │   ├── Appointments.tsx
│       │   ├── Notifications.tsx
│       │   └── Team.tsx
│       ├── lib/
│       │   └── trpc.ts     # Client tRPC
│       └── App.tsx         # Routing principal
├── server/                   # Application backend
│   ├── _core/              # Infrastructure (OAuth, tRPC, etc.)
│   ├── db.ts               # Helpers de base de données
│   └── routers.ts          # Routeurs tRPC
├── drizzle/                 # Schéma et migrations DB
│   └── schema.ts
├── scripts/                 # Scripts utilitaires
│   └── seed.ts             # Script de seed
└── shared/                  # Code partagé frontend/backend
```

## 🔐 Authentification et autorisation

### Système de rôles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Créateur de l'organisation | Tous droits (admin + gestion globale) |
| **Admin** | Gestion opérationnelle | Gestion utilisateurs, modération, quotas |
| **Member** | Utilisateur standard | Accès complet aux outils collaboratifs |
| **Guest** | Invité | Lecture seule + participation limitée |

### Flux d'authentification

1. L'utilisateur clique sur "Se connecter"
2. Redirection vers le portail OAuth Manus
3. Après authentification, retour avec un token
4. Le token est stocké dans un cookie sécurisé
5. Chaque requête API vérifie le token via middleware

## 🗄️ Modèle de données

### Principales entités

- **users** - Utilisateurs de la plateforme
- **organizations** - Organisations/équipes
- **org_memberships** - Appartenance aux organisations
- **chats** - Conversations (1:1 ou groupe)
- **chat_members** - Membres des conversations
- **messages** - Messages dans les chats
- **notes** - Notes privées ou publiques
- **note_versions** - Historique des versions
- **calendars** - Calendriers personnels ou partagés
- **events** - Événements dans les calendriers
- **event_attendees** - Participants aux événements
- **appointment_requests** - Demandes de rendez-vous
- **appointment_invitees** - Invités aux rendez-vous
- **notifications** - Notifications in-app
- **notification_subscriptions** - Abonnements push
- **availability_slots** - Créneaux de disponibilité
- **audit_logs** - Journaux d'audit

## 🔌 API tRPC

L'API est organisée en modules tRPC :

### Modules disponibles

- `auth` - Authentification et gestion de session
- `users` - Gestion des utilisateurs
- `organizations` - Gestion des organisations
- `chats` - Messagerie temps réel
- `files` - Upload et gestion de fichiers
- `notes` - Gestion des notes
- `calendars` - Gestion des calendriers
- `events` - Gestion des événements
- `appointments` - Prise de rendez-vous
- `availability` - Gestion des disponibilités
- `notifications` - Centre de notifications
- `audit` - Journaux d'audit

### Exemple d'utilisation

```typescript
// Côté client
const { data: notes } = trpc.notes.list.useQuery({
  orgId: 1,
  isPublic: false,
});

const createNote = trpc.notes.create.useMutation({
  onSuccess: () => {
    // Rafraîchir la liste
  },
});
```

## 📱 Progressive Web App (PWA)

L'application est configurée comme PWA et peut être installée sur :
- Android (Chrome, Edge)
- iOS (Safari)
- Windows (Edge, Chrome)
- macOS (Safari, Chrome)

### Fonctionnalités PWA
- Installation sur l'écran d'accueil
- Mode hors ligne (lecture des données en cache)
- Notifications push
- Raccourcis d'application
- Icônes adaptatives

## 🚀 Déploiement sur Vercel

### Déploiement automatique

Le projet est configuré pour un déploiement automatique sur Vercel via l'interface Manus. Il suffit de cliquer sur le bouton "Publier" dans l'interface.

### Configuration requise

- Base de données MySQL/TiDB accessible publiquement
- Variables d'environnement configurées
- Bucket S3 pour le stockage de fichiers

### Build et optimisations

Le build Vercel :
1. Compile le frontend avec Vite
2. Bundle le backend avec esbuild
3. Optimise les assets statiques
4. Configure les routes serverless

## 🧪 Tests

### Structure des tests

```bash
# Tests unitaires
pnpm test

# Tests avec coverage
pnpm test -- --coverage
```

## 📊 Monitoring et logs

### Journaux d'audit

Toutes les actions importantes sont enregistrées dans la table `audit_logs` :
- Création/modification/suppression de ressources
- Actions administratives
- Connexions et déconnexions
- Changements de permissions

### Métriques

L'application intègre Umami Analytics pour le suivi des métriques :
- Pages vues
- Utilisateurs actifs
- Temps de session
- Parcours utilisateur

## 🔒 Sécurité

### Mesures de sécurité implémentées

- **Authentification JWT** avec refresh tokens
- **Validation des entrées** avec Zod
- **Protection CSRF** via cookies SameSite
- **CORS** configuré strictement
- **Rate limiting** sur les endpoints sensibles
- **Audit logging** complet
- **Permissions RBAC** sur toutes les ressources

### Conformité RGPD

- Export des données utilisateur disponible
- Suppression des données sur demande
- Journalisation des accès
- Consentement pour les cookies

## 🤝 Contribution

### Workflow de développement

1. Créer une branche feature
2. Développer et tester localement
3. Vérifier avec `pnpm check`
4. Formater avec `pnpm format`
5. Créer une pull request

### Standards de code

- TypeScript strict mode
- ESLint + Prettier
- Commits conventionnels
- Tests pour les nouvelles fonctionnalités

## 📝 Licence

Ce projet est sous licence MIT.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation
- Contacter l'équipe de support

## 🎯 Roadmap

### Fonctionnalités futures

- [ ] Intégration Teams/Slack
- [ ] Gestion de projets (Kanban)
- [ ] Recherche globale unifiée
- [ ] Traductions i18n
- [ ] API publique pour intégrations tierces
- [ ] Webhooks sortants
- [ ] Templates de notes avancés
- [ ] Synchronisation Google Calendar
- [ ] Sondages dans les chats
- [ ] Appels vidéo intégrés

---

**Développé avec ❤️ par Manus AI**

