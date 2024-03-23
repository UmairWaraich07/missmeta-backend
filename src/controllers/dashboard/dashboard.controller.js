import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";
import pLimit from "p-limit";
import { Advertisement } from "../../models/advertisement.model.js";
import { User } from "../../models/user.model.js";
import { Post } from "../../models/post.model.js";
import { Like } from "../../models/like.model.js";
import { Highlight } from "../../models/highlight.modal.js";
import { Vote } from "../../models/vote.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { Notification } from "../../models/notifcation.model.js";
import {
  deleteImageFromCloudinary,
  deleteResourcesFromCloudinary,
  uploadOnCloudinary,
} from "../../utils/cloudinary.js";
import { Saved } from "../../models/saved.model.js";
import { Follow } from "../../models/follow.model.js";
import {
  calculateDurationInSeconds,
  getImagePublicIds,
  getVideoPublicIds,
} from "../../utils/index.js";

const createAdvertisement = asyncHandler(async (req, res) => {
  // It's optional, but required for creating individual advertisements
  const { contestantId } = req.query;
  const { type, startDate, endDate, startTime, endTime, hyperLink, individualAdType } = req.body;
  const adImages = req.files;

  //   Validations
  if (contestantId) {
    if (!isValidObjectId(contestantId)) {
      throw new ApiError(400, "Invalid advertisement ID");
    }
  }
  if (
    [type, startDate, endDate, startTime, endTime, hyperLink].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!adImages || adImages.length === 0) {
    throw new ApiError(400, "Advertisement images are required");
  }

  //   extract the local paths from ad images array received from multer
  const adImagesLocalPath = adImages.map((image) => image.path);

  //   upload the images to the cloudinary concurrently using plimit
  const limit = pLimit(3);
  const imagesToUpload = adImagesLocalPath.map((imageLocalPath) => {
    return limit(async () => {
      const response = await uploadOnCloudinary(imageLocalPath);
      return response;
    });
  });

  const uploads = await Promise.all(imagesToUpload);
  if (!uploads.every((upload) => upload)) {
    throw new ApiError(500, "Failed to upload one or more ad images to Cloudinary");
  }

  const durationInSeconds = calculateDurationInSeconds(startDate, endDate, startTime, endTime);

  //   create the advertisement
  const advertisementImages = uploads.map((upload) => ({
    url: upload.url,
    public_id: upload.public_id,
  }));

  const advertisement = await Advertisement.create({
    ...req.body,
    images: advertisementImages,
    contestant: contestantId ? contestantId : null,
    createdBy: req.admin?._id, // only add contestant Id if there is contestant Id
    durationInSeconds: durationInSeconds,
    isActive: false,
  });

  if (!advertisement) {
    throw new ApiError(500, "Failed to create the advertisement");
  }

  // If it's an individual advertisement, link it to the contestant profile
  if (contestantId && type === "individual") {
    try {
      const profileUpdate = {};
      if (individualAdType === "primary") {
        profileUpdate.primaryAdvertisement = advertisement._id;
      } else if (individualAdType === "secondary") {
        profileUpdate.secondaryAdvertisement = advertisement._id;
      }

      const response = await User.findByIdAndUpdate(contestantId, profileUpdate, { new: true });
      if (!response) {
        throw new ApiError(
          500,
          `Failed to link ${individualAdType} advertisement with contestant profile`
        );
      }
    } catch (error) {
      throw new ApiError(500, `Failed to update contestant profile: ${error.message}`);
    }
  }

  return res
    .status(201)
    .json(new ApiResponse(201, advertisement, "Advertisement created successfully"));
});

const editAdvertisement = asyncHandler(async (req, res) => {
  const { advertisementId } = req.params;
  const { startDate, endDate, startTime, endTime, hyperLink } = req.body;

  //   Validations
  if (!advertisementId || !isValidObjectId(advertisementId)) {
    throw new ApiError(400, "Invalid advertisement ID");
  }
  if ([startDate, endDate, startTime, endTime, hyperLink].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const durationInSeconds = calculateDurationInSeconds(startDate, endDate, startTime, endTime);

  const editedAdvertisement = await Advertisement.findByIdAndUpdate(advertisementId, {
    $set: {
      startDate,
      endDate,
      startTime,
      endTime,
      hyperLink,
      durationInSeconds: durationInSeconds,
    },
  });

  if (!editedAdvertisement) {
    throw new ApiError(500, "Failed to edit the advertisement");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, editedAdvertisement, "Advertisement edited successfully"));
});

