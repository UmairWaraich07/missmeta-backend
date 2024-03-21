import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";

const verifyAdmin = async (req, _, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!accessToken) throw new ApiError(401, "Unauthorized request");

    const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    const admin = await Admin.findById(decodedAccessToken._id).select("-password -refreshToken");

    if (!admin) throw new ApiError(401, "Invalid access token");

    req.admin = admin;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
    // console.log("Invalid access token", error?.message);
  }
};

export { verifyAdmin };
