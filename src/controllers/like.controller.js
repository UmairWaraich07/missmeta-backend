import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Follow } from "../models/follow.model.js";

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Post ID");
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
  const { page = 1, limit = 9 } = req.query;

  // get the following list of logged in user
  const userFollowingList = (
    await Follow.find({
      follower: req.user?._id,
    }).select("profile")
  ).map((user) => user.profile);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const aggregationPipeline = Like.aggregate([
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
        as: "posts",
        pipeline: [
          {
            $match: {
              status: "pending",
            },
          },
          {
            $lookup: {
              // populate the profile information of the owner of the post
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "owner",
              pipeline: [
                {
                  // get the posts of the user that role is active not suspended
                  $match: {
                    isActive: true,
                  },
                },
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    profilePhoto: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$owner", 0], // Extract the first element from the owner array
              },
            },
          },
          {
            $lookup: {
              from: "likes",
              foreignField: "post",
              localField: "_id",
              as: "likes",
            },
          },
          {
            $lookup: {
              from: "saveds",
              foreignField: "post",
              localField: "_id",
              as: "postSaveds",
            },
          },
          {
            $addFields: {
              likesCount: {
                $size: "$likes",
              },
              isSaved: {
                $cond: {
                  if: { $in: [req.user?._id, "$postSaveds.user"] },
                  then: true,
                  else: false,
                },
              },
              isLiked: {
                $cond: {
                  if: { $in: [req.user?._id, "$likes.likedBy"] },
                  then: true,
                  else: false,
                },
              },
              isFollowing: {
                $cond: {
                  if: { $in: ["$owner._id", userFollowingList] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              likes: 0,
              postSaveds: 0,
            },
          },
        ],
      },
    },
  ]);

  Like.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      const posts = results.docs.map((doc) => doc.posts).flat();
      const response = {
        ...results,
        docs: posts,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "User liked posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch the user liked posts");
    });
});

const getPostLikes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query } = req.query;
  const { postId } = req.params;

  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Post ID provided");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // Initialize searchQuery
  let searchQuery = [];

  // Add additional query parameters if provided
  if (query) {
    searchQuery.push(
      // Match documents where either username or fullname partially matches the query
      {
        $match: {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { fullname: { $regex: query, $options: "i" } },
          ],
        },
      }
    );
  }

  const aggregationPipeline = Like.aggregate([
    {
      $match: {
        post: new mongoose.Types.ObjectId(postId),
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
            $match: {
              isActive: true,
            },
          },
          // Include searchQuery pipeline only if it's not an empty object
          ...(Object.keys(searchQuery).length !== 0 ? searchQuery : []),
          {
            $project: {
              fullname: 1,
              username: 1,
              profilePhoto: 1,
            },
          },
        ],
      },
    },
  ]);

  Like.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      const likedBy = results.docs.map((doc) => doc.likedBy).flat();
      const response = {
        ...results,
        docs: likedBy,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "Post Likes fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get likes for this post.");
    });
});

const getPostLikesCount = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate Post ID
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Post ID provided");
  }

  const likesCount = await Like.countDocuments({
    post: postId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, likesCount, "Post likes count fetched successfully"));
});

export { togglePostLike, getUserLikedPosts, getPostLikes, getPostLikesCount };
