# 🔄 Keep-Alive Service

## Problema
Render Free Tier pone los servicios a dormir después de 15 minutos de inactividad, causando delays de 30-60 segundos cuando un usuario intenta acceder.

## Solución
Este servicio hace ping al servidor cada 10 minutos para mantenerlo despierto.

## Configuración en Render

1. **Ve a tu dashboard de Render:** https://dashboard.render.com
2. **Selecciona el servicio `crm2-backend`**
3. **Ve a "Environment"**
4. **Agrega la variable de entorno:**
   ```
   BACKEND_URL=https://crm2-backend.onrender.com
   ```
5. **Guarda los cambios**
6. **Redeploy manual del servicio**

## Cómo funciona

- El servicio se inicia automáticamente cuando el servidor arranca
- Hace el primer ping después de 5 minutos (para dar tiempo a que el servidor inicie)
- Luego hace ping cada 10 minutos
- Solo se activa en `NODE_ENV=production` (no en desarrollo local)

## Logs

Verás en los logs de Render:
```
[Keep-Alive] Iniciado - ping cada 10 minutos
[Keep-Alive] ✓ Ping exitoso (2025-11-20T15:30:00.000Z)
```

## Notas

- **No es una solución perfecta:** Render puede seguir durmiendo el servicio si detecta patrones de auto-ping
- **Mejor solución:** Upgrade a Render Starter ($7/mes) que nunca se duerme
- **Alternativa:** Usar un servicio externo como UptimeRobot o cron-job.org

## Alternativas externas

### UptimeRobot (Gratis)
1. Crea cuenta en https://uptimerobot.com
2. Add New Monitor
3. Monitor Type: HTTP(s)
4. URL: `https://crm2-backend.onrender.com/api/health`
5. Monitoring Interval: 5 minutos

### Cron-job.org (Gratis)
1. Crea cuenta en https://cron-job.org
2. Create Cronjob
3. URL: `https://crm2-backend.onrender.com/api/health`
4. Interval: */10 * * * * (cada 10 minutos)
