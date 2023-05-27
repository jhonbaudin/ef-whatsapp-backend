import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Obtener los valores de las variables de entorno
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Verificar que todas las variables tengan valores asignados
if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error(
    "Faltan variables de entorno para la configuración de la base de datos."
  );
}

const port = parseInt(DB_PORT);

// Configuración de la conexión a la base de datos
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
