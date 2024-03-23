import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
    type: { type: String, enum: ["follow", "like", "vote"], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    link: { type: String, required: true }, // Assuming postId is relevant for likes and votes
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

notificationSchema.plugin(aggregatePaginate);

export const Notification = mongoose.model("Notification", notificationSchema);
