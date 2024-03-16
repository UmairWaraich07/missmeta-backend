import { asyncHandler } from "../utils/asyncHandler.js";
import { validatePassword } from "../utils/passwordValidation.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const validateUser = asyncHandler((req, res) => {
  // get the all data from frontend
  // validate all the data
  // also do password validation
  // check the role of the user
  // if role === contestant the validate further three required fields like eyeColor, hairColor etc
  // store the data in session so it can be accessed later
  const { role } = req.query;
  const {
    firstname,
    lastname,
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
  } = req.body;

  if (
    [firstname, lastname, username, email, password, dateOfBirth, country, state, city].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "Required fields are missing");
  }

  const isPasswordValid = validatePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long with one special character"
    );
  }

  if (role === "contestant") {
    if ([height, weight, eyeColor, hairColor].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "Required fields for contestant are missing");
    }
  }

  res.session = {
    firstname,
    lastname,
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
  };

  return res.status(200).json(new ApiResponse(200, true, "Data validated successfully"));
});

const registerContestant = asyncHandler(async (req, res) => {
  // get the temp data from res.session
  // store the user in the db as a contestant
  const tempData = res.session;
  console.log([tempData]);
  const createdUser = await User.create({
    ...tempData,
    phoneVerified,
  });

  const user = await User.findById(createdUser._id).select("-refreshToken -password");

  console.log({ createdUser });

  if (!user) {
    throw new ApiError(500, "Failed to register the user as contestant");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully as a contestant"));
});

const registerVoter = asyncHandler(async (req, res) => {
  // TODO: how to get the data of phone verification in this route, like phoneNumber and verificationStatus
  // after phone number verification get the temp data from res.session
  // store the data in the db with phoneVerified === true
  const tempData = res.session;
  console.log([tempData]);
  const createdUser = await User.create({
    ...tempData,
    phoneVerified: true,
  });

  console.log([tempData]);

  const user = await User.findById(createdUser._id).select("-refreshToken -password");

  if (!user) {
    throw new ApiError(500, "Failed to register the user as voter");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully as a voter"));
});

export { validateUser, registerVoter, registerContestant };
