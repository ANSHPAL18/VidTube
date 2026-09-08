import { Router } from "express";

import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Apply verifyJWT middleware to all routes
router.use(verifyJWT);

// Get all comments of a video
// Add a comment to a video
router.route("/:videoId").get(getVideoComments).post(addComment);

// Update or delete a comment
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
