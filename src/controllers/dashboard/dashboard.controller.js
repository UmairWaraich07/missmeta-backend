import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";
import pLimit from "p-limit";
import { Advertisement } from "../../models/advertisement.model.js";
import { Profile } from "../../models/profile.model.js";
import { User } from "../../models/user.model.js";
import { Post } from "../../models/post.model.js";
import { Like } from "../../models/like.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { Notification } from "../../models/notifcation.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { Saved } from "../../models/saved.model.js";
import { Follow } from "../../models/follow.model.js";

const createAdvertisement = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;
  const { type, startDate, endDate, startTime, endTime, hyperLink, individualAdType } = req.body;
  const adImages = req.files;

  //   Validations
  if (!isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid advertisement ID");
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

  //   create the advertisement
  const advertisementImages = uploads.map((upload) => ({
    url: upload.url,
    public_id: upload.public_id,
  }));

  const advertisement = await Advertisement.create({
    ...req.body,
    images: advertisementImages,
    contestant: contestantId ? contestantId : null, // only add contestant Id if there is contestant Id
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

      const response = await Profile.findByIdAndUpdate(contestantId, profileUpdate, { new: true });
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

  const editedAdvertisement = await Advertisement.findByIdAndUpdate(advertisementId, {
    $set: {
      startDate,
      endDate,
      startTime,
      endTime,
      hyperLink,
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
  const { page = 1, limit = 10 } = req.query;
  const options = {
    page,
    limit,
  };
  const aggregationPipeline = Advertisement.aggregate([
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
      { displayName: { $regex: query, $options: "i" } },
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
        sortOptions.createdAt = -1;
        break;
      case "old_contestants":
        sortOptions.createdAt = 1;
        break;
      case "top_voted":
        sortOptions.votesCount = -1;
        break;
    }
  }

  if (input) {
    sortOptions.votesCount = -1;
  }

  console.log(sortOptions);

  const aggregatePipeline = [
    { $match: match },
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
  ];

  //   only add $sort pipeline if it has an object for sorting
  if (Object.keys(sortOptions).length > 0) {
    aggregatePipeline.push({ $sort: sortOptions });
  }

  aggregatePipeline.push({
    $project: { votes: 0 },
  });

  try {
    const results = await Profile.aggregatePaginate(aggregatePipeline, options);
    return res.status(200).json(new ApiResponse(200, results, "Contestants fetched successfully"));
  } catch (err) {
    throw new ApiError(500, err?.message || "Failed to fetch the contestants");
  }
});

const toggleActiveContestant = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  // Validations
  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestantId ID");
  }

  const profile = await Profile.findById(contestantId);
  if (!profile) {
    throw new ApiError(404, "Contestant not found");
  }
  const userId = profile.user;

  // Toggle isActive status
  profile.isActive = !profile.isActive;
  const isActive = profile.isActive;

  const response = await profile.save({
    validateBeforeSave: false,
  });

  if (response) {
    // also update the status in the users collection
    await User.findByIdAndUpdate(
      userId,
      {
        isActive,
      },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, true, "Contestant's active status updated successfully"));
  }
});

const deleteAContestant = asyncHandler(async (req, res) => {
  const { contestantId } = req.params;

  // Validations
  if (!contestantId || !isValidObjectId(contestantId)) {
    throw new ApiError(400, "Invalid contestantId ID");
  }

  // delete the contestant profile
  const profile = await Profile.findByIdAndDelete(contestantId);
  if (!profile) {
    throw new ApiError(404, "Contestant profile not found");
  }

  const userId = profile.user;

  // delete the user from users collection
  const response = await User.findByIdAndDelete(userId);
  if (!response) {
    throw new ApiError(404, "Contestant user collection not found");
  }

  // get all the posts of this user
  const posts = await Post.find({
    owner: contestantId,
  });

  // Delete posts and associated data (saved, likes)
  for (const post of posts) {
    await Promise.all([
      Post.findByIdAndDelete(post._id),
      Saved.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
    ]);
  }

  // Delete follows related to the contestant
  await Follow.deleteMany({
    $or: [{ profile: contestantId }, { follower: contestantId }],
  });

  // Delete user subscription
  await Subscription.deleteOne({
    userId: userId,
  });

  // Delete notifications sent to or received from the contestant
  await Notification.deleteMany({
    $or: [{ sender: contestantId }, { recipient: contestantId }],
  });

  // TODO: delete all the uploaded images of this contestant from cloudinary

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

  const response = await Advertisement.findByIdAndDelete(advertisementId);
  if (!response) {
    throw new ApiError(500, "Failed to delete the advertisement");
  }

  //TODO: delete the advertisement images from cloudinary

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