const toggleAdvertisementStatus = asyncHandler(async (req, res) => {
  const { advertisementId } = req.params;

  //   Validations
  if (!advertisementId || !isValidObjectId(advertisementId)) {
    throw new ApiError(400, "Invalid advertisement ID");
  }

  // Find the advertisement by ID
  const advertisement = await Advertisement.findById(advertisementId);

  // Ensure the advertisement exists
  if (!advertisement) {
    throw new ApiError(404, "Advertisement not found");
  }

  // Check the current status of the advertisement
  const isActive = !advertisement.isActive;

  // Update the advertisement status
  const updatedAdvertisement = await Advertisement.findByIdAndUpdate(
    advertisementId,
    { isActive },
    { new: true }
  );

  // If the advertisement is now active, deactivate all other global advertisements
  if (isActive && updatedAdvertisement.type === "global") {
    await Advertisement.updateMany(
      { _id: { $ne: advertisementId }, type: "global", isActive: true },
      { isActive: false }
    );
  }

  // Send response
  res.status(200).json({
    status: "success",
    data: updatedAdvertisement,
    message: `Advertisement ${isActive ? "activated" : "inactivated"} successfully`,
  });
});

const getAdvertisements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, filter } = req.query;
  const options = {
    page,
    limit,
  };

  // Filter by query params
  const match = {
    $match: {},
  };
  if (filter) {
    match.$match = {
      type: filter,
    };
  }
  const aggregationPipeline = Advertisement.aggregate([
    match,
    {
      $sort: {
        createdAt: -1,
        isActive: -1,
      },
    },
  ]);

  Advertisement.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      return res
        .status(200)
        .json(new ApiResponse(200, results, "Advertisements list fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to get list of advertisemets");
    });
});

const getAllContestants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, filter, input } = req.query;

  // Construct match stage for filtering
  const match = {
    role: "contestant",
  };

  // Add additional query parameters if provided
  if (query) {
    match.$or = [
      { username: { $regex: query, $options: "i" } },
      { fullname: { $regex: query, $options: "i" } },
    ];
  }

  const options = {
    page: parseInt(page),
    limit: input ? parseInt(input) : parseInt(limit),
  };

  // Construct sort options based on filter and input values
  let sortOptions = {};
  if (filter) {
    switch (filter) {
      case "new_contestants":
        sortOptions.$sort = { createdAt: -1 };
        break;
      case "old_contestants":
        sortOptions.$sort = { createdAt: 1 };

        break;
      case "top_voted":
        sortOptions.$sort = { votesCount: -1 };
        break;
    }
  } else if (input && !isNaN(input)) {
    sortOptions.$sort = { votesCount: -1 };
  }

  const pipeline = [
    {
      $match: match,
    },
    {
      $lookup: {
        from: "votes",
        foreignField: "contestant",
        localField: "_id",
        as: "votes",
      },
    },
    {
      $addFields: {
        votesCount: { $size: "$votes" },
      },
    },
    {
      $project: { votes: 0, password: 0, refreshToken: 0 },
    },
  ];
  // Add sort stage if it's not an empty object
  if (Object.keys(sortOptions).length !== 0) {
    pipeline.splice(1, 0, sortOptions);
  }

  const aggregatePipeline = User.aggregate(pipeline);

  User.aggregatePaginate(aggregatePipeline, options)
    .then((results) => {
      return res
        .status(200)
        .json(new ApiResponse(200, results, "Contestants fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch the contestants");
    });
});

