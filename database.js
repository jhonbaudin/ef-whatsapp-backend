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
const poolConfig1 = {
  host: DB_HOST,
  port,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionTimeoutMillis: 30000,
};

const poolConfig2 = {
  host: DB_HOST,
  port,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionTimeoutMillis: 30000,
};

let pool1 = new pg.Pool(poolConfig1);
let pool2 = new pg.Pool(poolConfig2);

pool1.on("error", (err) => {
  console.error("Database connection error (Pool 1):", err);
  console.log("Reconnecting to Pool 1...");
  pool1.end();
  pool1 = new pg.Pool(poolConfig1);
});

pool2.on("error", (err) => {
  console.error("Database connection error (Pool 2):", err);
  console.log("Reconnecting to Pool 2...");
  pool2.end();
  pool2 = new pg.Pool(poolConfig2);
});

// Function to get the desired pool
export const getPool = (poolName) => {
  if (poolName === "pool1") {
    return pool1;
  } else if (poolName === "pool2") {
    return pool2;
  } else {
    throw new Error("Invalid pool name.");
  }
};
