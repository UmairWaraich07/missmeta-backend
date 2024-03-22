import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const highlightsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
    required: true,
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    fullname: {
      type: String,
      required: true,
    },
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    phoneVerified: { type: Boolean, default: false }, // Added for phone number verification
    dateOfBirth: { type: Date, required: true },
    nationality: { type: String },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    role: { type: String, enum: ["voter", "contestant"], index: true, required: true },
    height: {
      type: Number,
      required: function () {
        return this.role === "contestant";
      },
    },
    weight: {
      type: Number,
      required: function () {
        return this.role === "contestant";
      },
    },
    eyeColor: {
      type: String,
      index: true,
      required: function () {
        return this.role === "contestant";
      },
    },
    hairColor: {
      type: String,
      index: true,
      required: function () {
        return this.role === "contestant";
      },
    },

    profilePhoto: {
      url: {
        type: String,
      },

      public_id: {
        type: String,
      },
    },
    bio: String,
    website: String,
    highlights: [highlightsSchema],
    instagramLink: {
      type: String,
    },
    facebookLink: {
      type: String,
    },
    tiktokLink: {
      type: String,
    },
    youtubeLink: {
      type: String,
    },
    spotifyLink: {
      type: String,
    },
    primaryAdvertisement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
    },
    secondaryAdvertisement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertisement",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ country: 1, state: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return await jwt.sign(
    {
      _id: this._id,
      username: this.username,
      fullname: this.fullname,
      role: this.role,
      isActive: this.isActive,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  return await jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

userSchema.plugin(mongooseAggregatePaginate);

export const User = mongoose.model("User", userSchema);
