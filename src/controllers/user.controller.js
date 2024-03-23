import { asyncHandler } from "../utils/asyncHandler.js";
import { validatePassword } from "../utils/passwordValidation.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens!");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const {
    fullname,
    username,
    email,
    password,
    dateOfBirth,
    nationality,
    country,
    state,
    city,
    height,
    weight,
    eyeColor,
    hairColor,
    role,
  } = req.body;

  const requiredFields = [
    fullname,
    username,
    email,
    password,
    dateOfBirth,
    country,
    state,
    city,
    role,
  ];
  if (requiredFields.some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  if (!validatePassword(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long with one lowercase letter and one special character"
    );
  }

  if (role === "contestant" && (!eyeColor || !hairColor || !height || !weight)) {
    throw new ApiError(400, "EyeColor, HairColor, Height, and Weight are required for contestants");
  }

  const existedUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  const createdUser = await User.create({ ...req.body, role });

  const user = await User.findById(createdUser._id).select("-refreshToken -password");
  console.log(user);

  if (!user) {
    throw new ApiError(500, `Failed to register the user as ${role}`);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, `User registered successfully as a ${role}`));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(404, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(403, "User with this username or email does not exists");
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(403, "Wrong Password!");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  //set the cookies in the client'
  const options = {
    httpOnly: true,
    secure: true,
    SameSite: "None",
  };

  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);

  // Return logged-in user details without sensitive data
  const loggedInUser = user.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      "User logged in successfully"
    )
  );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  console.log(req?.user);
  res.status(200).json(new ApiResponse(200, req?.user, "Successfully fetched current user"));
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user;

  await User.findByIdAndUpdate(
    user._id,
    {
      $unset: { refreshToken: 1 }, // this removes the field from document
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, true, "Logged out successfully"));
});

const updatePhoneVerification = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ApiError(400, "Phone number is required for updation of  phone verification status");
  }

  // Check if the phone number already exists in the database
  // TODO: uncomment it during production
  // const existingUserWithPhone = await User.findOne({ phone: phone });
  // if (existingUserWithPhone && existingUserWithPhone._id.toString() !== req.user?._id.toString()) {
  //   throw new ApiError(400, "Phone number is already in use");
  // }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        phone: phone,
        phoneVerified: true,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedUser) {
    throw new ApiError(500, "Failed to update the user phone verification status");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Phone verification status updated successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  console.log(newPassword);
  console.log(confirmNewPassword);

  if (!(newPassword === confirmNewPassword)) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password");
  }

  user.password = newPassword;
  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    // Handle save operation errors
    throw new ApiError(500, "Failed to change password");
  }

  return res.status(200).json(new ApiResponse(200, true, "Password changed successfully"));
});

const upgradeToContestant = asyncHandler(async (req, res) => {
  const { height, weight, eyeColor, hairColor } = req.body;

  if ([height, weight, eyeColor, hairColor].some((field) => field === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if the user has an active subscription
  const activeSubscription = await Subscription.findOne({
    userId: req.user?._id,
    stripeCurrentPeriodEnd: { $gt: new Date() }, // Check if current period end date is in the future
  });

  if (!activeSubscription) {
    throw new ApiError(403, "User does not have an active subscription");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        height,
        weight,
        eyeColor,
        hairColor,
        role: "contestant",
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new ApiError(500, "Failed to updated user details for contestant");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User upgraded to contestant successfully"));
});

/** User Profile Photo controllers **/
const updateUserProfilePhoto = asyncHandler(async (req, res) => {
  const { uploadedProfilePhoto } = req.body;
  const profilePhotoLocalPath = req.file?.path;

  if (!profilePhotoLocalPath && !uploadedProfilePhoto) {
    throw new ApiError(400, "Profile photo is required");
  }

  const profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);

  if (!profilePhoto) {
    throw new ApiError(500, "Failed to upload profile photo on cloudinary");
  }

  const updatedProfile = await User.findByIdAndUpdate(req.user?._id, {
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

  // after successfully uploading the image on cloudinary
  if (uploadedProfilePhoto) {
    const response = await deleteImageFromCloudinary(uploadedProfilePhoto.public_id);
    console.log(`Profile photo deleted from cloudinary, ${response}`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProfile, "Profile photo updated successfully"));
});

const updateProfileDetails = asyncHandler(async (req, res) => {
  const {
    fullname,
    bio,
    website,
    instagramLink,
    facebookLink,
    tiktokLink,
    youtubeLink,
    spotifyLink,
  } = req.body;

  if (!fullname) {
    throw new ApiError(404, "Display name field cannot be empty");
  }

  const userDetails = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
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
    .json(new ApiResponse(200, userDetails, "User Profile details updated successfully"));
});

const getUserProfileInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const profile = await User.aggregate([
    {
      $match: {
        username: username,
        isActive: true,
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
        votesCount: {
          $size: "$voters",
        },
        isFollowing: {
          $cond: {
            if: { $in: [req.user?._id, "$followers.follower"] },
            then: true,
            else: false,
          },
        },
        isVoted: {
          $cond: {
            if: { $in: [req.user?._id, "$voters.voter"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        fullname: 1,
        username: 1,
        profilePhoto: 1,
        role: 1,
        followersCount: 1,
        followingCount: 1,
        votesCount: 1,
        isFollowing: 1,
        isVoted: 1,
        highlights: 1,
        bio: 1,
        website: 1,
        instagramLink: 1,
        facebookLink: 1,
        tiktokLink: 1,
        youtubeLink: 1,
        spotifyLink: 1,
        primaryAdvertisement: 1,
        secondaryAdvertisement: 1,
        createdAt: 1,
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

const getAllContestants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 21 } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const aggregationPipeline = User.aggregate([
    // Shuffle the data randomly
    { $sample: { size: options.limit * options.page } },
    {
      $match: {
        role: "contestant",
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "votes",
        foreignField: "contestant",
        localField: "_id",
        as: "voters",
      },
    },
    {
      $addFields: {
        votesCount: {
          $size: "$voters",
        },
        isVoted: {
          $cond: {
            if: { $in: [req.user?._id, "$voters.voter"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        fullname: 1,
        username: 1,
        profilePhoto: 1,
        votesCount: 1,
        isVoted: 1,
      },
    },
  ]);

  User.aggregatePaginate(aggregationPipeline, options)
    .then((results) => {
      return res
        .status(200)
        .json(new ApiResponse(200, results, "All contestants fetched successfully"));
    })
    .catch((err) => {
      throw new ApiError(500, err?.message || "Failed to fetch all contestants");
    });
});

export {
  registerUser,
  updatePhoneVerification,
  loginUser,
  getCurrentUser,
  logoutUser,
  changeCurrentPassword,
  upgradeToContestant,
  updateUserProfilePhoto,
  updateProfileDetails,
  getUserProfileInfo,
  getAllContestants,
};
