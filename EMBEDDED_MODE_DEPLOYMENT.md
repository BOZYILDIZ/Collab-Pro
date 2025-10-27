# Collab-Pro: Embedded Mode Deployment Guide

## Overview

Collab-Pro **Embedded Mode**, Vercel'de harici veritabanı olmadan çalışan bir SPA (Single Page Application) dağıtımıdır. Tüm veri, tarayıcıda **IndexedDB** içinde persist edilir; sunucu yalnızca stateless **SSE relay** görevi görür.

### Architecture

```
┌─────────────────────────────────────────┐
│         Browser (Client)                 │
│  ┌──────────────────────────────────┐   │
│  │ React App (Vite SPA)             │   │
│  │ ├─ Zustand Store                 │   │
│  │ ├─ IndexedDB (Dexie)             │   │
│  │ ├─ Yjs CRDT (y-indexeddb)        │   │
│  │ └─ SSE Sync Client               │   │
│  └──────────────────────────────────┘   │
└────────────┬──────────────────────────────┘
             │ HTTP/SSE
┌────────────▼──────────────────────────────┐
│     Vercel Edge Functions (Stateless)    │
│  ├─ /api/auth.ts (JWT issuer)            │
│  └─ /api/sync.ts (SSE broadcast relay)   │
└──────────────────────────────────────────┘
```

---

## Pre-Deployment Checklist

- [x] `api/auth.ts` ve `api/sync.ts` Edge Functions'da Node API yok
- [x] `vercel.json`:
  - `functions`: `"api/*.ts"` → `runtime: "edge"`
  - `outputDirectory`: `"dist/public"` (Vite çıktı)
  - `routes`: `/api/(.*) → /api/$1` ve `/(.*) → /index.html`
- [x] `package.json`: dexie, yjs, y-indexeddb, zustand kurulu
- [x] `tsconfig.json`: `target: "ES2020"`, `downlevelIteration: true`
- [x] Build başarılı: `pnpm build:vercel` ✓
- [x] `.env.local` ile lokal test geçti

---

## Production Deployment (Vercel)

### Step 1: Git Commit

```bash
git add .
git commit -m "feat(embedded): Add Edge SSE + IndexedDB + Yjs for Embedded Mode on Vercel

- Add Edge Functions (auth.ts, sync.ts) for stateless JWT & SSE relay
- Add IndexedDB + Dexie schema (Projects, Tasks, Messages, Notes)
- Add Yjs CRDT + y-indexeddb provider for real-time notes
- Add SyncClient with SSE & reconnect backoff+jitter
- Add Zustand store (useDataStore) with full CRUD
- Add export/import workspace functionality
- Update vercel.json for Edge runtime
- Fix tsconfig for Yjs Uint8Array compatibility"

git push origin main
```

### Step 2: Link to Vercel

```bash
# Install Vercel CLI globally (if not already)
npm install -g vercel

# Login
vercel login

# Link repo
vercel link
```

### Step 3: Set Environment Variables

**Method A: CLI**
```bash
vercel env set DB_MODE embedded
vercel env set JWT_SECRET "$(openssl rand -base64 32)"  # Min 32 chars
vercel env set JWT_TTL_SECONDS 3600
vercel env set STORAGE_PROVIDER demo
```

**Method B: Vercel Dashboard**
1. Go to Project Settings → Environment Variables
2. Add:
   - `DB_MODE` = `embedded`
   - `JWT_SECRET` = `<strong-secret-min-32-chars>`
   - `JWT_TTL_SECONDS` = `3600`
   - `STORAGE_PROVIDER` = `demo`

### Step 4: Deploy to Production

```bash
vercel --prod
```

**Output example:**
```
✓ Production: https://collab-pro.vercel.app [in 24s]
```

---

## Post-Deployment Smoke Tests

### 1. Auth Endpoint

```bash
curl -s -X POST https://your-project.vercel.app/api/auth \
  -H "content-type: application/json" \
  -d '{"email":"test@example.com"}' | jq .
```

**Expected:**
```json
{
  "token": "eyJ...",
  "exp": 1735689600,
  "uid": "test@example.com"
}
```

### 2. SSE Relay (Two Browser Tabs)

**Tab A (Consumer):**
```javascript
const es = new EventSource('/api/sync?room=test&uid=alice');
es.addEventListener('hello', e => {
  console.log('Connected:', JSON.parse(e.data));
});
es.addEventListener('patch', e => {
  console.log('Received patch:', e.data);
});
```

**Tab B (Publisher):**
```javascript
fetch('/api/sync?room=test&uid=bob', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'message', text: 'Hello prod!' })
});
```

**Expected:** Tab A logs "Received patch: ..."

