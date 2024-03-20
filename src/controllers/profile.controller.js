import { Profile } from "../models/profile.model";
import { asyncHandler } from "../utils/asyncHandler";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";

const updateProfilePhoto = asyncHandler(async (req, res) => {
  const uploadedPhotoPublicId = req.user?.profilePhoto.public_id;
  const profilePhotoLocalPath = req.file?.path;
  console.log(profilePhotoLocalPath);

  if (!profilePhotoLocalPath) {
    throw new ApiError(400, "Profile photo is required");
  }

  const profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);
  console.log(`profile photo uploaded on cloudinary, ${response}`);

  if (!profilePhoto.url) {
    throw new ApiError(500, "Failed to upload profile photo on cloudinary");
  }
  // after successfully uploading the image on cloudinary
  if (uploadedPhotoPublicId) {
    const response = await deleteImageFromCloudinary(uploadedPhotoPublicId);
    console.log(`Profile photo deleted from cloudinary, ${response}`);
  }

  const updatedProfile = await Profile.findByIdAndUpdate(req.user?._id, {
    $set: {
      profilePhoto: {
        url: profilePhoto.url,
        public_id: profilePhoto.public_id,
      },
    },
  }).select("-password -refreshToken");

  if (!updatedProfile) {
    throw new ApiError(500, "Failed to upload the profile photo");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProfile, "Profile photo updated successfully"));
});

const updateProfileDetails = asyncHandler(async (req, res) => {
  const {
    displayName,
    bio,
    website,
    instagramLink,
    facebookLink,
    tiktokLink,
    youtubeLink,
    spotifyLink,
  } = req.body;

  if (!displayName) {
    throw new ApiError(404, "Display name field cannot be empty");
  }

  const userDetails = await Profile.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        displayName,
        bio,
        website,
        instagramLink,
        facebookLink,
        tiktokLink,
        youtubeLink,
        spotifyLink,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!userDetails) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, userDetails, "Profile details updated successfully"));
});

const getUserProfileInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ $and: [{ username: username }, { status: "active" }] }).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const profile = await Profile.aggregate([
    {
      $match: {
        _id: user._id,
      },
    },

    {
      $addFields: {
        user: user, //add the already fetched user here
      },
    },
    {
      $lookup: {
        from: "follows",
        foreignField: "following",
        localField: "_id",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        foreignField: "follower",
        localField: "_id",
        as: "following",
      },
    },
    {
      $lookup: {
        from: "voters",
        foreignField: "contestant",
        localField: "_id",
        as: "voters",
      },
    },
    {
      $addFields: {
        followersCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
        isFollowing: {
          cond: {
            if: { $in: [req.user?._id, "$followers.follower"] },
            then: true,
            else: false,
          },
        },
        isVoted: {
          cond: {
            if: { $in: [req.user?._id, "$voters.voter"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        followers: 0,
        following: 0,
        voters: 0,
      },
    },
  ]);

  if (!profile || profile.length === 0) {
    throw new ApiError(404, "Profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile[0], "Profile data fetched successfully"));
});

const createProfileHighlight = asyncHandler(async (req, res) => {
  const { title, mediaId } = req.body;

  if (!title || !mediaId) {
    throw new ApiError(400, "Title and Media is required to create highlight");
  }

  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "Highlight cover image is required");
  }

  const cover = await uploadOnCloudinary(coverLocalPath);

  if (!cover.url) {
    throw new ApiError(404, "Failed to upload the highlight cover on cloudinary", cover);
  }

  const updatedUser = await User.findByIdAndUpdate(req.user?._id, {
    $push: {
      highlights: {
        title,
        media: mediaId,
        cover: {
          url: cover.url,
          public_id: cover.public_id,
        },
      },
    },
  });

  const newHighlight = updatedUser.highlights[updatedUser.highlights.length - 1];

  if (!updatedUser) {
    throw new ApiError(500, "Failed to create the highlight");
  }

  return res.status(201).json(new ApiResponse(201, newHighlight, "Highlight created successfully"));
});

const editProfileHighlight = asyncHandler(async (req, res) => {
  const { title, cover } = req.body;
  const { highlightId } = req.params;
  const newCoverLocalPath = req.file?.path;
  if (!title) {
    throw new ApiError(400, "Highlight title is required");
  }
  if (!cover && !newCoverLocalPath) {
    throw new ApiError(400, "Highlight cover is required");
  }

  let newCover;
  if (newCoverLocalPath) {
    // upload it on cloudinary
    newCover = await uploadOnCloudinary(newCoverLocalPath);
    console.log(`Highlight cover uploaded on cloudinary, ${newCover}`);
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user?._id, "highlights._id": highlightId },
    {
      $set: {
        "$highlights.title": title,
        "$highlights.cover": newCover
          ? {
              url: newCover.url,
              public_id: newCover.public_id,
            }
          : cover,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(500, "Failed to edit the profile highlight");
  }

  // delete the already uploaded highlight cover ID
  if (newCoverLocalPath) {
    await deleteImageFromCloudinary(cover.public_id);
    console.log(`Existing highlight cover deleted successfully from cloudinary`);
  }

  // Find the updated highlight
  const updatedHighlight = updatedUser.highlights.find((highlight) => highlight._id == highlightId);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedHighlight, "Profile highlight edited successfully"));
});

const deleteProfileHighlight = asyncHandler(async (req, res) => {
  const { highlightId } = req.params;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Find the index of the highlight to be deleted
  const highlightIndex = user.highlights.findIndex((highlight) => highlight._id == highlightId);
  if (highlightIndex === -1) {
    throw new ApiError(404, "Highlight not found");
  }

  // Retrieve the deleted highlight before removing it from the user's profile
  const deletedHighlight = user.highlights[highlightIndex];

  // Remove the highlight from the user's profile
  user.highlights.splice(highlightIndex, 1);
  await user.save();

  // Delete the cover image associated with the deleted highlight from Cloudinary
  if (deletedHighlight && deletedHighlight.cover && deletedHighlight.cover.public_id) {
    await deleteImageFromCloudinary(deletedHighlight.cover.public_id);
    console.log(`Highlight cover image deleted successfully from Cloudinary`);
  }

  return res.status(200).json(new ApiResponse(200, true, "Profile highlight deleted successfully"));
});

export {
  updateProfileDetails,
  updateProfilePhoto,
  getUserProfileInfo,
  createProfileHighlight,
  editProfileHighlight,
  deleteProfileHighlight,
};
