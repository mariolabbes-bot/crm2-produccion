#!/bin/bash
# Script para verificar y configurar nombre_vendedor en la base de datos

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Credenciales de Neon
DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_USER="neondb_owner"
DB_NAME="neondb"
DB_PASSWORD="npg_DYTSqK9GI8Ei"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}VERIFICACIÓN DE DATOS - CRM2${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Función para ejecutar queries
run_query() {
    local query="$1"
    local description="$2"
    
    echo -e "${YELLOW}${description}${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$query"
    echo ""
}

# 1. Ver usuarios vendedores
echo -e "${GREEN}=== 1. USUARIOS VENDEDORES ===${NC}\n"
run_query "SELECT rut, nombre_completo, nombre_vendedor, correo FROM usuario WHERE rol_usuario = 'VENDEDOR' ORDER BY nombre_completo;" \
    "15 vendedores en el sistema:"

# 2. Ver nombres en ventas
echo -e "${GREEN}=== 2. NOMBRES DE VENDEDORES EN VENTAS ===${NC}\n"
run_query "SELECT vendedor_cliente, COUNT(*) as cantidad FROM venta WHERE vendedor_cliente IS NOT NULL GROUP BY vendedor_cliente ORDER BY cantidad DESC LIMIT 20;" \
    "Top 20 vendedores con más ventas registradas:"

# 3. Ver nombres en abonos
echo -e "${GREEN}=== 3. NOMBRES DE VENDEDORES EN ABONOS ===${NC}\n"
run_query "SELECT vendedor_cliente, COUNT(*) as cantidad FROM abono WHERE vendedor_cliente IS NOT NULL GROUP BY vendedor_cliente ORDER BY cantidad DESC LIMIT 20;" \
    "Top 20 vendedores con más abonos registrados:"

# 4. Estadísticas generales
echo -e "${GREEN}=== 4. ESTADÍSTICAS NOVIEMBRE 2025 ===${NC}\n"
run_query "SELECT COUNT(*) as ventas, SUM(valor_total) as total FROM venta WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2025-11';" \
    "Ventas en Noviembre 2025:"

run_query "SELECT COUNT(*) as abonos, SUM(monto) as total FROM abono WHERE TO_CHAR(fecha, 'YYYY-MM') = '2025-11';" \
    "Abonos en Noviembre 2025:"

# 5. Ventas sin vendedor
echo -e "${GREEN}=== 5. ANÁLISIS DE VENTAS ===${NC}\n"
run_query "SELECT COUNT(*) as total, COUNT(vendedor_cliente) as con_vendedor, COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor FROM venta;" \
    "Distribución de ventas con/sin vendedor:"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}VERIFICACIÓN COMPLETADA${NC}"
echo -e "${BLUE}======================================${NC}\n"

echo -e "${YELLOW}PRÓXIMO PASO:${NC}"
echo -e "Revisa los nombres que aparecen en las ventas y abonos."
echo -e "Luego ejecuta: ${GREEN}./asignar_nombres_vendedor.sh${NC}\n"
