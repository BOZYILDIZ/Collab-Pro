# Production Deployment Checklist

## Pre-Deployment (Do This First)

### Local Verification
```bash
# 1. Clean build
cd /tmp/Collab-Pro
pnpm build:vercel

# 2. Check output directory
ls -la dist/public/index.html
# → Should exist

# 3. Verify env template
cat .env.example | grep -A 10 "Embedded Mode"

# 4. Check git status
git status
# → Everything committed? (git add . && git commit if needed)
```

### Pre-flight Checklist
- [ ] `pnpm build:vercel` passes (0 errors)
- [ ] `dist/public/index.html` exists
- [ ] All changes committed to git (`git status` clean)
- [ ] No `.env.local` or secrets in git (check `.gitignore`)
- [ ] Vercel CLI installed: `vercel --version`

---

## Production Deployment (3 Commands)

### Step 1: Link to Vercel
```bash
vercel link
```
**Expected output:**
```
✓ Linked to [your-org]/[project-name]
```

### Step 2: Set Environment Variables
```bash
# These 4 are REQUIRED
vercel env set DB_MODE embedded
vercel env set JWT_SECRET "$(openssl rand -base64 32)"
vercel env set JWT_TTL_SECONDS 3600
vercel env set STORAGE_PROVIDER demo
```

**Verify they're set:**
```bash
vercel env ls
```
**Expected output shows all 4 vars with type "encrypted"**

### Step 3: Deploy to Production
```bash
vercel --prod
```

**Expected output:**
```
✓ Production: https://[project-name].vercel.app [in 24s]
```

---

## Immediate Post-Deploy Smoke Tests

### Test 1: Health Check (Auth Endpoint)

```bash
PROJECT_URL="https://your-project.vercel.app"

curl -s -X POST "$PROJECT_URL/api/auth" \
  -H "content-type: application/json" \
  -d '{"email":"smoke-test@example.com"}' | jq .
```

**Expected Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "exp": 1735698123,
  "uid": "smoke-test@example.com"
}
```

**If 404 or error:** Check `vercel logs --prod` for build/deployment errors.

### Test 2: SSE Relay (Interactive)

**Tab A (Consumer):**
```javascript
// Open browser console on https://your-project.vercel.app
const es = new EventSource('/api/sync?room=smoke-test&uid=alice');

es.addEventListener('hello', e => {
  console.log('✓ Connected:', JSON.parse(e.data));
});

es.addEventListener('patch', e => {
  console.log('✓ Received patch:', e.data);
});

es.onerror = () => console.error('✗ Connection failed');
```

**Tab B (Publisher):**
```javascript
// Open console on same app in different tab
fetch('/api/sync?room=smoke-test&uid=bob', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'message', text: 'Hello production!' })
});
```

**Expected:** Tab A logs "✓ Received patch: ..."

### Test 3: IndexedDB Persistence

1. Open app: https://your-project.vercel.app
2. Create a project/task via UI (if implemented)
3. Refresh page
4. Verify data still exists

**Note:** UI integration needed for full test (see next steps below)

---

## Optional Enhancements (Post-Deploy)

### Option 1: JWT Validation for SSE (Recommended)

Add token verification to `/api/sync.ts` to prevent unauthorized room access:

**Replace sync.ts with:**
```typescript
// api/sync.ts – Stateless SSE relay with JWT validation
export const config = { runtime: 'edge' };

const rooms = new Map<string, Set<{ id: string; controller: ReadableStreamDefaultController }>>();

function sseHeaders() {
  return new Headers({
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    'connection': 'keep-alive',
    'access-control-allow-origin': '*',
  });
}

