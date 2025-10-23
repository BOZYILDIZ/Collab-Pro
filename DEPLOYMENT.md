# Guide de déploiement sur Vercel

Ce guide vous explique comment déployer la Plateforme Collaborative Professionnelle sur Vercel.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

1. **Un compte Vercel** - Créez-en un sur [vercel.com](https://vercel.com)
2. **Une base de données MySQL** - Options recommandées :
   - [PlanetScale](https://planetscale.com) (gratuit pour commencer)
   - [Railway](https://railway.app)
   - [Aiven](https://aiven.io)
3. **Un bucket S3** - Pour le stockage des fichiers :
   - AWS S3
   - DigitalOcean Spaces
   - Cloudflare R2

## 🚀 Étapes de déploiement

### 1. Importer le projet dans Vercel

1. Connectez-vous à [vercel.com](https://vercel.com)
2. Cliquez sur **"New Project"**
3. Importez depuis GitHub : `BOZYILDIZ/Collab-Pro`
4. Cliquez sur **"Import"**

### 2. Configurer les variables d'environnement

Dans les paramètres du projet Vercel, ajoutez les variables suivantes :

#### Variables obligatoires

```bash
# Base de données
DATABASE_URL=mysql://user:password@host:port/database

# Authentification
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# Stockage S3
S3_BUCKET=nom-de-votre-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=votre-access-key
S3_SECRET_ACCESS_KEY=votre-secret-key
S3_ENDPOINT=https://s3.amazonaws.com

# Environnement
NODE_ENV=production
```

#### Variables optionnelles

```bash
# OAuth (si vous utilisez un système OAuth personnalisé)
OAUTH_SERVER_URL=https://votre-serveur-oauth.com
VITE_OAUTH_PORTAL_URL=https://portal.oauth.com

# Analytics (Umami)
VITE_ANALYTICS_ENDPOINT=https://analytics.umami.is
VITE_ANALYTICS_WEBSITE_ID=votre-website-id

# Configuration de l'app
VITE_APP_TITLE=Plateforme Collaborative Professionnelle
VITE_APP_LOGO=/logo.png
```

### 3. Configuration de la base de données

#### Option A : PlanetScale (Recommandé)

1. Créez un compte sur [planetscale.com](https://planetscale.com)
2. Créez une nouvelle base de données
3. Cliquez sur **"Connect"** et copiez l'URL de connexion
4. Format : `mysql://user:password@host/database?ssl={"rejectUnauthorized":true}`

#### Option B : Railway

1. Créez un compte sur [railway.app](https://railway.app)
2. Créez un nouveau projet
3. Ajoutez un service **MySQL**
4. Copiez l'URL de connexion depuis les variables d'environnement

### 4. Initialiser la base de données

Avant le premier déploiement, vous devez initialiser le schéma de la base de données.

**Depuis votre machine locale :**

```bash
# Installer les dépendances
pnpm install

# Définir l'URL de la base de données de production
export DATABASE_URL="mysql://user:password@host:port/database"

# Appliquer les migrations
pnpm db:push

# (Optionnel) Ajouter des données de test
pnpm seed
pnpm seed:templates
```

### 5. Configuration S3

#### AWS S3

1. Créez un bucket S3 sur [console.aws.amazon.com/s3](https://console.aws.amazon.com/s3)
2. Configurez les permissions CORS :

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Créez un utilisateur IAM avec les permissions :
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`

4. Notez l'Access Key ID et Secret Access Key

#### DigitalOcean Spaces

1. Créez un Space sur [cloud.digitalocean.com/spaces](https://cloud.digitalocean.com/spaces)
2. Générez une clé API dans **API → Spaces Keys**
3. Utilisez ces valeurs :
   - `S3_ENDPOINT`: `https://nyc3.digitaloceanspaces.com` (remplacez par votre région)
   - `S3_BUCKET`: nom de votre Space
   - `S3_REGION`: `us-east-1` (valeur par défaut)

### 6. Déployer

1. Une fois toutes les variables configurées, cliquez sur **"Deploy"**
2. Vercel va :
   - Installer les dépendances avec `pnpm install`
   - Construire le frontend avec `vite build`
   - Construire le backend avec `esbuild`
   - Déployer sur le CDN global

3. Le déploiement prend environ 2-3 minutes

### 7. Vérification post-déploiement

Une fois le déploiement terminé :

1. Visitez l'URL de votre application (fournie par Vercel)
2. Testez la connexion
3. Créez un compte de test
4. Vérifiez que toutes les fonctionnalités marchent :
   - ✅ Authentification
   - ✅ Chat
   - ✅ Notes
   - ✅ Calendrier
   - ✅ Upload de fichiers

## 🔧 Configuration avancée

### Domaine personnalisé

1. Dans les paramètres Vercel, allez dans **"Domains"**
2. Ajoutez votre domaine personnalisé
3. Configurez les enregistrements DNS selon les instructions

### Variables d'environnement par environnement

Vous pouvez définir des variables différentes pour :
- **Production** : déploiement principal
- **Preview** : branches de développement
- **Development** : environnement local

### Webhooks de déploiement

Pour déclencher des déploiements automatiques :

1. Allez dans **Settings → Git**
2. Activez **"Automatic deployments"**
3. Choisissez la branche principale (généralement `master` ou `main`)

## 🐛 Dépannage

### Erreur : "Cannot connect to database"

- Vérifiez que `DATABASE_URL` est correctement configuré
- Assurez-vous que la base de données accepte les connexions externes
- Pour PlanetScale, vérifiez que SSL est activé dans l'URL

### Erreur : "S3 upload failed"

- Vérifiez les credentials S3
- Assurez-vous que le bucket existe
- Vérifiez les permissions CORS du bucket

### Erreur : "JWT secret not configured"

- Ajoutez la variable `JWT_SECRET` dans Vercel
- Utilisez une valeur longue et aléatoire (minimum 32 caractères)

### Build timeout

Si le build prend trop de temps :
1. Vérifiez que `node_modules` n'est pas commité
2. Utilisez le cache Vercel (activé par défaut)
3. Augmentez le timeout dans les paramètres du projet

## 📊 Monitoring

### Logs

Les logs sont disponibles dans :
- **Vercel Dashboard → Deployments → [Votre déploiement] → Logs**

### Métriques

Vercel fournit automatiquement :
- Temps de réponse
- Taux d'erreur
- Utilisation de la bande passante
- Nombre de requêtes

### Alertes

Configurez des alertes pour :
- Erreurs de build
- Temps de réponse élevé
- Taux d'erreur > 5%

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais commiter les secrets** dans Git
2. **Utiliser des secrets forts** pour JWT_SECRET (32+ caractères)
3. **Activer HTTPS** (automatique avec Vercel)
4. **Configurer CORS** correctement sur S3
5. **Limiter les permissions IAM** au strict nécessaire

### Rotation des secrets

Pour changer un secret :
1. Générez un nouveau secret
2. Ajoutez-le dans Vercel
3. Redéployez l'application
4. Supprimez l'ancien secret

## 📈 Optimisations

### Performance

- **CDN global** : Vercel distribue automatiquement sur 100+ edge locations
- **Cache** : Les assets statiques sont mis en cache automatiquement
- **Compression** : Gzip/Brotli activé par défaut

### Coûts

Le plan gratuit Vercel inclut :
- 100 GB de bande passante
- Déploiements illimités
- Domaines personnalisés
- SSL automatique

Pour plus, consultez [vercel.com/pricing](https://vercel.com/pricing)

## 🆘 Support

- **Documentation Vercel** : [vercel.com/docs](https://vercel.com/docs)
- **Issues GitHub** : [github.com/BOZYILDIZ/Collab-Pro/issues](https://github.com/BOZYILDIZ/Collab-Pro/issues)
- **Discord Vercel** : [vercel.com/discord](https://vercel.com/discord)

## 🎉 Félicitations !

Votre plateforme collaborative est maintenant déployée et accessible au monde entier ! 🚀

---

**Développé avec ❤️ pour une collaboration efficace**

