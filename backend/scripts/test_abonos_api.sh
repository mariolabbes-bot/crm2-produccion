#!/bin/bash

# Script para probar las rutas de abonos
# Asegúrate de tener el servidor corriendo en puerto 3001

BASE_URL="http://localhost:3001/api"

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Probando API de Abonos"
echo "=========================="
echo ""

# Primero, hacer login para obtener el token
echo -e "${YELLOW}1. Obteniendo token de autenticación...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@crm.com", "password": "manager123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener el token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenido${NC}"
echo ""

# 2. Obtener lista de abonos
echo -e "${YELLOW}2. Obteniendo lista de abonos...${NC}"
curl -s -X GET "$BASE_URL/abonos?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.' | head -30
echo ""

# 3. Obtener estadísticas
echo -e "${YELLOW}3. Obteniendo estadísticas de abonos...${NC}"
curl -s -X GET "$BASE_URL/abonos/estadisticas" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 4. Obtener tipos de pago
echo -e "${YELLOW}4. Obteniendo tipos de pago...${NC}"
curl -s -X GET "$BASE_URL/abonos/tipos-pago" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 5. Obtener comparativo ventas vs abonos
echo -e "${YELLOW}5. Obteniendo comparativo ventas vs abonos (últimos 3 meses)...${NC}"
curl -s -X GET "$BASE_URL/abonos/comparativo?agrupar=mes&fecha_desde=2025-07-01" \
  -H "Authorization: Bearer $TOKEN" | jq '.' | head -50
echo ""

# 6. Obtener abonos por vendedor
echo -e "${YELLOW}6. Obteniendo resumen por vendedor...${NC}"
curl -s -X GET "$BASE_URL/abonos/por-vendedor" \
  -H "Authorization: Bearer $TOKEN" | jq '.' | head -40
echo ""

echo -e "${GREEN}✅ Pruebas completadas${NC}"
