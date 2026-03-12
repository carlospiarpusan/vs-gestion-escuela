// Tipos TypeScript para la base de datos de AutoEscuela Pro

export type Rol =
  | "super_admin"
  | "admin_escuela"
  | "admin_sede"
  | "administrativo"
  | "instructor"
  | "recepcion"
  | "alumno";

export type PlanEscuela = "gratuito" | "basico" | "profesional" | "enterprise";
export type EstadoEscuela = "activa" | "inactiva" | "suspendida";
export type EstadoSede = "activa" | "inactiva";
export type EstadoAlumno = "activo" | "inactivo" | "graduado";
export type TipoRegistroAlumno = "regular" | "aptitud_conductor" | "practica_adicional";
export type EstadoMatricula = "activo" | "cerrado" | "cancelado";
export type EstadoInstructor = "activo" | "inactivo";
export type TipoPermiso = "AM" | "A1" | "A2" | "A" | "B" | "C" | "D";
export type TipoPermisoExamen = TipoPermiso | "comun";
export type TipoVehiculo = "coche" | "moto" | "camion" | "autobus";
export type EstadoVehiculo = "disponible" | "en_uso" | "mantenimiento" | "baja";
export type TipoClase = "practica" | "teorica";
export type EstadoClase = "programada" | "completada" | "cancelada" | "no_asistio";
export type TipoExamen = "teorico" | "practico";
export type ResultadoExamen = "pendiente" | "aprobado" | "suspendido";
export type DificultadExamen = "facil" | "media" | "dificil";
export type OpcionExamen = "a" | "b" | "c" | "d";
export type MetodoPago = "efectivo" | "datafono" | "nequi" | "sistecredito" | "otro";
export type MetodoPagoGasto = "efectivo" | "tarjeta" | "transferencia" | "domiciliacion";
export type EstadoIngreso = "cobrado" | "pendiente" | "anulado";
export type EstadoPagoGasto = "pendiente" | "pagado" | "anulado";
export type EstadoImportacionFacturaCorreo = "importada" | "duplicada" | "omitida" | "error";
export type CategoriaGasto =
  | "combustible" | "mantenimiento_vehiculo" | "alquiler" | "servicios"
  | "nominas" | "seguros" | "material_didactico" | "marketing"
  | "impuestos" | "suministros" | "reparaciones" | "tramitador" | "otros";
export type CategoriaIngreso =
  | "matricula" | "mensualidad" | "clase_suelta" | "examen_teorico"
  | "examen_practico" | "examen_aptitud" | "material" | "tasas_dgt" | "otros";
export type TipoMantenimiento =
  | "cambio_aceite" | "gasolina" | "repuesto" | "mano_obra"
  | "lavado" | "neumaticos" | "reparacion" | "revision_general" | "otros";

export interface Escuela {
  id: string;
  nombre: string;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  categorias: string[] | null;
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
  tipo_registro: TipoRegistroAlumno;
  numero_contrato: string | null;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  telefono: string;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_permiso: TipoPermiso;
  categorias: string[] | null;
  estado: EstadoAlumno;
  fecha_inscripcion: string | null;
  notas: string | null;
  valor_total: number | null;
  ciudad: string | null;
  departamento: string | null;
  empresa_convenio: string | null;
  nota_examen_teorico: number | null;
  fecha_examen_teorico: string | null;
  nota_examen_practico: number | null;
  fecha_examen_practico: string | null;
  tiene_tramitador: boolean;
  tramitador_nombre: string | null;
  tramitador_valor: number | null;
  created_at: string;
}

export interface MatriculaAlumno {
  id: string;
  escuela_id: string;
  sede_id: string;
  alumno_id: string;
  created_by: string | null;
  numero_contrato: string | null;
  categorias: string[];
  valor_total: number | null;
  fecha_inscripcion: string | null;
  estado: EstadoMatricula;
  notas: string | null;
  tiene_tramitador: boolean;
  tramitador_nombre: string | null;
  tramitador_valor: number | null;
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
  especialidad: string;
  especialidades: string[] | null;
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
  anio: number | null;
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
  modulo_origen: string | null;
  fuente_banco: string | null;
  total_preguntas: number | null;
  respuestas_correctas: number | null;
  porcentaje: number | null;
  tiempo_segundos: number | null;
  notas: string | null;
  created_at: string;
}

