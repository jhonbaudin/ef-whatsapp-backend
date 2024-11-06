import bcrypt from "bcrypt";

export class UserModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser(
    username,
    password,
    role,
    company_id,
    company_phones_ids,
    weight = 0,
    work_schedule = null
  ) {
    const client = await this.pool.connect();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const queryResult = await client.query(
        "INSERT INTO users (username, password, role, company_id, company_phones_ids, weight, work_schedule) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          username.toLowerCase(),
          hashedPassword,
          role,
          company_id,
          company_phones_ids,
          weight,
          JSON.stringify(work_schedule ?? ""),
        ]
      );
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating user");
    } finally {
      await client.release(true);
    }
  }

  async updateUser(
    id,
    username,
    role,
    company_id,
    company_phones_ids,
    weight = 0,
    work_schedule = null
  ) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "UPDATE users SET username = $1, role = $2, company_phones_ids = $5, weight = $6, work_schedule = $7 WHERE id = $3 AND company_id = $4 RETURNING *",
        [
          username.toLowerCase(),
          role,
          id,
          company_id,
          company_phones_ids,
          weight,
          JSON.stringify(work_schedule ?? ""),
        ]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating user");
    } finally {
      await client.release(true);
    }
  }

  async getUserById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const user = await client.query(
        "SELECT * FROM users WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );

      if (user.rows.length) {
        const {
          id,
          username,
          password,
          role,
          company_id,
          company_phones_ids,
          weight,
          work_schedule,
        } = user.rows[0];

        let where = "";
        if (null !== company_phones_ids && "" !== company_phones_ids) {
          where = `AND id IN (${company_phones_ids})`;
        }

        const company = await client.query(
          `SELECT id as company_phone_id, phone, alias, catalog_id as catalog FROM companies_phones WHERE company_id = $1 ${where}`,
          [company_id]
        );
        const phones = company.rows;
        for (const phone of phones) {
          const flows = await client.query(
            "SELECT flow_id FROM auto_flow af WHERE af.company_phone_id = $1 GROUP BY flow_id",
            [phone.company_phone_id]
          );
          phone.flows = flows.rows;
        }
        return {
          id,
          username,
          password,
          role,
          company_id,
          weight,
          work_schedule,
          company_phones: phones,
        };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error("Error fetching user by ID");
    } finally {
      await client.release(true);
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
      await client.release(true);
    }
  }

  async getUserByUsername(username) {
    const client = await this.pool.connect();

    try {
      const user = await client.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );

      if (user.rows.length) {
        const {
          id,
          username,
          password,
          role,
          company_id,
          company_phones_ids,
          weight,
          work_schedule,
        } = user.rows[0];
        let where = "";
        if (null !== company_phones_ids && "" !== company_phones_ids) {
          where = `AND id IN (${company_phones_ids})`;
        }
        const company = await client.query(
          `SELECT id as company_phone_id, phone, alias, catalog_id as catalog FROM companies_phones WHERE company_id = $1 ${where}`,
          [company_id]
        );
        const phones = company.rows;
        return {
          id,
          username,
          password,
          role,
          company_id,
          weight,
          work_schedule,
          phones,
        };
      } else {
        return null;
      }
    } catch (error) {
      throw new Error("Error fetching user");
    } finally {
      await client.release(true);
    }
  }

  async deleteUser(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query("DELETE FROM user_conversation WHERE user_id = $1", [
        id,
      ]);

      await client.query(
        "DELETE FROM users WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
    } catch (error) {
      throw new Error("Error deleting user");
    } finally {
      await client.release(true);
    }
  }

  async updatePasswordUser(id, password, company_id) {
    const client = await this.pool.connect();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const queryResult = await client.query(
        "UPDATE users SET password = $1 WHERE id = $2 AND company_id = $3 RETURNING *",
        [hashedPassword, id, company_id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating user");
    } finally {
      await client.release(true);
    }
  }
}
