import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Block a user.
 */
export const blockUser = async (blockerId, blockedId) => {
	if (blockerId === blockedId) {
		throw ApiError.badRequest("You cannot block yourself");
	}

	const target = await prisma.user.findUnique({ where: { id: blockedId } });
	if (!target) throw ApiError.notFound("User not found");

	const existing = await prisma.block.findUnique({
		where: { blockerId_blockedId: { blockerId, blockedId } },
	});

	if (existing) {
		throw ApiError.conflict("User is already blocked");
	}

	// Also remove any follow relationships in both directions
	await prisma.$transaction([
		prisma.block.create({ data: { blockerId, blockedId } }),
		prisma.follow.deleteMany({
			where: {
				OR: [
					{ followerId: blockerId, followingId: blockedId },
					{ followerId: blockedId, followingId: blockerId },
				],
			},
		}),
	]);

	return { blocked: true };
};

/**
 * Unblock a user.
 */
export const unblockUser = async (blockerId, blockedId) => {
	const existing = await prisma.block.findUnique({
		where: { blockerId_blockedId: { blockerId, blockedId } },
	});

	if (!existing) throw ApiError.notFound("User is not blocked");

	await prisma.block.delete({ where: { id: existing.id } });
	return { blocked: false };
};

/**
 * Check if current user has blocked target user.
 */
export const getBlockStatus = async (blockerId, blockedId) => {
	const existing = await prisma.block.findUnique({
		where: { blockerId_blockedId: { blockerId, blockedId } },
	});

	return { blocked: !!existing };
};

/**
 * Get list of user IDs that the current user has blocked.
 */
export const getBlockedIds = async (userId) => {
	const blocks = await prisma.block.findMany({
		where: { blockerId: userId },
		select: { blockedId: true },
	});
	return blocks.map((b) => b.blockedId);
};

/**
 * Get list of user IDs who have blocked the current user.
 */
export const getBlockedByIds = async (userId) => {
	const blocks = await prisma.block.findMany({
		where: { blockedId: userId },
		select: { blockerId: true },
	});
	return blocks.map((b) => b.blockerId);
};

/**
 * Get all blocked user IDs (both directions) for filtering.
 */
export const getAllBlockedUserIds = async (userId) => {
	const [blocked, blockedBy] = await Promise.all([
		prisma.block.findMany({
			where: { blockerId: userId },
			select: { blockedId: true },
		}),
		prisma.block.findMany({
			where: { blockedId: userId },
			select: { blockerId: true },
		}),
	]);

	const ids = new Set([...blocked.map((b) => b.blockedId), ...blockedBy.map((b) => b.blockerId)]);

	return Array.from(ids);
};
