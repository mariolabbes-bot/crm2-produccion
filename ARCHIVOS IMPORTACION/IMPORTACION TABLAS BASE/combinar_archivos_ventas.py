#!/usr/bin/env python3
"""
Combina archivos de ventas desde un número inicial hasta el final
en UN SOLO archivo SQL grande que puedes ejecutar en DBeaver
"""

import os

# Configuración
start_file = 10  # Empezar desde el archivo 010 (ya tienes 001-009)
end_file = 78
output_file = "carga_ventas_completa_desde_010.sql"

print(f"📦 Combinando archivos {start_file:03d} a {end_file:03d}...")

with open(output_file, 'w', encoding='utf-8') as outfile:
    outfile.write("-- CARGA COMPLETA DE VENTAS\n")
    outfile.write(f"-- Archivos {start_file:03d} a {end_file:03d}\n")
    outfile.write(f"-- Total: {end_file - start_file + 1} archivos\n\n")
    outfile.write("-- ⚠️  NO ejecutar TRUNCATE (ya tienes datos cargados)\n\n")
    
    for i in range(start_file, end_file + 1):
        file_num = f"{i:03d}"
        input_file = f"ventas_lotes/carga_ventas_lote_{file_num}.sql"
        
        if not os.path.exists(input_file):
            print(f"❌ No encontrado: {input_file}")
            continue
        
        outfile.write(f"\n-- ===============================================\n")
        outfile.write(f"-- LOTE {file_num}\n")
        outfile.write(f"-- ===============================================\n\n")
        
        with open(input_file, 'r', encoding='utf-8') as infile:
            for line in infile:
                # Saltar líneas de TRUNCATE, comentarios de header, y SELECT intermedios
                if any(skip in line for skip in ['TRUNCATE TABLE', '-- VENTAS LOTE', '-- Máximo', '-- Limpieza:', '-- Eliminar datos', '-- Inicio de carga', '-- Parcial:']):
                    continue
                if line.strip().startswith('SELECT COUNT') and 'total_ventas' in line:
                    continue
                    
                outfile.write(line)
        
        if i % 10 == 0:
            print(f"✅ Procesados hasta lote {file_num}")

print(f"\n✅ Archivo creado: {output_file}")
print(f"📊 Tamaño aprox: {os.path.getsize(output_file) / 1024 / 1024:.1f} MB")
print(f"\n🎯 Ahora puedes:")
print(f"   1. Abrir {output_file} en DBeaver")
print(f"   2. Ejecutar todo el archivo (Ctrl+Enter o botón Execute)")
print(f"   3. Esperar ~15-20 minutos")
print(f"   4. Verificar: SELECT COUNT(*) FROM venta; -- Debe dar 77,029")
