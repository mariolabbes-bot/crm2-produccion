#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera script SQL de INSERT para la tabla VENTAS (carga masiva histórica)
Maneja correctamente la codificación, valores NULL, duplicados y foreign keys
"""

import csv
import os
from datetime import datetime

# Rutas de archivos
csv_file = 'VENTAS.csv'
output_file = 'carga_ventas.sql'

# Contadores y validación
count = 0
errores = []
registros_unicos = set()  # Para detectar duplicados (tipo_documento, folio, indice)
skipped_duplicates = 0
skipped_fk_errors = 0
duplicados_reporte = []  # Lista de duplicados para reporte CSV

# Abrir archivo de salida
with open(output_file, 'w', encoding='utf-8') as sql_file:
    sql_file.write("-- Script de carga masiva de VENTAS (histórico)\n")
    sql_file.write("-- Ejecuta este script en el editor SQL de DBeaver\n\n")
    
    sql_file.write("-- LIMPIEZA: Eliminar datos existentes en la tabla\n")
    sql_file.write("TRUNCATE TABLE venta CASCADE;\n\n")
    sql_file.write("-- Inicio de carga de datos\n\n")
    
    # Leer CSV
    with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        
        for row in reader:
            count += 1
            
            # Obtener valores del CSV
            sucursal = row.get('Sucursal', '').strip()
            tipo_documento = row.get('Tipo de documento', '').strip()
            folio = row.get('Folio', '').strip()
            fecha_emision_str = row.get('Fecha emisi√≥n', row.get('Fecha emision', '')).strip()
            identificador = row.get('Identificador', '').strip()
            cliente = row.get('Cliente', '').strip()
            vendedor_cliente = row.get('Vendedor cliente', '').strip()
            vendedor_documento = row.get('Vendedor documento', '').strip()
            indice = row.get('√çndice', row.get('Indice', '')).strip()
            
            # NO normalizamos vendedores porque usaremos la relación de la tabla CLIENTES
            # El vendedor_cliente se actualizará después desde tabla cliente
            sku = row.get('SKU', '').strip()
            descripcion = row.get('Descripci√≥n', row.get('Descripcion', '')).strip()
            cantidad_str = row.get('Cantidad', '').strip()
            precio_str = row.get('Precio', '').strip()
            valor_total_str = row.get('VALOR TOTAL', '').strip()
            
            # Validar campos obligatorios
            if not folio or not tipo_documento:
                errores.append(f"Línea {count + 1}: Falta folio o tipo_documento")
                continue
            
            # Detectar duplicados por UNIQUE(tipo_documento, folio, indice)
            unique_key = (tipo_documento, folio, indice if indice else '')
            if unique_key in registros_unicos:
                skipped_duplicates += 1
                # Registrar el duplicado para reporte
                duplicados_reporte.append({
                    'linea': count + 1,
                    'tipo_documento': tipo_documento,
                    'folio': folio,
                    'indice': indice,
                    'fecha': fecha_emision_str,
                    'cliente': cliente,
                    'sku': sku,
                    'descripcion': descripcion,
                    'cantidad': cantidad_str,
                    'valor_total': valor_total_str
                })
                continue
            registros_unicos.add(unique_key)
            
            # Escape de comillas simples
            def escape_str(s):
                return s.replace(chr(39), chr(39)+chr(39)) if s else ''
            
            # Convertir fecha (formato DD-MM-YY)
            fecha_val = 'NULL'
            if fecha_emision_str:
                try:
                    # Intentar parsear DD-MM-YY
                    fecha_obj = datetime.strptime(fecha_emision_str, '%d-%m-%y')
                    fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                except:
                    try:
                        # Intentar DD-MM-YYYY
                        fecha_obj = datetime.strptime(fecha_emision_str, '%d-%m-%Y')
                        fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                    except:
                        errores.append(f"Línea {count + 1}: Fecha inválida '{fecha_emision_str}'")
            
            # Convertir valores numéricos
            def parse_numeric(val):
                if not val:
                    return 'NULL'
                # Limpiar formato: eliminar puntos de miles y reemplazar coma decimal por punto
                val = val.replace('.', '').replace(',', '.')
                try:
                    float(val)
                    return val
                except:
                    return 'NULL'
            
            cantidad_val = parse_numeric(cantidad_str)
            precio_val = parse_numeric(precio_str)
            valor_total_val = parse_numeric(valor_total_str)
            
            # Convertir campos a SQL
            sucursal_val = f"'{escape_str(sucursal)}'" if sucursal else 'NULL'
            tipo_documento_val = f"'{escape_str(tipo_documento)}'"
            folio_val = f"'{escape_str(folio)}'"
            identificador_val = f"'{identificador}'" if identificador else 'NULL'
            cliente_val = f"'{escape_str(cliente)}'" if cliente else 'NULL'
            vendedor_cliente_val = 'NULL'  # Se actualizará desde tabla CLIENTES
            vendedor_documento_val = 'NULL'  # Se actualizará desde tabla CLIENTES
            indice_val = f"'{escape_str(indice)}'" if indice else 'NULL'
            sku_val = f"'{escape_str(sku)}'" if sku else 'NULL'
            descripcion_val = f"'{escape_str(descripcion)}'" if descripcion else 'NULL'
            
            # Generar INSERT
            insert_sql = f"""INSERT INTO venta (sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, indice, sku, descripcion, cantidad, precio, valor_total) VALUES ({sucursal_val}, {tipo_documento_val}, {folio_val}, {fecha_val}, {identificador_val}, {cliente_val}, {vendedor_cliente_val}, {vendedor_documento_val}, {indice_val}, {sku_val}, {descripcion_val}, {cantidad_val}, {precio_val}, {valor_total_val});
