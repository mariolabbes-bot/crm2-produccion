#!/bin/bash

# Script de deploy a producción
# Este script hace commit de los cambios y los sube al repositorio
# Render y Vercel desplegarán automáticamente

echo "🚀 Iniciando proceso de deploy a producción..."
echo ""

# Verificar que estamos en la rama main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️  No estás en la rama main (estás en $BRANCH)"
  read -p "¿Quieres cambiar a main? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout main
    echo "✅ Cambiado a rama main"
  else
    echo "❌ Deploy cancelado"
    exit 1
  fi
fi

echo "📦 Verificando cambios..."
git status

echo ""
read -p "¿Quieres continuar con el deploy? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Deploy cancelado"
  exit 1
fi

# Pedir mensaje de commit
echo ""
read -p "Ingresa un mensaje para el commit (Enter para usar mensaje por defecto): " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="Deploy: actualización de producción $(date '+%Y-%m-%d %H:%M')"
fi

echo ""
echo "📝 Haciendo commit con mensaje: $COMMIT_MSG"

# Agregar todos los cambios
git add .

# Hacer commit
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
  echo "⚠️  No hay cambios para commitear o hubo un error"
  echo "Verificando si hay cambios pendientes..."
  if git diff-index --quiet HEAD --; then
    echo "✅ No hay cambios pendientes, el repositorio está actualizado"
  else
    echo "❌ Hubo un error al hacer commit"
    exit 1
  fi
fi

echo ""
echo "🔄 Haciendo push a GitHub..."
git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ¡Deploy iniciado exitosamente!"
  echo ""
  echo "📊 Monitorea el progreso en:"
  echo "   - Backend (Render): https://dashboard.render.com"
  echo "   - Frontend (Vercel): https://vercel.com/dashboard"
  echo ""
  echo "⏳ El deploy puede tardar 2-5 minutos"
  echo ""
else
  echo ""
  echo "❌ Error al hacer push. Verifica tu conexión y permisos."
  exit 1
fi
