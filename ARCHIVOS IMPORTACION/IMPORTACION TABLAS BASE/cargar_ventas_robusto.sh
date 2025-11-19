#!/bin/bash
# Script ROBUSTO para continuar carga con reintentos y mejor manejo de errores
# Uso: ./cargar_ventas_robusto.sh [archivo_inicio]

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_NAME="neondb"
DB_USER="neondb_owner"
DB_PASSWORD="npg_DYTSqK9GI8Ei"
DB_PORT="5432"
PSQL_TIMEOUT=300  # 5 minutos por archivo

# Archivo de inicio (por defecto 010, o el que se pase como parámetro)
START_FILE=${1:-10}

echo "========================================"
echo "  CARGA ROBUSTA DE VENTAS"
echo "  Desde archivo $(printf '%03d' $START_FILE) hasta 078"
echo "========================================"
echo ""

# Verificar registros actuales
echo -e "${YELLOW}📊 Verificando estado actual...${NC}"
current_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;" 2>/dev/null | tr -d ' ')

if [ -z "$current_count" ]; then
    echo -e "${RED}❌ No se puede conectar a la base de datos${NC}"
    exit 1
fi

echo -e "${GREEN}   Registros actuales: $current_count${NC}"
echo ""

# Función para ejecutar un archivo con reintentos
execute_file_with_retry() {
    local file=$1
    local file_num=$2
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        if [ $retry -gt 0 ]; then
            echo -e "${YELLOW}   🔄 Reintento $retry/$max_retries...${NC}"
            sleep 2
        fi
        
        # Crear archivo temporal sin TRUNCATE
        temp_file=$(mktemp)
        grep -v "TRUNCATE TABLE" "$file" > "$temp_file"
        
        # Ejecutar con timeout
        timeout $PSQL_TIMEOUT psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT \
            -v ON_ERROR_STOP=1 \
            -f "$temp_file" > /tmp/psql_output_${file_num}.log 2>&1
        
        result=$?
        rm "$temp_file"
        
        if [ $result -eq 0 ]; then
            return 0
        elif [ $result -eq 124 ]; then
            echo -e "${RED}   ⏱️  Timeout alcanzado${NC}"
        else
            echo -e "${RED}   ❌ Error código: $result${NC}"
            if [ -f /tmp/psql_output_${file_num}.log ]; then
                tail -3 /tmp/psql_output_${file_num}.log
            fi
        fi
        
        retry=$((retry + 1))
    done
    
    return 1
}

# Contador
success_count=0
error_count=0
error_files=()

# Ejecutar archivos
for i in $(seq $START_FILE 78); do
    file_num=$(printf "%03d" $i)
    file="ventas_lotes/carga_ventas_lote_${file_num}.sql"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Archivo no encontrado: $file${NC}"
        error_count=$((error_count + 1))
        error_files+=($file_num)
        continue
    fi
    
    echo -n "📝 Lote $file_num/078 ... "
    
    if execute_file_with_retry "$file" "$file_num"; then
        echo -e "${GREEN}✅${NC}"
        success_count=$((success_count + 1))
        
        # Guardar progreso
        echo "$file_num" > /tmp/ventas_last_success.txt
    else
        echo -e "${RED}❌ FALLÓ después de 3 intentos${NC}"
        error_count=$((error_count + 1))
        error_files+=($file_num)
        
        # Preguntar si continuar
        read -p "¿Continuar con el siguiente? (s/n): " continue
        if [ "$continue" != "s" ]; then
            echo ""
            echo -e "${YELLOW}⚠️  Carga detenida en archivo $file_num${NC}"
            echo -e "${BLUE}Para continuar luego, ejecuta:${NC}"
            echo -e "${BLUE}  ./cargar_ventas_robusto.sh $((i+1))${NC}"
            exit 1
        fi
    fi
    
    # Verificar cada 10 archivos
    if [ $((i % 10)) -eq 0 ]; then
        count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;" 2>/dev/null | tr -d ' ')
        echo -e "${YELLOW}   📊 Total cargado: $count registros${NC}"
    fi
    
    # Pausa breve entre archivos
    sleep 1
done

echo ""
echo "========================================"
echo "  RESUMEN FINAL"
echo "========================================"
echo -e "${GREEN}✅ Exitosos: $success_count${NC}"
echo -e "${RED}❌ Errores: $error_count${NC}"

if [ ${#error_files[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Archivos con error: ${error_files[*]}${NC}"
fi

echo ""
echo -e "${YELLOW}📊 Verificación final...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << EOF
SELECT 
    COUNT(*) as total_ventas,
    COUNT(*) * 100.0 / 77029 as porcentaje_completado
FROM venta;

SELECT COUNT(*) as ventas_sin_vendedor 
FROM venta 
WHERE vendedor_cliente IS NULL;
EOF

echo ""
if [ $success_count -eq $((78 - START_FILE + 1)) ]; then
    echo -e "${GREEN}🎉 ¡Carga completada exitosamente!${NC}"
else
    echo -e "${YELLOW}⚠️  Carga incompleta. Revisa los archivos con error.${NC}"
fi