const toggleActiveContestant = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  // Validations
  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestantId ID");
  }

  const user = await User.findById(contestantId);
  if (!user) {
    throw new ApiError(404, "Contestant not found");
  }

  // Toggle isActive status
  user.isActive = !user.isActive;

  try {
    const response = await user.save({
      validateBeforeSave: false,
    });
    if (response) {
      return res
        .status(200)
        .json(new ApiResponse(200, response, "Contestant's active status updated successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Failed to update contestant's active status");
  }
});

const deleteAContestant = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  // Validations
  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestantId ID");
  }

  // delete the contestant profile
  const deletedUser = await User.findByIdAndDelete(contestantId);
  if (!deletedUser) {
    throw new ApiError(404, "Contestant profile not found");
  }

  // get all the posts of this user
  const posts = await Post.find({
    owner: contestantId,
  });

  // delete all the posts related to this user
  await Post.deleteMany({
    owner: contestantId,
  });

  // Delete posts and associated data (saved, likes)
  for (const post of posts) {
    await Promise.all([Saved.deleteMany({ post: post._id }), Like.deleteMany({ post: post._id })]);
  }

  // Delete follows related to the contestant
  await Follow.deleteMany({
    $or: [{ profile: contestantId }, { follower: contestantId }],
  });

  // Delete user subscription
  await Subscription.deleteOne({
    userId: contestantId,
  });

  // Delete notifications sent to or received from the contestant
  await Notification.deleteMany({
    $or: [{ sender: contestantId }, { recipient: contestantId }],
  });

  // delete all the votes this contestant got
  await Vote.deleteMany({
    contestant: contestantId,
  });

  // delete all the highlights created by this contestant
  await Highlight.deleteMany({
    owner: contestantId,
  });

  // delete all individual advertisements related to this contestant
  await Advertisement.deleteMany({
    contestant: contestantId,
  });

  const imagePublicIds = getImagePublicIds(posts);
  const videoPublicIds = getVideoPublicIds(posts);

  await deleteResourcesFromCloudinary(imagePublicIds, "image");
  await deleteResourcesFromCloudinary(videoPublicIds, "video");

  return res
    .status(200)
    .json(new ApiResponse(200, true, "Contestant and associated data deleted successfully"));
});

const deleteAdvertisement = asyncHandler(async (req, res) => {
  const { advertisementId } = req.params;

  // Validations
  if (!advertisementId || !isValidObjectId(advertisementId)) {
    throw new ApiError(400, "Invalid advertisementId ID");
  }

  const advertisement = await Advertisement.findById(advertisementId);
  // Handle deletion of primary and secondary advertisements for individual type advertisements
  if (advertisement?.type === "individual") {
    // check the type of individual advertisement and delete it from contestant profile
    if (advertisement.individualAdType === "primary") {
      const response = await User.findByIdAndUpdate(advertisement.contestant, {
        $unset: {
          primaryAdvertisement: 1,
        },
      });
      if (!response) {
        throw new ApiError(500, "Failed to remove the primary advertisement from contestant");
      }
    } else if (advertisement.individualAdType === "secondary") {
      const response = await User.findByIdAndUpdate(advertisement.contestant, {
        $unset: {
          secondaryAdvertisement: 1,
        },
      });
      if (!response) {
        throw new ApiError(500, "Failed to remove the secondary advertisement from contestant");
      }
    }
  }

  const deletedResponse = await Advertisement.findByIdAndDelete(advertisementId);
  if (!deletedResponse) {
    throw new ApiError(500, "Failed to delete the advertisement");
  }

  // Delete images from Cloudinary associated with the advertisement
  const limit = pLimit(3);
  const filesToRemove = advertisement.images.map((file) => {
    return limit(async () => {
      const response = await deleteImageFromCloudinary(file.public_id);
      console.log(`Image deleted from cloudinary, ${response}`);
      return response;
    });
  });

  await Promise.all(filesToRemove);

  return res
    .status(200)
    .json(new ApiResponse(200, true, "Advertisement has been deleted successfully"));
});

export {
  createAdvertisement,
  editAdvertisement,
  toggleAdvertisementStatus,
  getAllContestants,
  toggleActiveContestant,
  deleteAdvertisement,
  getAdvertisements,
  deleteAContestant,
};
