-- Tabla para trackear importaciones asíncronas
CREATE TABLE IF NOT EXISTS import_job (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- 'ventas' o 'abonos'
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  user_rut VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  total_rows INTEGER,
  imported_rows INTEGER,
  duplicate_rows INTEGER,
  error_rows INTEGER,
  result_data JSONB, -- Resultado completo: {success, imported, duplicates, etc}
  error_message TEXT,
  report_filename VARCHAR(255), -- Ruta del archivo de reporte si existe
  observations_filename VARCHAR(255) -- Ruta del archivo de observaciones si existe
);

CREATE INDEX IF NOT EXISTS idx_import_job_job_id ON import_job(job_id);
CREATE INDEX IF NOT EXISTS idx_import_job_status ON import_job(status);
CREATE INDEX IF NOT EXISTS idx_import_job_created_at ON import_job(created_at DESC);
