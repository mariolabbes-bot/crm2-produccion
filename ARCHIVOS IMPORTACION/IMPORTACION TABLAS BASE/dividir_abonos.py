#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Divide el script SQL de ABONOS en múltiples archivos más pequeños
Cada archivo tendrá máximo 10,000 registros
"""

import os

input_file = 'carga_abonos.sql'
output_prefix = 'carga_abonos_parte'
max_inserts_per_file = 10000

print(f"📂 Dividiendo {input_file} en archivos más pequeños...")

with open(input_file, 'r', encoding='utf-8') as infile:
    lines = infile.readlines()

# Separar header y footer
header_lines = []
insert_lines = []
footer_lines = []

in_inserts = False
in_footer = False

for line in lines:
    if line.strip().startswith('INSERT INTO'):
        in_inserts = True
        insert_lines.append(line)
    elif in_inserts and (line.strip().startswith('--') or line.strip().startswith('UPDATE') or line.strip().startswith('SELECT')):
        in_footer = True
        footer_lines.append(line)
    elif in_footer:
        footer_lines.append(line)
    else:
        header_lines.append(line)

total_inserts = len(insert_lines)
num_files = (total_inserts + max_inserts_per_file - 1) // max_inserts_per_file

print(f"📊 Total de INSERTs: {total_inserts}")
print(f"📦 Dividiendo en {num_files} archivos de máximo {max_inserts_per_file} registros cada uno\n")

# Crear archivos divididos
for i in range(num_files):
    start_idx = i * max_inserts_per_file
    end_idx = min((i + 1) * max_inserts_per_file, total_inserts)
    
    output_file = f"{output_prefix}_{i+1:02d}_de_{num_files:02d}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Escribir header
        outfile.write(f"-- Script de carga de ABONOS - PARTE {i+1} de {num_files}\n")
        outfile.write(f"-- Registros {start_idx + 1} a {end_idx}\n\n")
        
        # Solo el primer archivo hace TRUNCATE
        if i == 0:
            outfile.write("-- LIMPIEZA: Eliminar datos existentes en la tabla\n")
            outfile.write("TRUNCATE TABLE abono CASCADE;\n\n")
        
        outfile.write("-- Inicio de carga de datos\n\n")
        
        # Escribir INSERTs de este lote
        for line in insert_lines[start_idx:end_idx]:
            outfile.write(line)
        
        # Solo el último archivo tiene UPDATE y verificaciones
        if i == num_files - 1:
            outfile.write("\n-- PASO CRÍTICO: Actualizar vendedores desde tabla CLIENTES\n")
            outfile.write("-- (Solo se ejecuta en el último lote)\n")
            for line in footer_lines:
                outfile.write(line)
        else:
            outfile.write("\n-- Verificación parcial\n")
            outfile.write(f"SELECT COUNT(*) as registros_cargados FROM abono;\n")
    
    print(f"✅ Creado: {output_file} ({end_idx - start_idx} registros)")

print(f"\n🎉 Proceso completado!")
print(f"\n📝 Instrucciones para ejecutar en DBeaver:")
print(f"   1. Ejecutar archivos EN ORDEN: parte_01, parte_02, ..., parte_{num_files:02d}")
print(f"   2. El UPDATE de vendedores solo se ejecuta en la parte_{num_files:02d}")
print(f"   3. Tiempo estimado por archivo: ~1-2 minutos")
