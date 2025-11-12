#!/bin/bash

echo "🚀 MONITOREANDO DEPLOY EN RENDER"
echo "================================"
echo ""
echo "1. El cambio se pusheó a GitHub ✅"
echo "2. Render detectará el cambio automáticamente"
echo "3. El deploy tomará 3-5 minutos"
echo ""
echo "📊 Puedes monitorear en:"
echo "   https://dashboard.render.com"
echo ""
echo "🔍 Esperando a que el backend se actualice..."
echo ""

BACKEND_URL="https://crm2-backend.onrender.com/api/users/vendedores"
MAX_ATTEMPTS=60  # 5 minutos máximo
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    # Intentar conectar al endpoint
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" --max-time 10)
    
    if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 401 ]; then
        echo ""
        echo "✅ Backend actualizado correctamente!"
        echo "   Status: $STATUS"
        
        # Hacer una petición completa para ver la respuesta
        echo ""
        echo "📋 Respuesta del endpoint:"
        curl -s "$BACKEND_URL" | python3 -m json.tool | head -20
        
        echo ""
        echo "🎉 ¡Deploy completado exitosamente!"
        echo ""
        echo "Ahora puedes:"
        echo "1. Recargar tu frontend: https://crm2-produccion.vercel.app"
        echo "2. El error 500 debería estar resuelto"
        exit 0
    elif [ "$STATUS" -eq 500 ]; then
        echo "⏳ Intento $ATTEMPT/$MAX_ATTEMPTS - Backend aún no actualizado (Status: 500)"
    else
        echo "⏳ Intento $ATTEMPT/$MAX_ATTEMPTS - Esperando (Status: $STATUS)"
    fi
    
    sleep 5
done

echo ""
echo "⏰ Timeout - El deploy está tomando más tiempo de lo esperado"
echo ""
echo "Verifica manualmente en:"
echo "https://dashboard.render.com"
