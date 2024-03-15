import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    voter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contestant: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const Vote = mongoose.model("Vote", voteSchema);
