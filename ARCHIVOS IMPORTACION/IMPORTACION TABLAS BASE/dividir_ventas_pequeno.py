#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Divide el script SQL de VENTAS en múltiples archivos más pequeños
Cada archivo tendrá máximo 1000 registros (más pequeño para evitar errores)
"""

import os

input_file = 'carga_ventas.sql'
output_prefix = 'carga_ventas_lote'
max_inserts_per_file = 1000

print(f"📂 Dividiendo {input_file} en archivos de {max_inserts_per_file} registros...")

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
    
    output_file = f"{output_prefix}_{i+1:03d}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Escribir header
        outfile.write(f"-- VENTAS LOTE {i+1} de {num_files}\n")
        outfile.write(f"-- Registros {start_idx + 1} a {end_idx}\n\n")
        
        # Solo el primer archivo hace TRUNCATE
        if i == 0:
            outfile.write("-- LIMPIEZA: Eliminar datos existentes en la tabla\n")
            outfile.write("TRUNCATE TABLE venta CASCADE;\n\n")
        
        outfile.write("-- Carga de datos\n\n")
        
        # Escribir INSERTs de este lote
        for line in insert_lines[start_idx:end_idx]:
            outfile.write(line)
        
        # Solo el último archivo tiene UPDATE y verificaciones
        if i == num_files - 1:
            outfile.write("\n-- PASO FINAL: Actualizar vendedores desde tabla CLIENTES\n")
            for line in footer_lines:
                outfile.write(line)
        else:
            outfile.write(f"\n-- Parcial: {end_idx} de {total_inserts} registros cargados\n")
            outfile.write(f"SELECT COUNT(*) as cargados FROM venta;\n")
    
    if (i + 1) % 10 == 0:
        print(f"✅ Creados: lote_{i-8:03d} a lote_{i+1:03d}")

print(f"\n✅ Total: {num_files} archivos creados")
print(f"⏱️  Tiempo estimado: ~30 segundos por archivo")
print(f"⏱️  Tiempo total: ~{num_files * 0.5:.0f} minutos")
