#!/bin/bash
# Script para monitorear el progreso de la carga
# Ejecutar en otra terminal mientras corre la carga

DB_HOST="ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech"
DB_NAME="neondb"
DB_USER="neondb_owner"
DB_PASSWORD="npg_DYTSqK9GI8Ei"
DB_PORT="5432"

echo "🔍 Monitoreando carga de ventas..."
echo "Presiona Ctrl+C para salir"
echo ""

while true; do
    count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -t -c "SELECT COUNT(*) FROM venta;" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$count" ]; then
        porcentaje=$(echo "scale=2; $count * 100 / 77029" | bc)
        echo -ne "\r📊 Registros: $count / 77,029 ($porcentaje%)   "
    else
        echo -ne "\r⚠️  No se puede conectar...                    "
    fi
    
    sleep 5
done
