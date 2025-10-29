import pandas as pd

sheets = {
    "USUARIO": ["Nombre", "RUT", "Alias", "Telefono", "Email", "Cargo"],
    "PRODUCTOS": ["SKU", "Descripcion", "Familia", "SubFamilia", "Marca"],
    "CLIENTES": ["RUT", "Nombre", "Email", "Telefono", "Sucursal", "Comuna", "Ciudad", "Direccion", "Vendedor"],
    "VENTAS": ["Sucursal", "Tipo Documento", "Folio", "Fecha emision", "Identificador", "Cliente", "Vendedor cliente", "Vendedor documento", "Estado Sistema", "Estado comercial", "Estado SII", "Indice", "SKU", "Descripcion", "Cantidad", "Precio", "Valor Total"],
    "ABONOS": ["Sucursal", "Folio", "Fecha", "Identificador", "Cliente", "Vendedor cliente", "Caja operacion", "Usuario Ingreso", "Monto Total", "Saldo a Favor", "Saldo a Favor total", "Tipo Pago", "Estado Abono", "Identificador Abono", "Fecha vencimiento", "Monto", "Monto Neto"],
    "SIGNACION LITROS": ["descripcion", "litros x unidad de venta"]
}

with pd.ExcelWriter("db/modelo_importacion_crm2.xlsx") as writer:
    for sheet, columns in sheets.items():
        df = pd.DataFrame(columns=columns)
        df.to_excel(writer, sheet_name=sheet, index=False)
