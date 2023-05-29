import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import crypto from "crypto";

dotenv.config();

export class MediaController {
  async getMedia(id) {
    const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${id}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.WP_BEARER_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async downloadMedia(fileUrl) {
    try {
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${process.env.WP_BEARER_TOKEN}`,
        },
      });
      if (!response.ok) {
        throw new Error(
          `Error downloading the file. Status code: ${response.status}`
        );
      }

      const fileExtension = this.getFileExtension(response.headers);
      const tempFilename = crypto.randomBytes(16).toString("hex");
      const filePath = path.join("./tmp/", `${tempFilename}${fileExtension}`);

      const dest = fs.createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        response.body.pipe(dest);
        dest.on("finish", resolve);
        dest.on("error", reject);
      });

      const fileBuffer = fs.readFileSync(filePath);
      const base64File = `data:${this.getMimeType(
        fileExtension
      )};base64,${fileBuffer.toString("base64")}`;

      fs.unlinkSync(filePath);

      return base64File;
    } catch (error) {
      console.error("Error saving or reading the file:", error);
      throw error;
    }
  }

  getMimeType(fileExtension) {
    switch (fileExtension) {
      case ".txt":
        return "text/plain";
      case ".pdf":
        return "application/pdf";
      case ".ppt":
      case ".pptx":
        return "application/vnd.ms-powerpoint";
      case ".doc":
      case ".docx":
        return "application/msword";
      case ".xls":
      case ".xlsx":
        return "application/vnd.ms-excel";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".mp4":
        return "video/mp4";
      case ".3gp":
        return "video/3gp";
      case ".webp":
        return "image/webp";
      case ".aac":
        return "audio/aac";
      case ".mp3":
        return "audio/mp3";
      case ".mpeg":
        return "audio/mpeg";
      case ".amr":
        return "audio/amr";
      case ".ogg":
        return "audio/ogg";
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      default:
        return "application/octet-stream";
    }
  }

  getFileExtension(headers) {
    const contentType = headers.get("content-type");
    if (contentType) {
      const match = contentType.match(/\/(\w+)$/);
      if (match) {
        return `.${match[1]}`;
      }
    }
    return ".tmp";
  }
}
