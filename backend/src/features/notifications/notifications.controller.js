import * as notificationsService from "./notifications.service.js";
import catchAsync from "../../utils/catchAsync.js";

export const getNotifications = catchAsync(async (req, res) => {
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 20;
	const result = await notificationsService.getNotifications(req.user.id, { page, limit });
	res.json({ success: true, data: result });
});

export const getUnreadCount = catchAsync(async (req, res) => {
	const count = await notificationsService.getUnreadCount(req.user.id);
	res.json({ success: true, data: { unreadCount: count } });
});

export const markAllAsRead = catchAsync(async (req, res) => {
	await notificationsService.markAllAsRead(req.user.id);
	res.json({ success: true, message: "All notifications marked as read" });
});

export const markAsRead = catchAsync(async (req, res) => {
	await notificationsService.markAsRead(req.params.id, req.user.id);
	res.json({ success: true, message: "Notification marked as read" });
});
