# 🔐 SISTEMA DE AUTENTICACIÓN - CRM2

## 📋 ESTRUCTURA DE LA TABLA `usuario`

```sql
CREATE TABLE usuario (
    rut VARCHAR(20) PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    nombre_vendedor VARCHAR(100),
    local VARCHAR(100),
    direccion VARCHAR(255),
    comuna VARCHAR(100),
    telefono VARCHAR(30),
    correo VARCHAR(100) UNIQUE NOT NULL,
    rol_usuario VARCHAR(50) NOT NULL,
    alias VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL
);
```

---

## 👥 ROLES DE USUARIO

### 🔴 Vendedor (`rol_usuario = 'vendedor'`)
**Permisos**:
- ✅ Ver solo **SUS** clientes
- ✅ Ver solo **SUS** ventas
- ✅ Ver solo **SUS** actividades
- ✅ Crear actividades para sus clientes
- ✅ Actualizar sus propias actividades
- ❌ No puede ver información de otros vendedores
- ❌ No puede crear usuarios
- ❌ No puede ver reportes globales

**Filtrado automático**: Todas las consultas se filtran por `nombre_vendedor` o `alias` del usuario autenticado.

### 🟢 Manager (`rol_usuario = 'manager'`)
**Permisos**:
- ✅ Ver **TODOS** los clientes
- ✅ Ver **TODAS** las ventas
- ✅ Ver **TODAS** las actividades
- ✅ Crear, editar, eliminar cualquier registro
- ✅ Crear nuevos usuarios
- ✅ Ver reportes y KPIs globales
- ✅ Exportar datos
- ✅ Acceso completo al sistema

---

## 🔑 PROCESO DE LOGIN

### Endpoint: `POST /api/users/login`

**Request**:
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123"
}
```

**Response (éxito)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "rut": "12345678-9",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "rol": "vendedor",
    "alias": "jperez"
  }
}
```

**Response (error)**:
```json
{
  "msg": "Invalid credentials"
}
```

---

## 🎫 TOKEN JWT

### Contenido del Token

```javascript
{
  user: {
    rut: "12345678-9",
    alias: "jperez",
    nombre: "Juan Pérez",
    rol: "vendedor"  // o "manager"
  },
  iat: 1699999999,
  exp: 1700086399  // Expira en 24 horas
}
```

### Uso del Token

**En Frontend**:
```javascript
// Guardar token después del login
localStorage.setItem('token', response.token);

// Incluir en requests
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**En Backend (automático)**:
El middleware `auth.js` extrae y valida el token en cada request protegido.

---

## 🔒 PROTECCIÓN DE RUTAS

### Backend

**Rutas públicas** (sin autenticación):
```javascript
POST /api/users/login        // Login
```

**Rutas protegidas** (requieren token):
```javascript
GET  /api/clients            // Lista de clientes (filtrado por rol)
POST /api/clients            // Crear cliente
GET  /api/activities         // Actividades (filtrado por rol)
GET  /api/sales              // Ventas (filtrado por rol)
GET  /api/kpis               // KPIs (filtrado por rol)
```

**Rutas solo para Manager**:
```javascript
POST /api/users/register     // Crear usuario (solo manager)
GET  /api/kpis/global        // KPIs globales (solo manager)
DELETE /api/clients/:id      // Eliminar cliente (solo manager)
```

### Implementación en Backend

```javascript
// Ruta pública
router.post('/login', async (req, res) => { ... });

// Ruta protegida (cualquier usuario autenticado)
router.get('/clients', auth(), async (req, res) => {
  // Filtrar por rol automáticamente
  if (req.user.rol === 'vendedor') {
    // Solo sus clientes
  } else {
    // Todos los clientes
  }
});

// Ruta solo para manager
router.post('/register', auth('manager'), async (req, res) => { ... });
```

---

## 🎨 FLUJO DE AUTENTICACIÓN EN FRONTEND

### 1. Login

```javascript
import { login } from './api';

