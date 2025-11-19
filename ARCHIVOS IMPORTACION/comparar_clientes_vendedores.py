import csv
import unicodedata

def norm(text):
    if not text:
        return ''
    text = text.upper().strip()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    return text

# --- Cargar clientes base ---
clientes_base = set()
with open('CLIENTES.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        clientes_base.add(norm(row['Nombre']))

# --- Cargar vendedores base ---
vendedores_base = set()
with open('VENDEDORES.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        vendedores_base.add(norm(row['NOMBRE VENDEDOR']))

 # --- Cargar listas de no encontrados ---
with open('clientes_no_encontrados.txt', encoding='utf-8') as f:
    clientes_no_encontrados = [line.strip() for line in f if line.strip()]
with open('vendedores_no_encontrados.txt', encoding='utf-8') as f:
    vendedores_no_encontrados = [line.strip() for line in f if line.strip()]

# --- Comparar clientes ---
print("CLIENTES NO ENCONTRADOS (exactos):")
for nombre in clientes_no_encontrados:
    if norm(nombre) in clientes_base:
        print(f"Coincidencia exacta: {nombre}")
    else:
        # Buscar coincidencias parciales
        parciales = [base for base in clientes_base if norm(nombre) in base or base in norm(nombre)]
        if parciales:
            print(f"Coincidencia parcial: {nombre} -> {parciales}")
        else:
            print(f"No existe: {nombre}")

print("\nVENDEDORES NO ENCONTRADOS (exactos):")
for nombre in vendedores_no_encontrados:
    if norm(nombre) in vendedores_base:
        print(f"Coincidencia exacta: {nombre}")
    else:
        parciales = [base for base in vendedores_base if norm(nombre) in base or base in norm(nombre)]
        if parciales:
            print(f"Coincidencia parcial: {nombre} -> {parciales}")
        else:
            print(f"No existe: {nombre}")
