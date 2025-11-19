#!/usr/bin/env python3
"""
Divide archivo de abonos en bloques - CORREGIDO
Lee INSERTs completos, no solo la primera línea
"""

import os

input_file = "carga_abonos_completa.sql"
output_prefix = "carga_abonos_bloque"
inserts_per_block = 10000

print(f"📦 Dividiendo {input_file} en bloques de {inserts_per_block:,} registros...")

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extraer header con TRUNCATE
header = []
for line in content.split('\n')[:10]:
    if 'TRUNCATE' in line or 'LIMPIEZA' in line or line.strip().startswith('--'):
        header.append(line)
    if 'TRUNCATE TABLE abono' in line:
        break

# Dividir por cada INSERT completo
insert_statements = []
current_insert = []
in_insert = False

for line in content.split('\n'):
    if line.strip().startswith('INSERT INTO abono'):
        in_insert = True
        current_insert = [line + '\n']
    elif in_insert:
        current_insert.append(line + '\n')
        if line.strip().endswith(');'):
            # INSERT completo
            insert_statements.append(''.join(current_insert))
            current_insert = []
            in_insert = False

# Extraer footer con UPDATE
footer = []
capture_footer = False
for line in content.split('\n'):
    if '-- PASO FINAL' in line or 'UPDATE abono' in line:
        capture_footer = True
    if capture_footer:
        footer.append(line + '\n')

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
        
        # Solo el último bloque tiene UPDATE
        if i == num_blocks - 1:
            outfile.write('\n')
            for line in footer:
                outfile.write(line)
        else:
            outfile.write(f"\n-- Parcial: {end_idx:,} registros\n")
            outfile.write("SELECT COUNT(*) as registros_cargados FROM abono;\n")
    
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"✅ {output_file} ({size_mb:.1f} MB)")

print(f"\n✅ {num_blocks} bloques creados correctamente")
print(f"📂 Listos para cargar con: ./cargar_todos_bloques_abonos.sh")
