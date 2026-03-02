import { Router } from "express";
import * as notificationsController from "./notifications.controller.js";
import authenticate from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", notificationsController.getNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/read-all", notificationsController.markAllAsRead);
router.patch("/:id/read", notificationsController.markAsRead);

export default router;
