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

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message);
  process.exit(1); // Exit the application if a critical error occurs
});

// Test database connection with retry logic
(async () => {
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      console.log('Database connected successfully');
      client.release();
      break;
    } catch (err) {
      console.error(`Database connection failed (attempt ${attempt}):`, err.message);
      if (attempt === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
    }
  }
})();

module.exports = pool;