import mongoose, { Mongoose, isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate videoId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const existingLike = await Like.findOneAndDelete({
    $and: [{ post: postId }, { likedBy: req.user?._id }],
  });

  if (existingLike) {
    return res.status(200).json(new ApiResponse(200, true, "Post like removed successfully"));
  } else {
    // Like the video
    const newLike = await Like.create({
      post: postId,
      likedBy: req.user?._id,
    });

    if (!newLike) {
      throw new ApiError(500, "Failed to like the post");
    }

    return res.status(201).json(new ApiResponse(201, true, "Post liked successfully"));
  }
});

const getUserLikedPosts = asyncHandler(async (req, res) => {
  const userLikedPosts = await Like.aggregate([
    {
      $match: {
        likedBy: req.user?._id,
      },
    },

    {
      $lookup: {
        from: "posts",
        foreignField: "_id",
        localField: "post",
        as: "post",
        pipeline: [
          {
            $lookup: {
              // populate the profile information the owner of the post
              from: "profiles",
              foreignField: "user",
              localField: "owner",
              as: "owner",
              pipeline: [
                {
                  // get the posts of the user that role is active not suspended
                  $match: {
                    status: "active",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      // return an array of liked videos
      $project: {
        likedBy: 0,
      },
    },
  ]);

  if (!userLikedPosts) {
    throw new ApiError(500, "Failed to fetch the user liked posts");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userLikedPosts[0], "User liked posts fetched successfully"));
});

const getPostLikes = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Post ID provided");
  }

  const postLikedBy = await Like.aggregate([
    {
      $match: {
        post: new mongoose.Schema.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "likedBy",
        as: "likedBy",
        pipeline: [
          {
            $project: {
              _id: 1,
              displayName: 1,
              username: 1,
              profilePhoto: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!postLikedBy) {
    throw new ApiError(500, "Failed to get likes for this post.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, postLikedBy[0], "Post Likes fetched successfully"));
});

export { togglePostLike, getUserLikedPosts, getPostLikes };
