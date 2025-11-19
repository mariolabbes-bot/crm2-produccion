#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera script SQL de INSERT para la tabla PRODUCTOS
Maneja correctamente la codificación y valores NULL
Detecta y resuelve SKUs duplicados
"""

import csv
import os

# Rutas de archivos
csv_file = 'PRODUCTOS.csv'
output_file = 'carga_productos.sql'

# Contador de registros
count = 0
skus_vistos = {}
duplicados = []

# Abrir archivo de salida
with open(output_file, 'w', encoding='utf-8') as sql_file:
    sql_file.write("-- Script de carga de PRODUCTOS\n")
    sql_file.write("-- Ejecuta este script en el editor SQL de DBeaver\n\n")
    
    # Leer CSV
    with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        
        for row in reader:
            count += 1
            
            # Obtener valores del CSV (manejar diferentes nombres de columna)
            sku = row.get('SKU', '').strip()
            descripcion = row.get('Artículo', row.get('Art√≠culo', '')).strip()
            marca = row.get('Marca', '').strip()
            familia = row.get('Familia', '').strip()
            subfamilia = row.get('SubFamilia', '').strip()
            litros = row.get('LITROS', '').strip()
            
            # Manejar SKUs duplicados
            original_sku = sku
            if sku in skus_vistos:
                # Incrementar contador de duplicados para este SKU
                skus_vistos[sku] += 1
                sku = f"{sku}_DUP{skus_vistos[sku]}"
                duplicados.append(f"Línea {count + 1}: SKU '{original_sku}' duplicado → renombrado a '{sku}' | Producto: {descripcion}")
            else:
                skus_vistos[sku] = 0
            
            # Convertir vacíos a NULL
            sku_val = f"'{sku}'" if sku else 'NULL'
            descripcion_val = f"'{descripcion.replace(chr(39), chr(39)+chr(39))}'" if descripcion else 'NULL'
            marca_val = f"'{marca}'" if marca else 'NULL'
            familia_val = f"'{familia}'" if familia else 'NULL'
            subfamilia_val = f"'{subfamilia}'" if subfamilia else 'NULL'
            
            # Convertir litros a decimal o NULL
            if litros and litros.replace('.', '', 1).replace(',', '', 1).isdigit():
                litros_val = litros.replace(',', '.')
            else:
                litros_val = 'NULL'
            
            # Generar INSERT
            insert_sql = f"INSERT INTO producto (sku, descripcion, marca, familia, subfamilia, litros_por_unidad) VALUES ({sku_val}, {descripcion_val}, {marca_val}, {familia_val}, {subfamilia_val}, {litros_val});\n"
            sql_file.write(insert_sql)
            
            # Feedback cada 500 registros
            if count % 500 == 0:
                print(f"Procesados {count} registros...")
    
    # Agregar verificación al final
    sql_file.write("\n-- Verifica la carga\n")
    sql_file.write("SELECT COUNT(*) as total_productos FROM producto;\n")

print(f"\n✅ Script generado exitosamente: {output_file}")
print(f"📊 Total de registros: {count}")
if duplicados:
    print(f"\n⚠️  SKUs duplicados encontrados: {len(duplicados)}")
    print("Se agregó sufijo '_DUP#' para hacerlos únicos:\n")
    for dup in duplicados:
        print(f"   {dup}")
    print("\n⚠️  IMPORTANTE: Revisa estos duplicados y corrige el CSV fuente si es necesario.")
print(f"\nAhora ejecuta este script en DBeaver para cargar los productos.")
