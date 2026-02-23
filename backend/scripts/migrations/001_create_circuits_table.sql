-- Migration: Create maestro_circuitos table
-- Description: Centralize circuit definitions (names and colors)

CREATE TABLE IF NOT EXISTS maestro_circuitos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#95a5a6', -- Hex color
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: We keep 'circuito' in 'cliente' as a string for now to avoid breaking existing code,
-- but we can add an optional FK or constraint later if we want strictness.
-- For now, the 'maestro_circuitos' will serve as the source of truth for the UI and validation.
