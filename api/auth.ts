// api/auth.ts – Stateless JWT issuer (Edge Runtime)
export const config = { runtime: 'edge' };

interface AuthPayload {
  sub: string;
  exp: number;
  iat: number;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req: Request) {
  // CORS headers (demo)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'email required (string)' }, 400);
    }

    const secret = process.env.JWT_SECRET || 'dev-demo-secret-unsafe';
    const ttl = Number(process.env.JWT_TTL_SECONDS || 3600);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttl;

    const payload: AuthPayload = { sub: email, iat: now, exp };
    const token = await signJWT(payload, secret);

    return jsonResponse({ token, exp, uid: email }, 200);
  } catch (err: any) {
    console.error('[auth]', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
}

/**
 * Minimal Edge-compatible JWT signer (HS256)
 * Uses: crypto.subtle (WebCrypto)
 */
async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = (obj: any) => {
    const json = JSON.stringify(obj);
    const bytes = encoder.encode(json);
    return btoa(String.fromCharCode(...bytes))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const headerB64 = b64(header);
  const payloadB64 = b64(payload);
  const message = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${message}.${sigB64}`;
}
