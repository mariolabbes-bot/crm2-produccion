-- Crear tabla cliente_actividad para almacenar notas y observaciones
CREATE TABLE IF NOT EXISTS cliente_actividad (
  id SERIAL PRIMARY KEY,
  cliente_rut VARCHAR(20) NOT NULL,
  usuario_id INT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_cliente_rut FOREIGN KEY (cliente_rut) REFERENCES cliente(rut) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_rut ON cliente_actividad(cliente_rut);
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_created ON cliente_actividad(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_usuario ON cliente_actividad(usuario_id);

-- Agregar comentario descriptivo
COMMENT ON TABLE cliente_actividad IS 'Almacena actividades, notas y observaciones de clientes registradas por vendedores y gerentes';
COMMENT ON COLUMN cliente_actividad.cliente_rut IS 'RUT del cliente (referencia a tabla cliente)';
COMMENT ON COLUMN cliente_actividad.usuario_id IS 'ID del usuario que registró la actividad';
COMMENT ON COLUMN cliente_actividad.comentario IS 'Texto de la actividad/nota/observación';

-- Fin del script
