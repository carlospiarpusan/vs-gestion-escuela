# ConduSoft - Sistema de Gestión de Escuelas de Conducción

## Carpeta unica del proyecto

La ubicacion de trabajo es `/Users/carlos/Desktop/vs-gestion-escuela`.
La web esta en `src/` y Android en `mobile/`, dentro de este mismo proyecto.
No es necesario mantener otra carpeta `condusoft` ni copias de trabajo antiguas.

```sh
# Web
npm run dev

# Android (sin generar un instalador final)
npm run mobile:start

# Revisar archivos temporales que se pueden retirar
npm run clean:local

# Limpiar despues de detener servidores y compilaciones locales
npm run clean:local -- --apply
```

La limpieza conserva dependencias, codigo, datos, configuracion privada, firmas e
historial Git. La siguiente compilacion Android reconstruira sus caches.
Los respaldos de las carpetas retiradas estan en `.local-backups/`, fuera de Git
y del despliegue, y pueden contener configuracion privada.

ConduSoft es una plataforma SaaS integral construida para administrar flujos operativos, académicos y financieros para Centros de Enseñanza Automovilística (CEA). Con un enfoque multi-tenant, el sistema permite gestionar múltiples escuelas y sedes desde un único entorno.

## Características y Módulos Principales (Funciones de la Página)

El sistema cuenta con un panel de control (Dashboard) segmentado por roles que abarca los siguientes submódulos:

### 🏢 Gestión Multi-Tenant y Administrativa

- **Escuelas**: Gestión de los diferentes Centros de Enseñanza.
- **Sedes**: Administración de sucursales independientes por escuela.
- **Administrativos**: Asignación y control de personal de oficinas con niveles de acceso estrictos (Super Admin, Admin Escuela, Admin Sede, Administrativos).
- **Bitácora**: Registro de actividad y auditoría de todas las acciones del sistema.

### 👥 Gestión Académica y Usuarios

- **Alumnos**: Perfiles completos, control de documentos, seguimiento de aprendizaje y estado de licencias.
- **Instructores**: Gestión de profesores, asignación, y control de horas laboradas.
- **Categorías**: Configuración de los diferentes tipos de permisos y licencias expedidos (A1, A2, B1, C1, etc.).
- **Horas de instructores**: Registro de horas trabajadas, seguimiento por periodo y cierre mensual. El módulo de Clases está retirado.

### 🚗 Gestión de Flota Automotor

- **Vehículos**: Base de datos de la flota (taxis, motos, particulares, buses), documentos asociados, seguros (SOAT, Técnico-mecánica).
- **Mantenimiento**: Registro de mantenimientos preventivos y correctivos, tracking de gastos por vehículo y alertas.

### 💰 Gestión Financiera

- **Ingresos**: Control de pagos de alumnos, planes curriculares y facturación. Permite integración con API de DIAN (Facturación Electrónica).
- **Gastos**: Manejo de egresos de la escuela, caja menor, pago a instructores, mantenimiento de la flota.
- **Informes**: Reportería avanzada de rentabilidad, estado académico y consolidados de gastos/ingresos.

### 📝 Evaluación y Exámenes

- **Exámenes (Simulador CALE/ANSV)**: Banco de preguntas en tiempo real para simulacros teóricos obligatorios, segmentados por núcleos temáticos y conocimiento actitudinal para los alumnos.

## 🛠️ Stack Tecnológico

Este proyecto está desarrollado usando tecnologías modernas centradas en rendimiento, escalabilidad y Serverless:

- **Frontend / Framework**: Next.js 16 (App Router), React 19.
- **Estilos y UI**: Tailwind CSS 4, Lucide React (Iconos), Framer Motion (Animaciones).
- **Backend / Base de Datos**: Supabase (PostgreSQL), `@supabase/ssr` para autenticación y base de datos con Políticas de Seguridad (RLS).
- **Servicios Externos Integrados**: Facturación electrónica DIAN (SOAP XML), exportación/importación de reportes CALE.
- **Validación**: Zod.

## Ejecución en Entorno de Desarrollo

```bash
npm run dev
# o
yarn dev
```

## Facturación web con ClovEnt Billing Hub + Wompi

La facturación comercial de escuelas se gestiona desde la web autenticada en [`/dashboard/suscripciones`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/dashboard/suscripciones/page.tsx), pero el checkout real corre en `ClovEnt`, que actúa como hub central de Wompi para `Condusoft`.

Variables de entorno requeridas para web:

- `CLOVENT_BILLING_HUB_URL`
- `CONDUSOFT_BILLING_SHARED_SECRET`
- `CONDUSOFT_PUBLIC_BILLING_TOKEN_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

Piezas principales:

- Migración comercial: [`supabase/migrations/050_school_subscriptions_wompi.sql`](/Users/carlos/Desktop/vs-gestion-escuela/supabase/migrations/050_school_subscriptions_wompi.sql)
- Adaptador del hub: [`src/lib/billing/hub.ts`](/Users/carlos/Desktop/vs-gestion-escuela/src/lib/billing/hub.ts)
- Checkout autenticado: [`src/app/api/suscripciones/checkout/route.ts`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/api/suscripciones/checkout/route.ts)
- Centro de facturación de escuela: [`src/components/dashboard/subscriptions/SchoolBillingCenter.tsx`](/Users/carlos/Desktop/vs-gestion-escuela/src/components/dashboard/subscriptions/SchoolBillingCenter.tsx)
- Página pública de pago: [`src/app/billing/pagar/page.tsx`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/billing/pagar/page.tsx)
- Página pública de estado: [`src/app/billing/estado/page.tsx`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/billing/estado/page.tsx)
- Confirmación interna desde ClovEnt: [`src/app/api/billing/internal/payment-confirmation/route.ts`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/api/billing/internal/payment-confirmation/route.ts)
- Webhook Wompi legacy: [`src/app/api/wompi/eventos/route.ts`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/api/wompi/eventos/route.ts)
- Cron comercial: [`src/app/api/cron/suscripciones/route.ts`](/Users/carlos/Desktop/vs-gestion-escuela/src/app/api/cron/suscripciones/route.ts)

## Cliente Android (`mobile/`)

La carpeta [`mobile/`](/Users/carlos/Desktop/vs-gestion-escuela/mobile) contiene la app Expo/React Native para Android. Consume Supabase y utiliza la API web para operaciones concretas, como el acceso por cedula. No depende de `VERCEL_URL`.

### Variables de entorno

Crear `mobile/.env` a partir de [`mobile/.env.example`](/Users/carlos/Desktop/vs-gestion-escuela/mobile/.env.example):

```bash
cp mobile/.env.example mobile/.env
```

Variables requeridas:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Comandos útiles

```bash
npm run mobile:start
npm run mobile:android
npm run mobile:typecheck
```

### Backend Supabase para móvil

Antes de probar la sincronización móvil, aplicar la migración [`supabase/migrations/049_mobile_app_rpc.sql`](/Users/carlos/Desktop/vs-gestion-escuela/supabase/migrations/049_mobile_app_rpc.sql) y desplegar la Edge Function [`supabase/functions/mobile-admin-users/index.ts`](/Users/carlos/Desktop/vs-gestion-escuela/supabase/functions/mobile-admin-users/index.ts):

```bash
supabase db push
supabase functions deploy mobile-admin-users
```

La primera fase móvil incluye:

- Sitio público, login/registro y panel por rol.
- Cola offline con SQLite para alumnos, clases, ingresos, gastos y práctica CALE.
- Sin impresión de contratos, exportes ni automatización IMAP de facturas.
