import { Saved } from "../models/saved.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSaved = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Video ID");
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

const getUserSavedPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

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
        as: "post",
        pipeline: [
          {
            $lookup: {
              from: "profiles",
              foreignField: "user",
              localField: "owner",
              as: "owner",
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
  Saved.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results, "Saved posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch user saved posts");
    });
});

export { toggleSaved, getUserSavedPosts };
