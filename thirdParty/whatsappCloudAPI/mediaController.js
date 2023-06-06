import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import FormData from "form-data";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath(ffmpegStatic);
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
      console.log(`API request failed:`, error);
    }
  }

  async convertAudioToMP3(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .output(outputFilePath)
        .on("end", () => resolve())
        .on("error", (error) => reject(error))
        .run();
    });
  }

  async uploadMedia(base64File, mime_type) {
    const fileExtension = this.getExtensionFromMimeType(mime_type);
    const tempFilename = crypto.randomBytes(4).toString("hex");
    const filePath = path.join("./tmp/", `${tempFilename}${fileExtension}`);
    let convertedFilePath = filePath;

    try {
      await fs.writeFileSync(filePath, base64File.replace(/^data:[^,]+,/, ""), {
        encoding: "base64",
      });

      const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${process.env.WP_PHONE_ID}/media`;
      const formData = new FormData();

      if (mime_type == "audio/mpeg") {
        convertedFilePath = path.join("./tmp/", `${tempFilename}.mp3`);
        await this.convertAudioToMP3(filePath, convertedFilePath);
      }

      formData.append("file", fs.createReadStream(convertedFilePath), {
        contentType: mime_type,
      });

      formData.append("messaging_product", "whatsapp");

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${process.env.WP_BEARER_TOKEN}`,
          ...formData.getHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log(`API request failed:`, error);
    } finally {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
        if (fs.existsSync(convertedFilePath)) {
          await fs.promises.unlink(convertedFilePath);
        }
      } catch (error) {}
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

  getExtensionFromMimeType(mimeType) {
    const mimeTypesMap = {
      "text/plain": ".txt",
      "application/pdf": ".pdf",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/msword": ".doc",
      "application/vnd.ms-excel": ".xls",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "video/mp4": ".mp4",
      "video/3gp": ".3gp",
      "image/webp": ".webp",
      "audio/aac": ".aac",
      "audio/mp3": ".mp3",
      "audio/mpeg": ".mpeg",
      "audio/amr": ".amr",
      "audio/ogg": ".ogg",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        ".pptx",
      "application/octet-stream": "",
    };

    return mimeTypesMap[mimeType] || "";
  }
}
