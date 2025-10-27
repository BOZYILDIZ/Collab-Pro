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

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get('room') || 'default';
  const uid = url.searchParams.get('uid') || crypto.randomUUID();

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
