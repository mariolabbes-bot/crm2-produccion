
# CRM2 - Sistema de Gestión Comercial

Una aplicación web completa para gestión de equipos comerciales con funcionalidades avanzadas de seguimiento, análisis y administración.

## 🚀 Características Principales

- **Gestión de Usuarios**: Autenticación JWT, roles (vendedor/manager)
- **CRM Completo**: Clientes, actividades, objetivos parametrizables
- **Oportunidades y Amenazas**: Seguimiento comercial avanzado
- **Importación Masiva**: CSV y JSON para datos de ventas
- **KPIs y Dashboard**: Métricas y calendario interactivo
- **Arquitectura Robusta**: Backend Node.js + Frontend React + PostgreSQL

## 🏗️ Arquitectura

```
CRM2/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── routes/   # Endpoints REST
│   │   ├── models/   # Modelos de datos
│   │   └── middleware/ # Autenticación y validación
│   ├── schema.sql    # Estructura de base de datos
│   └── tests/        # Pruebas automatizadas
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/ # Componentes UI
│   │   ├── utils/    # Utilidades y helpers
│   │   └── api.js    # Cliente API
└── docs/            # Documentación
```

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** + Express.js
- **PostgreSQL** con pg
- **JWT** para autenticación
- **Multer** + **fast-csv** para importaciones
- **Jest** + **Supertest** para testing

### Frontend  
- **React 18** con Webpack
- **Material-UI** para componentes
- **React Router** para navegación
- **React Big Calendar** para dashboard
- **Moment.js** para fechas

### Base de Datos
- **PostgreSQL** en Supabase (producción)
- Esquema completo con relaciones
- Datos parametrizables (tipos de actividades/objetivos)

## Carga masiva de ventas
- Sube un archivo CSV con las columnas: `RUT`, `FECHA FACTURA`, `NUMERO FACTURA`, `MONTO NETO FACTURA`.
- El sistema valida y carga los registros correctos.
- Si hay errores (cliente no encontrado, duplicados, formato incorrecto), se descarga automáticamente un archivo CSV con los registros no cargados y el motivo.
- Puedes corregir y volver a cargar solo los faltantes.

## Roles de usuario
- **Vendedor:** Solo ve y gestiona sus propios clientes, actividades y ventas.
- **Manager/Admin:** Acceso a toda la información y parametrización del sistema.

## 📦 Instalación y Desarrollo

### Prerrequisitos
- Node.js 16+
- PostgreSQL 12+ (o cuenta Supabase)
- Git

### Configuración Local

1. **Clonar repositorio**
```bash
git clone https://github.com/tu-usuario/crm2.git
cd crm2
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb crm2_dev

# Ejecutar esquema
psql crm2_dev < backend/schema.sql
```

4. **Variables de entorno**
```bash
# Backend (.env)
DATABASE_URL=postgresql://usuario:password@localhost:5432/crm2_dev
JWT_SECRET=tu_clave_secreta_aqui
PORT=3001

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3001/api
```

5. **Ejecutar aplicación**
```bash
# Modo desarrollo (backend + frontend)
npm start

# Solo backend
npm run backend

# Solo frontend  
npm run frontend
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## 🚀 Despliegue en Producción

### Opción Recomendada (Gratis)
- **Base de datos**: Supabase PostgreSQL
- **Backend**: Render.com 
- **Frontend**: Vercel

Ver `PRODUCCION.md` para instrucciones detalladas paso a paso.

### Preparar para producción
```bash
./deploy-production.sh
```

## 📊 Funcionalidades

### Gestión de Datos
- ✅ CRUD completo para usuarios, clientes, actividades
- ✅ Tipos parametrizables (actividades y objetivos)
- ✅ Oportunidades y amenazas con probabilidades
- ✅ Importación masiva CSV/JSON con manejo de errores
- ✅ Exportación de registros fallidos

### Dashboard y Análisis
- ✅ KPIs principales (ventas, clientes top)
- ✅ Calendario de actividades interactivo
- ✅ Filtrado por rol (vendedor ve solo sus datos)
- ✅ Métricas de rendimiento en tiempo real

### Seguridad y Calidad
- ✅ Autenticación JWT robusta
- ✅ CORS configurado para producción
- ✅ Validación de datos en frontend y backend
- ✅ Logging estructurado con Morgan
- ✅ Pruebas automatizadas (Jest + Supertest)
- ✅ Manejo centralizado de errores

## 📖 API Documentation

Ver `backend/API.md` para documentación completa de endpoints.

### Endpoints Principales
```
POST /api/users/register       # Registro
POST /api/users/login          # Autenticación
GET  /api/clients              # Listar clientes
POST /api/sales/bulk           # Importar ventas CSV
POST /api/sales/import-json    # Importar ventas JSON
GET  /api/kpis/sales-summary   # Resumen de ventas
GET  /api/health               # Health check
```

## 🧪 Testing

```bash
# Ejecutar pruebas backend
npm run test:backend

# Ejecutar con coverage
cd backend && npm test -- --coverage

# Pruebas específicas
cd backend && npm test -- --testNamePattern="health"
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [ ] Notificaciones push
- [ ] Reportes avanzados en PDF
- [ ] Integración con CRM externos
- [ ] Mobile app (React Native)
- [ ] Análisis predictivo con IA

## 📄 Licencia

MIT License - ver `LICENSE` para detalles.

## 👥 Equipo

Desarrollado para optimizar la gestión de equipos comerciales con herramientas modernas y escalables.

---

**¿Preguntas?** Abre un issue o consulta la documentación en `/docs`.

**¿Listo para producción?** Sigue `PRODUCCION.md` paso a paso.

## Despliegue
Ver instrucciones detalladas en `DEPLOY.md` para alojar gratis en la nube (Render, Vercel, Supabase).

## Contacto y soporte
Para dudas, mejoras o soporte, contacta al equipo de desarrollo.
