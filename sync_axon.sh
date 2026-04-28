#!/bin/bash
# Script de sincronización estructural: CRM2 -> AXON CRM

# Definir rutas relativas/absolutas
CRM2_DIR="/Users/mariolabbe/Desktop/TRABAJO IA/CRM2"
AXON_DIR="/Users/mariolabbe/Desktop/TRABAJO IA/AXON CRM"

echo "==========================================="
echo "Iniciando clonacion estructural CRM2 -> AXON CRM"
echo "==========================================="

# Backups temporales para el branding de AXON
echo "[1/4] Respaldando temas y logos Axon (Branding)..."
mkdir -p /tmp/axon_backup
cp -r "$AXON_DIR/frontend/src/theme/axonTheme.js" "/tmp/axon_backup/axonTheme.js"
cp -r "$AXON_DIR/frontend/src/assets" "/tmp/axon_backup/assets"
cp -r "$AXON_DIR/frontend/public" "/tmp/axon_backup/public"

# Sincronización Backend
echo "[2/4] Sincronizando nucleo del Backend..."
rsync -a --exclude="node_modules" --exclude=".env" "$CRM2_DIR/backend/src/" "$AXON_DIR/backend/src/"
rsync -a --exclude="node_modules" --exclude=".env" "$CRM2_DIR/backend/scripts/" "$AXON_DIR/backend/scripts/"
cp "$CRM2_DIR/backend/package.json" "$AXON_DIR/backend/package.json"

# Sincronización Frontend
echo "[3/4] Sincronizando nucleo del Frontend..."
rsync -a --exclude="node_modules" --exclude=".env" --exclude=".env.production" --exclude=".env.vercel" "$CRM2_DIR/frontend/src/" "$AXON_DIR/frontend/src/"
cp "$CRM2_DIR/frontend/package.json" "$AXON_DIR/frontend/package.json"

# Restauración de Temas Axon
echo "[4/4] Restaurando identidad visual Axon..."
cp "/tmp/axon_backup/axonTheme.js" "$AXON_DIR/frontend/src/theme/axonTheme.js"
rm -rf "$AXON_DIR/frontend/src/assets/*"
cp -r /tmp/axon_backup/assets/* "$AXON_DIR/frontend/src/assets/"
rm -rf "$AXON_DIR/frontend/public/*"
cp -r /tmp/axon_backup/public/* "$AXON_DIR/frontend/public/"

# Limpiar referencias muertas de CRM2 en AXON
rm -f "$AXON_DIR/frontend/src/theme/lubricarTheme.js"

# Forzar parcheos dinámicos en los archivos de React usando sed
echo "Parcheando variables en el codigo..."
sed -i '' 's/lubricarTheme/axonTheme/g' "$AXON_DIR/frontend/src/App.js"
sed -i '' 's/logo-lubricar-letras.png/logo-axon-negro.png/g' "$AXON_DIR/frontend/src/components/Login.js"
sed -i '' 's/Lubricar/AXON/g' "$AXON_DIR/frontend/src/components/Login.js"
sed -i '' 's/INSA//g' "$AXON_DIR/frontend/src/components/Login.js"
sed -i '' 's/logo_lubricar/logo-axon-dark/g' "$AXON_DIR/frontend/src/components/Sidebar.js"
sed -i '' 's/LUBRICAR/AXON/g' "$AXON_DIR/frontend/src/components/Sidebar.js"
sed -i '' 's/INSA//g' "$AXON_DIR/frontend/src/components/Sidebar.js"
sed -i '' 's/E57A2D/FF5722/g' "$AXON_DIR/frontend/src/components/TopBar.js"
sed -i '' 's/Lubricar/AXON/g' "$AXON_DIR/frontend/src/components/TopBar.js"

echo "==========================================="
echo "Sincronizacion completada con exito!"
echo "Por favor procede a correr las migraciones en la nueva BD."
