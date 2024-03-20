import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { Vote } from "../models/vote.model.js";
import { ApiError } from "../utils/ApiError.js";

const toggleContestantVote = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestant ID");
  }

  // Check if user is trying to vote to their own profile
  if (String(contestantId) === String(req.user?._id)) {
    throw new ApiError(400, "User cannot vote to their own profile");
  }

  const existingVote = await Vote.findOneAndDelete({
    contestant: contestantId,
    voter: req.user?._id,
  });

  if (existingVote) {
    return res.status(201).json(new ApiResponse(201, true, "Unvoted successfully"));
  } else {
    // Vote to the contestant
    const newVote = await Vote.create({
      contestant: contestantId,
      voter: req.user?._id,
    });

    if (!newVote) {
      throw new ApiError(500, "Failed to vote contestant");
    }

    return res.status(201).json(new ApiResponse(201, true, "Voted successfully"));
  }
});

const getContestantVotersList = asyncHandler(async (req, res) => {
  const { page, limit, query } = req.query;
  const { contestantId } = req.params;

  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestant ID");
  }

  const options = {
    page,
    limit,
  };

  // Construct match stage for filtering
  const match = {
    $match: {
      contestant: new mongoose.Schema.ObjectId(contestantId),
    },
  };

  // Add additional query parameters if provided
  if (query) {
    match.$match.$or = [
      { username: { $regex: query, $options: "i" } },
      { displayName: { $regex: query, $options: "i" } },
    ];
  }

  const aggregationPipeline = Vote.aggregate([
    match,
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "voter",
        as: "voter",
      },
    },
    {
      $addFields: {
        $first: "$voter",
      },
    },
    {
      $project: {
        _id: "$voter._id",
        fullname: "$voter.displayName",
        username: "$voter.username",
        profilePhoto: "$voter.profilePhoto",
      },
    },
  ]);

  Vote.aggregatePaginate(aggregationPipeline, options)
    .then(function (results) {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results[0], "contestant voters fetched successfully"));
    })
    .catch(function (err) {
      throw new ApiError(500, err?.message || "Failed to get user contestant voters list");
    });
});

export { toggleContestantVote, getContestantVotersList };
