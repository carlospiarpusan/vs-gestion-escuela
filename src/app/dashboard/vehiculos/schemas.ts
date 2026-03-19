import { z } from "zod";
export const vehiculoSchema = z.object({
  marca: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  modelo: z.string().min(1, "El modelo es obligatorio."),
  matricula: z.string().min(4, "La matrícula debe tener al menos 4 caracteres."),
  tipo: z.string().min(1, "El tipo de vehículo es obligatorio."),
  anio: z
    .string()
    .refine(
      (val) =>
        !val ||
        (!Number.isNaN(Number(val)) &&
          Number(val) > 1900 &&
          Number(val) <= new Date().getFullYear() + 1),
      "El año no es válido."
    )
    .optional(),
  fecha_itv: z.string().optional(),
  seguro_vencimiento: z.string().optional(),
  estado: z.string(),
  kilometraje: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "El kilometraje debe ser positivo."
    ),
  notas: z.string().optional(),
});

export const mantenimientoSchema = z.object({
  vehiculo_id: z.string().min(1, "Debes seleccionar un vehículo."),
  instructor_id: z.string().optional(),
  tipo: z.string().min(1, "Debes seleccionar el tipo de mantenimiento."),
  descripcion: z.string().min(3, "La descripción debe tener al menos 3 caracteres."),
  monto: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "El monto debe ser un número positivo."
    ),
  kilometraje_actual: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "El kilometraje debe ser positivo."
    )
    .optional(),
  litros: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Los litros deben ser un número positivo."
    )
    .optional(),
  precio_por_litro: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "El precio por litro debe ser positivo."
    )
    .optional(),
  proveedor: z.string().optional(),
  numero_factura: z.string().optional(),
  fecha: z.string().min(1, "La fecha es obligatoria."),
  notas: z.string().optional(),
});
