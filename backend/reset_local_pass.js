/**
 * SCRIPT PARA RESETEAR CONTRASEÑA DE USUARIO (LOCAL)
 * Propósito: Restablecer la contraseña de un usuario para permitir el acceso local.
 */
const pool = require('./src/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const email = 'mario.labbe@lubricar-insa.cl';
  const newPassword = '123456';
  
  console.log(`🔐 Intentando restablecer contraseña para: ${email}`);

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await pool.query(
      'UPDATE usuario SET password = $1 WHERE LOWER(correo) = LOWER($2) RETURNING id, correo, rol_usuario',
      [hashedPassword, email]
    );

    if (result.rowCount === 0) {
      console.log('❌ No se encontró el usuario solicitado.');
    } else {
      console.log('✅ Contraseña restablecida con éxito.');
      console.table(result.rows);
      console.log('\nAhora intenta loguearte con:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${newPassword}`);
    }

  } catch (err) {
    console.error('💥 Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
