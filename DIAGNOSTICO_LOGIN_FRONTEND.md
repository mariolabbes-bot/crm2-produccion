# 🔍 DIAGNÓSTICO: "CREDENCIALES INVALIDAS" EN FRONTEND

**Fecha**: 12 de noviembre de 2025, 18:00 hrs  
**Problema**: Frontend muestra "CREDENCIALES INVALIDAS" pero backend acepta las credenciales

---

## ✅ VERIFICADO - BACKEND FUNCIONA

### Test 1: Manager Login
```bash
curl -X POST "https://crm2-backend.onrender.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mario.labbe@lubricar-insa.cl",
    "password": "manager123"
  }'
```

**Resultado**: ✅ EXITOSO
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "rut": "12.168.148-K",
    "nombre": "Mario Andres Labbe Silva",
    "correo": "mario.labbe@lubricar-insa.cl",
    "rol": "MANAGER",
    "alias": null
  }
}
```

### Test 2: Vendedor Login
```bash
curl -X POST "https://crm2-backend.onrender.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex.mondaca@lubricar-insa.cl",
    "password": "vendedor123"
  }'
```

**Resultado**: ✅ EXITOSO
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "rut": "11.599.857-9",
    "nombre": "Alex Mauricio Mondaca Cortes",
    "correo": "alex.mondaca@lubricar-insa.cl",
    "rol": "VENDEDOR",
    "alias": null
  }
}
```

---

## 🔍 POSIBLES CAUSAS

### 1. Frontend Local vs Producción

#### ❌ Si estás en localhost (http://localhost:3000)

**Problema**: Tu frontend local puede estar apuntando a:
- Backend local que no existe
- Versión vieja del código
- Variables de entorno incorrectas

**Solución**:
```bash
# Ve a la carpeta del frontend
cd frontend

# Verifica que tengas las variables correctas
cat .env.local
# Debería contener:
# REACT_APP_API_URL=https://crm2-backend.onrender.com/api

# Si no existe, créalo:
echo "REACT_APP_API_URL=https://crm2-backend.onrender.com/api" > .env.local

# Reinicia el servidor de desarrollo
npm start
```

#### ✅ Si estás en Vercel (https://crm2-produccion.vercel.app)

El frontend en producción **DEBERÍA FUNCIONAR** porque:
- Backend actualizado ✅
- Contraseñas actualizadas ✅
- CORS configurado ✅

**Pero si no funciona**, necesitas verificar:

---

## 🔧 PASOS PARA RESOLVER

### PASO 1: Determina dónde estás

```
¿Qué URL ves en tu navegador?

A) http://localhost:3000  → Estás en desarrollo local
B) https://crm2-produccion.vercel.app  → Estás en Vercel producción
```

### PASO 2A: Si estás en LOCALHOST

```bash
# 1. Ve a la carpeta frontend
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/frontend"

# 2. Crea/actualiza .env.local
echo "REACT_APP_API_URL=https://crm2-backend.onrender.com/api" > .env.local

# 3. Instala dependencias si es necesario
npm install

# 4. Reinicia el servidor
npm start

# 5. Abre http://localhost:3000 y prueba:
#    Email: mario.labbe@lubricar-insa.cl
#    Password: manager123
```

### PASO 2B: Si estás en VERCEL

#### Opción 1: Verificar Variables de Entorno

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto `crm2-produccion`
3. Ve a **Settings** → **Environment Variables**
4. Verifica que exista:
   ```
   REACT_APP_API_URL = https://crm2-backend.onrender.com/api
   ```
5. Si no existe, agrégala
6. Haz un **Redeploy**

#### Opción 2: Forzar Redeploy

```bash
# En la raíz del proyecto
cd "/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"

# Haz un commit vacío para forzar redeploy
git commit --allow-empty -m "Force redeploy frontend con nuevas variables"
git push origin main
```

Vercel detectará el push y hará un redeploy automático (~2 minutos).

---

## 🐛 DEBUG EN EL NAVEGADOR

### Si sigues teniendo problemas:

1. **Abre DevTools**:
   - Presiona `F12` (Windows/Linux) o `Cmd + Option + I` (Mac)
   - Ve a la pestaña **Network**

2. **Intenta hacer login**:
   - Email: mario.labbe@lubricar-insa.cl
   - Password: manager123

3. **Busca la petición `login`**:
   - Verifica **Request URL**: ¿A dónde está enviando la petición?
     - ✅ Correcto: `https://crm2-backend.onrender.com/api/users/login`
     - ❌ Incorrecto: `http://localhost:3001/api/users/login`
   
   - Verifica **Request Payload**: ¿Qué está enviando?
     ```json
     {
       "email": "mario.labbe@lubricar-insa.cl",
       "password": "manager123"
     }
     ```
   
   - Verifica **Response**: ¿Qué responde el servidor?
     - ✅ Status 200 + token = Login exitoso
     - ❌ Status 401 = Credenciales incorrectas
     - ❌ Status 500 = Error del servidor
     - ❌ CORS error = Problema de configuración

4. **Toma screenshot** de la pestaña Network y compártelo si el problema persiste

---

## 📋 CHECKLIST DE VERIFICACIÓN

Antes de reportar el problema como no resuelto, verifica:

- [ ] ¿Estás usando el email COMPLETO con @lubricar-insa.cl?
- [ ] ¿Estás usando la contraseña correcta?
  - Managers: `manager123`
  - Vendedores: `vendedor123`
- [ ] ¿El backend está funcionando? (probado con curl ✅)
- [ ] ¿Sabes si estás en localhost o en Vercel?
- [ ] Si estás en localhost, ¿existe el archivo `.env.local`?
- [ ] Si estás en Vercel, ¿verificaste las variables de entorno?
- [ ] ¿Abriste DevTools para ver la petición real?
- [ ] ¿Probaste con otro navegador o en modo incógnito?

---

## 🎯 CREDENCIALES DE PRUEBA

### Manager (Acceso Completo)
```
Email:    mario.labbe@lubricar-insa.cl
Password: manager123
```

### Vendedor (Acceso Limitado)
```
Email:    alex.mondaca@lubricar-insa.cl
Password: vendedor123
```

---

## 💡 SOLUCIÓN RÁPIDA

Si solo quieres que funcione YA:

1. **Usa Vercel directamente**:
   - Abre: https://crm2-produccion.vercel.app
   - Login con: mario.labbe@lubricar-insa.cl / manager123
   - **Debería funcionar** porque backend está actualizado

2. **Si Vercel no funciona**:
   - Ve a Vercel dashboard
   - Settings → Environment Variables
   - Agrega `REACT_APP_API_URL` si no existe
   - Redeploy (Deployments → ... → Redeploy)

3. **Si quieres usar localhost**:
   ```bash
   cd frontend
   echo "REACT_APP_API_URL=https://crm2-backend.onrender.com/api" > .env.local
   npm start
   ```

---

## 📞 SIGUIENTE PASO

**Dime cuál es tu situación**:

1. ¿Estás en `localhost:3000` o en `crm2-produccion.vercel.app`?
2. ¿Qué ves en DevTools → Network cuando intentas hacer login?
3. ¿Ya probaste con las credenciales exactas de arriba?

Con esa información puedo darte la solución exacta.

---

**Estado actual**:
- ✅ Backend: Funcionando perfectamente
- ✅ Database: 19 usuarios con contraseñas actualizadas
- ✅ API: Probada exitosamente con curl
- ❓ Frontend: Pendiente de verificar configuración
