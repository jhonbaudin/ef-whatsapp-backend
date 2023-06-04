import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Get the values of environment variables
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Check that all variables have assigned values
if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error("Missing environment variables for database configuration.");
}

const port = parseInt(DB_PORT);

// Database connection configuration
export const createPool = () => {
  const poolConfig = {
    host: DB_HOST,
    port,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  };

  const pool = new pg.Pool(poolConfig);
  return pool;
};
