import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const savedPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User collection
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post", // Reference to the Post collection
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

savedPostSchema.plugin(mongooseAggregatePaginate);

// Create the SavedPost model
const Saved = mongoose.model("Saved", savedPostSchema);

export { Saved };
