-- Create table cliente_actividad to store notes and observations
CREATE TABLE IF NOT EXISTS cliente_actividad (
  id SERIAL PRIMARY KEY,
  cliente_rut VARCHAR(20) NOT NULL,
  usuario_alias_id INT NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_cliente_rut FOREIGN KEY (cliente_rut) REFERENCES cliente(rut) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_alias_id FOREIGN KEY (usuario_alias_id) REFERENCES usuario_alias(id) ON DELETE CASCADE
);

-- Create indexes to optimize searches
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_rut ON cliente_actividad(cliente_rut);
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_created ON cliente_actividad(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cliente_actividad_usuario_alias ON cliente_actividad(usuario_alias_id);

-- Add table description
COMMENT ON TABLE cliente_actividad IS 'Stores client activities, notes and observations registered by vendors and managers';
COMMENT ON COLUMN cliente_actividad.cliente_rut IS 'Client RUT (reference to cliente table)';
COMMENT ON COLUMN cliente_actividad.usuario_alias_id IS 'ID of usuario_alias who registered the activity';
COMMENT ON COLUMN cliente_actividad.comentario IS 'Text of the activity/note/observation';

