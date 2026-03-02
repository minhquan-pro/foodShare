import * as likesService from "./likes.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import catchAsync from "../../utils/catchAsync.js";
import prisma from "../../utils/prisma.js";

export const toggleLike = catchAsync(async (req, res) => {
	const result = await likesService.toggleLike(req.user.id, req.params.postId);

	// Send notification when liked (not when unliked)
	if (result.liked) {
		const post = await prisma.post.findUnique({
			where: { id: req.params.postId },
			select: { userId: true },
		});

		if (post && post.userId !== req.user.id) {
			const notification = await notificationsService.createNotification({
				type: "like",
				userId: post.userId,
				actorId: req.user.id,
				postId: req.params.postId,
			});

			if (notification) {
				const io = req.app.get("io");
				io.to(`user:${post.userId}`).emit("notification:new", notification);
			}
		}
	}

	res.json({ success: true, data: result });
});

export const getLikeStatus = catchAsync(async (req, res) => {
	const result = await likesService.getLikeStatus(req.user.id, req.params.postId);
	res.json({ success: true, data: result });
});