export interface CategoriaExamen {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo_permiso: TipoPermisoExamen;
  orden: number;
  fuente: string;
  created_at: string;
}

export interface PreguntaExamen {
  id: string;
  categoria_id: string | null;
  pregunta: string;
  imagen_url: string | null;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string | null;
  respuesta_correcta: OpcionExamen;
  explicacion: string | null;
  fundamento_legal: string | null;
  tipo_permiso: TipoPermisoExamen;
  dificultad: DificultadExamen;
  activa: boolean;
  fuente: string;
  codigo_externo: string | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
  created_at: string;
}

export interface RespuestaExamen {
  id: string;
  escuela_id: string;
  sede_id: string;
  alumno_id: string;
  examen_id: string | null;
  pregunta_id: string;
  orden_pregunta: number | null;
  respuesta_alumno: OpcionExamen | null;
  respuesta_omitida: boolean;
  es_correcta: boolean;
  categoria_nombre: string | null;
  pregunta_texto: string | null;
  imagen_url: string | null;
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: OpcionExamen | null;
  explicacion: string | null;
  fundamento_legal: string | null;
  tiempo_segundos: number | null;
  created_at: string;
}

export interface ExamenCalePregunta {
  id: number;
  escuela_id: string;
  sede_id: string;
  alumno_id: string;
  examen_id: string;
  pregunta_id: string | null;
  categoria_id: string | null;
  categoria_nombre: string | null;
  codigo_externo: string | null;
  pregunta_texto: string;
  orden_pregunta: number;
  created_at: string;
}

export interface Gasto {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  mantenimiento_id: string | null;
  categoria: CategoriaGasto;
  concepto: string;
  monto: number;
  metodo_pago: MetodoPagoGasto;
  proveedor: string | null;
  numero_factura: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  estado_pago: EstadoPagoGasto;
  recurrente: boolean;
  notas: string | null;
  created_at: string;
}

export type FacturaCorreoProveedor = "imap" | "gmail_google";

export interface FacturaCorreoIntegracion {
  id: string;
  escuela_id: string;
  sede_id: string;
  created_by: string | null;
  updated_by: string | null;
  provider: FacturaCorreoProveedor;
  correo: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string;
  mailbox: string;
  from_filter: string | null;
  subject_filter: string | null;
  import_only_unseen: boolean;
  auto_sync: boolean;
  activa: boolean;
  last_uid: number | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacturaCorreoImportacion {
  id: string;
  integracion_id: string;
  escuela_id: string;
  sede_id: string;
  gasto_id: string | null;
  imap_uid: number | null;
  message_id: string | null;
  message_date: string | null;
  remitente: string | null;
  asunto: string | null;
  attachment_name: string;
  invoice_number: string | null;
  supplier_name: string | null;
  total: number | null;
  currency: string | null;
  status: EstadoImportacionFacturaCorreo;
  detail: string | null;
  created_at: string;
}

export interface CierreHorasInstructor {
  id: string;
  escuela_id: string;
  sede_id: string;
  instructor_id: string;
  gasto_id: string | null;
  periodo_anio: number;
  periodo_mes: number;
  fecha_cierre: string;
  total_horas: number;
  valor_hora: number;
  monto_total: number;
  generado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingreso {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  alumno_id: string | null;
  matricula_id: string | null;
  categoria: CategoriaIngreso;
  concepto: string;
  monto: number;
  metodo_pago: MetodoPago;
  medio_especifico: string | null;
  numero_factura: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
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

export interface Evaluacion {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  activa: boolean;
  created_at: string;
}

export interface Pregunta {
  id: string;
  evaluacion_id: string;
  texto: string;
  opciones: string[];
  respuesta_correcta: number;
  orden: number;
  created_at: string;
}
