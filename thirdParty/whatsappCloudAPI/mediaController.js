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
  mimeTypesMap = {
    ".txt": "text/plain",
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.ms-powerpoint",
    ".doc": "application/msword",
    ".docx": "application/msword",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.ms-excel",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".3gp": "video/3gp",
    ".webp": "image/webp",
    ".aac": "audio/aac",
    ".mp3": "audio/mp3",
    ".mpeg": "audio/mpeg",
    ".amr": "audio/amr",
    ".ogg": "audio/ogg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
    "application/octet-stream": "",
  };

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
        console.log(`API request failed with status ${response.status}`);
        return {};
      }

      return await response.json();
    } catch (error) {
      console.log(`API request failed:`, error);
    }
  }

  async uploadMedia(base64File, mime_type) {
    const fileExtension = this.getExtensionFromMimeType(mime_type);
    const tempFilename = crypto.randomBytes(4).toString("hex");
    const filePath = path.join("./tmp/", `${tempFilename}${fileExtension}`);
    let convertedFilePath = filePath;

    try {
      await fs.promises.writeFile(
        filePath,
        base64File.replace(/^data:[^,]+,/, ""),
        {
          encoding: "base64",
        }
      );

      const url = `https://graph.facebook.com/${process.env.WP_API_VERSION}/${process.env.WP_PHONE_ID}/media`;
      const formData = new FormData();

      if (mime_type === "audio/mpeg") {
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
    return Object.keys(this.mimeTypesMap).find(
      (extension) => this.mimeTypesMap[extension] === mimeType
    );
  }

  getMimeType(fileExtension) {
    return this.mimeTypesMap[fileExtension] || "application/octet-stream";
  }

  async convertAudioToMP3(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .output(outputFilePath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });
  }
}
