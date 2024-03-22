import mongoose from "mongoose";

const highlightsSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  cover: {
    url: {
      type: String,
      required: true,
    },

    public_id: {
      type: String,
      required: true,
    },
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
});

export const Highlight = mongoose.model("Highlight", highlightsSchema);
