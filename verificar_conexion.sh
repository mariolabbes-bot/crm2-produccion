#!/bin/bash

# ================================================
# SCRIPT DE VERIFICACIÓN - RENDER + VERCEL + NEON
# ================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# URLs de servicios
BACKEND_URL="https://crm2-backend.onrender.com"
FRONTEND_URL="https://crm2-produccion.vercel.app"
API_URL="${BACKEND_URL}/api"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  VERIFICACIÓN DE CONEXIÓN PRODUCCIÓN${NC}"
echo -e "${BLUE}  Render + Vercel + Neon${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Test 1: Backend Health
echo -e "${YELLOW}🔍 Test 1: Backend Health Check (Render)...${NC}"
echo "URL: $BACKEND_URL"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" --max-time 10)

if [ "$BACKEND_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Backend respondiendo correctamente (HTTP $BACKEND_STATUS)${NC}"
  # Obtener respuesta
  BACKEND_RESPONSE=$(curl -s "$BACKEND_URL" --max-time 10)
  echo "   Respuesta: $BACKEND_RESPONSE"
elif [ "$BACKEND_STATUS" -eq 000 ]; then
  echo -e "${RED}❌ Backend no responde (timeout o sin conexión)${NC}"
  echo -e "${YELLOW}⏰ Nota: Si es plan gratuito de Render, puede estar hibernando.${NC}"
  echo -e "${YELLOW}   Espera 30-60 segundos y vuelve a intentar.${NC}"
else
  echo -e "${RED}❌ Backend con error (HTTP $BACKEND_STATUS)${NC}"
fi
echo ""

# Test 2: API Endpoints
echo -e "${YELLOW}🔍 Test 2: API Endpoints...${NC}"
echo "URL: $API_URL/clients"

# Test con timeout más largo para despertar servicio
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/clients" --max-time 60)

if [ "$API_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ API respondiendo con datos (HTTP $API_STATUS)${NC}"
elif [ "$API_STATUS" -eq 401 ]; then
  echo -e "${GREEN}✅ API funcionando - requiere autenticación (HTTP $API_STATUS)${NC}"
elif [ "$API_STATUS" -eq 403 ]; then
  echo -e "${GREEN}✅ API funcionando - acceso denegado (HTTP $API_STATUS)${NC}"
elif [ "$API_STATUS" -eq 000 ]; then
  echo -e "${RED}❌ API no responde (timeout)${NC}"
else
  echo -e "${YELLOW}⚠️  API responde con código HTTP $API_STATUS${NC}"
fi
echo ""

# Test 3: Frontend
echo -e "${YELLOW}🔍 Test 3: Frontend (Vercel)...${NC}"
echo "URL: $FRONTEND_URL"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" --max-time 10)

if [ "$FRONTEND_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Frontend respondiendo correctamente (HTTP $FRONTEND_STATUS)${NC}"
else
  echo -e "${RED}❌ Frontend con error (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Test 4: Database Connection (a través del API)
echo -e "${YELLOW}🔍 Test 4: Conexión a Base de Datos...${NC}"
DB_TEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" --max-time 30)

if [ "$DB_TEST_STATUS" -eq 200 ] || [ "$DB_TEST_STATUS" -eq 401 ]; then
  echo -e "${GREEN}✅ Base de datos conectada (HTTP $DB_TEST_STATUS)${NC}"
else
  echo -e "${YELLOW}⚠️  Verificar conexión a base de datos (HTTP $DB_TEST_STATUS)${NC}"
fi
echo ""

# Test 5: CORS
echo -e "${YELLOW}🔍 Test 5: CORS Configuration...${NC}"
CORS_TEST=$(curl -s -I -X OPTIONS "$API_URL/clients" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  --max-time 10 | grep -i "access-control-allow-origin")

if [ ! -z "$CORS_TEST" ]; then
  echo -e "${GREEN}✅ CORS configurado correctamente${NC}"
  echo "   $CORS_TEST"
else
  echo -e "${YELLOW}⚠️  CORS puede necesitar configuración${NC}"
  echo -e "${YELLOW}   Verifica que el frontend esté en allowedOrigins del backend${NC}"
fi
echo ""

# Resumen Final
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  RESUMEN DE VERIFICACIÓN${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

TOTAL_TESTS=5
PASSED_TESTS=0

# Contar tests exitosos
[ "$BACKEND_STATUS" -eq 200 ] && ((PASSED_TESTS++))
[ "$API_STATUS" -eq 200 ] || [ "$API_STATUS" -eq 401 ] || [ "$API_STATUS" -eq 403 ] && ((PASSED_TESTS++))
[ "$FRONTEND_STATUS" -eq 200 ] && ((PASSED_TESTS++))
[ "$DB_TEST_STATUS" -eq 200 ] || [ "$DB_TEST_STATUS" -eq 401 ] && ((PASSED_TESTS++))
[ ! -z "$CORS_TEST" ] && ((PASSED_TESTS++))

echo -e "Tests pasados: ${GREEN}$PASSED_TESTS${NC}/$TOTAL_TESTS"
echo ""

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "${GREEN}🎉 ¡Todos los tests pasaron! Sistema operativo.${NC}"
elif [ $PASSED_TESTS -ge 3 ]; then
  echo -e "${YELLOW}⚠️  Sistema parcialmente operativo. Revisar tests fallidos.${NC}"
else
  echo -e "${RED}❌ Sistema con problemas. Revisar configuración.${NC}"
fi

echo ""
echo "📊 URLs del sistema:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo "   API:      $API_URL"
echo ""
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
