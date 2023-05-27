import bcrypt from "bcrypt";

export class UserModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser(username, password, role) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const client = await this.pool.connect();
      const queryResult = await client.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *",
        [username, hashedPassword, role]
      );
      client.release();
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating user");
    }
  }

  async updateUser(id, username, password, role) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const client = await this.pool.connect();
      const queryResult = await client.query(
        "UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4 RETURNING *",
        [username, hashedPassword, role, id]
      );
      client.release();
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating user");
    }
  }

  async getUserById(id) {
    try {
      const client = await this.pool.connect();
      const queryResult = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
      );
      client.release();
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error fetching user by ID");
    }
  }

  async getUsers() {
    try {
      const client = await this.pool.connect();
      const queryResult = await client.query("SELECT * FROM users");
      client.release();
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching users");
    }
  }

  async getUserByUsername(username) {
    try {
      const query = "SELECT * FROM users WHERE username = $1";
      const values = [username];
      const client = await this.pool.connect();
      const { rows } = await client.query(query, values);
      client.release();
      if (rows.length > 0) {
        const { id, username, password, role } = rows[0];
        return { id, username, password, role };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error("Error fetching user");
    }
  }
}
