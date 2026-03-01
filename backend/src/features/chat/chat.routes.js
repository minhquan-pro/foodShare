import { Router } from "express";
import authenticate from "../../middleware/authenticate.js";
import * as chatController from "./chat.controller.js";

const router = Router();

// All chat routes require authentication
router.use(authenticate);

router.get("/conversations", chatController.getConversations);
router.post("/conversations", chatController.startConversation);
router.get("/conversations/:id/messages", chatController.getMessages);
router.post("/conversations/:id/messages", chatController.sendMessage);
router.patch("/conversations/:id/read", chatController.markAsRead);
router.post("/conversations/:id/messages/:messageId/react", chatController.toggleReaction);
router.get("/unread-count", chatController.getUnreadCount);

export default router;
