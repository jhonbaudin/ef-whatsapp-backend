import BeeQueue from "bee-queue";
const queue = new BeeQueue("chat-bot");

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
