import { uploadOnCloudinary } from "../utils/cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { Saved } from "../models/saved.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

/** Associated with contestant */
const createPost = asyncHandler(async (req, res) => {
  const { caption, location } = req.body;
  console.log(req.files);

  // make sure the status of the user before creating post
  const user = await User.findById(req.user?._id);
  if (!user?.role === "contestant") {
    throw new ApiError(400, "Only contestants are allowed to upload posts");
  }

  const mediaArray = req.files?.media; // an array of media files received from multer
  const mediaLocalPathArray = mediaArray.map((media) => media[0]?.path);

  let urlArray;
  mediaLocalPathArray.forEach(async (path) => {
    let response = await uploadOnCloudinary(mediaLocalPathArray);
    urlArray.push(response?.url);
  });

  if (!response) {
    throw new ApiError(500, "Failed to upload the files on cloudinary");
  }

  const post = await Post.create({
    owner: req.user?._id,
    caption,
    location,
    media: urlArray,
  });

  if (!post) {
    throw new ApiError(500, "Failed to create a post");
  }

  return res.status(201).json(new ApiResponse(201, post, "Post created successfully"));
});

const editPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { caption, location } = req.body;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const editedPost = await Post.findByIdAndUpdate(
    postId,
    {
      $set: {
        caption,
        location,
      },
    },
    {
      new: true,
    }
  );

  if (!editedPost) {
    throw new ApiError(500, "Failed to edit the post");
  }

  return res.status(200).json(new ApiResponse(200, editedPost, "Post edited successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const response = await Post.findByIdAndDelete(postId);
  if (!response) {
    throw new ApiError(500, "Failed to delete this video");
  }

  // after deletion of videoFile delete the video and images associated with that post from cloudinary
  //TODO:

  // Delete likes associated with the post
  await Like.deleteMany({ post: postId });

  // delete all the documents associated with then post from saved posts
  await Saved.deleteMany({
    post: postId,
  });

  return res.status(200).json(new ApiResponse(200, true, "Post deleted successfully"));
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || !isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const userFollowingList = await Follow.find({
    follower: req.user?._id,
  }).select("profile");
  console.log({ userFollowingList });

  const post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Schema.Types(postId),
      },
    },
    {
      $lookup: {
        from: "profiles",
        foreignField: "user",
        localField: "owner",
        as: "owner",
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
        foreignField: "user",
        localField: "owner",
        as: "userSaveds",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likesCount: {
          $size: "$likes",
        },
        isSaved: {
          cond: {
            if: { $in: [req.user?._id, "$userSaveds.user"] },
            then: true,
            else: false,
          },
        },
        isLiked: {
          cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
        isFollowing: {
          cond: {
            if: { $in: [req.user?._id, userFollowingList] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        likes: 0,
        userSaveds: 0,
      },
    },
  ]);

  if (!post) {
    throw new ApiError(500, "Failed to fetch the post data");
  }

  return res.status(200).json(new ApiResponse(200, post[0], "Post data fetched successfully"));
});

const getUserFeedPosts = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;

  const userFollowingList = await Follow.find({
    follower: userId,
  }).select("profile");

  const options = {
    page,
    limit,
  };

  const aggregationPipeline = Post.aggregate([
    {
      $match: {
        owner: {
          $in: userFollowingList,
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "profiles",
        foreignField: "user",
        localField: "owner",
        as: "owner",
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
        foreignField: "user",
        localField: "owner",
        as: "userSaveds",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likesCount: {
          $size: "$likes",
        },
        isSaved: {
          cond: {
            if: { $in: [req.user?._id, "$userSaveds.user"] },
            then: true,
            else: false,
          },
        },
        isLiked: {
          cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        likes: 0,
        userSaveds: 0,
      },
    },
  ]);

  Post.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results, "User feed posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch the user feed posts");
    });
});

const getSuggestedFeedPosts = asyncHandler(async (req, res) => {});

const getGuestFeedPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const options = {
    page,
    limit,
  };

  const aggregationPipeline = Post.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "profiles",
        foreignField: "user",
        localField: "owner",
        as: "owner",
        pipeline: [
          {
            $populate: {
              _id: 1,
              displayName: 1,
              username: 1,
              profilePhoto: 1,
            },
          },
        ],
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
      },
    },
    {
      $project: {
        likes: 0,
      },
    },
  ]);

  Post.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      console.log(results);
      return res
        .status(200)
        .json(new ApiResponse(200, results, "Guest feed posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get feed posts for guest");
    });
});

export { createPost, editPost, deletePost, getPostById, getUserFeedPosts, getGuestFeedPosts };
