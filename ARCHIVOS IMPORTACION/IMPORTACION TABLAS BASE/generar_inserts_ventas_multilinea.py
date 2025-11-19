#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera script SQL de INSERT para VENTAS con formato multi-línea
Cada INSERT se divide en múltiples líneas para evitar problemas con DBeaver
"""

import csv
import os
from datetime import datetime

# Configuración
csv_file = 'VENTAS.csv'
output_dir = 'ventas_lotes'
records_per_file = 1000

# Crear directorio de salida
os.makedirs(output_dir, exist_ok=True)

# Contadores
count = 0
errores = []
registros_unicos = set()
skipped_duplicates = 0
file_number = 1
records_in_current_file = 0
sql_file = None

def escape_str(s):
    """Escape de comillas simples para SQL"""
    return s.replace("'", "''") if s else ''

def parse_numeric(val):
    """Convertir strings numéricos a formato SQL"""
    if not val:
        return 'NULL'
    val = val.replace('.', '').replace(',', '.')
    try:
        float(val)
        return val
    except:
        return 'NULL'

def format_insert_multiline(values_dict):
    """Genera INSERT en formato multi-línea para mejor legibilidad"""
    # Construir VALUES con saltos de línea
    insert = "INSERT INTO venta (\n"
    insert += "  sucursal, tipo_documento, folio, fecha_emision,\n"
    insert += "  identificador, cliente, vendedor_cliente, vendedor_documento,\n"
    insert += "  indice, sku, descripcion,\n"
    insert += "  cantidad, precio, valor_total\n"
    insert += ") VALUES (\n"
    insert += f"  {values_dict['sucursal']}, {values_dict['tipo_documento']}, {values_dict['folio']}, {values_dict['fecha']},\n"
    insert += f"  {values_dict['identificador']}, {values_dict['cliente']}, {values_dict['vendedor_cliente']}, {values_dict['vendedor_documento']},\n"
    insert += f"  {values_dict['indice']}, {values_dict['sku']}, {values_dict['descripcion']},\n"
    insert += f"  {values_dict['cantidad']}, {values_dict['precio']}, {values_dict['valor_total']}\n"
    insert += ");\n\n"
    return insert

def open_new_file():
    """Abrir nuevo archivo de lote"""
    global sql_file, file_number, records_in_current_file
    
    if sql_file:
        # Cerrar archivo anterior
        if file_number > 1:
            sql_file.write(f"-- Parcial: {(file_number - 1) * records_per_file + records_in_current_file} registros cargados\n")
        sql_file.write("SELECT COUNT(*) as total_ventas FROM venta;\n")
        sql_file.close()
    
    filename = f"{output_dir}/carga_ventas_lote_{file_number:03d}.sql"
    sql_file = open(filename, 'w', encoding='utf-8')
    
    # Header
    sql_file.write(f"-- VENTAS LOTE {file_number}\n")
    sql_file.write(f"-- Máximo {records_per_file} registros\n\n")
    
    # Solo el primer archivo hace TRUNCATE
    if file_number == 1:
        sql_file.write("-- LIMPIEZA: Eliminar datos existentes\n")
        sql_file.write("TRUNCATE TABLE venta CASCADE;\n\n")
    
    sql_file.write("-- Inicio de carga\n\n")
    
    records_in_current_file = 0
    print(f"📝 Creando {filename}...")

# Procesar CSV
print(f"📂 Leyendo {csv_file}...")
open_new_file()

with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
    reader = csv.DictReader(csvfile, delimiter=';')
    
    for row in reader:
        count += 1
        
        # Obtener valores
        sucursal = row.get('Sucursal', '').strip()
        tipo_documento = row.get('Tipo de documento', '').strip()
        folio = row.get('Folio', '').strip()
        fecha_emision_str = row.get('Fecha emisi√≥n', row.get('Fecha emision', '')).strip()
        identificador = row.get('Identificador', '').strip()
        cliente = row.get('Cliente', '').strip()
        indice = row.get('√çndice', row.get('Indice', '')).strip()
        sku = row.get('SKU', '').strip()
        descripcion = row.get('Descripci√≥n', row.get('Descripcion', '')).strip()
        cantidad_str = row.get('Cantidad', '').strip()
        precio_str = row.get('Precio', '').strip()
        valor_total_str = row.get('VALOR TOTAL', '').strip()
        
        # Validar obligatorios
        if not folio or not tipo_documento:
            continue
        
        # Detectar duplicados
        unique_key = (tipo_documento, folio, indice if indice else '')
        if unique_key in registros_unicos:
            skipped_duplicates += 1
            continue
        registros_unicos.add(unique_key)
        
        # Convertir fecha
        fecha_val = 'NULL'
        if fecha_emision_str:
            try:
                fecha_obj = datetime.strptime(fecha_emision_str, '%d-%m-%y')
                fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
            except:
                try:
                    fecha_obj = datetime.strptime(fecha_emision_str, '%d-%m-%Y')
                    fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                except:
                    pass
        
        # Preparar valores
        values = {
            'sucursal': f"'{escape_str(sucursal)}'" if sucursal else 'NULL',
            'tipo_documento': f"'{escape_str(tipo_documento)}'",
            'folio': f"'{escape_str(folio)}'",
            'fecha': fecha_val,
            'identificador': f"'{identificador}'" if identificador else 'NULL',
            'cliente': f"'{escape_str(cliente)}'" if cliente else 'NULL',
            'vendedor_cliente': 'NULL',
            'vendedor_documento': 'NULL',
            'indice': f"'{escape_str(indice)}'" if indice else 'NULL',
            'sku': f"'{escape_str(sku)}'" if sku else 'NULL',
            'descripcion': f"'{escape_str(descripcion)}'" if descripcion else 'NULL',
            'cantidad': parse_numeric(cantidad_str),
            'precio': parse_numeric(precio_str),
            'valor_total': parse_numeric(valor_total_str)
        }
        
        # Escribir INSERT multi-línea
        sql_file.write(format_insert_multiline(values))
        records_in_current_file += 1
        
        # Cambiar de archivo si alcanzamos el límite
        if records_in_current_file >= records_per_file:
            file_number += 1
            open_new_file()
        
        if count % 5000 == 0:
            print(f"  Procesados {count} registros...")

# Cerrar último archivo con UPDATE de vendedores
sql_file.write("\n-- PASO FINAL: Actualizar vendedores desde tabla CLIENTES\n")
sql_file.write("UPDATE venta v\n")
sql_file.write("SET vendedor_cliente = c.nombre_vendedor,\n")
sql_file.write("    vendedor_documento = c.nombre_vendedor\n")
sql_file.write("FROM cliente c\n")
sql_file.write("WHERE v.identificador = c.rut;\n\n")
sql_file.write("-- Verificar resultados\n")
sql_file.write("SELECT COUNT(*) as total_ventas FROM venta;\n")
sql_file.write("SELECT COUNT(*) as ventas_sin_vendedor FROM venta WHERE vendedor_cliente IS NULL;\n")
sql_file.close()

print(f"\n✅ Generados {file_number} archivos")
print(f"📊 Total registros procesados: {count}")
print(f"⚠️  Duplicados omitidos: {skipped_duplicates}")
print(f"📁 Archivos en: {output_dir}/")
