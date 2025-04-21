const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatbot_db',
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// Test database connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;