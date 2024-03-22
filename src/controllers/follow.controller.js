import { asyncHandler } from "../utils/asyncHandler.js";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleFollow = asyncHandler(async (req, res) => {
  const { profileId } = req.params;

  // Validate profileId
  if (!profileId || !isValidObjectId(profileId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  // Check if user is trying to follow their own account
  if (String(profileId) === String(req.user?._id)) {
    throw new ApiError(400, "User cannot subscribe to their own account");
  }

  const existingFollowing = await Follow.findOneAndDelete({
    profile: profileId,
    follower: req.user?._id,
  });

  if (existingFollowing) {
    return res.status(200).json(new ApiResponse(200, true, "Unfollowed successfully"));
  } else {
    // Follow the user
    const newFollower = await Follow.create({
      profile: profileId,
      follower: req.user?._id,
    });

    if (!newFollower) {
      throw new ApiError(500, "Failed to follow");
    }

    return res.status(201).json(new ApiResponse(201, true, "Followed successfully"));
  }
});

const getFollowersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query } = req.query;
  const { profileId } = req.params;

  // Validate profileId
  if (!profileId || !isValidObjectId(profileId)) {
    throw new ApiError(400, "Invalid profile ID");
  }

  const options = {
    page,
    limit,
  };

  // Construct match stage for filtering
  const match = {
    $match: {
      profile: new mongoose.Types.ObjectId(profileId),
    },
  };

  // Initialize searchQuery
  let searchQuery = [];

  // Add additional query parameters if provided
  if (query) {
    searchQuery.push(
      { $unwind: "$followers" },
      // Match documents where either username or fullname partially matches the query
      {
        $match: {
          $or: [
            { "followers.username": { $regex: query, $options: "i" } },
            { "followers.fullname": { $regex: query, $options: "i" } },
          ],
        },
      },
      // Group back to restore the original structure and push matched followers into an array
      {
        $group: {
          _id: "$_id",
          followers: { $push: "$followers" },
        },
      }
    );
  }

  const aggregationPipeline = Follow.aggregate([
    match,
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "follower",
        as: "followers",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              profilePhoto: 1,
            },
          },
        ],
      },
    },
    // Include searchQuery pipeline only if it's not an empty object
    ...(Object.keys(searchQuery).length !== 0 ? searchQuery : []),
    {
      $project: {
        _id: 0,
        followers: 1,
      },
    },
  ]);

  Follow.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      // Extract array of voters from the 'docs' property
      const followers = results.docs.map((doc) => doc.followers).flat();
      const response = {
        ...results,
        docs: followers,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "User followers list fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get user followers list");
    });
});

const getFollowingList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query } = req.query;
  const { profileId } = req.params;

  // Validate profileId
  if (!profileId || !isValidObjectId(profileId)) {
    throw new ApiError(400, "Invalid profile ID");
  }

  const options = {
    page,
    limit,
  };

  // Construct match stage for filtering
  const match = {
    $match: {
      follower: new mongoose.Types.ObjectId(profileId),
    },
  };

  // Initialize searchQuery
  let searchQuery = [];

  // Add additional query parameters if provided
  if (query) {
    searchQuery.push(
      { $unwind: "$following" },
      // Match documents where either username or fullname partially matches the query
      {
        $match: {
          $or: [
            { "following.username": { $regex: query, $options: "i" } },
            { "following.fullname": { $regex: query, $options: "i" } },
          ],
        },
      },
      // Group back to restore the original structure and push matched followers into an array
      {
        $group: {
          _id: "$_id",
          following: { $push: "$following" },
        },
      }
    );
  }

  const aggregationPipeline = Follow.aggregate([
    match,
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "profile",
        as: "following",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              profilePhoto: 1,
            },
          },
        ],
      },
    },
    // Include searchQuery pipeline only if it's not an empty object
    ...(Object.keys(searchQuery).length !== 0 ? searchQuery : []),
    {
      $project: {
        _id: 0,
        following: 1,
      },
    },
  ]);

  Follow.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      // Extract array of voters from the 'docs' property
      const following = results.docs.map((doc) => doc.following).flat();
      const response = {
        ...results,
        docs: following,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "User following list fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get user following list");
    });
});

export { toggleFollow, getFollowersList, getFollowingList };
