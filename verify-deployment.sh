#!/bin/bash

# Script para verificar el deployment del módulo de abonos en Vercel

echo "🔍 Verificando deployment en Vercel..."
echo "========================================"
echo ""

URL="https://crm2-produccion.vercel.app"

# 1. Verificar que el sitio responde
echo "1️⃣  Verificando conectividad..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" -eq 200 ]; then
  echo "   ✅ Sitio principal accesible (HTTP $STATUS)"
else
  echo "   ❌ Error en sitio principal (HTTP $STATUS)"
  exit 1
fi
echo ""

# 2. Verificar página de abonos
echo "2️⃣  Verificando /abonos..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/abonos")
if [ "$STATUS" -eq 200 ]; then
  echo "   ✅ Ruta /abonos accesible (HTTP $STATUS)"
else
  echo "   ❌ Error en /abonos (HTTP $STATUS)"
fi
echo ""

# 3. Verificar página de comparativo
echo "3️⃣  Verificando /comparativo..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/comparativo")
if [ "$STATUS" -eq 200 ]; then
  echo "   ✅ Ruta /comparativo accesible (HTTP $STATUS)"
else
  echo "   ❌ Error en /comparativo (HTTP $STATUS)"
fi
echo ""

# 4. Verificar que los componentes están en el bundle
echo "4️⃣  Verificando código de componentes en bundles..."
BUNDLE_COUNT=$(curl -s "$URL" | grep -o "bundle\.[a-f0-9]*.js" | wc -l | xargs)
echo "   📦 Bundles encontrados: $BUNDLE_COUNT"

if [ "$BUNDLE_COUNT" -gt 0 ]; then
  # Descargar y buscar referencias a abonos
  BUNDLE_URL=$(curl -s "$URL" | grep -o "bundle\.[a-f0-9]*.js" | head -1)
  ABONOS_REFS=$(curl -s "$URL/$BUNDLE_URL" | grep -o "abonos" | wc -l | xargs)
  
  if [ "$ABONOS_REFS" -gt 0 ]; then
    echo "   ✅ Código de abonos encontrado ($ABONOS_REFS referencias)"
  else
    echo "   ⚠️  No se encontraron referencias a abonos en el bundle"
  fi
fi
echo ""

# 5. Verificar último commit
echo "5️⃣  Verificando último commit local..."
LAST_COMMIT=$(git log -1 --oneline | head -1)
echo "   📝 $LAST_COMMIT"
echo ""

# 6. Verificar status de git
echo "6️⃣  Verificando estado de Git..."
if [ -z "$(git status --porcelain)" ]; then
  echo "   ✅ No hay cambios pendientes"
else
  echo "   ⚠️  Hay cambios sin commitear"
  git status --short
fi
echo ""

echo "========================================"
echo "✨ Verificación completada"
echo ""
echo "🌐 Visita las siguientes URLs para probar:"
echo "   - Dashboard: $URL"
echo "   - Abonos: $URL/abonos"
echo "   - Comparativo: $URL/comparativo"
echo ""
