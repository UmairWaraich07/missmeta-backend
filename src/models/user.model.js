import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },

    phoneVerified: { type: Boolean, default: false }, // Added for phone number verification
    dateOfBirth: { type: Date, required: true },
    nationality: { type: String },
    country: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    role: { type: String, enum: ["voter", "contestant"], index: true, required: true },
    height: {
      type: Number,
      required: function () {
        return this.role === "contestant";
      },
    },
    weight: {
      type: Number,
      required: function () {
        return this.role === "contestant";
      },
    },
    eyeColor: {
      type: String,
      required: function () {
        return this.role === "contestant";
      },
    },
    hairColor: {
      type: String,
      required: function () {
        return this.role === "contestant";
      },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
