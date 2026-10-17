# Conexión de ConduSoft con FacturaX

Estado actual, 11 de octubre de 2026: ambos canales API están conectados en
producción para Sin Fronteras. FacturaX consulta alumnos mediante la API de
lectura descrita aquí. ConduSoft también solicita facturación con revisión y
confirmación explícita antes de emitir; ese canal usa otra credencial y está
documentado en [FACTURAX-EMISION.md](FACTURAX-EMISION.md).

La clave de alumnos se creó a las 08:44 Colombia con permiso exclusivo
`alumnos:leer` y vence el 9 de enero de 2027 a las 08:44 Colombia. La anterior
estaba revocada; no había otra clave vigente. FacturaX la guardó cifrada por
empresa después de verificar NIT e identidad contra la API real. Su interfaz
publicada mostró «Conectada mediante la API HTTPS de ConduSoft» y la búsqueda
de un nombre sintético inexistente respondió con cero resultados.

Para renovar, generar la clave en ConduSoft → Conexión con facturación y
actualizarla inmediatamente en FacturaX → Conexión API → Configurar ConduSoft
para esta empresa. No guardar el secreto en el chat, Git o variables públicas.

Las migraciones 053 y 054 y `VS_BILLING_API_ENABLED=true` siguen activas.
No repetir las migraciones para usar la conexión existente. Las secciones
fechadas del 30 de septiembre conservan la evidencia histórica.

## Alcance confirmado

- Empresa: Escuela de Conduccion Sin Fronteras S.A.S., NIT 901171550-0.
- Escuela interna: a5320c4a-3bf6-4da5-b365-da17d7001d4f.
- ConduSoft comparte exclusivamente identificador, nombres, apellidos, tipo y
  numero de documento y correo del alumno.
- NO comparte matriculas, contratos, categorias, cursos, precios, valores,
  saldos, pagos, impuestos, credenciales, evaluaciones ni fechas de nacimiento.
- vs-facturacion define adquirente, conceptos, valores e impuestos y crea las
  facturas. ConduSoft no genera XML, firma, consume numeracion ni transmite a DIAN.
- Este canal de lectura no marca alumnos como facturados ni modifica cartera.
  La asociación de la factura con el contrato usa el canal de emisión separado
  descrito en [FACTURAX-EMISION.md](FACTURAX-EMISION.md).

## Configuración y renovación

1. Completado: migracion `053_vs_facturacion_api.sql` aplicada y registrada
   atomicamente en `public._migraciones`. La migracion 054 tambien se aplico
   y registro atomicamente el 2026-09-30, conservando las claves existentes.
2. Completado: `VS_BILLING_API_ENABLED=true` configurada solo en produccion
   del servidor ConduSoft y nuevo despliegue publicado.
3. Entrar como administrador de Sin Fronteras o superadministrador con esa
   escuela seleccionada. Abrir `/dashboard/facturacion`.
4. Generar una clave y guardarla como secreto del SERVIDOR de vs-facturacion,
   nunca en una variable `NEXT_PUBLIC_*`, localStorage, codigo cliente o repositorio.
5. En FacturaX → Conexión API, abrir la configuración de la empresa y guardar
   la nueva clave con la conexión activada. El servidor comprueba la API antes
   de guardarla cifrada. La URL HTTPS de ConduSoft es fija en el conector.
6. Pulsar «Verificar conexión» y comprobar el estado conectado.

FacturaX tiene autenticación y membresías propias, API privada y datos en su
servidor, con aislamiento por empresa y límites de solicitudes. El navegador
nunca recibe la clave. No hay consulta SQL alternativa de alumnos ni acceso
cruzado a bases de datos. La importación requiere revisar y confirmar al
adquirente; no autoriza una emisión automática.

## Seguridad

- Claves aleatorias de 256 bits, almacenadas solo como SHA-256. Vigencia predeterminada
  de 90 dias; el administrador puede elegir una fecha futura o sin vencimiento.
- Solo una clave no revocada por escuela; generar otra revoca la anterior de forma atomica.
- Token vinculado al administrador que lo crea; caducar, revocar, desactivar al
  responsable o retirarle su alcance cancela el acceso en nuevas solicitudes.
- Limite de 60 consultas/minuto por clave y 120 intentos/minuto por IP.
- Permiso fijo `alumnos:leer`, no utilizable para escribir en APIs de ConduSoft.
- No CORS abierto. Respuestas `private, no-store`. No tokens ni datos en logs de aplicacion.
- Rotacion, revocacion, edicion de vigencia y eliminacion auditadas. La pantalla
  lista las ultimas 10 claves no eliminadas, sin hashes.
- RLS y revocacion de privilegios impiden acceder a las claves desde Supabase cliente.

## Administrar la duracion y las claves

En `/dashboard/facturacion`, cada clave muestra acciones con texto:

- **Cambiar vigencia**: 90 dias desde hoy, fecha y hora de Bogota o sin vencimiento.
  Mantiene el mismo token. No permite reactivar claves revocadas o eliminadas.
- **Revocar**: cancela el acceso y conserva la clave visible en el historial.
- **Eliminar**: cancela el acceso y oculta la conexion, conservando su auditoria.
  Requiere confirmar antes de aplicar el cambio.

Las mismas opciones de vigencia estan disponibles al generar una clave.
La API usa `PATCH /api/integraciones/vs-facturacion/claves` con `id` y
`expires_at` (ISO con zona horaria o `null`) para editar, y `DELETE` con
`id` y `accion: "eliminar"` para eliminar. Sin `accion`, DELETE revoca.

