import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Vote } from "../models/vote.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleContestantVote = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestant ID");
  }

  // Check if user is trying to vote to their own profile
  if (String(contestantId) === String(req.user?._id)) {
    throw new ApiError(400, "User cannot vote to their own profile");
  }

  if (req.user?.role === "contestant") {
    throw new ApiError(400, "Contestant can't vote contestants");
  }

  const contestant = await User.findById(contestantId);

  if (contestant?.role !== "contestant") {
    throw new ApiError(400, "Contestant Id does not belong to contestant");
  }

  const existingVote = await Vote.findOneAndDelete({
    contestant: contestantId,
    voter: req.user?._id,
  });

  if (existingVote) {
    return res.status(201).json(new ApiResponse(200, true, "Unvoted successfully"));
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
  const { page = 1, limit = 10, query } = req.query;
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
      contestant: new mongoose.Types.ObjectId(contestantId),
    },
  };

  let searchQuery = [];

  // Add additional query parameters if provided
  if (query) {
    searchQuery.push(
      { $unwind: "$voters" },
      // Match documents where either username or fullname partially matches the query
      {
        $match: {
          $or: [
            { "voters.username": { $regex: query, $options: "i" } },
            { "voters.fullname": { $regex: query, $options: "i" } },
          ],
        },
      },
      // Group back to restore the original structure and push matched followers into an array
      {
        $group: {
          _id: "$_id",
          voters: { $push: "$voters" },
        },
      }
    );
  }

  const aggregationPipeline = Vote.aggregate([
    match,
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "voter",
        as: "voters",
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
    ...(Object.keys(searchQuery).length !== 0 ? searchQuery : []),
    {
      $project: {
        _id: 0,
        voters: 1,
      },
    },
  ]);

  Vote.aggregatePaginate(aggregationPipeline, options)
    .then(function (results) {
      // Extract array of voters from the 'docs' property
      const voters = results.docs.map((doc) => doc.voters).flat();
      const response = {
        ...results,
        docs: voters,
      };
      return res
        .status(200)
        .json(new ApiResponse(200, response, "contestant voters fetched successfully"));
    })

    .catch(function (err) {
      throw new ApiError(500, err?.message || "Failed to get user contestant voters list");
    });
});

export { toggleContestantVote, getContestantVotersList };