"""
            sql_file.write(insert_sql)
            
            # Feedback cada 5000 registros
            if count % 5000 == 0:
                print(f"Procesados {count} registros...")
    
    # Agregar verificación al final
    sql_file.write("\n-- Verifica la carga\n")
    sql_file.write("SELECT COUNT(*) as total_ventas FROM venta;\n")
    sql_file.write("SELECT fecha_emision, COUNT(*) as num_ventas FROM venta GROUP BY fecha_emision ORDER BY fecha_emision DESC LIMIT 10;\n")
    
    # IMPORTANTE: Actualizar vendedores desde la tabla CLIENTES
    sql_file.write("\n-- PASO CRÍTICO: Actualizar vendedores desde tabla CLIENTES\n")
    sql_file.write("-- Esto establece la relación cliente-vendedor de forma consistente\n")
    sql_file.write("UPDATE venta v\n")
    sql_file.write("SET vendedor_cliente = c.nombre_vendedor,\n")
    sql_file.write("    vendedor_documento = c.nombre_vendedor\n")
    sql_file.write("FROM cliente c\n")
    sql_file.write("WHERE v.identificador = c.rut\n")
    sql_file.write("AND c.nombre_vendedor IS NOT NULL;\n\n")
    
    sql_file.write("-- Verificar actualización de vendedores\n")
    sql_file.write("SELECT \n")
    sql_file.write("    COUNT(*) as total_ventas,\n")
    sql_file.write("    COUNT(vendedor_cliente) as con_vendedor,\n")
    sql_file.write("    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor\n")
    sql_file.write("FROM venta;\n\n")
    
    sql_file.write("-- Ventas por vendedor\n")
    sql_file.write("SELECT vendedor_cliente, COUNT(*) as num_ventas, SUM(valor_total) as total_vendido FROM venta WHERE vendedor_cliente IS NOT NULL GROUP BY vendedor_cliente ORDER BY total_vendido DESC;\n")

# Generar reporte CSV de duplicados si hay
if duplicados_reporte:
    duplicados_file = 'ventas_duplicados_reporte.csv'
    with open(duplicados_file, 'w', encoding='utf-8', newline='') as dup_file:
        if duplicados_reporte:
            fieldnames = duplicados_reporte[0].keys()
            writer = csv.DictWriter(dup_file, fieldnames=fieldnames, delimiter=';')
            writer.writeheader()
            writer.writerows(duplicados_reporte)
    print(f"📄 Reporte de duplicados generado: {duplicados_file}")

print(f"\n✅ Script generado exitosamente: {output_file}")
print(f"📊 Total de registros procesados: {count}")
print(f"✅ Registros únicos para insertar: {len(registros_unicos)}")
if skipped_duplicates > 0:
    print(f"⚠️  Duplicados omitidos: {skipped_duplicates}")
if errores:
    print(f"⚠️  Errores encontrados: {len(errores)}")
    for error in errores[:20]:
        print(f"   {error}")
print(f"\n⏱️  Tiempo estimado de ejecución en DB: ~5-10 minutos para {len(registros_unicos)} registros")
print(f"\nAhora ejecuta este script en DBeaver para cargar las ventas.")
