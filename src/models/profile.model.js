import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    displayName: {
      type: String,
      required: true,
    },
    profilePhoto: {
      type: String,
    },
    bio: String,
    website: String,
    highlights: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    socialMediaHandles: {
      instagram: String,
      facebook: String,
      tiktok: String,
      youtube: String,
      spotify: String,
    },
    primaryAdvertisement: {
      type: [String],
      maxLength: 3,
    },
    secondaryAdvertisement: {
      type: [String],
      maxLength: 3,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile = mongoose.model("Profile", profileSchema);
