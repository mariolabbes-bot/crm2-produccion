#!/bin/bash
# Script para CONTINUAR la carga de ventas desde el archivo 009
# NO borra los datos existentes, solo continúa

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración de conexión PostgreSQL
DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_NAME="neondb"
DB_USER="neondb_owner"
DB_PASSWORD="npg_DYTSqK9GI8Ei"
DB_PORT="5432"

echo "========================================"
echo "  CONTINUAR CARGA DE VENTAS"
echo "  Desde archivo 009 hasta 078"
echo "========================================"
echo ""

# Verificar registros actuales
echo -e "${YELLOW}📊 Verificando registros existentes...${NC}"
current_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;")
echo -e "${GREEN}   Registros actuales: $current_count${NC}"
echo ""

# Preguntar confirmación
read -p "¿Continuar la carga desde el archivo 009? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "Carga cancelada"
    exit 0
fi

echo ""
echo -e "${YELLOW}📂 Continuando carga desde archivo 009...${NC}"
echo ""

# Contador de progreso
success_count=0
error_count=0

# Ejecutar archivos desde el 009 hasta el 078
for i in $(seq -f "%03g" 9 78); do
    file="ventas_lotes/carga_ventas_lote_${i}.sql"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Archivo no encontrado: $file${NC}"
        error_count=$((error_count + 1))
        continue
    fi
    
    # Necesitamos quitar el TRUNCATE del archivo si existe
    # (solo el archivo 001 debería tenerlo, pero por seguridad)
    temp_file=$(mktemp)
    grep -v "TRUNCATE TABLE" "$file" > "$temp_file"
    
    echo -n "📝 Ejecutando lote $i/78... "
    
    # Ejecutar archivo
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f "$temp_file" > /dev/null 2>&1
    
    result=$?
    rm "$temp_file"
    
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✅${NC}"
        success_count=$((success_count + 1))
    else
        echo -e "${RED}❌ ERROR${NC}"
        error_count=$((error_count + 1))
        
        # Mostrar último error
        echo -e "${RED}Error al ejecutar $file${NC}"
        
        # Preguntar si continuar
        read -p "¿Continuar con el siguiente archivo? (s/n): " continue
        if [ "$continue" != "s" ]; then
            echo "Carga cancelada por el usuario"
            exit 1
        fi
    fi
    
    # Mostrar progreso cada 10 archivos
    if [ $((i % 10)) -eq 0 ]; then
        count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;")
        echo -e "${YELLOW}   📊 Registros cargados hasta ahora: $count${NC}"
    fi
done

echo ""
echo "========================================"
echo "  RESUMEN DE CARGA CONTINUADA"
echo "========================================"
echo -e "${GREEN}✅ Exitosos: $success_count${NC}"
echo -e "${RED}❌ Errores: $error_count${NC}"
echo ""

# Verificación final
echo -e "${YELLOW}📊 Verificando carga final...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << EOF
SELECT COUNT(*) as total_ventas FROM venta;
SELECT COUNT(*) as ventas_sin_vendedor FROM venta WHERE vendedor_cliente IS NULL;
EOF

echo ""
echo -e "${GREEN}✅ Carga continuada completada!${NC}"
echo -e "${YELLOW}📌 Total esperado: 77,029 registros${NC}"
