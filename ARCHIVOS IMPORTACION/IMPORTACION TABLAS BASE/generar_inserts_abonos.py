#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera script SQL de INSERT para la tabla ABONOS (carga masiva histórica)
Maneja correctamente la codificación, valores NULL, duplicados y foreign keys
UNIQUE constraint: (folio, identificador, fecha)
"""

import csv
import os
from datetime import datetime

# Rutas de archivos
csv_file = 'ABONOS.csv'
output_file = 'carga_abonos.sql'

# Contadores y validación
count = 0
errores = []
registros_unicos = set()  # Para detectar duplicados por (folio, identificador, fecha)
skipped_duplicates = 0
duplicados_reporte = []  # Lista de duplicados para reporte CSV

# Abrir archivo de salida
with open(output_file, 'w', encoding='utf-8') as sql_file:
    sql_file.write("-- Script de carga masiva de ABONOS (histórico)\n")
    sql_file.write("-- Ejecuta este script en el editor SQL de DBeaver\n\n")
    
    sql_file.write("-- LIMPIEZA: Eliminar datos existentes en la tabla\n")
    sql_file.write("TRUNCATE TABLE abono CASCADE;\n\n")
    sql_file.write("-- Inicio de carga de datos\n\n")
    
    # Leer CSV
    with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        
        for row in reader:
            count += 1
            
            # Obtener valores del CSV
            sucursal = row.get('Sucursal', '').strip()
            folio = row.get('Folio', '').strip()
            fecha_str = row.get('Fecha', '').strip()
            rut_cliente = row.get('rut cliente', '').strip()
            cliente = row.get('Cliente', '').strip()
            vendedor_cliente = row.get('Vendedor cliente', '').strip()
            identificador = row.get('Identificador', '').strip()
            
            # NO usamos el vendedor del CSV, se actualizará desde tabla CLIENTES
            monto_str = row.get('Monto', '').strip()
            monto_neto_str = row.get('MONTO NETO', '').strip()
            
            # Validar campos obligatorios
            if not folio:
                errores.append(f"Línea {count + 1}: Falta folio")
                continue
            
            if not monto_str:
                errores.append(f"Línea {count + 1}: Falta monto")
                continue
            
            # Detectar duplicados por UNIQUE(folio, identificador, fecha)
            # Usamos fecha como string para la clave de duplicados
            unique_key = (folio, identificador if identificador else '', fecha_str)
            if unique_key in registros_unicos:
                skipped_duplicates += 1
                # Registrar el duplicado para reporte
                duplicados_reporte.append({
                    'linea': count + 1,
                    'folio': folio,
                    'identificador': identificador,
                    'fecha': fecha_str,
                    'rut_cliente': rut_cliente,
                    'cliente': cliente,
                    'vendedor': vendedor_cliente,
                    'monto': monto_str,
                    'monto_neto': monto_neto_str
                })
                continue
            registros_unicos.add(unique_key)
            
            # Escape de comillas simples
            def escape_str(s):
                return s.replace(chr(39), chr(39)+chr(39)) if s else ''
            
            # Convertir fecha (formato DD-MM-YY)
            fecha_val = 'NULL'
            if fecha_str:
                try:
                    # Intentar parsear DD-MM-YY
                    fecha_obj = datetime.strptime(fecha_str, '%d-%m-%y')
                    fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                except:
                    try:
                        # Intentar DD-MM-YYYY
                        fecha_obj = datetime.strptime(fecha_str, '%d-%m-%Y')
                        fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                    except:
                        errores.append(f"Línea {count + 1}: Fecha inválida '{fecha_str}'")
            
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
            
            monto_val = parse_numeric(monto_str)
            monto_neto_val = parse_numeric(monto_neto_str)
            
            # Convertir campos a SQL
            sucursal_val = f"'{escape_str(sucursal)}'" if sucursal else 'NULL'
            folio_val = f"'{escape_str(folio)}'"
            rut_cliente_val = f"'{rut_cliente}'" if rut_cliente else 'NULL'
            cliente_val = f"'{escape_str(cliente)}'" if cliente else 'NULL'
            vendedor_cliente_val = 'NULL'  # Se actualizará desde tabla CLIENTES
            identificador_val = f"'{escape_str(identificador)}'" if identificador else 'NULL'
            
            # Generar INSERT - ahora incluye el campo identificador_abono
            insert_sql = f"""INSERT INTO abono (sucursal, folio, fecha, identificador, cliente, vendedor_cliente, identificador_abono, monto, monto_neto) VALUES ({sucursal_val}, {folio_val}, {fecha_val}, {rut_cliente_val}, {cliente_val}, {vendedor_cliente_val}, {identificador_val}, {monto_val}, {monto_neto_val});
"""
            sql_file.write(insert_sql)
            
            # Feedback cada 5000 registros
            if count % 5000 == 0:
                print(f"Procesados {count} registros...")
    
    # Agregar verificación al final
    sql_file.write("\n-- Verifica la carga\n")
    sql_file.write("SELECT COUNT(*) as total_abonos FROM abono;\n")
    sql_file.write("SELECT fecha, COUNT(*) as num_abonos, SUM(monto) as total_abonado FROM abono GROUP BY fecha ORDER BY fecha DESC LIMIT 10;\n")
    
    # IMPORTANTE: Actualizar vendedores desde la tabla CLIENTES
    sql_file.write("\n-- PASO CRÍTICO: Actualizar vendedores desde tabla CLIENTES\n")
    sql_file.write("-- Esto establece la relación cliente-vendedor de forma consistente\n")
    sql_file.write("UPDATE abono a\n")
    sql_file.write("SET vendedor_cliente = c.nombre_vendedor\n")
    sql_file.write("FROM cliente c\n")
    sql_file.write("WHERE a.identificador = c.rut\n")
    sql_file.write("AND c.nombre_vendedor IS NOT NULL;\n\n")
    
    sql_file.write("-- Verificar actualización de vendedores\n")
    sql_file.write("SELECT \n")
    sql_file.write("    COUNT(*) as total_abonos,\n")
    sql_file.write("    COUNT(vendedor_cliente) as con_vendedor,\n")
    sql_file.write("    COUNT(*) - COUNT(vendedor_cliente) as sin_vendedor\n")
    sql_file.write("FROM abono;\n\n")
    
    sql_file.write("-- Abonos por vendedor\n")
    sql_file.write("SELECT vendedor_cliente, COUNT(*) as num_abonos, SUM(monto) as total_abonado FROM abono WHERE vendedor_cliente IS NOT NULL GROUP BY vendedor_cliente ORDER BY total_abonado DESC;\n")

# Generar reporte CSV de duplicados si hay
if duplicados_reporte:
    duplicados_file = 'abonos_duplicados_reporte.csv'
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
    print(f"⚠️  Duplicados omitidos (mismo folio+identificador+fecha): {skipped_duplicates}")
if errores:
    print(f"⚠️  Errores encontrados: {len(errores)}")
    for error in errores[:20]:
        print(f"   {error}")
print(f"\n⏱️  Tiempo estimado de ejecución en DB: ~3-5 minutos para {len(registros_unicos)} registros")
print(f"\nAhora ejecuta este script en DBeaver para cargar los abonos.")
