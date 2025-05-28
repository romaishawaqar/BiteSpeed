// config/database.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME, // should be 'BiteSpeed'
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});


export const connectDB = async () => {
  try {
    await pool.connect();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error.message);
    process.exit(1);
  }
};

export const initializeDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact (
        id SERIAL PRIMARY KEY,
        phonenumber VARCHAR(20),
        email VARCHAR(255),
        linkedid INTEGER,
        linkprecedence VARCHAR(20) CHECK (linkPrecedence IN ('primary', 'secondary')),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Contacts table is ready.");
  } catch (err) {
    console.error("❌ Failed to initialize DB:", err);
  }
};
