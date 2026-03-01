import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { getAllBlockedUserIds } from "../blocks/blocks.service.js";

const POST_INCLUDE = {
	user: { select: { id: true, name: true, avatarUrl: true } },
	_count: { select: { likes: true, comments: true } },
};

/**
 * Create a food review post.
 */
export const createPost = async (userId, data, imageUrl) => {
	const post = await prisma.post.create({
		data: {
			...data,
			imageUrl,
			userId,
		},
		include: POST_INCLUDE,
	});
	return post;
};

/**
 * Get paginated feed of latest posts, optionally filtered by location.
 * Excludes posts from blocked users (both directions).
 */
export const getFeed = async ({ page = 1, limit = 10, location = null, userId = null }) => {
	const skip = (page - 1) * limit;

	const where = {};
	if (location) where.restaurantAddress = { contains: location };

	// Filter out blocked users
	if (userId) {
		const blockedIds = await getAllBlockedUserIds(userId);
		if (blockedIds.length > 0) {
			where.userId = { notIn: blockedIds };
		}
	}

	const [posts, total] = await Promise.all([
		prisma.post.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: POST_INCLUDE,
		}),
		prisma.post.count({ where }),
	]);

	return {
		posts,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

/**
 * Get distinct city/location names extracted from restaurant addresses.
 */
export const getDistinctLocations = async () => {
	const posts = await prisma.post.findMany({
		select: { restaurantAddress: true },
		distinct: ["restaurantAddress"],
	});

	// Extract city names from addresses (last part after the last comma)
	const citySet = new Set();
	for (const p of posts) {
		const parts = p.restaurantAddress.split(",").map((s) => s.trim());
		if (parts.length > 0) {
			citySet.add(parts[parts.length - 1]);
		}
	}

	return Array.from(citySet).sort();
};

/**
 * Get posts from users that the current user follows.
 * Excludes posts from blocked users (both directions).
 */
export const getFriendsFeed = async (userId, { page = 1, limit = 10 }) => {
	const skip = (page - 1) * limit;

	// Get IDs of users the current user follows
	const following = await prisma.follow.findMany({
		where: { followerId: userId },
		select: { followingId: true },
	});

	// Get blocked user IDs (both directions)
	const blockedIds = await getAllBlockedUserIds(userId);

	// Filter out blocked users from following list
	const followingIds = following.map((f) => f.followingId).filter((id) => !blockedIds.includes(id));

	const [posts, total] = await Promise.all([
		prisma.post.findMany({
			where: { userId: { in: followingIds } },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: POST_INCLUDE,
		}),
		prisma.post.count({ where: { userId: { in: followingIds } } }),
	]);

	return {
		posts,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

/**
 * Get a single post by ID.
 */
export const getPostById = async (postId) => {
	const post = await prisma.post.findUnique({
		where: { id: postId },
		include: {
			...POST_INCLUDE,
			comments: {
				where: { parentId: null },
				orderBy: { createdAt: "desc" },
				take: 20,
				include: {
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
				},
			},
		},
	});

	if (!post) throw ApiError.notFound("Post not found");
	return post;
};

/**
 * Get a post by its share slug (for public sharing).
 */
export const getPostBySlug = async (slug) => {
	const post = await prisma.post.findUnique({
		where: { shareSlug: slug },
		include: {
			...POST_INCLUDE,
			comments: {
				where: { parentId: null },
				orderBy: { createdAt: "desc" },
				take: 20,
				include: {
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
				},
			},
		},
	});

	if (!post) throw ApiError.notFound("Post not found");
	return post;
};

/**
 * Update a post (owner only).
 */
export const updatePost = async (postId, userId, data) => {
	const post = await prisma.post.findUnique({ where: { id: postId } });
	if (!post) throw ApiError.notFound("Post not found");
	if (post.userId !== userId) throw ApiError.forbidden("You can only edit your own posts");

	return prisma.post.update({
		where: { id: postId },
		data,
		include: POST_INCLUDE,
	});
};

/**
 * Delete a post (owner only).
 */
export const deletePost = async (postId, userId) => {
	const post = await prisma.post.findUnique({ where: { id: postId } });
	if (!post) throw ApiError.notFound("Post not found");
	if (post.userId !== userId) throw ApiError.forbidden("You can only delete your own posts");

	await prisma.post.delete({ where: { id: postId } });
};
