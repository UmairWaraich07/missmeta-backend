import mongoose from "mongoose";
import { Notification } from "../models/notifcation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createNotification = asyncHandler(
  async (senderId, recipientId, notificationType, postIdOrUsername) => {
    const websiteUrl = `${process.env.PUBLIC_APP_URL}`;

    let notificationLink = "";

    // Determine notification content and link based on the notification type
    switch (notificationType) {
      case "like":
        notificationLink = `${websiteUrl}/posts/${postIdOrUsername}`; // Assuming postIdOrUsername contains the post ID
        break;
      case "vote":
        notificationLink = `${websiteUrl}/${postIdOrUsername}`; // Assuming postIdOrUsername contains the contestant's username
        break;
      case "follow":
        notificationLink = `${websiteUrl}/${postIdOrUsername}`; // Assuming postIdOrUsername contains the follower username
        break;
      default:
        throw new ApiError(`Unsupported notification type : ${notificationType}`);
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: notificationType,
      link: notificationLink,
      read: false,
    });

    if (!notification) {
      console.log(`Failed to send the notification`);
    }

    return notification;
  }
);

const markNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user?._id,
      read: false,
    },
    { $set: { read: true } }
  );

  if (!result) {
    throw new ApiError(500, "Failed to mark notifications as read");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, true, "Notifications marked as read successfully"));
});

const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const options = {
    page,
    limit,
  };

  const aggregationPipeline = Notification.aggregate([
    {
      $match: {
        recipient: new mongoose.Schema.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              profilePhoto: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "posts",
        foreignField: "_id",
        localField: "post",
        as: "post",
      },
    },
    {
      $addFields: {
        sender: {
          $first: "$sender",
        },
        post: {
          $first: "$post",
        },
      },
    },
    {
      $sort: {
        read: true,
        createdAt: -1,
      },
    },
  ]);

  Notification.aggregatePaginate(aggregationPipeline, options)
    .then(function (results) {
      console.log(results[0]);
      return res
        .status(200)
        .json(new ApiResponse(200, results[0], "Notifications fetched successfully"));
    })
    .catch(function (err) {
      throw new ApiError(500, err?.message || "Failed to get user notifications");
    });
});

export { createNotification, markNotificationsAsRead, getUserNotifications };
