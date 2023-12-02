import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export class MessageController {
  async sendMessage(requestBody, wp_phone_id, wp_bearer_token) {
    const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${wp_phone_id}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wp_bearer_token}`,
        },
      });

      if (!response.ok) {
        console.log(response);
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log(`API request failed:`, error);
    }
  }
  async markAsReadMessage(requestBody) {
    const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${process.env.WP_PHONE_ID}/messages`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(requestBody),
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
