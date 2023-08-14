import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export class TemplateController {
  async importTemplates(waba_id, wp_bearer_token) {
    const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${waba_id}/message_templates`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wp_bearer_token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.log(error);
      console.log(`API request failed:`, error);
    }
  }
}
