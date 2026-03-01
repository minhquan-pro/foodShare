import { Router } from "express";
import * as blocksController from "./blocks.controller.js";
import authenticate from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

// Get list of blocked user IDs
router.get("/ids", blocksController.getBlockedIds);

// Block / unblock a user
router.post("/:id", blocksController.blockUser);
router.delete("/:id", blocksController.unblockUser);

// Check block status
router.get("/:id/status", blocksController.getBlockStatus);

export default router;
