require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Mapping from User Image
// [RUT, FullName (Clients), Alias (Sales/Abonos), SaldoName]
// RUT is the Primary Key to identify the user record.
const GOLDEN_MAPPING = [
    { rut: '11.599.857-9', nombre: 'Alex Mauricio Mondaca Cortes', alias: 'Alex', saldo: 'Alex Mondaca' },
    { rut: '09.262.987-2', nombre: 'Eduardo Enrique Ponce Castillo', alias: 'Eduardo', saldo: 'Eduardo Ponce' },
    { rut: '13.830.417-5', nombre: 'Eduardo Rojas Andres Rojas Del Campo', alias: 'Eduardo Rojas', saldo: 'Eduardo Rojas Rojas' },
    { rut: '12.569.531-0', nombre: 'Emilio Alberto Santos Castillo', alias: 'Emilio', saldo: 'Emilio Santos' },
    { rut: '7.775.897-6', nombre: 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA', alias: 'Joaquin', saldo: 'JOAQUIN MANRIQUEZ' }, // Check casing in sales? Likely UPPER in comparison
    { rut: '05.715.101-3', nombre: 'Jorge Heriberto Gutierrez Silva', alias: 'Jorge', saldo: 'Jorge Gutierrez' },
    { rut: '11.823.790-0', nombre: 'Luis Ramon Esquivel Oyamadel', alias: 'luis', saldo: 'Luis Esquivel' }, // lowercase 'luis' in image
    { rut: '13.018.313-1', nombre: 'Maiko Ricardo Flores Maldonado', alias: 'Maiko', saldo: 'Maiko Flores' },
    { rut: '16.412.525-4', nombre: 'Marcelo Hernan Troncoso Molina', alias: 'Marcelo', saldo: 'Marcelo Troncoso' },
    { rut: '13.087.134-8', nombre: 'Marisol De Lourdes Sanchez Roitman', alias: 'Marisol', saldo: 'Marisol Sanchez' },
    { rut: '14.138.537-2', nombre: 'Matias Felipe Felipe Tapia Valenzuela', alias: 'Matias Felipe', saldo: 'Matias Felipe Tapia' },
    { rut: '12.570.853-6', nombre: 'Milton Marin Blanco', alias: 'Milton', saldo: 'Milton Marin' },
    { rut: '16.082.310-0', nombre: 'Nataly Andrea Carrasco Rojas', alias: 'Nataly', saldo: 'Nataly Carrasco' },
    { rut: '09.338.644-2', nombre: 'Nelson Antonio Muñoz Cortes', alias: 'Nelson', saldo: 'Nelson Muñoz' }, // Check special char encoding
    { rut: '10.913.019-2', nombre: 'Omar Antonio Maldonado Castillo', alias: 'Omar', saldo: 'Omar Maldonado' },
    { rut: '07.107.100-6', nombre: 'Roberto Otilio Oyarzun Alvarez', alias: 'Roberto', saldo: 'Roberto Oyarzun' },
    { rut: '12.051.321-4', nombre: 'Victoria Andrea Hurtado Olivares', alias: 'Victoria', saldo: 'Victoria Hurtado' },
    // Managers - Ensure they exist but maybe no alias needed for sales if they don't sell?
    { rut: '12.168.148-k', nombre: 'Mario Andres labbe Silba', alias: null, saldo: null },
    { rut: '12.425.152-4', nombre: 'Luis Alberto Marin Blanco', alias: null, saldo: null }
];

async function applyMapping() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Golden Mapping Application...');

        // 0. Safety: Force release of target aliases and clear users to be updated.
        // This prevents unique constraint violations if an alias is held by a different RUT (or ghost record).
        const targetAliases = GOLDEN_MAPPING.map(m => m.alias).filter(a => a);
        const targetRuts = GOLDEN_MAPPING.map(m => m.rut).filter(r => r);

        console.log('🧹 Releasing target aliases from potentially conflicting users...');
        await client.query(`UPDATE usuario SET alias = NULL WHERE alias = ANY($1::text[])`, [targetAliases]);

        console.log('🧹 Cleaning aliases of target users...');
        await client.query(`UPDATE usuario SET alias = NULL WHERE rut = ANY($1::text[])`, [targetRuts]);

        for (const map of GOLDEN_MAPPING) {
            console.log(`Processing ${map.rut} (${map.alias || 'No Alias'})...`);

            // 1. Update Usuario Table
            // We search by RUT. If not found, log warning.
            // We set nombre_vendedor = map.nombre, alias = map.alias

            const res = await client.query(`
                UPDATE usuario 
                SET 
                    nombre_vendedor = $1,
                    alias = $2
                WHERE rut = $3
                RETURNING rut, nombre_vendedor, alias
            `, [map.nombre, map.alias, map.rut]);

            if (res.rowCount === 0) {
                console.warn(`⚠️ User with RUT ${map.rut} not found!`);

                // Attempt fuzzy search by partial name if RUT failed (e.g. invalid rut format in DB)
                const fuzzy = await client.query(`
                    SELECT * FROM usuario WHERE nombre_vendedor ILIKE $1 OR email ILIKE $2
                `, [`%${map.alias}%`, `%${map.alias}%`]);

                if (fuzzy.rowCount > 0 && map.alias) {
                    console.log(`   found potential match by name: ${fuzzy.rows[0].nombre_vendedor} (${fuzzy.rows[0].rut})`);
                }
            } else {
                console.log(`✅ Updated ${map.rut}: Name="${res.rows[0].nombre_vendedor}", Alias="${res.rows[0].alias}"`);
            }
        }

        console.log('🏁 Verification Phase: Checking Duplicates...');
        // Ensure no two users share the same Alias (unless null)
        const dups = await client.query(`
            SELECT alias, COUNT(*) 
            FROM usuario 
            WHERE alias IS NOT NULL 
            GROUP BY alias 
            HAVING COUNT(*) > 1
        `);

        if (dups.rowCount > 0) {
            console.error('❌ Duplicate Aliases found:', dups.rows);
        } else {
            console.log('✅ Unique constraints verified.');
        }

    } catch (err) {
        console.error('❌ Error applying mapping:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

applyMapping();
