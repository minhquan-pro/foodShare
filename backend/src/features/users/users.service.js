import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

const USER_SELECT = {
	id: true,
	email: true,
	name: true,
	bio: true,
	avatarUrl: true,
	facebook: true,
	instagram: true,
	twitter: true,
	tiktok: true,
	youtube: true,
	github: true,
	createdAt: true,
	_count: { select: { posts: true, followers: true, following: true } },
};

/**
 * Get user profile by ID.
 */
export const getProfile = async (userId) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: USER_SELECT,
	});

	if (!user) throw ApiError.notFound("User not found");
	return user;
};

/**
 * Get a user's posts with pagination.
 */
export const getUserPosts = async (userId, { page = 1, limit = 10 }) => {
	const skip = (page - 1) * limit;

	const [posts, total] = await Promise.all([
		prisma.post.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: {
				user: { select: { id: true, name: true, avatarUrl: true } },
				_count: { select: { likes: true, comments: true } },
			},
		}),
		prisma.post.count({ where: { userId } }),
	]);

	return {
		posts,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

/**
 * Update profile (name, bio, avatar).
 */
export const updateProfile = async (userId, data, avatarFile) => {
	const updateData = { ...data };
	if (avatarFile) {
		updateData.avatarUrl = `/uploads/${avatarFile.filename}`;
	}

	return prisma.user.update({
		where: { id: userId },
		data: updateData,
		select: USER_SELECT,
	});
};

/**
 * Follow a user.
 */
export const followUser = async (followerId, followingId) => {
	if (followerId === followingId) {
		throw ApiError.badRequest("You cannot follow yourself");
	}

	const target = await prisma.user.findUnique({ where: { id: followingId } });
	if (!target) throw ApiError.notFound("User not found");

	const existing = await prisma.follow.findUnique({
		where: { followerId_followingId: { followerId, followingId } },
	});

	if (existing) {
		throw ApiError.conflict("Already following this user");
	}

	await prisma.follow.create({ data: { followerId, followingId } });
	return { following: true };
};

/**
 * Unfollow a user.
 */
export const unfollowUser = async (followerId, followingId) => {
	const existing = await prisma.follow.findUnique({
		where: { followerId_followingId: { followerId, followingId } },
	});

	if (!existing) throw ApiError.notFound("Not following this user");

	await prisma.follow.delete({ where: { id: existing.id } });
	return { following: false };
};

/**
 * Check if current user follows target user.
 */
export const getFollowStatus = async (followerId, followingId) => {
	const existing = await prisma.follow.findUnique({
		where: { followerId_followingId: { followerId, followingId } },
	});

	return { following: !!existing };
};

/**
 * Get list of user IDs that the current user is following.
 */
export const getFollowingIds = async (userId) => {
	const follows = await prisma.follow.findMany({
		where: { followerId: userId },
		select: { followingId: true },
	});
	return follows.map((f) => f.followingId);
};

/**
 * Get list of followers for a user.
 */
export const getFollowers = async (userId) => {
	const follows = await prisma.follow.findMany({
		where: { followingId: userId },
		select: {
			follower: {
				select: { id: true, name: true, avatarUrl: true, bio: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});
	return follows.map((f) => f.follower);
};

/**
 * Get list of users that a user is following.
 */
export const getFollowing = async (userId) => {
	const follows = await prisma.follow.findMany({
		where: { followerId: userId },
		select: {
			following: {
				select: { id: true, name: true, avatarUrl: true, bio: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});
	return follows.map((f) => f.following);
};
