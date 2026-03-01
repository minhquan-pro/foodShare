import { Router } from "express";
import * as usersController from "./users.controller.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import upload from "../../utils/upload.js";
import { updateProfileSchema } from "./users.validation.js";

const router = Router();

router.use(authenticate);

// Profile
router.get("/:id", usersController.getProfile);
router.get("/:id/posts", usersController.getUserPosts);
router.patch("/profile", upload.single("avatar"), validate(updateProfileSchema), usersController.updateProfile);

// Follow system
router.get("/following/ids", usersController.getFollowingIds);
router.get("/:id/followers", usersController.getFollowers);
router.get("/:id/following", usersController.getFollowing);
router.post("/:id/follow", usersController.followUser);
router.delete("/:id/follow", usersController.unfollowUser);
router.get("/:id/follow-status", usersController.getFollowStatus);

export default router;
