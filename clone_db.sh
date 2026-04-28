#!/bin/bash

# Script de migración estructural: CRM2 Database -> AXON Database

# Forzar rutas de binarios locales (Homebrew)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# IMPORTANTE: Se han removido las palabras "-pooler" de los dominios,
# lo cual impedía que pg_dump se coordinara con AWS sin colgarse.
DB_CRM2="postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r.sa-east-1.aws.neon.tech/neondb?sslmode=require"
DB_AXON="postgresql://neondb_owner:npg_QYAF7LlsCK9q@ep-shy-bonus-acluekws.sa-east-1.aws.neon.tech/neondb?sslmode=require"

echo "==========================================="
echo "⚙️  Paso 1: Extrayendo la estructura de la base CRM2 (DDL)..."
# Usamos wait/timeout interno o ejecución directa asumiendo que compute node contesta de inmediato
pg_dump --schema-only "$DB_CRM2" > /tmp/schema_axon.sql

if [ ! -s /tmp/schema_axon.sql ]; then
    echo "❌ ERROR: pg_dump falló al extraer el esquema original o está vacío."
    exit 1
fi

# Quitamos comentarios innecesarios de Privilegios que interceden al clonar
grep -v '^GRANT' /tmp/schema_axon.sql > /tmp/schema_axon_clean.sql

echo "⚙️  Paso 2: Inyectando la estructura exacta en la Base AXON..."
psql "$DB_AXON" -f /tmp/schema_axon_clean.sql > /dev/null

echo "⚙️  Paso 3: Poblando AXON con Clientes y Datos de Demostracion..."
cd "/Users/mariolabbe/Desktop/TRABAJO IA/AXON CRM/backend"
node scripts/seed_axon.js

echo "==========================================="
echo "🎉 Todo Listo! El Motor y la Base de AXON están vivos. 🎉"
