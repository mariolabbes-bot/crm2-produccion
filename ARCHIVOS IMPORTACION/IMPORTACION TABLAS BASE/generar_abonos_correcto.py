#!/usr/bin/env python3
"""
Genera archivo SQL de abonos con las columnas CORRECTAS de la tabla
"""

import csv
from datetime import datetime

csv_file = 'ABONOS.csv'
output_file = 'carga_abonos_correcta.sql'

print(f"📂 Leyendo {csv_file}...")

registros_unicos = set()
skipped_duplicates = 0
count = 0

with open(output_file, 'w', encoding='utf-8') as sql_file:
    sql_file.write("-- CARGA DE ABONOS - COLUMNAS CORRECTAS\n")
    sql_file.write("-- Generado con estructura real de tabla abono\n\n")
    sql_file.write("TRUNCATE TABLE abono CASCADE;\n\n")
    
    with open(csv_file, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        
        for row in reader:
            count += 1
            
            # Obtener valores del CSV
            folio = row.get('Folio', '').strip()
            fecha_str = row.get('Fecha', '').strip()
            identificador = row.get('rut cliente', '').strip()  # ← CORREGIDO: usar "rut cliente"
            cliente = row.get('Cliente', '').strip()
            sucursal = row.get('Sucursal', '').strip()
            monto_str = row.get('Monto', '').strip()
            
            # Validar obligatorios
            if not folio:
                continue
            
            # Detectar duplicados
            unique_key = (folio, fecha_str, identificador, monto_str)
            if unique_key in registros_unicos:
                skipped_duplicates += 1
                continue
            registros_unicos.add(unique_key)
            
            # Escape de comillas
            def escape_str(s):
                return s.replace("'", "''") if s else ''
            
            # Convertir fecha
            fecha_val = 'NULL'
            if fecha_str:
                try:
                    fecha_obj = datetime.strptime(fecha_str, '%d-%m-%y')
                    fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                except:
                    try:
                        fecha_obj = datetime.strptime(fecha_str, '%d-%m-%Y')
                        fecha_val = f"'{fecha_obj.strftime('%Y-%m-%d')}'"
                    except:
                        pass
            
            # Convertir monto
            def parse_numeric(val):
                if not val:
                    return 'NULL'
                val = val.replace('.', '').replace(',', '.')
                try:
                    float(val)
                    return val
                except:
                    return 'NULL'
            
            monto_val = parse_numeric(monto_str)
            
            # Preparar valores
            sucursal_val = f"'{escape_str(sucursal)}'" if sucursal else 'NULL'
            folio_val = f"'{escape_str(folio)}'"
            fecha_val = fecha_val
            identificador_val = f"'{identificador}'" if identificador else 'NULL'
            cliente_val = f"'{escape_str(cliente)}'" if cliente else 'NULL'
            identificador_abono_val = f"'{escape_str(folio)}'"  # Usamos folio como identificador
            
            # Generar INSERT con ONLY las columnas que existen
            insert = f"""INSERT INTO abono (
  sucursal, folio, fecha, identificador,
  cliente, vendedor_cliente,
  identificador_abono, monto
) VALUES (
  {sucursal_val}, {folio_val}, {fecha_val}, {identificador_val},
  {cliente_val}, NULL,
  {identificador_abono_val}, {monto_val}
)
ON CONFLICT (folio, identificador_abono, fecha) DO NOTHING;

"""
            sql_file.write(insert)
            
            if count % 5000 == 0:
                print(f"  Procesados {count:,} registros...")
    
    # UPDATE de vendedores
    sql_file.write("\n-- Actualizar vendedores desde tabla CLIENTES\n")
    sql_file.write("UPDATE abono a\n")
    sql_file.write("SET vendedor_cliente = c.nombre_vendedor\n")
    sql_file.write("FROM cliente c\n")
    sql_file.write("WHERE a.identificador = c.rut;\n\n")
    
    # Verificación
    sql_file.write("SELECT COUNT(*) as total_abonos FROM abono;\n")
    sql_file.write("SELECT COUNT(*) as abonos_sin_vendedor FROM abono WHERE vendedor_cliente IS NULL;\n")

print(f"\n✅ Archivo generado: {output_file}")
print(f"📊 Registros procesados: {count:,}")
print(f"⚠️  Duplicados omitidos: {skipped_duplicates}")
print(f"\n🎯 Ahora ejecuta:")
print(f"   python3 dividir_abonos_bloques_final.py")
