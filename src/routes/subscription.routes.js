import { Router } from "express";

import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Apply verifyJWT middleware to all routes
router.use(verifyJWT);

// Get subscribers of a channel
// Toggle subscription to a channel
router
  .route("/c/:channelId")
  .get(getUserChannelSubscribers)
  .post(toggleSubscription);

// Get channels subscribed by a user
router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
