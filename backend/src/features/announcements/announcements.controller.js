import catchAsync from "../../utils/catchAsync.js";
import { ApiError } from "../../utils/ApiError.js";
import * as announcementsService from "./announcements.service.js";

export const getAnnouncements = catchAsync(async (_req, res) => {
	const announcements = await announcementsService.getActiveAnnouncements();
	res.json({ success: true, data: { announcements } });
});

export const deleteAnnouncement = catchAsync(async (req, res) => {
	const { id } = req.params;
	const announcement = await announcementsService.getAnnouncementById(id);
	if (!announcement) throw ApiError.notFound("Announcement not found");
	if (announcement.userId !== req.user.id) throw ApiError.forbidden("Not your announcement");
	await announcementsService.deleteAnnouncement(id);
	req.app.get("io").emit("announcement:deleted", { id });
	res.json({ success: true });
});

export const createAnnouncement = catchAsync(async (req, res) => {
	if (!req.file) throw ApiError.badRequest("Story image is required");

	const imageUrl = `/uploads/${req.file.filename}`;
	const announcement = await announcementsService.createAnnouncement(req.user.id, req.body, imageUrl);

	// Broadcast to all connected clients in real-time
	req.app.get("io").emit("announcement:new", announcement);

	res.status(201).json({ success: true, data: { announcement } });
});
