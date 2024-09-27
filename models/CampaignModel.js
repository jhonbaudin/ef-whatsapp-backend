export class CampaignModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createCampaign(id_campaign, users, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "INSERT INTO campaigns (id_campaign, users, company_id) VALUES ($1, $2, $3) RETURNING *",
        [id_campaign, JSON.stringify(users), company_id]
      );
      return queryResult.rows[0];
    } catch (error) {
      throw new Error("Error creating campaign");
    } finally {
      await client.release(true);
    }
  }

  async updateCampaign(id, id_campaign, users, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "UPDATE campaigns SET id_campaign = $2, users = $3, company_id = $4, created = now() WHERE id = $1 RETURNING *",
        [id, id_campaign, JSON.stringify(users), company_id]
      );
      return queryResult.rows[0] || null;
    } catch (error) {
      throw new Error("Error updating campaign");
    } finally {
      await client.release(true);
    }
  }

  async getCampaignById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT c.id, c.id_campaign, c.created, c.users FROM campaigns c WHERE c.company_id = $1 AND c.id = $2",
        [company_id, id]
      );

      let campaignsFull = {};
      for (const campaign of queryResult.rows) {
        const { id, id_campaign, created, users } = campaign;
        const userInfo = await client.query(
          "SELECT id, username FROM public.users where id = ANY($1::int[])",
          [users]
        );

        campaignsFull = {
          id,
          id_campaign,
          created,
          users: userInfo.rows,
        };
      }

      return campaignsFull;
    } catch (error) {
      console.lo;
      throw new Error("Error fetching campaign");
    } finally {
      await client.release(true);
    }
  }

  async getCampaigns(company_id) {
    const client = await this.pool.connect();

    try {
      const queryResult = await client.query(
        "SELECT c.id, c.id_campaign, TO_CHAR(c.created, 'YYYY-MM-DD HH24:MI:SS') AS created, c.users FROM campaigns c WHERE c.company_id = $1 ORDER BY c.created DESC",
        [company_id]
      );

      let campaignsFull = [];
      for (const campaign of queryResult.rows) {
        const { id, id_campaign, created, users } = campaign;

        const userInfo = await client.query(
          "SELECT id, username FROM public.users WHERE id = ANY($1::int[])",
          [users]
        );

        campaignsFull.push({
          id,
          id_campaign,
          created,
          users: userInfo.rows,
        });
      }

      return campaignsFull;
    } catch (error) {
      throw new Error("Error fetching campaigns");
    } finally {
      await client.release(true);
    }
  }

  async deleteCampaign(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM campaigns WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
    } catch (error) {
      throw new Error("Error deleting campaign");
    } finally {
      await client.release(true);
    }
  }
}
