import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import type { Perfil, Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
  "recepcion",
];

const BROAD_TAGS = new Set([
  "analytics",
  "dashboard",
  "dashboard:admin",
  "dashboard:superadmin",
  "finance",
  "finance:cash",
  "finance:expense",
  "finance:income",
  "finance:portfolio",
  "finance:reports",
  "scope",
  "superadmin",
]);

type MinimalPerfil = Pick<Perfil, "id" | "rol" | "escuela_id" | "sede_id">;

function normalizeTags(payload: unknown) {
  return Array.isArray((payload as { tags?: unknown[] } | null)?.tags)
    ? (payload as { tags: unknown[] }).tags
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((tag) => tag.trim())
        .slice(0, 64)
    : [];
}

function canRevalidateTag(tag: string, perfil: MinimalPerfil) {
  if (perfil.rol === "super_admin") {
    return tag.length <= 160;
  }

  if (tag === `scope:school:${perfil.escuela_id}`) {
    return true;
  }

  if (perfil.sede_id && tag === `scope:branch:${perfil.escuela_id}:${perfil.sede_id}`) {
    return true;
  }

  if (tag === `user:${perfil.id}`) {
    return true;
  }

  if (BROAD_TAGS.has(tag)) {
    return false;
  }

  return false;
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const tags = normalizeTags(payload);

  if (tags.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un tag." }, { status: 400 });
  }

  const allowedTags = Array.from(
    new Set(tags.filter((tag) => canRevalidateTag(tag, authorization.perfil)))
  );

  if (allowedTags.length === 0) {
    return NextResponse.json(
      { error: "No tienes permisos para revalidar esos tags." },
      { status: 403 }
    );
  }

  revalidateServerReadCache(allowedTags);

  return NextResponse.json({ ok: true, tags: allowedTags });
}
