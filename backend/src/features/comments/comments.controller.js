import * as commentsService from "./comments.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import catchAsync from "../../utils/catchAsync.js";
import prisma from "../../utils/prisma.js";

export const addComment = catchAsync(async (req, res) => {
	const { body, parentId } = req.body;
	const comment = await commentsService.addComment(req.user.id, req.params.postId, body, parentId || null);

	const io = req.app.get("io");
	const notifiedUserIds = new Set();

	// 1. Notify post owner
	const post = await prisma.post.findUnique({
		where: { id: req.params.postId },
		select: { userId: true },
	});

	if (post && post.userId !== req.user.id) {
		notifiedUserIds.add(post.userId);
		const notification = await notificationsService.createNotification({
			type: "comment",
			userId: post.userId,
			actorId: req.user.id,
			postId: req.params.postId,
			commentId: comment.id,
		});
		if (notification) {
			io.to(`user:${post.userId}`).emit("notification:new", notification);
		}
	}

	// 2. Notify parent comment author (reply notification)
	if (parentId) {
		const parentComment = await prisma.comment.findUnique({
			where: { id: parentId },
			select: { userId: true },
		});
		if (parentComment && parentComment.userId !== req.user.id && !notifiedUserIds.has(parentComment.userId)) {
			const notification = await notificationsService.createNotification({
				type: "reply",
				userId: parentComment.userId,
				actorId: req.user.id,
				postId: req.params.postId,
				commentId: comment.id,
			});
			if (notification) {
				io.to(`user:${parentComment.userId}`).emit("notification:new", notification);
			}
		}
	}

	res.status(201).json({ success: true, data: { comment } });
});

export const getComments = catchAsync(async (req, res) => {
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 20;
	const result = await commentsService.getComments(req.params.postId, { page, limit });

	// Get liked comment IDs for current user
	const allIds = extractCommentIds(result.comments);
	const likedIds = await commentsService.getUserLikedCommentIds(req.user.id, allIds);

	res.json({ success: true, data: { ...result, likedCommentIds: likedIds } });
});

export const deleteComment = catchAsync(async (req, res) => {
	await commentsService.deleteComment(req.params.commentId, req.user.id);
	res.status(204).send();
});

export const toggleCommentLike = catchAsync(async (req, res) => {
	const result = await commentsService.toggleCommentLike(req.user.id, req.params.commentId);

	// Send notification when liked (not when unliked)
	if (result.liked) {
		const comment = await prisma.comment.findUnique({
			where: { id: req.params.commentId },
			select: { userId: true, postId: true },
		});

		if (comment && comment.userId !== req.user.id) {
			const notification = await notificationsService.createNotification({
				type: "comment_like",
				userId: comment.userId,
				actorId: req.user.id,
				postId: comment.postId,
				commentId: req.params.commentId,
			});

			if (notification) {
				const io = req.app.get("io");
				io.to(`user:${comment.userId}`).emit("notification:new", notification);
			}
		}
	}

	res.json({ success: true, data: result });
});

// Helper: extract all comment IDs recursively (including replies)
function extractCommentIds(comments) {
	const ids = [];
	for (const c of comments) {
		ids.push(c.id);
		if (c.replies) ids.push(...extractCommentIds(c.replies));
	}
	return ids;
}
