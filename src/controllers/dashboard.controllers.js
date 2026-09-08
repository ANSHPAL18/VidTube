import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channelId = new mongoose.Types.ObjectId(req.user._id);

  const stats = await Video.aggregate([
    // Find all videos of logged-in user
    {
      $match: {
        owner: channelId,
      },
    },

    // Get likes for every video
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },

    // Calculate totals
    {
      $group: {
        _id: null,

        totalVideos: {
          $sum: 1,
        },

        totalViews: {
          $sum: "$views",
        },

        totalLikes: {
          $sum: {
            $size: "$likes",
          },
        },
      },
    },
  ]);

  // Count subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const channelStats = {
    totalVideos: stats[0]?.totalVideos || 0,

    totalViews: stats[0]?.totalViews || 0,

    totalLikes: stats[0]?.totalLikes || 0,

    totalSubscribers,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const channelId = req.user._id;

  const videos = await Video.find({
    owner: channelId,
  }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
