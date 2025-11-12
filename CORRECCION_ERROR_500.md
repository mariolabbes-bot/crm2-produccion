# 🔧 CORRECCIÓN DEL ERROR 500 - RESUMEN

## ❌ PROBLEMA ENCONTRADO

El frontend reportaba **"API request failed (500)"** al intentar cargar datos.

### Causa Raíz
El backend estaba configurado para una estructura de tabla `usuario` diferente a la real:

| Backend esperaba | Base de datos tiene |
|------------------|---------------------|
| `email` | `correo` |
| `rol` | `rol_usuario` |
| `nombre` | `nombre_completo` |
| `id` | `rut` (PK) |
| `rol = 'vendedor'` | `rol_usuario = 'VENDEDOR'` (mayúsculas) |

---

## ✅ SOLUCIÓN APLICADA

### 1. Actualización de `/api/users/login`
- ✅ Cambiado de `email` a `correo`
- ✅ Cambiado de `rol` a `rol_usuario`
- ✅ Añadido soporte para `alias`
- ✅ Token incluye ahora: `rut`, `alias`, `nombre`, `rol`
- ✅ Expiración extendida a 24 horas

### 2. Actualización de `/api/users/register`
- ✅ Adaptado a columnas reales
- ✅ Incluye validación de `correo` y `alias` únicos

### 3. Actualización de `/api/users/vendedores`
- ✅ Query simplificada
- ✅ Usa `rol_usuario = 'VENDEDOR'` (mayúsculas)
- ✅ Retorna todos los vendedores con su información completa

---

## 📊 DATOS EN PRODUCCIÓN

### Usuarios Disponibles

**Total**: 19 usuarios
- **4 Managers**: Con acceso completo
- **15 Vendedores**: Con acceso limitado a sus datos

### Managers
1. Emilio Alberto Santos Castillo - emilio.santos@lubricar-insa.cl
2. Luis Alberto Marin Blanco - luis.marin@lubricar-insa.cl  
3. Mario Andres Labbe Silva - mario.labbe@lubricar-insa.cl
4. Milton Marin Blanco - milton.marin@lubricar-insa.cl

### Vendedores
1. Alex Mauricio Mondaca Cortes
2. Eduardo Enrique Ponce Castillo
3. Eduardo Rojas Andres Rojas Del Campo
4. Joaquin Alejandro Manriquez Munizaga
5. Jorge Heriberto Gutierrez Silva
6. Luis Ramon Esquivel Oyamadel
7. Maiko Ricardo Flores Maldonado
8. Marcelo Hernan Troncoso Molina
9. Marisol De Lourdes Sanchez Roitman
10. Matias Felipe Felipe Tapia Valenzuela
11. Nataly Andrea Carrasco Rojas
12. Nelson Antonio Muñoz Cortes
13. Omar Antonio Maldonado Castillo
14. Roberto Otilio Oyarzun Alvarez
15. Victoria Andrea Hurtado Olivares

**Nota**: Todos los usuarios tienen password configurado ✅

---

## 🚀 DEPLOY EN PROCESO

### Cambios Pusheados a GitHub
```
✅ Commit 1: Fix query de vendedores (simplificado)
✅ Commit 2: Adaptar a estructura real (rol_usuario, correo, alias)
✅ Commit 3: Ajustar rol a VENDEDOR en mayúsculas
```

### Estado del Deploy
Render detectará automáticamente los cambios y hará redeploy en **3-5 minutos**.

### Monitorear Deploy
```bash
# Dashboard de Render
https://dashboard.render.com

# O ejecutar script de monitoreo
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
./monitorear_deploy.sh
```

---

## 🧪 VERIFICACIÓN POST-DEPLOY

### 1. Test de Endpoint de Vendedores

```bash
curl https://crm2-backend.onrender.com/api/users/vendedores
```

