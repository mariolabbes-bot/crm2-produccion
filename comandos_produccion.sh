#!/bin/bash

# ================================================
# COMANDOS ÚTILES PARA PRODUCCIÓN - CRM2
# ================================================
# Atajos para tareas comunes en producción
# ================================================

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# URLs
BACKEND_URL="https://crm2-backend.onrender.com"
FRONTEND_URL="https://crm2-produccion.vercel.app"
API_URL="${BACKEND_URL}/api"

function mostrar_menu() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  COMANDOS ÚTILES - CRM2 PRODUCCIÓN${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo "1. Verificar estado de todos los servicios"
    echo "2. Ver logs del backend (últimas 100 líneas)"
    echo "3. Despertar backend (si está hibernando)"
    echo "4. Test de conexión a base de datos"
    echo "5. Ver info de base de datos (conteo de registros)"
    echo "6. Abrir dashboards (Render, Vercel, Neon)"
    echo "7. Deploy backend (git push)"
    echo "8. Deploy frontend (git push)"
    echo "9. Generar nuevo JWT secret"
    echo "10. Ver URLs de producción"
    echo "0. Salir"
    echo ""
}

function verificar_servicios() {
    echo -e "${YELLOW}🔍 Verificando servicios...${NC}"
    ./verificar_conexion.sh
}

function despertar_backend() {
    echo -e "${YELLOW}⏰ Despertando backend...${NC}"
    echo "Esto puede tardar 30-60 segundos..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL" --max-time 60)
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Backend despierto y funcionando${NC}"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    else
        echo -e "${YELLOW}⚠️  Backend respondió con código $STATUS${NC}"
    fi
}

function test_database() {
    echo -e "${YELLOW}🔍 Testeando conexión a base de datos...${NC}"
    
    # Test simple con curl
    RESPONSE=$(curl -s "$API_URL/clients" -w "\n%{http_code}" --max-time 30)
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    
    if [ "$STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Base de datos conectada - API respondiendo${NC}"
    elif [ "$STATUS" -eq 401 ]; then
        echo -e "${GREEN}✅ Base de datos conectada - Requiere autenticación${NC}"
    else
        echo -e "${YELLOW}⚠️  Verificar conexión (Status: $STATUS)${NC}"
    fi
}

function info_database() {
    echo -e "${YELLOW}📊 Obteniendo info de base de datos...${NC}"
    ./verificacion_produccion.sh
}

function abrir_dashboards() {
    echo -e "${YELLOW}🌐 Abriendo dashboards...${NC}"
    open "https://dashboard.render.com"
    sleep 1
    open "https://vercel.com/dashboard"
    sleep 1
    open "https://console.neon.tech"
    echo -e "${GREEN}✅ Dashboards abiertos en el navegador${NC}"
}

function deploy_backend() {
    echo -e "${YELLOW}🚀 Deploy de backend...${NC}"
    echo "Esto hará commit y push de los cambios en backend/"
    read -p "¿Continuar? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        git add backend/
        git commit -m "Deploy backend - $(date '+%Y-%m-%d %H:%M')"
        git push origin main
        echo -e "${GREEN}✅ Push completado. Render deployará automáticamente en 3-5 min${NC}"
        echo "Monitorea en: https://dashboard.render.com"
    fi
}

function deploy_frontend() {
    echo -e "${YELLOW}🚀 Deploy de frontend...${NC}"
    echo "Esto hará commit y push de los cambios en frontend/"
    read -p "¿Continuar? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        git add frontend/
        git commit -m "Deploy frontend - $(date '+%Y-%m-%d %H:%M')"
        git push origin main
        echo -e "${GREEN}✅ Push completado. Vercel deployará automáticamente en 1-2 min${NC}"
        echo "Monitorea en: https://vercel.com/dashboard"
    fi
}

function generar_jwt_secret() {
    echo -e "${YELLOW}🔐 Generando nuevo JWT secret...${NC}"
    NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo ""
    echo -e "${GREEN}Nuevo JWT Secret:${NC}"
    echo "$NEW_SECRET"
    echo ""
    echo "Cópialo y actualízalo en:"
    echo "1. Render → Environment → JWT_SECRET"
    echo "2. Redeploy el backend después de actualizarlo"
}

function mostrar_urls() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  URLs DE PRODUCCIÓN${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "${GREEN}Frontend:${NC}  $FRONTEND_URL"
    echo -e "${GREEN}Backend:${NC}   $BACKEND_URL"
    echo -e "${GREEN}API:${NC}       $API_URL"
    echo ""
    echo -e "${BLUE}Dashboards:${NC}"
    echo "Render:    https://dashboard.render.com"
    echo "Vercel:    https://vercel.com/dashboard"
    echo "Neon:      https://console.neon.tech"
    echo "GitHub:    https://github.com/mariolabbes-bot/crm2-produccion"
    echo ""
}

# Main loop
while true; do
    mostrar_menu
    read -p "Selecciona una opción: " opcion
    echo ""
    
    case $opcion in
        1) verificar_servicios ;;
        2) 
            echo "Abriendo Render logs..."
            open "https://dashboard.render.com"
            echo "Ve a tu servicio → Logs"
            ;;
        3) despertar_backend ;;
        4) test_database ;;
        5) info_database ;;
        6) abrir_dashboards ;;
        7) deploy_backend ;;
        8) deploy_frontend ;;
        9) generar_jwt_secret ;;
        10) mostrar_urls ;;
        0) 
            echo -e "${GREEN}¡Hasta luego!${NC}"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Opción inválida${NC}"
            ;;
    esac
    
    echo ""
    read -p "Presiona Enter para continuar..."
    clear
done
