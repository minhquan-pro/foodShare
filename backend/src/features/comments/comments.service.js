import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

// Reusable include for nested replies (2 levels deep)
const REPLY_INCLUDE = {
	user: { select: { id: true, name: true, avatarUrl: true } },
	_count: { select: { commentLikes: true } },
	replies: {
		orderBy: { createdAt: "asc" },
		include: {
			user: { select: { id: true, name: true, avatarUrl: true } },
			_count: { select: { commentLikes: true } },
			replies: {
				orderBy: { createdAt: "asc" },
				include: {
					user: { select: { id: true, name: true, avatarUrl: true } },
					_count: { select: { commentLikes: true } },
				},
			},
		},
	},
};

/**
 * Add a comment (or reply) to a post.
 */
export const addComment = async (userId, postId, body, parentId = null) => {
	// Verify post exists
	const post = await prisma.post.findUnique({ where: { id: postId } });
	if (!post) throw ApiError.notFound("Post not found");

	// If replying, verify parent comment exists and belongs to same post
	if (parentId) {
		const parent = await prisma.comment.findUnique({ where: { id: parentId } });
		if (!parent) throw ApiError.notFound("Parent comment not found");
		if (parent.postId !== postId) throw ApiError.badRequest("Parent comment does not belong to this post");
	}

	const comment = await prisma.comment.create({
		data: { body, userId, postId, parentId },
		include: REPLY_INCLUDE,
	});

	return comment;
};

/**
 * Get top-level comments for a post with nested replies.
 */
export const getComments = async (postId, { page = 1, limit = 20 }) => {
	const skip = (page - 1) * limit;

	// Only fetch top-level comments (parentId is null)
	const where = { postId, parentId: null };

	const [comments, total] = await Promise.all([
		prisma.comment.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: REPLY_INCLUDE,
		}),
		prisma.comment.count({ where }),
	]);

	return {
		comments,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

/**
 * Delete a comment and its replies (owner only).
 */
export const deleteComment = async (commentId, userId) => {
	const comment = await prisma.comment.findUnique({ where: { id: commentId } });
	if (!comment) throw ApiError.notFound("Comment not found");
	if (comment.userId !== userId) throw ApiError.forbidden("You can only delete your own comments");

	// Cascade delete is handled by Prisma schema
	await prisma.comment.delete({ where: { id: commentId } });
};

/**
 * Toggle like on a comment (like/unlike).
 */
export const toggleCommentLike = async (userId, commentId) => {
	const comment = await prisma.comment.findUnique({ where: { id: commentId } });
	if (!comment) throw ApiError.notFound("Comment not found");

	const existing = await prisma.commentLike.findUnique({
		where: { userId_commentId: { userId, commentId } },
	});

	if (existing) {
		await prisma.commentLike.delete({ where: { id: existing.id } });
		return { liked: false };
	}

	await prisma.commentLike.create({ data: { userId, commentId } });
	return { liked: true };
};

/**
 * Get IDs of comments liked by a user (for a given set of comment IDs).
 */
export const getUserLikedCommentIds = async (userId, commentIds) => {
	const likes = await prisma.commentLike.findMany({
		where: { userId, commentId: { in: commentIds } },
		select: { commentId: true },
	});
	return likes.map((l) => l.commentId);
};