**Respuesta esperada**: Array con 15 vendedores
```json
[
  {
    "rut": "11.599.857-9",
    "nombre_completo": "Alex Mauricio Mondaca Cortes",
    "correo": "alex.mondaca@lubricar-insa.cl",
    "rol_usuario": "VENDEDOR",
    "alias": "ALEX",
    "nombre_vendedor": "ALEX",
    "cargo": null,
    "local": null
  },
  ...
]
```

### 2. Test de Login

Puedes probar con cualquiera de los 19 usuarios:

```bash
curl -X POST https://crm2-backend.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mario.labbe@lubricar-insa.cl",
    "password": "tu_password_aqui"
  }'
```

**Respuesta esperada**:
```json
{
  "token": "eyJhbG...",
  "user": {
    "rut": "12.168.148-K",
    "nombre": "Mario Andres Labbe Silva",
    "correo": "mario.labbe@lubricar-insa.cl",
    "rol": "MANAGER",
    "alias": null
  }
}
```

### 3. Test desde Frontend

1. Abre: https://crm2-produccion.vercel.app
2. Intenta hacer login con un usuario
3. **NO debería haber error 500**
4. Debería cargar el dashboard correctamente

---

## 📱 PRÓXIMOS PASOS

### Inmediato (cuando termine el deploy)

1. **Verificar que no hay errores**:
   ```bash
   ./verificar_conexion.sh
   ```

2. **Probar login en frontend**:
   - Ir a https://crm2-produccion.vercel.app
   - Intentar login con un usuario manager
   - Verificar que carga datos correctamente

3. **Verificar CORS** (F12 en navegador):
   - No debe haber errores rojos
   - Peticiones a API deben ser status 200/401

### Configuración de Usuarios

Si necesitas crear usuarios de prueba o cambiar passwords:

```sql
-- Crear usuario de prueba
INSERT INTO usuario (
    rut, nombre_completo, correo, password, rol_usuario, alias
) VALUES (
    '99999999-9',
    'Usuario de Prueba',
    'prueba@example.com',
    '$2a$10$...hash_aqui...',
    'VENDEDOR',
    'prueba'
);

-- Cambiar password de un usuario
-- (primero genera el hash con bcrypt)
UPDATE usuario 
SET password = '$2a$10$...nuevo_hash...'
WHERE correo = 'usuario@example.com';
```

### Testing de Roles

1. **Login como Manager**:
   - Debe ver todos los clientes
   - Debe ver todas las ventas
   - Debe ver KPIs globales

2. **Login como Vendedor**:
   - Debe ver solo sus clientes
   - Debe ver solo sus ventas
   - No debe ver datos de otros vendedores

---

## 🐛 SI PERSISTE EL ERROR

### Verificar Logs en Render

1. Ve a https://dashboard.render.com
2. Abre tu servicio `crm2-backend`
3. Click en **"Logs"**
4. Busca líneas con "Error" o "error"

### Comandos de Diagnóstico

```bash
# Ver respuesta completa de endpoint problemático
curl -v https://crm2-backend.onrender.com/api/users/vendedores

# Ver logs del servidor
# (en dashboard de Render)

# Test de conexión a base de datos
curl https://crm2-backend.onrender.com/api/health
```

---

## ✅ RESULTADO ESPERADO

Una vez que el deploy termine (en 2-3 minutos más):

- ✅ `/api/users/vendedores` retorna 15 vendedores
- ✅ `/api/users/login` funciona correctamente
- ✅ Frontend puede hacer login sin error 500
- ✅ Dashboard carga datos correctamente
- ✅ Sistema 100% funcional

---

## 📞 DOCUMENTACIÓN ACTUALIZADA

He creado/actualizado estos archivos:

1. **AUTENTICACION.md** - Guía completa del sistema de autenticación
2. Este archivo - **CORRECCION_ERROR_500.md** - Resumen de la corrección

---

**Estado**: ⏳ **Esperando deploy de Render** (2-3 minutos)  
**Próxima acción**: Verificar que el endpoint funcione  
**Fecha**: 12 de noviembre de 2025, 20:45 hrs
