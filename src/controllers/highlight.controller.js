import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Highlight } from "../models/highlight.modal.js";
import { isValidObjectId } from "mongoose";

const createProfileHighlight = asyncHandler(async (req, res) => {
  const { title, postId } = req.body;

  if (!title || !postId) {
    throw new ApiError(400, "Title and Post ID is required to create highlight");
  }

  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "Highlight cover is required");
  }

  const cover = await uploadOnCloudinary(coverLocalPath);

  if (!cover.url) {
    throw new ApiError(404, "Failed to upload the highlight cover on cloudinary", cover);
  }

  const highlight = await Highlight.create({
    owner: req.user?._id,
    title,
    post: postId,
    cover: {
      url: cover.url,
      public_id: cover.public_id,
    },
  });

  if (!highlight) {
    throw new ApiError(500, "Failed to create the highlight");
  }

  return res.status(201).json(new ApiResponse(201, highlight, "Highlight created successfully"));
});

const editProfileHighlight = asyncHandler(async (req, res) => {
  const { title, cover } = req.body;
  const { highlightId } = req.params;
  const newCoverLocalPath = req.file?.path;
  if (!title) {
    throw new ApiError(400, "Highlight title is required");
  }
  if (!cover && !newCoverLocalPath) {
    throw new ApiError(400, "Highlight cover is required");
  }
  if (!highlightId || !isValidObjectId(highlightId)) {
    throw new ApiError(400, "Invalid highlight id");
  }

  let newCover;
  if (newCoverLocalPath) {
    // upload it on cloudinary
    newCover = await uploadOnCloudinary(newCoverLocalPath);
    console.log(`Highlight cover uploaded on cloudinary, ${newCover}`);
  }

  const highlight = await Highlight.findById(highlightId);

  const updatedHighlight = await Highlight.findByIdAndUpdate(
    highlightId,
    {
      $set: {
        title: title,
        cover: newCover
          ? {
              url: newCover.url,
              public_id: newCover.public_id,
            }
          : cover,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedHighlight) {
    throw new ApiError(500, "Failed to edit the profile highlight");
  }
  // delete the already uploaded highlight cover ID
  if (newCoverLocalPath && updatedHighlight?.cover?.public_id) {
    await deleteImageFromCloudinary(highlight.cover.public_id);
    console.log(`Existing highlight cover deleted successfully from cloudinary`);
  }

  // Find the updated highlight
  return res
    .status(200)
    .json(new ApiResponse(200, updatedHighlight, "Profile highlight edited successfully"));
});

const deleteProfileHighlight = asyncHandler(async (req, res) => {
  const { highlightId } = req.params;

  if (!highlightId || !isValidObjectId(highlightId)) {
    throw new ApiError(400, "Invalid highlight id");
  }

  const highlight = await Highlight.findOneAndDelete({
    _id: highlightId,
    owner: req.user?._id,
  });
  if (!highlight) {
    throw new ApiError(500, "Failed to delete the profile highlight");
  }

  if (highlight?.cover?.public_id) {
    await deleteImageFromCloudinary(highlight.cover.public_id);
  }

  return res.status(200).json(new ApiResponse(200, true, "Profile highlight deleted successfully"));
});

const getProfileHighlights = asyncHandler(async (req, res) => {
  const highlights = await Highlight.find({
    owner: req.user?._id,
  });

  if (!highlights) {
    throw new ApiError(500, "Failed to get the profile highlights of this user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, highlights, "Profile highlights fetched successfully"));
});

const getProfileHighlightById = asyncHandler(async (req, res) => {
  const { highlightId } = req.params;

  if (!highlightId || !isValidObjectId(highlightId)) {
    throw new ApiError(400, "Invalid highlight id");
  }

  const highlight = await Highlight.findById(highlightId).populate("post");
  if (!highlight) {
    throw new ApiError(500, "Failed to get this profile highlight");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, highlight, "Profile highlight fetched successfully"));
});

export {
  createProfileHighlight,
  editProfileHighlight,
  deleteProfileHighlight,
  getProfileHighlights,
  getProfileHighlightById,
};
