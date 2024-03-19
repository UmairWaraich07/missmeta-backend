import { asyncHandler } from "../utils/asyncHandler.js";
import { validatePassword } from "../utils/passwordValidation.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

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

  if (
    [fullname, username, email, password, dateOfBirth, country, state, city, role].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const isPasswordValid = validatePassword(password);
  // console.log(isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long with one lowercase letter and one special character"
    );
  }

  if (role === "contestant") {
    if (!eyeColor || !hairColor) {
      throw new ApiError(400, "EyeColor and HairColor are required for contestants");
    }

    if (!height || !weight) {
      throw new ApiError(400, "Height and Weight are required for contestants");
    }
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  const createdUser = await User.create({
    ...req.body,
    role,
  });

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

  // if (!(user.phone && user.phoneVerified)) {
  //   res.redirect("http://localhost:5173/verify");
  // }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  //set the cookies in the client'
  const options = {
    httpOnly: true,
    secure: false,
  };

  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);

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

  if (!(newPassword === confirmNewPassword)) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password");
  }

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });

  return res.status(200).json(new ApiResponse(200, true, "Password changed successfully"));
});
const upgradeToContestant = asyncHandler(async (req, res) => {
  const { height, weight, eyeColor, hairColor } = req.body;

  if ([height, weight, eyeColor, hairColor].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
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

export {
  registerUser,
  updatePhoneVerification,
  loginUser,
  getCurrentUser,
  logoutUser,
  changeCurrentPassword,
  upgradeToContestant,
};
