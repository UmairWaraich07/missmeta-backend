import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

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
      // transformation: {
      //   width: 1080,
      //   height: 1080,
      //   crop: "fill",
      //   // quality: "auto", // TODO: reverify to add this field as this will increase the transformations
      // },
    });

    if (!response) {
      throw new ApiError(500, "Failed to upload image on cloudinary");
    }

    console.log(`File uploaded on cloudinary successfully, ${response}`);
    // once the file uploaded successfully delete local copy of the file
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file
    console.log(`Failed to upload the file on cloudinary: ${error}`);
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.log("No public Id to delete image from cloudinary");
      return;
    }
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    console.log("File deleted from cloudinary", response);

    return response;
  } catch (error) {
    console.log(`Failed to delete file from cloudinary: ${error}`);
  }
};

const deleteVideosFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) {
      throw new ApiError(400, "PublicId is required to delete file from cloudinary");
    }
    const response = await cloudinary.api.delete_resources([publicIds], {
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

const deleteResourcesFromCloudinary = async (pubicIds, resource_type) => {
  try {
    if (!pubicIds || pubicIds.length === 0) {
      console.log("No resources to delete");
      return;
    }
    const response = await cloudinary.api
      .delete_resources(pubicIds, {
        resource_type: resource_type,
      })
      .then((result) => console.log("Resources deleted", result));
    return response;
  } catch (error) {
    console.log(`Failed to delete resources from cloudinary: ${error}`);
  }
};

export {
  uploadOnCloudinary,
  deleteVideosFromCloudinary,
  deleteImageFromCloudinary,
  deleteResourcesFromCloudinary,
};
