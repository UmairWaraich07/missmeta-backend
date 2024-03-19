import { Profile } from "../models/profile.model";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";

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
  });

  if (!updatedProfile) {
    throw new ApiError(500, "Failed to upload the profile photo");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProfile, "Profile photo updated successfully"));
});

const updateProfileDetails = asyncHandler(async (req, res) => {
  // take the data from frontend
  // validate it
  // find user by id and update it

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
  );

  if (!userDetails) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, userDetails, "Profile details updated successfully"));
});

export { updateProfileDetails, updateProfilePhoto };
