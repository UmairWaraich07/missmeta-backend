import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const voteSchema = new mongoose.Schema(
  {
    voter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contestant: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

voteSchema.plugin(mongooseAggregatePaginate);

export const Vote = mongoose.model("Vote", voteSchema);
