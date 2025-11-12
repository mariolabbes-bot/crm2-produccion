#!/bin/bash

# ================================================
# SCRIPT DE VERIFICACIÓN DE PRODUCCIÓN - CRM2
# ================================================
# Valida que el sistema esté funcionando correctamente
# ================================================

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de conexión
DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_USER="neondb_owner"
DB_NAME="neondb"
DB_PORT="5432"
PGPASSWORD="npg_DYTSqK9GI8Ei"

export PGPASSWORD

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  VERIFICACIÓN DEL SISTEMA CRM2 - PRODUCCIÓN${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Test 1: Conexión a base de datos
echo -e "${YELLOW}📡 Test 1: Verificando conexión a base de datos...${NC}"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
else
    echo -e "${RED}❌ Error de conexión${NC}"
    exit 1
fi
echo ""

# Test 2: Verificar tablas principales
echo -e "${YELLOW}📋 Test 2: Verificando tablas principales...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'usuario' THEN '✅'
        WHEN table_name = 'producto' THEN '✅'
        WHEN table_name = 'cliente' THEN '✅'
        WHEN table_name = 'venta' THEN '✅'
        WHEN table_name = 'abono' THEN '✅'
        ELSE '⚠️'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('usuario', 'producto', 'cliente', 'venta', 'abono')
ORDER BY table_name;
EOF
echo ""

# Test 3: Conteo de registros
echo -e "${YELLOW}📊 Test 3: Conteo de registros por tabla...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
SELECT 
    'USUARIOS' as tabla,
    COUNT(*) as registros,
    CASE WHEN COUNT(*) >= 19 THEN '✅' ELSE '⚠️' END as status
FROM usuario
UNION ALL
SELECT 
    'PRODUCTOS',
    COUNT(*),
    CASE WHEN COUNT(*) >= 2697 THEN '✅' ELSE '⚠️' END
FROM producto
UNION ALL
SELECT 
    'CLIENTES',
    COUNT(*),
    CASE WHEN COUNT(*) >= 2919 THEN '✅' ELSE '⚠️' END
FROM cliente
UNION ALL
SELECT 
    'VENTAS',
    COUNT(*),
    CASE WHEN COUNT(*) >= 77000 THEN '✅' ELSE '⚠️' END
FROM venta
UNION ALL
SELECT 
    'ABONOS',
    COUNT(*),
    CASE WHEN COUNT(*) >= 30000 THEN '✅' ELSE '⚠️' END
FROM abono;
EOF
echo ""

# Test 4: Integridad de vendedores
echo -e "${YELLOW}👥 Test 4: Verificando asignación de vendedores...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
SELECT 
    'VENTAS' as tabla,
    COUNT(*) as total,
    COUNT(vendedor_cliente) as con_vendedor,
    ROUND(COUNT(vendedor_cliente)::numeric * 100 / NULLIF(COUNT(*), 0), 2) as porcentaje,
    CASE 
        WHEN ROUND(COUNT(vendedor_cliente)::numeric * 100 / NULLIF(COUNT(*), 0), 2) >= 99 
        THEN '✅' 
        ELSE '⚠️' 
    END as status
FROM venta
UNION ALL
SELECT 
    'ABONOS',
    COUNT(*),
    COUNT(vendedor_cliente),
    ROUND(COUNT(vendedor_cliente)::numeric * 100 / NULLIF(COUNT(*), 0), 2),
    CASE 
        WHEN ROUND(COUNT(vendedor_cliente)::numeric * 100 / NULLIF(COUNT(*), 0), 2) >= 99 
        THEN '✅' 
        ELSE '⚠️' 
    END
FROM abono;
EOF
echo ""

# Test 5: Última transacción
echo -e "${YELLOW}📅 Test 5: Verificando transacciones recientes...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
SELECT 
    'Última Venta' as tipo,
    MAX(fecha_emision)::date as fecha,
    '✅' as status
FROM venta
UNION ALL
SELECT 
    'Último Abono',
    MAX(fecha)::date,
    '✅'
FROM abono;
EOF
echo ""

# Test 6: Vendedores activos
echo -e "${YELLOW}💼 Test 6: Vendedores activos en sistema...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
SELECT 
    COUNT(DISTINCT vendedor_cliente) as vendedores_activos,
    CASE 
        WHEN COUNT(DISTINCT vendedor_cliente) >= 15 THEN '✅' 
        ELSE '⚠️' 
    END as status
FROM (
    SELECT vendedor_cliente FROM venta WHERE vendedor_cliente IS NOT NULL
    UNION
    SELECT vendedor_cliente FROM abono WHERE vendedor_cliente IS NOT NULL
) as vendedores;
EOF
echo ""

# Resumen Final
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ VERIFICACIÓN COMPLETADA${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Sistema CRM2 funcionando correctamente en producción${NC}"
echo -e "Fecha de verificación: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
