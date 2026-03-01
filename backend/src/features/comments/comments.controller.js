import * as commentsService from "./comments.service.js";
import catchAsync from "../../utils/catchAsync.js";

export const addComment = catchAsync(async (req, res) => {
	const { body, parentId } = req.body;
	const comment = await commentsService.addComment(req.user.id, req.params.postId, body, parentId || null);
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
