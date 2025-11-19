#!/usr/bin/env python3
"""
Exporta tablas cliente y venta a Excel para revisión
"""

import psycopg2
import pandas as pd
from datetime import datetime

# Configuración de conexión
DB_CONFIG = {
    'host': 'ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_DYTSqK9GI8Ei',
    'port': '5432'
}

print("📊 Conectando a base de datos...")

try:
    conn = psycopg2.connect(**DB_CONFIG)
    
    # EXPORTAR CLIENTES
    print("\n📋 Exportando tabla CLIENTES...")
    query_clientes = """
        SELECT *
        FROM cliente
        ORDER BY nombre_vendedor, nombre
    """
    df_clientes = pd.read_sql_query(query_clientes, conn)
    
    # Agregar estadísticas
    print(f"   Total clientes: {len(df_clientes):,}")
    print(f"   Con vendedor: {df_clientes['nombre_vendedor'].notna().sum():,}")
    print(f"   Sin vendedor: {df_clientes['nombre_vendedor'].isna().sum():,}")
    
    # EXPORTAR MUESTRA DE VENTAS (primeras 50,000 para análisis)
    print("\n📋 Exportando muestra de VENTAS...")
    query_ventas = """
        SELECT 
            id,
            sucursal,
            tipo_documento,
            folio,
            fecha_emision,
            identificador as rut_cliente,
            cliente as nombre_cliente,
            vendedor_cliente,
            sku,
            descripcion,
            cantidad,
            valor_total
        FROM venta
        ORDER BY fecha_emision DESC, folio DESC
        LIMIT 50000
    """
    df_ventas = pd.read_sql_query(query_ventas, conn)
    
    print(f"   Total ventas exportadas: {len(df_ventas):,} (de 77,017)")
    print(f"   Con vendedor: {df_ventas['vendedor_cliente'].notna().sum():,}")
    print(f"   Sin vendedor: {df_ventas['vendedor_cliente'].isna().sum():,}")
    
    # ANÁLISIS DE COINCIDENCIAS RUT
    print("\n🔍 Analizando coincidencias RUT...")
    query_analisis = """
        SELECT 
            COUNT(DISTINCT v.identificador) as ruts_unicos_ventas,
            COUNT(DISTINCT c.rut) as ruts_unicos_clientes,
            COUNT(DISTINCT CASE WHEN c.rut IS NOT NULL THEN v.identificador END) as ruts_coinciden
        FROM venta v
        LEFT JOIN cliente c ON v.identificador = c.rut
    """
    df_analisis = pd.read_sql_query(query_analisis, conn)
    
    print(f"   RUTs únicos en ventas: {df_analisis['ruts_unicos_ventas'].iloc[0]:,}")
    print(f"   RUTs únicos en clientes: {df_analisis['ruts_unicos_clientes'].iloc[0]:,}")
    print(f"   RUTs que coinciden: {df_analisis['ruts_coinciden'].iloc[0]:,}")
    
    # RUTS QUE NO COINCIDEN
    print("\n📋 Exportando RUTs que NO coinciden...")
    query_no_coinciden = """
        SELECT DISTINCT
            v.identificador as rut,
            v.cliente as nombre_en_venta,
            COUNT(*) as num_ventas,
            SUM(v.valor_total) as total_vendido
        FROM venta v
        LEFT JOIN cliente c ON v.identificador = c.rut
        WHERE c.rut IS NULL
        AND v.identificador IS NOT NULL
        AND v.identificador != ''
        GROUP BY v.identificador, v.cliente
        ORDER BY num_ventas DESC
    """
    df_no_coinciden = pd.read_sql_query(query_no_coinciden, conn)
    print(f"   RUTs sin match: {len(df_no_coinciden):,}")
    
    conn.close()
    
    # CREAR ARCHIVO EXCEL CON MÚLTIPLES HOJAS
    print("\n💾 Generando archivo Excel...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"analisis_clientes_ventas_{timestamp}.xlsx"
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        # Hoja 1: Clientes
        df_clientes.to_excel(writer, sheet_name='CLIENTES', index=False)
        
        # Hoja 2: Muestra de Ventas
        df_ventas.to_excel(writer, sheet_name='VENTAS (muestra 50K)', index=False)
        
        # Hoja 3: Análisis de coincidencias
        df_analisis.to_excel(writer, sheet_name='ANÁLISIS RUTS', index=False)
        
        # Hoja 4: RUTs que no coinciden
        df_no_coinciden.to_excel(writer, sheet_name='RUTS SIN MATCH', index=False)
        
        # Hoja 5: Resumen por vendedor
        print("   Calculando resumen por vendedor...")
        df_resumen_vendedor = df_clientes.groupby('nombre_vendedor').agg({
            'rut': 'count'
        }).reset_index()
        df_resumen_vendedor.columns = ['Vendedor', 'Num_Clientes']
        df_resumen_vendedor.to_excel(writer, sheet_name='CLIENTES POR VENDEDOR', index=False)
    
    print(f"\n✅ Archivo creado: {filename}")
    print(f"\n📂 Ubicación: {filename}")
    print("\n📊 Hojas incluidas:")
    print("   1. CLIENTES - Todos los clientes con su vendedor")
    print("   2. VENTAS (muestra 50K) - Muestra de ventas para análisis")
    print("   3. ANÁLISIS RUTS - Estadísticas de coincidencias")
    print("   4. RUTS SIN MATCH - Clientes en ventas pero no en tabla cliente")
    print("   5. CLIENTES POR VENDEDOR - Resumen por vendedor")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
