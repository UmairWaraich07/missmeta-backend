import mongoose from "mongoose";

const highlightsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
    required: true,
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
});

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    displayName: {
      type: String,
      required: true,
    },
    profilePhoto: {
      url: {
        type: String,
      },

      public_id: {
        type: String,
      },
    },
    bio: String,
    website: String,
    highlights: [highlightsSchema],
    instagramLink: {
      type: String,
    },
    facebookLink: {
      type: String,
    },
    tiktokLink: {
      type: String,
    },
    youtubeLink: {
      type: String,
    },
    spotifyLink: {
      type: String,
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
