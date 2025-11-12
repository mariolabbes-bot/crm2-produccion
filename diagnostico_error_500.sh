#!/bin/bash

# Script de diagnóstico para error 500

BACKEND_URL="https://crm2-backend.onrender.com"

echo "🔍 DIAGNÓSTICO DE ERROR 500"
echo "================================"
echo ""

echo "1️⃣ Test de endpoints básicos:"
echo ""

echo "📍 Health check (/api/health):"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/health" | head -20
echo ""

echo "📍 Root (/):"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/" | head -20
echo ""

echo "📍 Clients (/api/clients):"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/clients" | head -20
echo ""

echo "📍 Users (/api/users):"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/users" | head -20
echo ""

echo "📍 Sales (/api/sales):"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/sales" | head -20
echo ""

echo "================================"
echo "2️⃣ Test de CORS desde frontend:"
echo ""
curl -s -I -X OPTIONS "$BACKEND_URL/api/clients" \
  -H "Origin: https://crm2-produccion.vercel.app" \
  -H "Access-Control-Request-Method: GET" | grep -i "access-control"
echo ""

echo "================================"
echo "3️⃣ Información del error:"
echo ""
echo "Si ves Status: 500 arriba, significa que:"
echo "  - El backend está funcionando"
echo "  - Pero hay un error interno (probablemente en la DB)"
echo ""
echo "Si ves Status: 401, significa que:"
echo "  - El backend funciona correctamente"
echo "  - Requiere autenticación (esto es normal)"
echo ""
echo "Si ves Status: 200, significa que:"
echo "  - Todo funciona correctamente"
echo ""
