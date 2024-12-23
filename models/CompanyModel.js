export class CompanyModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createPhone(
    phone,
    wp_phone_id = "",
    waba_id = "",
    bussines_id = "",
    wp_bearer_token = "",
    alias = "",
    catalog_id = "",
    company_id,
    tag_id = null
  ) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "INSERT INTO public.companies_phones (phone, company_id, wp_phone_id, waba_id, bussines_id, wp_bearer_token, alias, catalog_id, tag_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
        [
          phone,
          company_id,
          wp_phone_id,
          waba_id,
          bussines_id,
          wp_bearer_token,
          alias,
          catalog_id,
          tag_id,
        ]
      );
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating phone");
    } finally {
      await client.release(true);
    }
  }

  async updatePhone(
    id,
    phone,
    wp_phone_id = "",
    waba_id = "",
    bussines_id = "",
    wp_bearer_token = "",
    alias = "",
    catalog_id = "",
    company_id,
    tag_id = null
  ) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "UPDATE public.companies_phones SET phone=$2, wp_phone_id=$3, waba_id=$4, bussines_id=$5, wp_bearer_token=$6, alias=$8, catalog_id=$9, tag_id=$10 WHERE id = $1 AND company_id = $7 RETURNING *",
        [
          id,
          phone,
          wp_phone_id,
          waba_id,
          bussines_id,
          wp_bearer_token,
          company_id,
          alias,
          catalog_id,
          tag_id,
        ]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating phone");
    } finally {
      await client.release(true);
    }
  }

  async getPhoneById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT * FROM companies_phones WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error fetching phone by ID");
    } finally {
      await client.release(true);
    }
  }

  async getPhones(company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT * FROM companies_phones WHERE company_id = $1 ORDER BY id",
        [company_id]
      );
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching phones");
    } finally {
      await client.release(true);
    }
  }

  async deletePhone(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM companies_phones WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
    } catch (error) {
      throw new Error("Error deleting phone");
    } finally {
      await client.release(true);
    }
  }
}
