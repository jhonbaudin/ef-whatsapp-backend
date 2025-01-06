import pg from "pg";
import dotenv from "dotenv";
pg.defaults.poolIdleTimeout = 600000;
dotenv.config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, ENVIROMENT } =
  process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error("Missing environment variables for database configuration.");
}

const port = parseInt(DB_PORT);

const poolConfig1 = {
  host: DB_HOST,
  port,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 0,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,
  max: 100,
};

const poolConfig2 = {
  host: DB_HOST,
  port,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,
  max: 100,
};

if (ENVIROMENT == "TEST") {
  poolConfig2.ssl = {
    rejectUnauthorized: false,
  };
  poolConfig1.ssl = {
    rejectUnauthorized: false,
  };
}

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

export const getPool = (poolName) => {
  if (poolName === "pool1") {
    return pool1;
  } else if (poolName === "pool2") {
    return pool2;
  } else {
    throw new Error("Invalid pool name.");
  }
};