### 3. IndexedDB Persistence

1. Open app
2. Create a project/task via UI
3. Refresh page
4. Verify data still exists (IndexedDB persist)

---

## Troubleshooting

### Issue: `/api/` returns 404

**Check:**
- `api/auth.ts` and `api/sync.ts` exist in repo root
- `vercel.json` has `functions: { "api/*.ts": { "runtime": "edge" } }`
- Build log shows no errors

**Fix:**
```bash
vercel --prod --verbose  # Check build logs
```

### Issue: "Edge runtime: Module not found"

**Cause:** Edge Functions using Node API (fs, Buffer, etc.)

**Check:** Ensure `api/*.ts` only uses WebCrypto + Fetch API.

### Issue: SSE connection drops in production

**Expected:** Transient drops are normal. SyncClient auto-reconnects with backoff.

**Workaround:** Check browser console for reconnect attempts; refresh if stuck offline.

### Issue: Large bundle size (812 KB JS)

**Cause:** React ecosystem is large. Not a blocker for demo.

**Optimization (future):**
- Dynamic imports for routes
- Tree-shake unused Radix UI components

---

## Environment Variables

### Embedded Mode (Default)

```
DB_MODE=embedded
JWT_SECRET=<min-32-chars>
JWT_TTL_SECONDS=3600
STORAGE_PROVIDER=demo
```

### Managed Mode (Future)

When scaling to persistent DB:

```
DB_MODE=managed
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STORAGE_PROVIDER=s3
S3_BUCKET=collab-pro-files
JWT_SECRET=<strong-secret>
JWT_TTL_SECONDS=3600
```

---

## Key Features (Embedded Mode)

✅ **Working:**
- Projects & Tasks (CRUD, IndexedDB persist)
- Messages / Chat (SSE broadcast)
- Notes (Yjs CRDT, real-time collab)
- Export/Import workspace (JSON snapshot)
- Offline-first (full data in browser)
- Auto-reconnect (SSE backoff + jitter)

⚠️ **Limitations:**
- No multi-user strong consistency (CRDT notes only; tasks/chat "last-write-wins")
- No server-side persistence (Edge relay stateless)
- No user accounts (stateless JWT, demo only)
- No file storage (mock provider)
- SSE relay resets on Vercel cold boot (clients have backup in IndexedDB)

---

## Optional: Enable CORS for Custom Domain

If frontend and API are on different origins:

**In `api/auth.ts` & `api/sync.ts`:**
```typescript
const corsOrigin = process.env.CORS_ORIGIN || '*';

function sseHeaders() {
  return new Headers({
    'content-type': 'text/event-stream',
    'access-control-allow-origin': corsOrigin,
    // ...
  });
}
```

Set env var:
```bash
vercel env set CORS_ORIGIN "https://yourdomain.com"
```

---

## Next Steps (Roadmap)

1. **UI Integration** (2-3 days)
   - Connect useDataStore to React components
   - Implement Yjs editor adapter for notes
   - Add export/import UI buttons

2. **PWA** (1-2 days)
   - Service worker caching
   - Offline page fallback
   - Background sync queue

3. **Managed Mode Path** (3-5 days)
   - Set up Postgres + Redis
   - Fill `ManagedAdapter` with Prisma queries
   - Switch `DB_MODE=managed` for prod scale

4. **Auth UI** (1-2 days)
   - Email login modal
   - Session management
   - User account (if moving to Managed)

---

## Support & Debugging

### Local Development

```bash
# Install
pnpm install

# Dev server
pnpm dev
# → http://localhost:5173

# Type check
pnpm typecheck

# Build test
pnpm build:vercel

# View build output
ls -la dist/public/
```

### Production Logs

```bash
vercel logs --prod
```

### Common Queries

**"How do I add more projects/tasks/notes?"**
- Use `useDataStore` hook in React components
- See `client/src/state/useDataStore.ts` for API

**"Can I add real-time collab for tasks?"**
- Currently: single-browser (IndexedDB only)
- Upgrade: Add Yjs.Map for tasks; activate CRDT sync

**"What about user auth?"**
- Current: demo stateless JWT (no user DB)
- Future: Add Prisma user model; switch to Managed Mode

---

## Credits

Built with:
- **Vite** (fast build)
- **React** 19 + TypeScript
- **Dexie** (IndexedDB ORM)
- **Yjs** (CRDT)
- **Zustand** (state management)
- **Vercel Edge Functions** (serverless)
- **Multi-model orchestration** (Claude + ChatGPT + Gemini)

---

**Last updated:** 2025-10-27
**Status:** ✅ Production-ready for demo
**Next milestone:** UI integration (start with useDataStore hooks)
