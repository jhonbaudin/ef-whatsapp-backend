import BeeQueue from "bee-queue";
const queue = new BeeQueue("chat-bot", {
  removeOnSuccess: true,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

async function clearQueue() {
  try {
    await queue.destroy();
    console.log("Queue cleared successfully.");
  } catch (error) {
    console.error("Error while clearing the queue:", error);
  } finally {
    process.exit();
  }
}

clearQueue();
