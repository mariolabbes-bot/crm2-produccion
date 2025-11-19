#!/bin/bash
# Script para cargar TODOS los bloques de ventas automáticamente desde Terminal
# Más confiable que DBeaver

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_NAME="neondb"
DB_USER="neondb_owner"
DB_PASSWORD="npg_DYTSqK9GI8Ei"
DB_PORT="5432"

echo "========================================"
echo "  CARGA AUTOMÁTICA - 7 BLOQUES VENTAS"
echo "========================================"
echo ""

# Verificar registros actuales
current=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;" | tr -d ' ')
echo -e "${YELLOW}📊 Registros actuales: $current${NC}"
echo ""

# Cargar bloques
for i in {1..7}; do
    file="carga_ventas_bloque_0${i}_de_07.sql"
    
    echo -n "📝 Cargando bloque $i/7... "
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT \
        -f "$file" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;" | tr -d ' ')
        echo -e "${GREEN}✅ Total: $count${NC}"
    else
        echo "❌ ERROR"
        exit 1
    fi
    
    sleep 2
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ VENTAS COMPLETADAS${NC}"
echo "========================================"

# Verificación
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << EOF
SELECT COUNT(*) as total_ventas FROM venta;
SELECT COUNT(*) as ventas_sin_vendedor FROM venta WHERE vendedor_cliente IS NULL;
EOF
