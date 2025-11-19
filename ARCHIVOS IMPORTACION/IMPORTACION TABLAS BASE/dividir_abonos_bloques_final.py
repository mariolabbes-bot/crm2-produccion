#!/usr/bin/env python3
"""
Divide archivo de abonos CORRECTO en bloques
"""

import os

input_file = "carga_abonos_correcta.sql"
output_prefix = "carga_abonos_bloque"
inserts_per_block = 10000

print(f"📦 Dividiendo {input_file} en bloques...")

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Dividir por INSERT completo
insert_statements = []
current_insert = []
in_insert = False

for line in content.split('\n'):
    if line.strip().startswith('INSERT INTO abono'):
        in_insert = True
        current_insert = [line + '\n']
    elif in_insert:
        current_insert.append(line + '\n')
        if line.strip().endswith(';') or 'DO NOTHING;' in line:
            insert_statements.append(''.join(current_insert))
            current_insert = []
            in_insert = False

total_inserts = len(insert_statements)
num_blocks = (total_inserts + inserts_per_block - 1) // inserts_per_block

print(f"📊 Total INSERTs: {total_inserts:,}")
print(f"📦 Bloques: {num_blocks}\n")

for i in range(num_blocks):
    start_idx = i * inserts_per_block
    end_idx = min((i + 1) * inserts_per_block, total_inserts)
    
    output_file = f"{output_prefix}_{i+1:02d}_de_{num_blocks:02d}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write(f"-- BLOQUE {i+1} de {num_blocks}\n")
        outfile.write(f"-- Registros {start_idx + 1:,} a {end_idx:,}\n\n")
        
        if i == 0:
            outfile.write("TRUNCATE TABLE abono CASCADE;\n\n")
        
        for insert in insert_statements[start_idx:end_idx]:
            outfile.write(insert)
        
        if i == num_blocks - 1:
            outfile.write("\n-- Actualizar vendedores\n")
            outfile.write("UPDATE abono a SET vendedor_cliente = c.nombre_vendedor ")
            outfile.write("FROM cliente c WHERE a.identificador = c.rut;\n\n")
            outfile.write("SELECT COUNT(*) as total FROM abono;\n")
        else:
            outfile.write(f"\n-- Parcial: {end_idx:,}\n")
            outfile.write("SELECT COUNT(*) FROM abono;\n")
    
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"✅ {output_file} ({size_mb:.1f} MB)")

print(f"\n✅ Listos para cargar")
