import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    return null;
  }

  console.log("Uploading file:", localFilePath);

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("Cloudinary upload successful:", response.url);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.log("========== CLOUDINARY ERROR ==========");
    console.log("message:", error.message);
    console.log("name:", error.name);
    console.log("http_code:", error.http_code);
    console.log("error:", JSON.stringify(error, null, 2));
    console.log("======================================");

    throw error;
  }
};
export { uploadOnCloudinary };
