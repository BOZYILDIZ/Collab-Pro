# Managed Mode Preparation Guide

## What is Managed Mode?

When Embedded Mode reaches capacity (team > 5-10 users, need persistence), **Managed Mode** switches:
- `DB_MODE=embedded` → `DB_MODE=managed`
- Browser IndexedDB → Postgres + Redis (on server)
- Stateless relay → WebSocket + persistent queue
- Demo JWT → User accounts + sessions

---

## Current Infrastructure

### Embedded Mode (Now)
- **DB:** IndexedDB (browser)
- **Cache:** None
- **Files:** Mock provider
- **Sync:** SSE relay (stateless)
- **Auth:** Stateless JWT

### Managed Mode (Future)
- **DB:** Postgres (via Prisma)
- **Cache:** Redis
- **Files:** S3/MinIO
- **Sync:** WebSocket + Redis queue
- **Auth:** Prisma user model + sessions

---

## Minimal Managed Mode Scaffold

### 1. Install Prisma

```bash
pnpm add -D prisma @prisma/client
npx prisma init
```

### 2. Create `schema.prisma`

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User & Auth
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
  tasks     Task[]
}

// Projects
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tasks       Task[]
  notes       Note[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
}

// Tasks
model Task {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  done        Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
}

// Notes (with Yjs binary store)
model Note {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  ystate      Bytes    @db.LongBlob // Yjs binary update
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
}

// Messages
model Message {
  id        String   @id @default(cuid())
  room      String   // "project:<id>" or "chat:<id>"
  text      String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  ts        DateTime @default(now())

  @@index([room, ts])
}
```

### 3. Update `ManagedAdapter`

**File:** `src/server/db/adapters.ts`

```typescript
import { prisma } from './prisma'; // Create this file

export class ManagedAdapter implements DataAdapter {
  async isHealthy(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async saveProject(p: any): Promise<any> {
    return prisma.project.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  async loadProject(id: string): Promise<any | null> {
    return prisma.project.findUnique({
      where: { id },
      include: { tasks: true, notes: true },
    });
  }

  // ... add similar for tasks, messages, notes
}
```

### 4. Environment Setup

**Vercel Production:**
```bash
vercel env set DB_MODE managed
vercel env set DATABASE_URL "postgresql://user:pass@host:5432/collab_pro"
vercel env set REDIS_URL "redis://default:pass@host:6379"
```

**Local `.env`:**
```
DB_MODE=managed
DATABASE_URL="postgresql://localhost/collab_pro"
REDIS_URL="redis://localhost:6379"
```

### 5. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Switch Checklist

| Component | Embedded | Managed |
|-----------|----------|---------|
| **DB_MODE** | embedded | managed |
| **Data store** | IndexedDB | Postgres |
| **User DB** | ❌ None | ✓ Prisma |
| **Cache** | ❌ None | ✓ Redis |
| **Sync** | SSE relay | WebSocket+queue |
| **Auth** | JWT only | JWT+sessions |
| **Files** | Mock | S3/MinIO |

---

## Implementation Order

1. **Set up Postgres** (Vercel Postgres, Supabase, PlanetScale, etc.)
2. **Migrate schema** (Prisma migrate)
3. **Fill ManagedAdapter** methods (6-8 hours)
4. **Implement Prisma user model** (2-3 hours)
5. **Add WebSocket gateway** for sync (4-5 hours)
6. **Test with DB_MODE=managed** locally
7. **Deploy with DB_MODE=managed** to Vercel

**Est. total:** 2-3 days for minimal working Managed Mode

---

## Key Differences

### Query Layer

**Embedded (IndexedDB):**
```typescript
const tasks = await db.tasks.where('projectId').equals(pid).toArray();
```

**Managed (Prisma):**
```typescript
const tasks = await prisma.task.findMany({ where: { projectId: pid } });
```

### Sync Protocol

**Embedded (SSE):**
- Unidirectional broadcast
- No server-side persistence
- Clients pull from IndexedDB

**Managed (WebSocket + Redis):**
- Bidirectional messages
- Redis queue for offline users
- Server broadcasts + persists

### Auth

**Embedded (Stateless JWT):**
```typescript
const payload = { sub: email, exp: now + ttl };
```

**Managed (Prisma sessions):**
```typescript
const user = await prisma.user.create({ data: { email } });
const session = await redis.set(`session:${token}`, userId, 'EX', 86400);
```

---

## Common Gotchas

1. **Yjs binary in Prisma**
   - Store `Y.encodeStateAsUpdate()` as `Bytes` field
   - On read: `Y.applyUpdate(ydoc, data)`

2. **CRDT merge on server**
   - Multiple clients send Yjs updates → server merges
   - Use Redis transaction or database lock

3. **Message queue for offline users**
   - SSE drops → messages go to Redis queue
   - Client reconnects → drain queue + fetch from DB

---

## Resources

- **Prisma:** https://www.prisma.io/docs/
- **Vercel Postgres:** https://vercel.com/storage/postgres
- **Redis Upstash:** https://upstash.com/
- **Yjs updates:** https://docs.yjs.dev/#updates

---

**Status:** Template ready. Start when team > 5 concurrent users or persistence required.
