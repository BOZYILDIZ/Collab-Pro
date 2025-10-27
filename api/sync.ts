// api/sync.ts – Stateless SSE relay for CRDT/message broadcasting
export const config = { runtime: 'edge' };

// In-memory room storage (not durable; clears on cold boot)
// In production: use Redis or switch to Managed Mode
const rooms = new Map<string, Set<{ id: string; controller: ReadableStreamDefaultController }>>();

function sseHeaders() {
  return new Headers({
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    'connection': 'keep-alive',
    'access-control-allow-origin': '*',
  });
}

/**
 * Verify JWT token (optional, for room access control)
 * Uncomment to enforce: const jwt = await verifyJWT(authHeader);
 */
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

  // JWT validation: check Authorization header OR querystring token
  const authHeader = req.headers.get('authorization');
  const qsToken = url.searchParams.get('token');
  const finalAuthHeader = authHeader ?? (qsToken ? `Bearer ${qsToken}` : undefined);

  const jwt = await verifyJWT(finalAuthHeader);
  if (!jwt) return new Response('unauthorized', { status: 401 });

  // POST: publish event to room
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
      return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
    } catch (err) {
      console.error('[sync] POST error:', err);
      return new Response('error', { status: 500, headers: { 'content-type': 'text/plain' } });
    }
  }

  // GET: open SSE stream
  if (req.method === 'GET') {
    const stream = new ReadableStream({
      start(controller) {
        const client = { id: uid, controller };

        // Register client in room
        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room)!.add(client);

        // Send hello event
        controller.enqueue(
          `event: hello\ndata: ${JSON.stringify({ uid, room, ts: Date.now() })}\n\n`
        );

        // Heartbeat every 30s
        const interval = setInterval(() => {
          try {
            controller.enqueue(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
          } catch (e) {
            clearInterval(interval);
            rooms.get(room)?.delete(client);
          }
        }, 30000);

        // Cleanup on close
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
