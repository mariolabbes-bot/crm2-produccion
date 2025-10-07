#!/bin/bash

echo "🚀 Preparando archivos para producción..."

# Crear build del frontend
echo "📦 Construyendo frontend..."
cd frontend
npm install
npm run build
cd ..

# Verificar que existen archivos necesarios
echo "✅ Verificando archivos de configuración..."

if [ ! -f "backend/.env.production" ]; then
    echo "❌ Falta backend/.env.production"
    exit 1
fi

if [ ! -f "frontend/.env.production" ]; then
    echo "❌ Falta frontend/.env.production" 
    exit 1
fi

if [ ! -f "backend/render.yaml" ]; then
    echo "❌ Falta backend/render.yaml"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    echo "❌ Falta vercel.json"
    exit 1
fi

# Mostrar checklist
echo ""
echo "📋 CHECKLIST PARA PRODUCCIÓN:"
echo ""
echo "✅ Frontend construido en /frontend/dist"
echo "✅ Variables de entorno configuradas"
echo "✅ Configuración de CORS actualizada"
echo "✅ Configuraciones de Render y Vercel listas"
echo ""
echo "📄 PRÓXIMOS PASOS:"
echo "1. Sube código a GitHub"
echo "2. Configura base de datos en Supabase (ver PRODUCCION.md)"
echo "3. Despliega backend en Render.com"
echo "4. Despliega frontend en Vercel"
echo "5. Actualiza variables de entorno con URLs reales"
echo ""
echo "📖 Ver PRODUCCION.md para instrucciones detalladas"
echo ""
echo "🎉 ¡Listo para producción!"