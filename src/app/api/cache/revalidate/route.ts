import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
  "recepcion",
  "alumno",
];

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const tags = Array.isArray((payload as { tags?: unknown[] } | null)?.tags)
    ? (payload as { tags: unknown[] }).tags
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .slice(0, 64)
    : [];

  if (tags.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un tag." }, { status: 400 });
  }

  revalidateServerReadCache(tags);

  return NextResponse.json({ ok: true, tags });
}
