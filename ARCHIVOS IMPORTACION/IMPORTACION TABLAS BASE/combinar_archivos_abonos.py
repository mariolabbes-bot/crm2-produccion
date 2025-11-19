#!/usr/bin/env python3
"""
Combina TODOS los archivos de abonos en UN SOLO archivo SQL
"""

import os

# Configuración
start_file = 1
end_file = 42
output_file = "carga_abonos_completa.sql"

print(f"📦 Combinando archivos de abonos {start_file:03d} a {end_file:03d}...")

with open(output_file, 'w', encoding='utf-8') as outfile:
    outfile.write("-- CARGA COMPLETA DE ABONOS\n")
    outfile.write(f"-- Archivos {start_file:03d} a {end_file:03d}\n")
    outfile.write(f"-- Total: {end_file - start_file + 1} archivos\n\n")
    
    # El primer archivo tiene el TRUNCATE
    outfile.write("-- LIMPIEZA: Eliminar datos existentes\n")
    outfile.write("TRUNCATE TABLE abono CASCADE;\n\n")
    
    for i in range(start_file, end_file + 1):
        file_num = f"{i:03d}"
        input_file = f"abonos_lotes/carga_abonos_lote_{file_num}.sql"
        
        if not os.path.exists(input_file):
            print(f"❌ No encontrado: {input_file}")
            continue
        
        outfile.write(f"\n-- ===============================================\n")
        outfile.write(f"-- LOTE {file_num}\n")
        outfile.write(f"-- ===============================================\n\n")
        
        with open(input_file, 'r', encoding='utf-8') as infile:
            for line in infile:
                # Saltar headers y comandos duplicados
                if any(skip in line for skip in ['TRUNCATE TABLE', '-- ABONOS LOTE', '-- Máximo', '-- Limpieza:', '-- Eliminar datos', '-- Inicio de carga', '-- Parcial:']):
                    continue
                if line.strip().startswith('SELECT COUNT') and 'total_abonos' in line:
                    continue
                # Saltar UPDATE y SELECT del medio (solo queremos el del final)
                if i < end_file and ('-- PASO FINAL' in line or 'UPDATE abono' in line or 'SET vendedor_cliente' in line or 'FROM cliente' in line or 'WHERE a.identificador' in line):
                    continue
                if i < end_file and 'abonos_sin_vendedor' in line:
                    continue
                    
                outfile.write(line)
        
        if i % 10 == 0:
            print(f"✅ Procesados hasta lote {file_num}")

print(f"\n✅ Archivo creado: {output_file}")
print(f"📊 Tamaño aprox: {os.path.getsize(output_file) / 1024 / 1024:.1f} MB")
print(f"\n🎯 Ejecutar en DBeaver:")
print(f"   1. Abrir {output_file}")
print(f"   2. Execute SQL Script")
print(f"   3. Esperar ~10 minutos")
print(f"   4. Verificar: SELECT COUNT(*) FROM abono; -- Debe dar 41,540")
