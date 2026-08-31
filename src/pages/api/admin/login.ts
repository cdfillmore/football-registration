import type { APIRoute } from 'astro';
import { originOk, signed } from '../../../lib/http.js';
const attempts = new Map<string, { count: number; at: number }>();
export const POST: APIRoute = async ({ request, cookies, clientAddress, locals }) => {
  if (!originOk(request, locals.runtime.env.ORIGIN)) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const key = clientAddress ?? 'unknown', time = Date.now(), old = attempts.get(key);
  if (old && old.count >= 5 && time - old.at < 900000) return Response.json({ error: 'Too many attempts.' }, { status: 429 });
  const body = await request.json() as { password?: unknown }; const password = locals.runtime.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (typeof password !== 'string' || body.password !== password) { attempts.set(key, { count: (old?.count ?? 0) + 1, at: old?.at ?? time }); return Response.json({ error: 'Invalid password.' }, { status: 401 }); }
  attempts.delete(key); const secret = locals.runtime.env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'dev-secret';
  cookies.set('admin_session', signed('admin', secret), { httpOnly: true, sameSite: 'strict', secure: import.meta.env.PROD, path: '/', maxAge: 28800 });
  return Response.json({ ok: true });
};
