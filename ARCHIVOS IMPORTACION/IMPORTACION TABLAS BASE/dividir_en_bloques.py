#!/usr/bin/env python3
"""
Divide el archivo grande en bloques de 10,000 registros
Esto permite cargarlos en DBeaver sin problemas de memoria
"""

import os

input_file = "carga_ventas_completa_desde_010.sql"
output_prefix = "carga_ventas_bloque"
inserts_per_block = 10000

print(f"📦 Dividiendo {input_file} en bloques de {inserts_per_block:,} registros...")

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Dividir por cada INSERT completo (cada uno termina con ");\n\n")
insert_statements = []
current_insert = []
in_insert = False

for line in content.split('\n'):
    if line.strip().startswith('INSERT INTO'):
        in_insert = True
        current_insert = [line + '\n']
    elif in_insert:
        current_insert.append(line + '\n')
        if line.strip().endswith(');'):
            # INSERT completo
            insert_statements.append(''.join(current_insert))
            current_insert = []
            in_insert = False

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
        outfile.write(f"-- Registros {start_idx + 1:,} a {end_idx:,}\n")
        outfile.write(f"-- NO hacer TRUNCATE (ya hay datos cargados)\n\n")
        
        # Escribir INSERTs de este bloque
        for insert in insert_statements[start_idx:end_idx]:
            outfile.write(insert)
        
        # Solo el último bloque tiene UPDATE y verificaciones
        if i == num_blocks - 1:
            outfile.write("\n-- PASO FINAL: Actualizar vendedores desde tabla CLIENTES\n")
            outfile.write("UPDATE venta v\n")
            outfile.write("SET vendedor_cliente = c.nombre_vendedor,\n")
            outfile.write("    vendedor_documento = c.nombre_vendedor\n")
            outfile.write("FROM cliente c\n")
            outfile.write("WHERE v.identificador = c.rut;\n\n")
            outfile.write("-- Verificación final\n")
            outfile.write("SELECT COUNT(*) as total_ventas FROM venta;\n")
            outfile.write("SELECT COUNT(*) as ventas_sin_vendedor FROM venta WHERE vendedor_cliente IS NULL;\n")
        else:
            outfile.write(f"\n-- Parcial: {end_idx:,} de {total_inserts + 9000:,} registros\n")
            outfile.write("SELECT COUNT(*) as registros_cargados FROM venta;\n")
    
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"✅ {output_file} ({size_mb:.1f} MB)")

print(f"\n✅ {num_blocks} bloques creados")
print(f"\n🎯 Ejecutar EN ORDEN en DBeaver:")
for i in range(num_blocks):
    print(f"   {i+1}. {output_prefix}_{i+1:02d}_de_{num_blocks:02d}.sql")
print(f"\n⏱️  Tiempo estimado: ~{num_blocks * 2} minutos ({num_blocks} bloques × 2 min)")
