import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";
import type { Rol } from "@/types/database";
import {
  AUDITED_ROLE_ORDER,
  ROLE_CAPABILITY_MODULES,
  type RoleCapabilityAction,
  type RoleCapabilityModuleId,
  type RoleCapabilityScope,
  type RoleCapabilityState,
} from "@/lib/role-capabilities";

const READ_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
const WRITE_ROLES: Rol[] = ["super_admin"];

const VALID_STATES: RoleCapabilityState[] = ["full", "scoped", "readonly", "none"];
const VALID_SCOPES: RoleCapabilityScope[] = ["platform", "school", "branch", "self", "none"];
const VALID_ACTIONS: RoleCapabilityAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "sync",
  "close",
  "configure",
];

const MODULE_IDS = new Set(ROLE_CAPABILITY_MODULES.map((m) => m.id));
const ROLE_IDS = new Set<string>(AUDITED_ROLE_ORDER);

type OverrideRow = {
  rol: string;
  module_id: string;
  state: string;
  scope: string;
  actions: string[];
  note: string | null;
};

function buildAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const auth = await authorizeApiRequest(READ_ROLES);
  if (!auth.ok) return auth.response;

  const admin = buildAdminClient();
  const { data, error } = await admin
    .from("permisos_config")
    .select("rol, module_id, state, scope, actions, note")
    .order("rol")
    .order("module_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const overrides: Record<string, Record<string, OverrideRow>> = {};
  for (const row of (data ?? []) as OverrideRow[]) {
    if (!overrides[row.rol]) overrides[row.rol] = {};
    overrides[row.rol][row.module_id] = row;
  }

  return NextResponse.json({ overrides });
}

type OverrideInput = {
  rol: string;
  module_id: string;
  state: string;
  scope: string;
  actions: string[];
  note?: string | null;
};

export async function PUT(request: Request) {
  const auth = await authorizeApiRequest(WRITE_ROLES);
  if (!auth.ok) return auth.response;

  let body: { overrides: OverrideInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(body.overrides)) {
    return NextResponse.json({ error: "Se requiere un array de overrides." }, { status: 400 });
  }

  for (const item of body.overrides) {
    if (!ROLE_IDS.has(item.rol)) {
      return NextResponse.json({ error: `Rol inválido: ${item.rol}` }, { status: 400 });
    }
    if (!MODULE_IDS.has(item.module_id as RoleCapabilityModuleId)) {
      return NextResponse.json({ error: `Módulo inválido: ${item.module_id}` }, { status: 400 });
    }
    if (!VALID_STATES.includes(item.state as RoleCapabilityState)) {
      return NextResponse.json({ error: `Estado inválido: ${item.state}` }, { status: 400 });
    }
    if (!VALID_SCOPES.includes(item.scope as RoleCapabilityScope)) {
      return NextResponse.json({ error: `Alcance inválido: ${item.scope}` }, { status: 400 });
    }
    if (
      !Array.isArray(item.actions) ||
      item.actions.some((a) => !VALID_ACTIONS.includes(a as RoleCapabilityAction))
    ) {
      return NextResponse.json(
        { error: `Acciones inválidas para ${item.rol}/${item.module_id}` },
        { status: 400 }
      );
    }
  }

  const admin = buildAdminClient();

  // Delete existing overrides and insert new ones in a transaction-like manner
  const { error: deleteError } = await admin
    .from("permisos_config")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (body.overrides.length > 0) {
    const rows = body.overrides.map((item) => ({
      rol: item.rol,
      module_id: item.module_id,
      state: item.state,
      scope: item.scope,
      actions: item.actions,
      note: item.note ?? null,
      updated_by: auth.perfil.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await admin.from("permisos_config").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: body.overrides.length });
}
