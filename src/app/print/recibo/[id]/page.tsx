import { notFound, redirect } from "next/navigation";
import { authorizeApiRequest, ensureSchoolScope, ensureSedeScope } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import PaymentReceipt, { type PaymentReceiptData } from "./PaymentReceipt";
export const dynamic = "force-dynamic";
export default async function PrintReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest([
    "super_admin",
    "admin_escuela",
    "admin_sede",
    "administrativo",
    "recepcion",
  ]);
  if (!auth.ok) {
    if (auth.response.status === 401) redirect("/login");
    notFound();
  }
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { rows } = await getServerDbPool().query<
    PaymentReceiptData & { escuela_id: string; sede_id: string }
  >(
    `
    select i.id,i.escuela_id,i.sede_id,e.nombre escuela,e.cif nit,s.nombre sede,s.direccion,s.telefono,
      concat_ws(' ',a.nombre,a.apellidos) alumno,a.dni documento,m.numero_contrato contrato,
      i.concepto,i.monto,i.fecha,i.metodo_pago,p.nombre registrado_por
    from public.ingresos i
    join public.escuelas e on e.id=i.escuela_id
    join public.sedes s on s.id=i.sede_id
    join public.alumnos a on a.id=i.alumno_id
    left join public.matriculas_alumno m on m.id=i.matricula_id
    join public.perfiles p on p.id=i.user_id
    where i.id=$1 and i.estado='cobrado'
      and ($2::uuid is null or i.escuela_id=$2)
      and ($3::uuid is null or i.sede_id=$3)`,
    [
      id,
      auth.perfil.rol === "super_admin" ? null : auth.perfil.escuela_id,
      ["super_admin", "admin_escuela"].includes(auth.perfil.rol) ? null : auth.perfil.sede_id,
    ]
  );
  const receipt = rows[0];
  if (
    !receipt ||
    ensureSchoolScope(auth.perfil, receipt.escuela_id) ||
    ensureSedeScope(auth.perfil, receipt.sede_id)
  )
    notFound();
  return <PaymentReceipt receipt={receipt} />;
}