Estas operaciones requieren sesion de administrador autorizado y `Origin` del
mismo sitio. El token de lectura de vs-facturacion NO permite administrar claves.
Al crear, `POST` acepta `expires_at` opcional: omitirlo conserva los 90 dias por
defecto y `null` indica sin vencimiento. Se rechazan fechas pasadas o sin zona.

Sin vencimiento no desactiva autenticacion, revocacion, limites de consultas ni
la validacion del responsable. Una clave permanente robada seguiria siendo
utilizable hasta revocarla: guardarla solo como secreto del servidor receptor.

Actualizacion publicada en produccion el 2026-09-30 con autorizacion del usuario.
La migracion `054_vs_facturacion_connection_lifecycle.sql` se aplico y registro
en una sola transaccion; se verifico que las claves, hashes, vencimientos y
estados de revocacion existentes permanecieran iguales. No se aplicaron otras
migraciones durante esta actualizacion.

Despliegue Vercel: `dpl_GFPc2vzppwbs2ahXFGdBddVtfW56`, estado `READY`, destino
`production`, alias `https://condusoft.co`.
Validacion: 109 pruebas de claves aprobadas y compilacion de produccion correcta.
El flujo de edicion y eliminacion se comprobo en navegador con datos ficticios;
no se generaron ni revocaron claves reales para probarlo.

## Contrato v1

URL base de produccion activa (requiere una clave Bearer valida):
`https://condusoft.co/api/integraciones/vs-facturacion/v1`

Todas las consultas usan `Authorization: Bearer <CLAVE>`.
El token es exclusivo de esta integracion. El consumidor debe usar HTTPS,
timeout, no registrar cuerpos con datos personales y no seguir redirecciones
que pudieran enviar la credencial a otro servidor.

### GET /conexion

Devuelve `schema_version`, `source`, `empresa`, `permisos` y `campos`.
Sirve para validar credenciales y comprobar que la empresa es la esperada.

### POST /alumnos/buscar

Consulta de solo lectura mediante POST para no incluir cedulas/nombres en URLs.

```json
{ "q": "12345678", "cursor": null }
```

`q`: 3 a 100 caracteres, documento exacto o fragmento del nombre completo.
Devuelve hasta 20 alumnos de la escuela autorizada:

```json
{
  "data": [
    {
      "schema_version": 1,
      "source": "condusoft",
      "source_reference": "condusoft:alumno:10000000-0000-4000-8000-000000000002",
      "alumno": {
        "id": "10000000-0000-4000-8000-000000000002",
        "nombre": "Persona",
        "apellidos": "Ficticia",
        "nombre_completo": "Persona Ficticia",
        "tipo_documento": "CC",
        "documento": "12345678",
        "email": "demo@example.com"
      }
    }
  ],
  "next_cursor": null
}
```

Reenviar `next_cursor` como `cursor` conservando `q` para la siguiente pagina.
`null` indica fin. La API no acepta campos adicionales, filtros por otra escuela
ni solicitudes para incluir valores.

### GET /alumnos/{id}

Devuelve un objeto individual con la misma estructura de `data[]`.
UUID inexistente o de otra escuela: `404`, sin revelar a quien pertenece.

### Identidad e importacion

- `source_reference` identifica al CLIENTE, no a una factura. Puede tener muchas
  facturas en vs-facturacion. Usarlo para actualizar/vincular al mismo cliente,
  no para impedir facturas futuras ni copiar una factura anterior.
- El receptor debe mostrar y confirmar nombre/documento antes de crear una factura.
- `email` y `tipo_documento` pueden ser `null`; confirmar lo que falte en destino.
- No deducir impuestos, precios o conceptos a partir del alumno.
- No interpretar la importacion como autorizacion de emision automatica.
- No todos los alumnos son necesariamente el adquirente fiscal (puede ser un
  acudiente o empresa). La seleccion final se hace en vs-facturacion.

### Errores

`400` entrada invalida; `401` token invalido/revocado/vencido; `404` conexion
desactivada o alumno no disponible; `429` limite alcanzado (`Retry-After: 60`);
`503` fallo temporal/configuracion pendiente.

Reintentar solo consultas idempotentes ante `429`/`503` con espera limitada.
Nunca reintentar automaticamente la generacion de claves.

## Despliegue del 2026-09-30

- Vercel: `dpl_EiTmCAErsc6MB3gpwbnwRiCZj3AH`, estado `Ready`, produccion.
- Dominio confirmado mediante Vercel: `https://condusoft.co`.
- Panel: `https://condusoft.co/dashboard/facturacion`. Requiere administrador
  de Sin Fronteras o superadministrador con esa escuela seleccionada.
- 195 pruebas aprobadas; linter, compilacion y TypeScript correctos.
- Verificacion directa de RLS y ausencia de permisos SELECT/INSERT/UPDATE/DELETE
  para `anon` y `authenticated` sobre las dos tablas de la integracion.
- Columnas necesarias verificadas mediante metadatos, sin leer datos de alumnos.
- No se realizo una consulta HTTP autenticada en produccion ni se genero una
  clave. La prueba entre ambos servidores queda pendiente de configurar el receptor.
- Para deshabilitar la API, cambiar `VS_BILLING_API_ENABLED=false` en Vercel y
  volver a desplegar. No hace falta borrar tablas ni modificar alumnos.

## Verificacion local

```sh
npm ci
npm test -- --run
npx tsc --noEmit --incremental false
npm run build
```

Las pruebas de integracion utilizan PostgreSQL en memoria (PGlite, dependencia
solo de desarrollo) con datos ficticios. No necesitan ni consultan DATABASE_URL.
