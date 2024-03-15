import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    media: [String], // Array to store cloudinary url of images and videos
  },
  {
    timestamps: true,
  }
);

export const Post = mongoose.model("Post", postSchema);
