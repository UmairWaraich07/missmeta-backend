import { isValidObjectId } from "mongoose";
import { Saved } from "../models/saved.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Follow } from "../models/follow.model.js";

const toggleSaved = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const existingSaved = await Saved.findOneAndDelete({
    post: postId,
    user: req.user?._id,
  });

  if (existingSaved) {
    return res.status(200).json(new ApiResponse(200, true, "Post removed from saved collection"));
  } else {
    // add this post to the saved collection
    const saved = await Saved.create({
      post: postId,
      user: req.user?._id,
    });

    if (!saved) {
      throw new ApiError(500, "Failed to add video to saved collection");
    }

    return res.status(201).json(new ApiResponse(201, true, "Post added to the saved collection"));
  }
});

// TODO: isFollowing
const getUserSavedPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  // get the following list of logged in user
  const userFollowingList = (
    await Follow.find({
      follower: req.user?._id,
    }).select("profile")
  ).map((user) => user.profile);

  const options = {
    page,
    limit,
  };

  const aggregationPipeline = Saved.aggregate([
    {
      $match: {
        user: req.user?._id,
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
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "owner",
              pipeline: [
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
                $first: "$owner",
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
            $addFields: {
              likesCount: {
                $size: "$likes",
              },
              isSaved: true,

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
            },
          },
        ],
      },
    },
  ]);
  Saved.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      const posts = results.docs.map((doc) => doc.posts).flat();
      const response = {
        ...results,
        docs: posts,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "Saved posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch user saved posts");
    });
});

export { toggleSaved, getUserSavedPosts };
