import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    caption: {
      type: String,
      index: true,
    },
    location: {
      type: String,
    },
    media: {
      type: [
        {
          url: {
            type: String,
            required: true,
          },
          public_id: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            required: true,
          },
        },
      ],
      maxLength: 3,
    }, // Array to store cloudinary url of images and videos
    type: {
      type: String,
      required: true,
      enum: ["image", "video"],
      index: true, //TODO: figure out do I allow user to upload mutiple images or one at a time
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.plugin(mongooseAggregatePaginate);

export const Post = mongoose.model("Post", postSchema);
