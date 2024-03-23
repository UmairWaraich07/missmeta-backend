import {
  deleteImageFromCloudinary,
  deleteVideosFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { Saved } from "../models/saved.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import pLimit from "p-limit";

/** Associated with contestant */
const createPost = asyncHandler(async (req, res) => {
  const { caption, location } = req.body;

  // make sure the status of the user before creating post
  const user = await User.findById(req.user?._id);
  if (user?.role !== "contestant") {
    throw new ApiError(400, "Only contestants are allowed to upload posts");
  }

  //   extract the local paths from ad images array received from multer
  const imagesLocalPath = req?.files.map((image) => image.path);

  //   upload the images to the cloudinary concurrently using plimit
  const limit = pLimit(3);
  const imagesToUpload = imagesLocalPath.map((imageLocalPath) => {
    return limit(async () => {
      const response = await uploadOnCloudinary(imageLocalPath);
      return response;
    });
  });

  const uploads = await Promise.all(imagesToUpload);
  if (!uploads.every((upload) => upload?.url)) {
    throw new ApiError(500, "Failed to upload one or more ad images to Cloudinary");
  }

  //   create the post
  const postImages = uploads.map((upload) => ({
    url: upload.url,
    public_id: upload.public_id,
    type: upload.resource_type,
  }));

  const post = await Post.create({
    owner: req.user?._id,
    caption,
    location,
    media: postImages,
    type: uploads[0]?.resource_type,
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
    throw new ApiError(400, "Invalid post ID");
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

  // get the array of users posts and videos
  const media = response.media;

  const limit = pLimit(3);
  const filesToRemove = media.map((file) => {
    return limit(async () => {
      if (file.type === "image") {
        const response = await deleteImageFromCloudinary(file.public_id);
        console.log(`Image deleted from cloudinary, ${response}`);
        return response;
      } else {
        const response = await deleteVideosFromCloudinary(file.public_id);
        console.log(`Video deleted fro cloudinary, ${response}`);
        return response;
      }
    });
  });

  await Promise.all(filesToRemove);

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

  // get the following list of logged in user
  const userFollowingList = (
    await Follow.find({
      follower: req.user?._id,
    }).select("profile")
  ).map((user) => user.profile);

  const post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
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
  ]);

  if (!post) {
    throw new ApiError(500, "Failed to fetch the post data");
  }

  return res.status(200).json(new ApiResponse(200, post[0], "Post data fetched successfully"));
});

const getUserFeedPosts = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;

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

  const aggregationPipeline = Post.aggregate([
    {
      $match: {
        owner: {
          $in: userFollowingList,
        },
        status: "pending",
      },
    },
    {
      $sort: {
        createdAt: -1,
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
            if: { $in: [userId, "$postSaveds.user"] },
            then: true,
            else: false,
          },
        },
        isLiked: {
          $cond: {
            if: { $in: [userId, "$likes.likedBy"] },
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
  ]);

  Post.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
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
      $match: {
        status: "pending",
      },
    },
    {
      $sort: {
        createdAt: -1,
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
        owner: {
          $first: "$owner",
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
      return res
        .status(200)
        .json(new ApiResponse(200, results, "Guest feed posts fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get feed posts for guest");
    });
});

export { createPost, editPost, deletePost, getPostById, getUserFeedPosts, getGuestFeedPosts };
