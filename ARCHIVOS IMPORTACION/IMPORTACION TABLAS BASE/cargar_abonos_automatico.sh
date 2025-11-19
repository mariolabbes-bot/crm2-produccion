#!/bin/bash
# Script para ejecutar todos los archivos de abonos en orden
# Uso: ./cargar_abonos_automatico.sh

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
echo "  CARGA AUTOMÁTICA DE ABONOS"
echo "========================================"
echo ""

# Verificar que psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ ERROR: psql no está instalado${NC}"
    echo "Instala PostgreSQL client con: brew install postgresql"
    exit 1
fi

# Limpiar tabla antes de comenzar
echo -e "${YELLOW}🧹 Limpiando tabla abono...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << EOF
TRUNCATE TABLE abono CASCADE;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tabla limpiada${NC}"
else
    echo -e "${RED}❌ Error al limpiar tabla${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📂 Iniciando carga de 42 archivos...${NC}"
echo ""

# Contador de progreso
total_files=42
success_count=0
error_count=0

# Ejecutar archivos en orden
for i in $(seq -f "%03g" 1 42); do
    file="abonos_lotes/carga_abonos_lote_${i}.sql"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Archivo no encontrado: $file${NC}"
        error_count=$((error_count + 1))
        continue
    fi
    
    echo -n "📝 Ejecutando lote $i/$total_files... "
    
    # Ejecutar archivo
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f "$file" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC}"
        success_count=$((success_count + 1))
    else
        echo -e "${RED}❌ ERROR${NC}"
        error_count=$((error_count + 1))
        
        # Preguntar si continuar
        read -p "¿Continuar con el siguiente archivo? (s/n): " continue
        if [ "$continue" != "s" ]; then
            echo "Carga cancelada por el usuario"
            exit 1
        fi
    fi
    
    # Mostrar progreso cada 10 archivos
    if [ $((i % 10)) -eq 0 ]; then
        count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM abono;")
        echo -e "${YELLOW}   📊 Registros cargados hasta ahora: $count${NC}"
    fi
done

echo ""
echo "========================================"
echo "  RESUMEN DE CARGA"
echo "========================================"
echo -e "${GREEN}✅ Exitosos: $success_count${NC}"
echo -e "${RED}❌ Errores: $error_count${NC}"
echo ""

# Verificación final
echo -e "${YELLOW}📊 Verificando carga final...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << EOF
SELECT COUNT(*) as total_abonos FROM abono;
SELECT COUNT(*) as abonos_sin_vendedor FROM abono WHERE vendedor_cliente IS NULL;
SELECT vendedor_cliente, COUNT(*) as num_abonos 
FROM abono 
WHERE vendedor_cliente IS NOT NULL 
GROUP BY vendedor_cliente 
ORDER BY num_abonos DESC 
LIMIT 10;
EOF

echo ""
echo -e "${GREEN}✅ Carga completada!${NC}"
