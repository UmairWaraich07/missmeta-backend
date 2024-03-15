import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    email: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  {
    timestamps: true,
  }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
