#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera script SQL de INSERT para la tabla CLIENTES
Maneja correctamente la codificación y valores NULL
Detecta y resuelve RUTs duplicados
"""

import csv
import os

# Rutas de archivos
csv_file = 'CLIENTES.csv'
output_file = 'carga_clientes.sql'

# Contador de registros
count = 0
errores = []
ruts_vistos = {}
duplicados = []

# Abrir archivo de salida
with open(output_file, 'w', encoding='utf-8') as sql_file:
    sql_file.write("-- Script de carga de CLIENTES\n")
    sql_file.write("-- Ejecuta este script en el editor SQL de DBeaver\n\n")
    
    # Leer CSV
    with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        
        for row in reader:
            count += 1
            
            # Obtener valores del CSV
            rut = row.get('rut', '').strip()
            nombre = row.get('Nombre', '').strip()
            email = row.get('Email', '').strip()
            telefono = row.get('TelefonoPrincipal', '').strip()
            sucursal = row.get('Sucursal', '').strip()
            categoria = row.get('Categoria', '').strip()
            subcategoria = row.get('Subcategoria', '').strip()
            comuna = row.get('Comuna', '').strip()
            ciudad = row.get('Ciudad', '').strip()
            direccion = row.get('Direccion', '').strip()
            numero = row.get('Numero', '').strip()
            nombre_vendedor = row.get('NombreVendedor', '').strip()
            
            # Validar que tenga RUT (campo obligatorio)
            if not rut:
                errores.append(f"Línea {count + 1}: Sin RUT")
                continue
            
            # Manejar RUTs duplicados
            original_rut = rut
            if rut in ruts_vistos:
                # Incrementar contador de duplicados para este RUT
                ruts_vistos[rut] += 1
                rut = f"{rut}_DUP{ruts_vistos[rut]}"
                duplicados.append(f"Línea {count + 1}: RUT '{original_rut}' duplicado → renombrado a '{rut}' | Cliente: {nombre}")
            else:
                ruts_vistos[rut] = 0
            
            # Escape de comillas simples
            def escape_str(s):
                return s.replace(chr(39), chr(39)+chr(39)) if s else ''
            
            # Convertir vacíos a NULL
            rut_val = f"'{rut}'"
            nombre_val = f"'{escape_str(nombre)}'" if nombre else 'NULL'
            email_val = f"'{escape_str(email)}'" if email else 'NULL'
            telefono_val = f"'{escape_str(telefono)}'" if telefono else 'NULL'
            sucursal_val = f"'{escape_str(sucursal)}'" if sucursal else 'NULL'
            categoria_val = f"'{escape_str(categoria)}'" if categoria else 'NULL'
            subcategoria_val = f"'{escape_str(subcategoria)}'" if subcategoria else 'NULL'
            comuna_val = f"'{escape_str(comuna)}'" if comuna else 'NULL'
            ciudad_val = f"'{escape_str(ciudad)}'" if ciudad else 'NULL'
            direccion_val = f"'{escape_str(direccion)}'" if direccion else 'NULL'
            numero_val = f"'{escape_str(numero)}'" if numero else 'NULL'
            nombre_vendedor_val = f"'{escape_str(nombre_vendedor)}'" if nombre_vendedor else 'NULL'
            
            # Generar INSERT
            insert_sql = f"""INSERT INTO cliente (rut, nombre, email, telefono_principal, sucursal, categoria, subcategoria, comuna, ciudad, direccion, numero, nombre_vendedor) VALUES ({rut_val}, {nombre_val}, {email_val}, {telefono_val}, {sucursal_val}, {categoria_val}, {subcategoria_val}, {comuna_val}, {ciudad_val}, {direccion_val}, {numero_val}, {nombre_vendedor_val});
"""
            sql_file.write(insert_sql)
            
            # Feedback cada 500 registros
            if count % 500 == 0:
                print(f"Procesados {count} registros...")
    
    # Agregar verificación al final
    sql_file.write("\n-- Verifica la carga\n")
    sql_file.write("SELECT COUNT(*) as total_clientes FROM cliente;\n")
    sql_file.write("SELECT nombre_vendedor, COUNT(*) as num_clientes FROM cliente WHERE nombre_vendedor IS NOT NULL GROUP BY nombre_vendedor ORDER BY num_clientes DESC;\n")

print(f"\n✅ Script generado exitosamente: {output_file}")
print(f"📊 Total de registros: {count}")
if errores:
    print(f"⚠️  Errores encontrados: {len(errores)}")
    for error in errores[:10]:
        print(f"   - {error}")
if duplicados:
    print(f"\n⚠️  RUTs duplicados encontrados: {len(duplicados)}")
    print("Se agregó sufijo '_DUP#' para hacerlos únicos:\n")
    for dup in duplicados:
        print(f"   {dup}")
    print("\n⚠️  IMPORTANTE: Revisa estos duplicados y asigna RUTs únicos en el CSV fuente.")
print(f"\nAhora ejecuta este script en DBeaver para cargar los clientes.")
