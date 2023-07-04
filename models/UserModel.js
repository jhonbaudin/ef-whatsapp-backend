import bcrypt from "bcrypt";

export class UserModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser(username, password, role, company_id) {
    const client = await this.pool.connect();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const queryResult = await client.query(
        "INSERT INTO users (username, password, role, company_id) VALUES ($1, $2, $3, $4) RETURNING *",
        [username, hashedPassword, role, company_id]
      );
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating user");
    } finally {
      client.release();
    }
  }

  async updateUser(id, username, role, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "UPDATE users SET username = $1, role = $2 WHERE id = $3 AND company_id = $4 RETURNING *",
        [username, role, id, company_id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating user");
    } finally {
      client.release();
    }
  }

  async getUserById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT * FROM users WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error fetching user by ID");
    } finally {
      client.release();
    }
  }

  async getUsers(company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT * FROM users WHERE company_id = $1 ORDER BY id",
        [company_id]
      );
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching users");
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username) {
    const client = await this.pool.connect();

    try {
      const query = "SELECT * FROM users WHERE username = $1";
      const values = [username];
      const { rows } = await client.query(query, values);
      if (rows.length > 0) {
        const { id, username, password, role, company_id } = rows[0];
        return { id, username, password, role, company_id };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error("Error fetching user");
    } finally {
      client.release();
    }
  }

  async deleteUser(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM users WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
    } catch (error) {
      throw new Error("Error deleting user");
    } finally {
      client.release();
    }
  }
}
