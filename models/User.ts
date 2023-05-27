import { Pool, QueryResult } from "pg";
import bcrypt from "bcrypt";

export interface User {
  id: number;
  username: string;
  password: string;
  role: string;
}

export class UserModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async createUser(
    username: string,
    password: string,
    role: string
  ): Promise<User> {
    try {
      // Generar el hash de la contraseña antes de almacenarla en la base de datos
      const hashedPassword = await bcrypt.hash(password, 10);
      const client = await this.pool.connect();
      const queryResult: QueryResult<User> = await client.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *",
        [username, hashedPassword, role]
      );
      client.release();
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating user");
    }
  }

  public async updateUser(
    id: number,
    username: string,
    password: string,
    role: string
  ): Promise<User | null> {
    try {
      // Generar el hash de la contraseña antes de actualizarla en la base de datos
      const hashedPassword = await bcrypt.hash(password, 10);
      const client = await this.pool.connect();
      const queryResult: QueryResult<User> = await client.query(
        "UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4 RETURNING *",
        [username, hashedPassword, role, id]
      );
      client.release();
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating user");
    }
  }

  public async getUserById(id: number): Promise<User | null> {
    try {
      const client = await this.pool.connect();
      const queryResult: QueryResult<User> = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      client.release();
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error fetching user by ID");
    }
  }

  public async getUsers(): Promise<User[]> {
    try {
      const client = await this.pool.connect();
      const queryResult: QueryResult<User> = await client.query(
        "SELECT * FROM users"
      );
      client.release();
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching users");
    }
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    try {
      const query: string = "SELECT * FROM users WHERE username = $1";
      const values: any[] = [username];
      const client = await this.pool.connect();
      const { rows }: QueryResult<User> = await client.query(query, values);
      client.release();
      if (rows.length > 0) {
        const { id, username, password, role }: User = rows[0];
        return { id, username, password, role };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error("Error fetching user");
    }
  }
}
