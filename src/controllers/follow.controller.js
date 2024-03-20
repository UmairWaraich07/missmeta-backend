import { asyncHandler } from "../utils/asyncHandler";
import { Follow } from "../models/follow.model";
import { ApiError } from "../utils/ApiError";

const toggleFollow = asyncHandler(async (req, res) => {
  const { profileId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
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

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid profile ID");
  }

  const options = {
    page,
    limit,
  };

  // Construct match stage for filtering
  const match = {
    $match: {
      profile: new mongoose.Schema.ObjectId(profileId),
    },
  };

  // Add additional query parameters if provided
  if (query) {
    match.$match.$or = [
      { username: { $regex: query, $options: "i" } },
      { displayName: { $regex: query, $options: "i" } },
    ];
  }

  const aggregationPipeline = Follow.aggregate([
    match,
    {
      $lookup: {
        from: "profiles",
        foreignField: "_id",
        localField: "follower",
        as: "follower",
      },
    },
    {
      $addFields: {
        profile: {
          $first: "$follower",
        },
      },
    },
    {
      $project: {
        _id: "$follower._id",
        fullname: "$follower.displayName",
        username: "$follower.username",
        profilePhoto: "$follower.profilePhoto",
      },
    },
  ]);

  Follow.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results, "User followers fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get user followers list");
    });
});

const getFollowingList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query } = req.query;
  const { profileId } = req.params;

  // Validate postId
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
      follower: new mongoose.Schema.ObjectId(profileId),
    },
  };

  // Add additional query parameters if provided
  if (query) {
    match.$match.$or = [
      { username: { $regex: query, $options: "i" } },
      { displayName: { $regex: query, $options: "i" } },
    ];
  }

  const aggregationPipeline = Follow.aggregate([
    match,
    {
      $lookup: {
        from: "profiles",
        foreignField: "_id",
        localField: "profile",
        as: "following",
      },
    },
    {
      $addFields: {
        profile: {
          $first: "$following",
        },
      },
    },
    {
      $project: {
        _id: "$following._id",
        fullname: "$following.displayName",
        username: "$following.username",
        profilePhoto: "$following.profilePhoto",
      },
    },
  ]);

  Follow.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results, "User following fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get user following list");
    });
});

export { toggleFollow, getFollowersList, getFollowingList };
