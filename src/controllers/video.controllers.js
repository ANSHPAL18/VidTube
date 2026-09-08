import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;
  const matchConditions = {
    isPublished: true,
  };
  // Search by title or description
  if (query?.trim()) {
    matchConditions.$or = [
      {
        title: {
          $regex: query.trim(),
          $options: "i",
        },
      },
      {
        description: {
          $regex: query.trim(),
          $options: "i",
        },
      },
    ];
  }
  // Filter by user
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }
    matchConditions.owner = new mongoose.Types.ObjectId(userId);
  }
  const videosAggregate = Video.aggregate([
    {
      $match: matchConditions,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);
  const options = {
    page: Math.max(1, Number(page)),
    limit: Math.min(50, Math.max(1, Number(limit))),
  };
  const videos = await Video.aggregatePaginate(videosAggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  // 1. Validate title and description
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }
  // 2. Get local file paths
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  // 3. Validate files
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  // 4. Upload video to Cloudinary
  const videoFile = await uploadOnCloudinary(videoLocalPath);
  if (!videoFile?.url) {
    throw new ApiError(400, "Error while uploading video");
  }
  // 5. Upload thumbnail
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail?.url) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }
  // 6. Create video document
  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title: title.trim(),
    description: description.trim(),
    duration: videoFile.duration,
    owner: req.user._id,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});
const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findOneAndUpdate(
    {
      _id: videoId,
      isPublished: true,
    },
    {
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    }
  ).populate("owner", "fullName username avatar");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;
  // 1. Validate video ID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  // 2. Validate fields
  if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
    throw new ApiError(400, "At least title or description is required");
  }
  // 3. Find video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // 4. Check ownership
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }
  // 5. Update title and description
  if (title?.trim()) {
    video.title = title.trim();
  }
  if (description?.trim()) {
    video.description = description.trim();
  }
  // 6. Check if new thumbnail is uploaded
  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }
    video.thumbnail = thumbnail.url;
  }
  // 7. Save updated video
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});
const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params;
  // 1. Validate video ID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  // 2. Find video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // 3. Check ownership
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }
  // 4. Delete video from MongoDB
  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // 1. Validate video ID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  // 2. Find video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // 3. Check ownership
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to change publish status");
  }
  // 4. Toggle publish status
  video.isPublished = !video.isPublished;
  // 5. Save changes
  await video.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
