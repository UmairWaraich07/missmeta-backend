import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const advertisementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["global", "individual"], required: true },
    individualAdType: {
      type: String,
      enum: ["primary", "secondary"],
      required: function () {
        return this.type === "individual";
      },
    },
    images: {
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
        },
      ],
      maxlength: 3, // Maximum length of the images array
    },
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
    hyperLink: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    durationInSeconds: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    contestant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "individual";
      },
    }, // For individual advertisement
  },
  {
    timestamps: true,
  }
);

advertisementSchema.plugin(mongooseAggregatePaginate);

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);
