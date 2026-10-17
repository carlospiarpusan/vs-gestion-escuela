import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  AUDITED_ROLE_ORDER,
  getAuditedVisibleModules,
  getDefaultCapability,
} from "@/lib/role-capabilities";
import type { Rol } from "@/types/database";

const READ_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
const HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  const auth = await authorizeApiRequest(READ_ROLES);
  if (!auth.ok) return auth.response;
  const capabilities = Object.fromEntries(
    AUDITED_ROLE_ORDER.map((role) => [
      role,
      Object.fromEntries(
        getAuditedVisibleModules().map((module) => [
          module.id,
          getDefaultCapability(role, module.id),
        ])
      ),
    ])
  );
  return NextResponse.json({ overrides: {}, capabilities, editable: false }, { headers: HEADERS });
}

export async function PUT() {
  const auth = await authorizeApiRequest(["super_admin"]);
  if (!auth.ok) return auth.response;
  // Legacy clients must not report a successful permission change that is not enforced.
  return NextResponse.json(
    { error: "Los permisos vigentes son de consulta. No se pueden modificar desde esta matriz." },
    { status: 409, headers: HEADERS }
  );
}
