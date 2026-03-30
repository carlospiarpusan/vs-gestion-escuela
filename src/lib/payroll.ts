/**
 * Payroll utilities for the instructor payroll (nóminas) module.
 */

export type InstructorPayrollClosure = {
  id: string;
  instructor_id: string;
  sede_id: string | null;
  gasto_id: string | null;
  periodo_anio: number;
  periodo_mes: number;
  fecha_cierre: string;
  total_horas: number;
  valor_hora: number;
  monto_total: number;
};

type LegacyExpenseRow = {
  id: string;
  proveedor: string | null;
  fecha: string;
  estado_pago: string;
  notas: string | null;
};

/**
 * Convert instructor hour closures that already have a matching expense (legacy flow)
 * into payroll-like rows so they appear in the payroll grid.
 *
 * Closures whose instructor is already present in the current payroll are skipped.
 */
export function buildLegacyInstructorPayrollRows({
  closures,
  expensesById,
  instructorNames,
  existingInstructorIds,
}: {
  closures: InstructorPayrollClosure[];
  expensesById: Map<string, LegacyExpenseRow>;
  instructorNames: Map<string, string>;
  existingInstructorIds: Set<string>;
}) {
  return closures
    .filter(
      (closure) =>
        closure.gasto_id &&
        expensesById.has(closure.gasto_id) &&
        !existingInstructorIds.has(closure.instructor_id)
    )
    .map((closure) => {
      const expense = expensesById.get(closure.gasto_id!);
      const monto = closure.monto_total || 0;
      return {
        id: `legacy-${closure.id}`,
        escuela_id: null,
        sede_id: closure.sede_id,
        empleado_tipo: "instructor" as const,
        empleado_id: closure.instructor_id,
        empleado_nombre: instructorNames.get(closure.instructor_id) || "Instructor",
        periodo_anio: closure.periodo_anio,
        periodo_mes: closure.periodo_mes,
        tipo_contrato: "prestacion_servicios" as const,
        salario_base: monto,
        total_devengado: monto,
        total_deducciones: 0,
        neto_pagar: monto,
        estado: expense?.estado_pago === "pagado" ? ("pagada" as const) : ("borrador" as const),
        fecha_pago: expense?.fecha || null,
        notas: expense?.notas || `${closure.total_horas}h x $${closure.valor_hora}/h`,
        nomina_conceptos: [],
        origen: "legacy" as const,
      };
    });
}

/**
 * Filter closures that do NOT have a corresponding payroll row yet.
 * These are "pending" instructor closures that can be imported into the payroll module.
 */
export function getPendingInstructorPayrollClosures({
  payrollRows,
  closures,
}: {
  payrollRows: Array<{ empleado_tipo: string; empleado_id: string }>;
  closures: InstructorPayrollClosure[];
}): InstructorPayrollClosure[] {
  const existingIds = new Set(
    payrollRows.filter((r) => r.empleado_tipo === "instructor").map((r) => r.empleado_id)
  );
  return closures.filter((c) => !existingIds.has(c.instructor_id));
}

/**
 * Build a summary object for the payroll period, aggregating totals.
 */
export function buildPayrollSummary({
  payrollRows,
  empleadoTipo,
  pendingInstructorClosures,
}: {
  payrollRows: Array<{
    empleado_tipo: string;
    total_devengado: number;
    total_deducciones: number;
    neto_pagar: number;
    estado: string;
  }>;
  empleadoTipo: string;
  pendingInstructorClosures: InstructorPayrollClosure[];
}) {
  const filtered = payrollRows.filter((r) => r.empleado_tipo === empleadoTipo);

  let devengado = 0;
  let deducciones = 0;
  let neto = 0;
  let pagadas = 0;

  for (const row of filtered) {
    devengado += Number(row.total_devengado || 0);
    deducciones += Number(row.total_deducciones || 0);
    neto += Number(row.neto_pagar || 0);
    if (row.estado === "pagada") pagadas++;
  }

  // Add pending instructor closures to the total count
  const pendingCount = empleadoTipo === "instructor" ? pendingInstructorClosures.length : 0;

  return {
    devengado,
    deducciones,
    neto,
    pagadas,
    total: filtered.length + pendingCount,
  };
}
