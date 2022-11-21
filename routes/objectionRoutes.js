import express from "express";
const router = express.Router();

import rateLimiter from "express-rate-limit";

const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message:
    "Too many requests from this IP address, please try again after 15 minutes",
});

import { createObjection, getObjection, getAllObjections, deleteObjection } from "../controllers/objectionController.js";

router.route("/").post(createObjection).get(getAllObjections);
router.route("/:id").post(apiLimiter, createObjection).get(apiLimiter, getObjection).delete(apiLimiter, deleteObjection);

export default router;