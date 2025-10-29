-- Elimina restricciones UNIQUE y PRIMARY KEY previas en usuario, agrega id SERIAL PRIMARY KEY si no existe
DO $$
DECLARE
    pk_name text;
    unique_rut text;
    unique_alias text;
    unique_email text;
BEGIN
    -- Buscar y eliminar PRIMARY KEY existente
    SELECT constraint_name INTO pk_name
    FROM information_schema.table_constraints
    WHERE table_name='usuario' AND constraint_type='PRIMARY KEY';
    IF pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuario DROP CONSTRAINT %I', pk_name);
    END IF;

    -- Buscar y eliminar UNIQUE en rut, alias, email
    SELECT constraint_name INTO unique_rut
    FROM information_schema.constraint_column_usage
    WHERE table_name='usuario' AND column_name='rut';
    IF unique_rut IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuario DROP CONSTRAINT %I', unique_rut);
    END IF;

    SELECT constraint_name INTO unique_alias
    FROM information_schema.constraint_column_usage
    WHERE table_name='usuario' AND column_name='alias';
    IF unique_alias IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuario DROP CONSTRAINT %I', unique_alias);
    END IF;

    SELECT constraint_name INTO unique_email
    FROM information_schema.constraint_column_usage
    WHERE table_name='usuario' AND column_name='email';
    IF unique_email IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuario DROP CONSTRAINT %I', unique_email);
    END IF;

    -- Agregar columna id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='usuario' AND column_name='id'
    ) THEN
        EXECUTE 'ALTER TABLE usuario ADD COLUMN id SERIAL';
    END IF;

    -- Agregar PRIMARY KEY en id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='usuario' AND constraint_type='PRIMARY KEY'
    ) THEN
        EXECUTE 'ALTER TABLE usuario ADD PRIMARY KEY (id)';
    END IF;
END $$;
