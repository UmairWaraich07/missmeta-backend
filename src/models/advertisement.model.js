import mongoose from "mongoose";
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
    hyperlink: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    contestant: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: function () {
        return this.role === "individual";
      },
    }, // For individual advertisement
  },
  {
    timestamps: true,
  }
);

advertisementSchema.virtual("durationInSeconds").get(function () {
  const startTime = new Date(this.startDate).getTime() + new Date(this.startTime).getTime();
  const endTime = new Date(this.endDate).getTime() + new Date(this.endTime).getTime();
  const duration = endTime - startTime;
  return Math.floor(duration / 1000); // Convert milliseconds to seconds and return
});

advertisementSchema.plugin(mongooseAggregatePaginate);

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);
