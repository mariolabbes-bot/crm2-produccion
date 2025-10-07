const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seedManager() {
  const managerEmail = 'manager@crm.com'; // Using a default email

  // Check if manager exists
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [managerEmail]);
  if (user.rows.length > 0) {
    console.log('Manager user already exists.');
    pool.end();
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('ADMIN123', salt);

  // Create manager user
  await pool.query(
    'INSERT INTO users (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
    ['MANAGER', managerEmail, hashedPassword, 'manager']
  );

  console.log('Manager user created successfully.');
  pool.end();
}

seedManager();
