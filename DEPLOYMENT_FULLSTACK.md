# Guide de déploiement Fullstack

Cette application est une application fullstack avec un backend Express.js et un frontend React. Vercel ne supporte pas nativement Express.js en mode serverless, donc nous allons déployer le frontend et le backend séparément.

## 🏗️ Architecture de déploiement recommandée

### Option 1 : Frontend sur Vercel + Backend sur Railway (Recommandé)

**Frontend (Vercel)** : Interface utilisateur statique
**Backend (Railway)** : API Express.js + Base de données

### Option 2 : Tout sur Railway

Déployer frontend et backend ensemble sur Railway

### Option 3 : Frontend sur Vercel + Backend sur Render

Alternative à Railway

---

## 🚀 Option 1 : Vercel + Railway (Recommandé)

### Partie 1 : Déployer le Backend sur Railway

1. **Créer un compte sur [Railway.app](https://railway.app)**

2. **Créer un nouveau projet**
   - Cliquez sur "New Project"
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez `BOZYILDIZ/Collab-Pro`

3. **Configurer les variables d'environnement**
   
   Dans les paramètres Railway, ajoutez :
   
   ```bash
   NODE_ENV=production
   PORT=3000
   
   # Base de données (Railway peut fournir MySQL automatiquement)
   DATABASE_URL=mysql://user:password@host:port/database
   
   # JWT
   JWT_SECRET=votre-secret-super-securise-32-caracteres-minimum
   
   # S3 Storage
   S3_BUCKET=votre-bucket
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=votre-access-key
   S3_SECRET_ACCESS_KEY=votre-secret-key
   S3_ENDPOINT=https://s3.amazonaws.com
   ```

4. **Ajouter une base de données MySQL**
   - Dans Railway, cliquez sur "New" → "Database" → "Add MySQL"
   - Railway génèrera automatiquement `DATABASE_URL`

5. **Configurer le build**
   
   Railway détectera automatiquement le `package.json` et exécutera :
   ```bash
   pnpm install
   pnpm build
   pnpm start
   ```

6. **Initialiser la base de données**
   
   Depuis votre machine locale :
   ```bash
   # Utiliser l'URL de la base Railway
   DATABASE_URL="mysql://..." pnpm db:push
   DATABASE_URL="mysql://..." pnpm seed
   DATABASE_URL="mysql://..." pnpm seed:templates
   ```

7. **Déployer**
   - Railway déploiera automatiquement
   - Notez l'URL du backend (ex: `https://collab-pro-production.up.railway.app`)

### Partie 2 : Déployer le Frontend sur Vercel

1. **Créer un fichier `.env.production` localement**
   
   ```bash
   VITE_API_URL=https://votre-backend-railway.up.railway.app
   ```

2. **Mettre à jour le client tRPC**
   
   Modifiez `client/src/lib/trpc.ts` :
   
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
   
   export const trpc = createTRPCReact<AppRouter>();
   
   export const trpcClient = trpc.createClient({
     links: [
       httpBatchLink({
         url: `${API_URL}/api/trpc`,
         credentials: 'include',
       }),
     ],
   });
   ```

3. **Pousser les changements sur GitHub**
   
   ```bash
   git add .
   git commit -m "Configure API URL for production"
   git push
   ```

4. **Importer dans Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - "New Project" → Importez `BOZYILDIZ/Collab-Pro`
   
5. **Configurer les variables d'environnement Vercel**
   
   ```bash
   VITE_API_URL=https://votre-backend-railway.up.railway.app
   ```

6. **Déployer**
   - Vercel construira uniquement le frontend
   - Le frontend communiquera avec le backend Railway

---

## 🚀 Option 2 : Tout sur Railway

Si vous préférez tout déployer au même endroit :

1. **Créer un projet Railway depuis GitHub**

2. **Ajouter MySQL**
   - New → Database → MySQL

3. **Configurer les variables d'environnement** (voir Option 1)

4. **Modifier le build**
   
   Railway exécutera automatiquement :
   ```bash
   pnpm install
   pnpm build  # Build frontend + backend
   pnpm start  # Démarre Express qui sert aussi le frontend
   ```

5. **Le serveur Express sert le frontend**
   
   Dans `server/_core/index.ts`, le code suivant sert déjà les fichiers statiques :
   
   ```typescript
   // Serve static files in production
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../client')));
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../client/index.html'));
     });
   }
   ```

6. **Déployer**
   - Railway déploie automatiquement
   - Une seule URL pour tout : `https://collab-pro.up.railway.app`

---

## 🚀 Option 3 : Vercel + Render

Similaire à l'Option 1, mais avec Render au lieu de Railway :

### Backend sur Render

1. Créez un compte sur [render.com](https://render.com)
2. "New" → "Web Service"
3. Connectez votre repository GitHub
4. Configurez :
   - **Build Command** : `pnpm install && pnpm build`
   - **Start Command** : `pnpm start`
   - **Environment** : Node
5. Ajoutez les variables d'environnement
6. Ajoutez une base de données PostgreSQL ou MySQL

### Frontend sur Vercel

Même procédure que l'Option 1, Partie 2

---

## 📊 Comparaison des options

| Critère | Vercel + Railway | Tout sur Railway | Vercel + Render |
|---------|------------------|------------------|-----------------|
| **Coût** | Gratuit (limites) | Gratuit ($5 crédit/mois) | Gratuit (limites) |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Simplicité** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **CDN Global** | ✅ (Vercel) | ❌ | ✅ (Vercel) |
| **Auto-scaling** | ✅ | ✅ | ✅ |
| **Base de données incluse** | ✅ | ✅ | ✅ |

## 🎯 Recommandation

Pour la meilleure performance et le meilleur coût :

1. **Démarrage** : **Option 2** (Tout sur Railway) - Plus simple
2. **Production** : **Option 1** (Vercel + Railway) - Meilleure performance

---

## 🔧 Configuration CORS

Si vous déployez frontend et backend séparément, configurez CORS dans `server/_core/index.ts` :

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://votre-app.vercel.app',
  ],
  credentials: true,
}));
```

---

## 🐛 Dépannage

### Erreur CORS

Ajoutez l'URL du frontend dans la configuration CORS du backend

### Base de données inaccessible

Vérifiez que `DATABASE_URL` est correctement configuré et que la base accepte les connexions externes

### Variables d'environnement manquantes

Vérifiez que toutes les variables sont définies dans Railway/Render/Vercel

---

## 📞 Support

- **Railway** : [docs.railway.app](https://docs.railway.app)
- **Render** : [render.com/docs](https://render.com/docs)
- **Vercel** : [vercel.com/docs](https://vercel.com/docs)

---

**Bon déploiement ! 🚀**

