# Autoescuela Pro - Sistema de Gestión de Escuelas de Conducción

Autoescuela Pro es una plataforma SaaS integral construida para administrar flujos operativos, académicos y financieros para Centros de Enseñanza Automovilística (CEA). Con un enfoque multi-tenant, el sistema permite gestionar múltiples escuelas y sedes desde un único entorno.

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
- **Clases y Horas**: Agendamiento de clases prácticas/teóricas y seguimiento del progreso o cumplimiento de horas de cada estudiante.

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