async function verifyJWT(authHeader?: string) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || '';
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = `${h}.${p}`;
    const sigB64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));

    const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
    if (!ok) return null;

    const payload = JSON.parse(
      atob(p.replace(/-/g, '+').replace(/_/g, '/'))
    );

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get('room') || 'default';
  const uid = url.searchParams.get('uid') || crypto.randomUUID();
  const authHeader = req.headers.get('authorization');

  // Optional: Uncomment to enforce JWT on all requests
  // const jwt = await verifyJWT(authHeader);
  // if (!jwt) return new Response('unauthorized', { status: 401 });

  if (req.method === 'POST') {
    try {
      const text = await req.text();
      const clients = rooms.get(room);
      if (clients) {
        clients.forEach((client) => {
          try {
            client.controller.enqueue(`event: patch\ndata: ${text}\n\n`);
          } catch (e) {
            console.error('[sync] enqueue error:', e);
            clients.delete(client);
          }
        });
      }
      return new Response('ok', { status: 200 });
    } catch (err) {
      console.error('[sync] POST error:', err);
      return new Response('error', { status: 500 });
    }
  }

  if (req.method === 'GET') {
    const stream = new ReadableStream({
      start(controller) {
        const client = { id: uid, controller };

        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room)!.add(client);

        controller.enqueue(
          `event: hello\ndata: ${JSON.stringify({ uid, room, ts: Date.now() })}\n\n`
        );

        const interval = setInterval(() => {
          try {
            controller.enqueue(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
          } catch (e) {
            clearInterval(interval);
            rooms.get(room)?.delete(client);
          }
        }, 30000);

        (controller as any)._cleanup = () => {
          clearInterval(interval);
          rooms.get(room)?.delete(client);
          if (rooms.get(room)?.size === 0) {
            rooms.delete(room);
          }
        };
      },

      cancel() {
        (this as any)._cleanup?.();
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  }

  return new Response('Method not allowed', { status: 405 });
}
```

**To enable JWT validation**, uncomment these lines:
```typescript
// const jwt = await verifyJWT(authHeader);
// if (!jwt) return new Response('unauthorized', { status: 401 });
```

### Option 2: Single Region Pinning (Optional)

Reduce cold starts by pinning to one Vercel region:

1. Go to **Vercel Dashboard** → Project Settings → **Functions** → **General**
2. Set **Regions** to single region (e.g., `fra1` for Europe)

---

## Troubleshooting

### Issue: `/api/auth` returns 404

**Cause:** Edge Functions not deployed correctly

**Fix:**
```bash
# Check build log
vercel logs --prod

# Verify functions are there
vercel list deployments
```

### Issue: Deployment fails with build error

**Cause:** TypeScript or Vite build issue

**Fix:**
```bash
# Test locally first
pnpm build:vercel

# Check errors
pnpm typecheck
```

### Issue: SSE connection drops immediately

**Expected:** Transient drops are normal. Auto-reconnect should fire.

**Check browser console:** Look for `[sync] error, reconnecting...` logs.

### Issue: "Large bundle size" warning

**Status:** Not a blocker. Optimize later with code-splitting.

---

## Post-Deployment Tasks

### Immediate (Today)
- [ ] Run all 3 smoke tests
- [ ] Share prod URL with team
- [ ] Update README with live demo link

### This Week
- [ ] Connect useDataStore to UI components
- [ ] Implement Yjs editor adapter
- [ ] Add export/import buttons
- [ ] Test with real workspace data

### This Month
- [ ] Add PWA (service worker)
- [ ] Set up monitoring (Sentry/Datadog)
- [ ] Plan Managed Mode migration

---

## Key URLs

| Resource | URL |
|----------|-----|
| **Live App** | https://your-project.vercel.app |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Production Logs** | `vercel logs --prod` |
| **Deployment History** | `vercel list deployments` |

---

## Support

**Issue? Check these first:**
1. `vercel logs --prod` (shows all errors)
2. Browser console (network/client errors)
3. `EMBEDDED_MODE_DEPLOYMENT.md` (detailed guide)

---

**Status:** ✅ Ready to Deploy
**Last Updated:** 2025-10-27
**Next Command:** `vercel link`