const handleLogin = async (email, password) => {
  try {
    const response = await login({ email, password });
    
    // Guardar token y datos de usuario
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    // Redirigir al dashboard
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    alert('Credenciales inválidas');
  }
};
```

### 2. Verificar Autenticación

```javascript
import { getToken } from './utils/auth';

const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  // Opcional: verificar expiración
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};
```

### 3. Logout

```javascript
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  navigate('/login');
};
```

### 4. Proteger Rutas en React

```javascript
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Uso
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

<Route path="/admin" element={
  <ProtectedRoute requiredRole="manager">
    <AdminPanel />
  </ProtectedRoute>
} />
```

---

## 📊 DATOS EN PRODUCCIÓN

### Usuarios Existentes

Para ver los usuarios en tu base de datos:

```sql
SELECT 
    rut, 
    nombre_completo, 
    correo, 
    rol_usuario, 
    alias,
    nombre_vendedor
FROM usuario
ORDER BY rol_usuario, nombre_completo;
```

### Crear Usuario de Prueba (Manager)

```sql
-- Password hasheado de "admin123"
INSERT INTO usuario (
    rut, 
    nombre_completo, 
    correo, 
    password, 
    rol_usuario, 
    alias
) VALUES (
    '11111111-1',
    'Administrador Sistema',
    'admin@crm2.com',
    '$2a$10$rBV2kexample...', -- Hash de bcrypt
    'manager',
    'admin'
);
```

**Nota**: Para hashear el password, usa:
```javascript
const bcrypt = require('bcryptjs');
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash('admin123', salt);
console.log(hash);
```

---

## 🔧 CONFIGURACIÓN DE SEGURIDAD

### Variables de Entorno

**Backend (Render)**:
```env
JWT_SECRET=baa20e848edf99dcdaa39ca95f0771af3e5a82d059061cbd8aa04e7410323d3e
```

### Mejores Prácticas

1. **JWT Secret**: Debe ser único y secreto (ya configurado)
2. **Expiración**: Tokens expiran en 24 horas
3. **HTTPS**: Siempre usar HTTPS en producción (Render/Vercel lo hacen automáticamente)
4. **Password Hashing**: Usar bcrypt con salt rounds = 10
5. **Validación**: Validar entrada del usuario antes de procesar

---

## 🧪 TESTING DE AUTENTICACIÓN

### Test de Login

```bash
# Login exitoso
curl -X POST https://crm2-backend.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"password123"}'

# Respuesta esperada:
# {"token":"eyJ...","user":{...}}
```

### Test de Ruta Protegida

```bash
# Sin token (debería fallar con 401)
curl https://crm2-backend.onrender.com/api/clients

# Con token (debería funcionar)
curl https://crm2-backend.onrender.com/api/clients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🚨 MANEJO DE ERRORES

### Errores Comunes

| Código | Mensaje | Causa | Solución |
|--------|---------|-------|----------|
| 400 | Invalid credentials | Email o password incorrectos | Verificar credenciales |
| 401 | No token, authorization denied | No se envió token | Incluir header Authorization |
| 401 | Token is not valid | Token expirado o inválido | Hacer login nuevamente |
| 403 | Access denied | Usuario sin permisos | Verificar rol del usuario |
| 500 | Server Error | Error en servidor | Revisar logs del backend |

### Renovación Automática de Token

```javascript
// Interceptor para renovar token automáticamente
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expirado - redirigir a login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📝 PRÓXIMOS PASOS

1. **Crear usuario Manager**: Para acceso completo al sistema
2. **Asignar vendedores**: Asegurar que cada vendedor tenga su `nombre_vendedor` correcto
3. **Testing**: Probar login con diferentes roles
4. **Documentar usuarios**: Mantener lista de usuarios y sus roles

---

**Última actualización**: 12 de noviembre de 2025  
**Versión**: 1.0 (Producción)
