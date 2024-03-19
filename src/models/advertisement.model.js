import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    images: { type: [String], maxlength: 3 },
    durationInSeconds: Number,
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    hyperlink: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);
