#!/usr/bin/env python3
"""
Divide el archivo completo de abonos en bloques de 10,000 registros
"""

import os

input_file = "carga_abonos_completa.sql"
output_prefix = "carga_abonos_bloque"
inserts_per_block = 10000

print(f"📦 Dividiendo {input_file} en bloques de {inserts_per_block:,} registros...")

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Separar header con TRUNCATE
header_lines = []
insert_statements = []
footer_lines = []

# Extraer INSERT completos
current_insert = []
in_insert = False
in_footer = False

for line in content.split('\n'):
    if 'UPDATE abono' in line or 'PASO FINAL' in line:
        in_footer = True
        footer_lines.append(line + '\n')
    elif in_footer:
        footer_lines.append(line + '\n')
    elif line.strip().startswith('INSERT INTO'):
        in_insert = True
        current_insert = [line + '\n']
    elif in_insert:
        current_insert.append(line + '\n')
        if line.strip().endswith(');'):
            # INSERT completo
            insert_statements.append(''.join(current_insert))
            current_insert = []
            in_insert = False
    elif line.strip().startswith('TRUNCATE') or line.strip().startswith('--') and not in_insert:
        header_lines.append(line + '\n')

total_inserts = len(insert_statements)
num_blocks = (total_inserts + inserts_per_block - 1) // inserts_per_block

print(f"📊 Total INSERTs: {total_inserts:,}")
print(f"📦 Bloques a crear: {num_blocks}")
print()

for i in range(num_blocks):
    start_idx = i * inserts_per_block
    end_idx = min((i + 1) * inserts_per_block, total_inserts)
    
    output_file = f"{output_prefix}_{i+1:02d}_de_{num_blocks:02d}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write(f"-- BLOQUE {i+1} de {num_blocks}\n")
        outfile.write(f"-- Registros {start_idx + 1:,} a {end_idx:,}\n\n")
        
        # Solo el primer bloque tiene TRUNCATE
        if i == 0:
            outfile.write("-- LIMPIEZA: Eliminar datos existentes\n")
            outfile.write("TRUNCATE TABLE abono CASCADE;\n\n")
        
        # Escribir INSERTs de este bloque
        for insert in insert_statements[start_idx:end_idx]:
            outfile.write(insert)
        
        # Solo el último bloque tiene UPDATE y verificaciones
        if i == num_blocks - 1:
            for line in footer_lines:
                outfile.write(line)
        else:
            outfile.write(f"\n-- Parcial: {end_idx:,} registros cargados\n")
            outfile.write("SELECT COUNT(*) as registros_cargados FROM abono;\n")
    
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"✅ {output_file} ({size_mb:.1f} MB)")

print(f"\n✅ {num_blocks} bloques creados")
print(f"\n🎯 Ejecutar EN ORDEN en DBeaver:")
for i in range(num_blocks):
    print(f"   {i+1}. {output_prefix}_{i+1:02d}_de_{num_blocks:02d}.sql")
print(f"\n⏱️  Tiempo estimado: ~{num_blocks * 2} minutos")
