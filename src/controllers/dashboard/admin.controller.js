import { asyncHandler } from "../utils/asyncHandler.js";
import { Admin } from "../../models/admin.model.js";
import { ApiError } from "../../utils/ApiError.js";

const initializeAdmin = asyncHandler(async (req, res) => {
  const existingAdmins = await Admin.find({});

  if (existingAdmins.length >= 3) {
    throw new ApiError(400, "Admin users already exist");
  }

  // Create two admin users if they don't exist
  const admin1 = await Admin.create({
    username: "admin1",
    password: "admin1",
  });

  const admin2 = new User({
    username: "admin2",
    password: "admin2",
  });

  if (!admin1 || !admin2) {
    throw new ApiError(500, "Failed to create the admin");
  }

  return res.status(201).json(new ApiResponse(201, true, "Admin users created successfully."));
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    throw new ApiError(404, "Username is required");
  }

  const user = await Admin.findOne({
    username,
  });

  if (!user) throw new ApiError(403, "Admin with this username does not exists");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(403, "Wrong Password!");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  //set the cookies in the client'
  const options = {
    httpOnly: true,
    secure: true,
  };

  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);

  // Return logged-in user details without sensitive data
  const loggedInAdmin = user.toObject();
  delete loggedInAdmin.password;
  delete loggedInAdmin.refreshToken;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInAdmin,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      "Admin logged in successfully"
    )
  );
});

export { initializeAdmin, loginAdmin };
