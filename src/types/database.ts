// Tipos TypeScript para la base de datos de AutoEscuela Pro

export type Rol =
  | "super_admin"
  | "admin_escuela"
  | "admin_sede"
  | "secretaria"
  | "instructor"
  | "recepcion"
  | "alumno";

export type PlanEscuela = "gratuito" | "basico" | "profesional" | "enterprise";
export type EstadoEscuela = "activa" | "inactiva" | "suspendida";
export type EstadoSede = "activa" | "inactiva";
export type EstadoAlumno = "activo" | "inactivo" | "graduado";
export type EstadoInstructor = "activo" | "inactivo";
export type TipoPermiso = "AM" | "A1" | "A2" | "A" | "B" | "C" | "D";
export type TipoVehiculo = "coche" | "moto" | "camion" | "autobus";
export type EstadoVehiculo = "disponible" | "en_uso" | "mantenimiento" | "baja";
export type TipoClase = "practica" | "teorica";
export type EstadoClase = "programada" | "completada" | "cancelada" | "no_asistio";
export type TipoExamen = "teorico" | "practico";
export type ResultadoExamen = "pendiente" | "aprobado" | "suspendido";
export type MetodoPago = "efectivo" | "datafono" | "nequi" | "sistecredito" | "otro";
export type MetodoPagoGasto = "efectivo" | "tarjeta" | "transferencia" | "domiciliacion";
export type EstadoIngreso = "cobrado" | "pendiente" | "anulado";
export type CategoriaGasto =
  | "combustible" | "mantenimiento_vehiculo" | "alquiler" | "servicios"
  | "nominas" | "seguros" | "material_didactico" | "marketing"
  | "impuestos" | "suministros" | "reparaciones" | "otros";
export type CategoriaIngreso =
  | "matricula" | "mensualidad" | "clase_suelta" | "examen_teorico"
  | "examen_practico" | "material" | "tasas_dgt" | "otros";
export type TipoMantenimiento =
  | "cambio_aceite" | "gasolina" | "repuesto" | "mano_obra"
  | "lavado" | "neumaticos" | "revision_general" | "otros";

export interface Escuela {
  id: string;
  nombre: string;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  logo_url: string | null;
  numero_licencia: string | null;
  plan: PlanEscuela;
  max_alumnos: number;
  max_sedes: number;
  estado: EstadoEscuela;
  fecha_alta: string | null;
  created_at: string;
}

export interface Sede {
  id: string;
  escuela_id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  codigo_postal: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  horario_apertura: string | null;
  horario_cierre: string | null;
  es_principal: boolean;
  estado: EstadoSede;
  created_at: string;
}

export interface Perfil {
  id: string;
  escuela_id: string | null;
  sede_id: string | null;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  avatar_url: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
}

export interface Alumno {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  telefono: string;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_permiso: TipoPermiso;
  estado: EstadoAlumno;
  fecha_inscripcion: string | null;
  notas: string | null;
  created_at: string;
}

export interface Instructor {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  telefono: string;
  licencia: string;
  especialidad: TipoPermiso;
  estado: EstadoInstructor;
  color: string;
  created_at: string;
}

export interface Vehiculo {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  marca: string;
  modelo: string;
  matricula: string;
  tipo: TipoVehiculo;
  año: number | null;
  fecha_itv: string | null;
  seguro_vencimiento: string | null;
  estado: EstadoVehiculo;
  kilometraje: number;
  notas: string | null;
  created_at: string;
}

export interface Clase {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  alumno_id: string;
  instructor_id: string | null;
  vehiculo_id: string | null;
  tipo: TipoClase;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoClase;
  notas: string | null;
  created_at: string;
}

export interface Examen {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  alumno_id: string;
  tipo: TipoExamen;
  fecha: string;
  hora: string | null;
  resultado: ResultadoExamen;
  intentos: number;
  notas: string | null;
  created_at: string;
}

export interface Gasto {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  metodo_pago: MetodoPagoGasto;
  proveedor: string | null;
  numero_factura: string | null;
  fecha: string;
  recurrente: boolean;
  notas: string | null;
  created_at: string;
}

export interface Ingreso {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  alumno_id: string | null;
  categoria: CategoriaIngreso;
  concepto: string;
  monto: number;
  metodo_pago: MetodoPago;
  medio_especifico: string | null;
  numero_factura: string | null;
  fecha: string;
  estado: EstadoIngreso;
  notas: string | null;
  created_at: string;
}

export interface MantenimientoVehiculo {
  id: string;
  escuela_id: string;
  sede_id: string;
  vehiculo_id: string;
  instructor_id: string | null;
  user_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  monto: number;
  kilometraje_actual: number | null;
  litros: number | null;
  precio_por_litro: number | null;
  proveedor: string | null;
  numero_factura: string | null;
  foto_url: string | null;
  fecha: string;
  notas: string | null;
  created_at: string;
}

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface SedeCurso {
  id: number;
  sede_id: string;
  curso_id: number;
  precio: number;
  activo: boolean;
}

export interface AlumnoCurso {
  id: number;
  alumno_id: string;
  curso_id: number;
}
