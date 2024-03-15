import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      transformation: {
        width: 1080,
        height: 1080,
        crop: "fill",
        quality: "auto", // TODO: reverify to add this field as this will increase the transformations
      },
    });

    console.log(`File uploaded on cloudinary successfully, ${response}`);
    // TODO: remove the locally saved temporary file
    // once the file uploaded successfully delete local copy of the file
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file
    console.log(`Failed to upload the file on cloudinary: ${error}`);
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new ApiError(400, "PublicId is required to delete file from cloudinary");
    }
    const response = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });

    console.log("File deleted from cloudinary", response);

    return response;
  } catch (error) {
    console.log(`Failed to delete file from cloudinary: ${error}`);
  }
};

const deleteVideosFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new ApiError(400, "PublicId is required to delete file from cloudinary");
    }
    const response = await cloudinary.api.delete_resources([publicId], {
      type: "upload",
      resource_type: "video",
      invalidate: true,
    });

    console.log("File deleted from cloudinary", response);

    return response;
  } catch (error) {
    console.log(`Failed to delete file from cloudinary: ${error}`);
  }
};

export { uploadOnCloudinary, deleteVideosFromCloudinary, deleteImageFromCloudinary };
