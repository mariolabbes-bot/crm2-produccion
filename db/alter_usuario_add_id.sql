-- Agrega columna id SERIAL PRIMARY KEY a la tabla usuario si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='usuario' AND column_name='id'
    ) THEN
        ALTER TABLE usuario ADD COLUMN id SERIAL PRIMARY KEY;
    END IF;
END $$;
