import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export class TemplateController {
  async importTemplates() {
    const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${process.env.WABA_ID}/message_templates`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WP_BEARER_TOKEN}`,
        },
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.log(`API request failed:`, error);
    }
  }
}
