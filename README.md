
# CRM2 - Sistema de Gestión Comercial

Una aplicación web completa para gestión de equipos comerciales con funcionalidades avanzadas de seguimiento, análisis y administración.

## 🚀 Características Principales

- **Gestión de Usuarios**: Autenticación JWT, roles (vendedor/manager)
- **CRM Completo**: Clientes, actividades, objetivos parametrizables
- **Oportunidades y Amenazas**: Seguimiento comercial avanzado
- **Importación Masiva**: Excel para datos de ventas, abonos, saldo de crédito
- **Sistema de Saldo Crédito**: KPI de facturas pendientes con normalización de nombres
- **KPIs y Dashboard**: Métricas en tiempo real con filtros por vendedor
- **Arquitectura Robusta**: Backend Node.js + Frontend React + PostgreSQL Neon

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
- **PostgreSQL** en Neon (producción)
- Esquema completo con relaciones
- Datos parametrizables (tipos de actividades/objetivos)
- Sistema de aliases para normalización de vendedores

## 📥 Importación de Datos

### Saldo Crédito (Nuevo ✨)
Sistema completo para gestionar facturas pendientes con normalización automática de nombres de vendedores.

**Características:**
- ✅ Importación desde Excel con reemplazo completo
- ✅ 18 aliases de vendedores configurados
- ✅ Normalización automática de nombres (sin acentos, uppercase)
- ✅ KPI en dashboard con filtro por vendedor
- ✅ Visualización global (manager) o individual (vendedor)

**Documentación completa:** Ver [`docs/SISTEMA_SALDO_CREDITO.md`](docs/SISTEMA_SALDO_CREDITO.md)

**Columnas esperadas en Excel:**
- `RUT`, `TIPO DOCUMENTO`, `CLIENTE`, `folio`, `fecha_emision`
- `TOTAL FACTURA`, `SALDO FACTURA`, `NOMBRE VENDEDOR`
- Opcionales: `Deuda Cancelada`, `Saldo a Favor Disponible`, `idvendedor`

**Proceso:**
1. Manager → "Importación de Datos" → "💳 Saldo Crédito"
2. Subir archivo `SALDO CREDITO.xlsx`
3. Sistema elimina registros anteriores e inserta nuevos
4. Dashboard muestra total actualizado

### Ventas y Abonos
### Ventas y Abonos
- Sube un archivo Excel con las columnas requeridas
- El sistema valida y carga los registros correctos
- Si hay errores (cliente no encontrado, duplicados, formato incorrecto), se muestran en tabla
- Puedes corregir y volver a cargar solo los faltantes

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

### URLs Actuales
- **Frontend:** https://crm2-produccion.vercel.app
- **Backend:** https://crm2-backend.onrender.com
- **Base de datos:** Neon PostgreSQL

### Stack de Producción
- **Base de datos**: Neon PostgreSQL (gratis)
- **Backend**: Render.com (gratis con auto-sleep)
- **Frontend**: Vercel (gratis, auto-deploy desde `main`)

Ver archivos de configuración obsoletos archivados en `docs/archive/` (DEPLOY*.md, PRODUCCION*.md)

## 📊 Funcionalidades

### Gestión de Datos
- ✅ CRUD completo para usuarios, clientes, actividades
- ✅ Tipos parametrizables (actividades y objetivos)
- ✅ Oportunidades y amenazas con probabilidades
- ✅ Importación masiva CSV/JSON con manejo de errores
- ✅ Exportación de registros fallidos

### Dashboard y Análisis
- ✅ KPIs principales (ventas, abonos, saldo crédito)
- ✅ Calendario de actividades interactivo
- ✅ Filtrado por rol (vendedor ve solo sus datos)
- ✅ Métricas de rendimiento en tiempo real
- ✅ Sistema de aliases para normalización de vendedores

### Seguridad y Calidad
- ✅ Autenticación JWT robusta
- ✅ CORS configurado para producción
- ✅ Validación de datos en frontend y backend
- ✅ Logging estructurado con Morgan
- ✅ Pruebas automatizadas (Jest + Supertest)
- ✅ Manejo centralizado de errores

## 📖 API Documentation

### Endpoints Principales
```
POST /api/users/register           # Registro
POST /api/users/login              # Autenticación
GET  /api/clients                  # Listar clientes
POST /api/import/saldo-credito     # Importar saldo crédito Excel
POST /api/import/ventas            # Importar ventas Excel
POST /api/import/abonos            # Importar abonos Excel
GET  /api/kpis/saldo-credito-total # KPI saldo crédito con filtro
GET  /api/vendor-aliases           # CRUD aliases vendedores
POST /api/vendor-aliases/seed      # Cargar 18 aliases predefinidos
GET  /api/health                   # Health check
```

**Documentación detallada:**
- Sistema Saldo Crédito: [`docs/SISTEMA_SALDO_CREDITO.md`](docs/SISTEMA_SALDO_CREDITO.md)
- Documentación obsoleta archivada en: `docs/archive/`

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

- [x] Sistema de Saldo Crédito con aliases
- [x] Importación masiva desde Excel (Ventas, Abonos, Saldo Crédito)
- [x] Dashboard con KPIs en tiempo real
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

**Sistema Saldo Crédito:** Ver guía completa en [`docs/SISTEMA_SALDO_CREDITO.md`](docs/SISTEMA_SALDO_CREDITO.md)

**Documentación obsoleta:** Archivada en `docs/archive/` para referencia histórica

## Contacto y soporte
Para dudas, mejoras o soporte, contacta al equipo de desarrollo.
