export class QueueModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createJobToProcess(message, company_id, conversation_id, hash) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO public.queue (message, company_id, conversation_id, md5) SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM public.queue WHERE md5 = $4 AND processed = false) ON CONFLICT (md5) DO NOTHING`,
        [message, company_id, conversation_id, hash]
      );
      return true;
    } catch (error) {
      console.error("Error creating job:", error);
      return false;
    } finally {
      await client.release(true);
    }
  }

  async getJobsToProcess() {
    const client = await this.pool.connect();
    try {
      const queryResult = await client.query(
        `SELECT q.id, q.message, q.conversation_id, q.company_id, q.md5
        FROM public.queue q
        WHERE processed = false AND q.created_at >= NOW() - INTERVAL '30 minutes'
        LIMIT 50`
      );
      return queryResult.rows;
    } catch (error) {
      console.error("Error getting jobs:", error);
      return [];
    } finally {
      await client.release(true);
    }
  }

  async markJobAsProcessed(id) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
      UPDATE public.queue
      SET processed = TRUE
      WHERE id = $1
    `,
        [id]
      );
    } catch (error) {
      console.error("Error on process a job:", error);
    } finally {
      await client.release(true);
    }
  }
}
