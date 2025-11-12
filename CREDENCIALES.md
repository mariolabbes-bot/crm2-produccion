# 🔐 CREDENCIALES DE ACCESO - CRM2 PRODUCCIÓN

**IMPORTANTE**: Este archivo contiene credenciales de acceso. Mantenlo seguro.

---

## 📊 RESUMEN

- **Total de usuarios**: 19
- **Managers**: 4
- **Vendedores**: 15
- **Contraseñas actualizadas**: 12 de noviembre de 2025, 18:00 hrs

---

## 👨‍💼 MANAGERS (Acceso Completo)

**Contraseña para todos los managers**: `manager123`

| # | Nombre | Email | RUT |
|---|--------|-------|-----|
| 1 | Emilio Alberto Santos Castillo | emilio.santos@lubricar-insa.cl | 12.569.531-0 |
| 2 | Luis Alberto Marin Blanco | luis.marin@lubricar-insa.cl | 12.425.152-4 |
| 3 | **Mario Andres Labbe Silva** | **mario.labbe@lubricar-insa.cl** | 12.168.148-K |
| 4 | Milton Marin Blanco | milton.marin@lubricar-insa.cl | 12.570.853-6 |

---

## 👥 VENDEDORES (Acceso Limitado)

**Contraseña para todos los vendedores**: `vendedor123`

| # | Nombre | Email | RUT |
|---|--------|-------|-----|
| 1 | Alex Mauricio Mondaca Cortes | alex.mondaca@lubricar-insa.cl | 11.599.857-9 |
| 2 | Eduardo Enrique Ponce Castillo | lubricar.tb@lubricar-insa.cl | 09.262.987-2 |
| 3 | Eduardo Rojas Andres Rojas Del Campo | eduardo.rojas@lubricar-insa.cl | 13.830.417-5 |
| 4 | Joaquin Alejandro Manriquez Munizaga | joaquin.mariquez@lubricar-insa.cl | 7.775.897-6 |
| 5 | Jorge Heriberto Gutierrez Silva | jorge.gutierrez@lubricar-insa.cl | 05.715.101-3 |
| 6 | Luis Ramon Esquivel Oyamadel | soporteventas.norte@lubricar-insa.cl | 11.823.790-0 |
| 7 | Maiko Ricardo Flores Maldonado | lubricar.matriz@lubricar-insa.cl | 13.018.313-1 |
| 8 | Marcelo Hernan Troncoso Molina | marcelo.troncoso@lubricar-insa.cl | 16.412.525-4 |
| 9 | Marisol De Lourdes Sanchez Roitman | ventas.laflorida@lubricar-insa.cl | 13.087.134-8 |
| 10 | Matias Felipe Felipe Tapia Valenzuela | matias.tapia@lubricar-insa.cl | 14.138.537-2 |
| 11 | Nataly Andrea Carrasco Rojas | ventas.pudahuel@lubricar-insa.cl | 16.082.310-0 |
| 12 | Nelson Antonio Muñoz Cortes | nelson.munoz@lubricar-insa.cl | 09.338.644-2 |
| 13 | Omar Antonio Maldonado Castillo | omar.maldonado@lubricar-insa.cl | 10.913.019-2 |
| 14 | Roberto Otilio Oyarzun Alvarez | roberto.oyarzun@lubricar-insa.cl | 07.107.100-6 |
| 15 | Victoria Andrea Hurtado Olivares | victoria.hurtado@lubricar-insa.cl | 12.051.321-4 |

---

## 🧪 PRUEBAS REALIZADAS

### ✅ Test 1: Manager
```bash
Email: mario.labbe@lubricar-insa.cl
Password: manager123
Resultado: ✅ LOGIN EXITOSO
Token generado: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ Test 2: Vendedor
```bash
Email: alex.mondaca@lubricar-insa.cl
Password: vendedor123
Resultado: ✅ LOGIN EXITOSO
Token generado: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Comando de Prueba
```bash
curl -X POST "https://crm2-backend.onrender.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mario.labbe@lubricar-insa.cl",
    "password": "manager123"
  }'
```

---

## 🌐 URLs DE ACCESO

```
Producción (Vercel): https://crm2-produccion.vercel.app
Backend API:         https://crm2-backend.onrender.com/api
```

---

## 🔒 INFORMACIÓN TÉCNICA

### Hashes de Contraseñas (bcrypt)

**Vendedores** (`vendedor123`):
```
$2b$10$LRrtxsjS/LAcEQ4vEWgiou6RxS6yOvwl0vDcjOEQCXQJpe.T0sji2
```

**Managers** (`manager123`):
```
$2b$10$LRrtxsjS/LAcEQ4vEWgioucn3dhYFUejvAOAh47Sed/hftNDtpoLu
```

### Salt Rounds
- **Algoritmo**: bcrypt
- **Rounds**: 10
- **Generado**: 12 de noviembre de 2025

---

## 📝 NOTAS IMPORTANTES

### Frontend en Vercel

Si estás usando el frontend en Vercel (https://crm2-produccion.vercel.app):
- Las credenciales funcionan correctamente ✅
- El backend está actualizado ✅
- No necesitas redeploy

### Frontend Local

Si estás desarrollando localmente:
1. Asegúrate de que `REACT_APP_API_URL` apunte a producción:
   ```
   REACT_APP_API_URL=https://crm2-backend.onrender.com/api
   ```
2. O cambia a localhost si tienes el backend corriendo localmente

### Verificar Credenciales

Si tienes problemas para hacer login:

1. **Verifica que estás usando el email exacto** (con @lubricar-insa.cl)
2. **Verifica la contraseña**:
   - Managers: `manager123`
   - Vendedores: `vendedor123`
3. **Abre la consola del navegador** (F12) y busca errores
4. **Verifica que el backend esté funcionando**:
   ```bash
   curl https://crm2-backend.onrender.com/api/health
   ```

---

## 🔄 CAMBIAR CONTRASEÑAS

Si necesitas cambiar la contraseña de un usuario:

### 1. Generar nuevo hash

```bash
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"

# Editar generar_passwords.js con la nueva contraseña
node generar_passwords.js
```

### 2. Actualizar en base de datos

```sql
UPDATE usuario 
SET password = '$2b$10$..nuevo_hash...'
WHERE correo = 'email@example.com';
```

---

## 👤 USUARIO RECOMENDADO PARA PRUEBAS

### Manager Principal
```
Email:    mario.labbe@lubricar-insa.cl
Password: manager123
Rol:      MANAGER
Acceso:   Completo (todos los datos)
```

### Vendedor de Prueba
```
Email:    alex.mondaca@lubricar-insa.cl
Password: vendedor123
Rol:      VENDEDOR
Acceso:   Solo sus clientes y ventas
```

---

## 🚨 SEGURIDAD

### Recomendaciones

1. ✅ **Cambiar contraseñas en producción**: Estas son contraseñas genéricas para desarrollo
2. ✅ **No compartir este archivo**: Contiene credenciales sensibles
3. ✅ **Rotar contraseñas periódicamente**: Cada 3-6 meses
4. ✅ **Usar HTTPS siempre**: Render y Vercel ya lo hacen automáticamente
5. ✅ **Monitorear accesos**: Revisar logs regularmente

### Git Ignore

Este archivo debería estar en `.gitignore`:
```
CREDENCIALES.md
*.credentials.*
.env
.env.local
```

---

**Última actualización**: 12 de noviembre de 2025, 18:00 hrs  
**Estado**: ✅ Todas las contraseñas actualizadas y probadas
