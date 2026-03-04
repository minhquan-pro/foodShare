import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { getAllBlockedUserIds } from "../blocks/blocks.service.js";

const POST_INCLUDE = {
	user: { select: { id: true, name: true, role: true, avatarUrl: true } },
	_count: { select: { likes: true, comments: true, bookmarks: true, views: true } },
};

/**
 * Search distinct restaurant names.
 */
export const searchRestaurantNames = async (query, limit = 8) => {
	const posts = await prisma.post.findMany({
		where: { restaurantName: { contains: query } },
		select: { restaurantName: true },
		distinct: ["restaurantName"],
		orderBy: { restaurantName: "asc" },
		take: limit,
	});
	return posts.map((p) => p.restaurantName);
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

	const where = { isStory: false };
	if (location) where.restaurantAddress = { contains: location };

	// Filter out blocked users
	if (userId) {
		const blockedIds = await getAllBlockedUserIds(userId);
		if (blockedIds.length > 0) {
			where.userId = { notIn: blockedIds };
		}
	}

	let [posts, total] = await Promise.all([
		prisma.post.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: POST_INCLUDE,
		}),
		prisma.post.count({ where }),
	]);

	// attach reactions counts
	posts = await attachReactionsToPosts(posts);

	// Get liked post IDs, user reactions, and bookmarked post IDs in parallel
	let likedPostIds = [];
	let userReactedPosts = {};
	let bookmarkedPostIds = [];
	if (userId && posts.length > 0) {
		const postIds = posts.map((p) => p.id);
		const [likes, userRxs, bookmarks] = await Promise.all([
			prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
			prisma.postReaction.findMany({
				where: { userId, postId: { in: postIds } },
				select: { postId: true, emoji: true },
			}),
			prisma.bookmark.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
		]);
		likedPostIds = likes.map((l) => l.postId);
		for (const r of userRxs) userReactedPosts[r.postId] = r.emoji;
		bookmarkedPostIds = bookmarks.map((b) => b.postId);
	}

	return {
		posts,
		likedPostIds,
		userReactedPosts,
		bookmarkedPostIds,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// Helper to attach reaction counts to posts array
const attachReactionsToPosts = async (posts) => {
	if (!posts || posts.length === 0) return posts;
	const postIds = posts.map((p) => p.id);
	const groups = await prisma.postReaction.groupBy({
		by: ["postId", "emoji"],
		where: { postId: { in: postIds } },
		_count: { emoji: true },
	});

	const map = {};
	for (const g of groups) {
		if (!map[g.postId]) map[g.postId] = [];
		map[g.postId].push({ emoji: g.emoji, count: g._count.emoji });
	}

	return posts.map((p) => ({ ...p, reactions: map[p.id] || [] }));
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

	let [posts, total] = await Promise.all([
		prisma.post.findMany({
			where: { userId: { in: followingIds }, isStory: false },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: POST_INCLUDE,
		}),
		prisma.post.count({ where: { userId: { in: followingIds }, isStory: false } }),
	]);

	// attach reactions counts
	posts = await attachReactionsToPosts(posts);

	// Get liked post IDs, user reactions, and bookmarked post IDs in parallel
	let likedPostIds = [];
	let userReactedPosts = {};
	let bookmarkedPostIds = [];
	if (posts.length > 0) {
		const postIds = posts.map((p) => p.id);
		const [likes, userRxs, bookmarks] = await Promise.all([
			prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
			prisma.postReaction.findMany({
				where: { userId, postId: { in: postIds } },
				select: { postId: true, emoji: true },
			}),
			prisma.bookmark.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
		]);
		likedPostIds = likes.map((l) => l.postId);
		for (const r of userRxs) userReactedPosts[r.postId] = r.emoji;
		bookmarkedPostIds = bookmarks.map((b) => b.postId);
	}

	return {
		posts,
		likedPostIds,
		userReactedPosts,
		bookmarkedPostIds,
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
export const getPostById = async (postId, userId = null) => {
	const post = await prisma.post.findUnique({
		where: { id: postId },
		include: {
			...POST_INCLUDE,
			comments: {
				where: { parentId: null },
				orderBy: { createdAt: "desc" },
				take: 20,
				include: {
					user: { select: { id: true, name: true, role: true, avatarUrl: true } },
					_count: { select: { commentLikes: true } },
					replies: {
						orderBy: { createdAt: "asc" },
						include: {
							user: { select: { id: true, name: true, role: true, avatarUrl: true } },
							_count: { select: { commentLikes: true } },
							replies: {
								orderBy: { createdAt: "asc" },
								include: {
									user: { select: { id: true, name: true, role: true, avatarUrl: true } },
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
	// attach reactions
	const groups = await prisma.postReaction.groupBy({
		by: ["emoji"],
		where: { postId },
		_count: { emoji: true },
	});
	post.reactions = groups.map((g) => ({ emoji: g.emoji, count: g._count.emoji }));

	let userReaction = null;
	let isPostBookmarked = false;
	let isPostLiked = false;
	if (userId) {
		const [ur, bm, lk] = await Promise.all([
			prisma.postReaction.findFirst({ where: { postId, userId }, select: { emoji: true } }),
			prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } }),
			prisma.like.findUnique({ where: { userId_postId: { userId, postId } } }),
		]);
		userReaction = ur?.emoji ?? null;
		isPostBookmarked = !!bm;
		isPostLiked = !!lk;
	}

	return { post, userReaction, isPostBookmarked, isPostLiked };
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
					user: { select: { id: true, name: true, role: true, avatarUrl: true } },
					_count: { select: { commentLikes: true } },
					replies: {
						orderBy: { createdAt: "asc" },
						include: {
							user: { select: { id: true, name: true, role: true, avatarUrl: true } },
							_count: { select: { commentLikes: true } },
							replies: {
								orderBy: { createdAt: "asc" },
								include: {
									user: { select: { id: true, name: true, role: true, avatarUrl: true } },
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

/**
 * Toggle a reaction (emoji) on a post by a user.
 * Facebook-style: one reaction per user. Same emoji = remove, different emoji = switch.
 */
export const togglePostReaction = async (postId, userId, emoji = "❤️") => {
	const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
	if (!post) throw ApiError.notFound("Post not found");

	// Find any existing reaction by this user (one per user, Facebook-style)
	const existing = await prisma.postReaction.findFirst({ where: { userId, postId } });

	if (existing) {
		if (existing.emoji === emoji) {
			// Same emoji → remove (toggle off)
			await prisma.postReaction.delete({ where: { id: existing.id } });
			return { removed: true, emoji, postOwnerId: post.userId };
		}
		// Different emoji → switch reaction
		await prisma.postReaction.update({ where: { id: existing.id }, data: { emoji } });
		return { removed: false, switched: true, prevEmoji: existing.emoji, emoji, postOwnerId: post.userId };
	}

	const created = await prisma.postReaction.create({ data: { userId, postId, emoji } });
	return { removed: false, emoji, id: created.id, postOwnerId: post.userId };
};

/**
 * Get reaction counts grouped by emoji for a post.
 * Optionally indicate which emojis the given user has reacted with.
 */
export const getPostReactions = async (postId, userId = null) => {
	const reactions = await prisma.postReaction.groupBy({
		by: ["emoji"],
		where: { postId },
		_count: { emoji: true },
	});

	const result = reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji }));

	let userReactions = [];
	if (userId) {
		const urs = await prisma.postReaction.findMany({ where: { postId, userId }, select: { emoji: true } });
		userReactions = urs.map((u) => u.emoji);
	}

	return { reactions: result, userReactions };
};

export const getReactionUsers = async (postId, emoji = null) => {
	const where = { postId };
	if (emoji) where.emoji = emoji;
	const rows = await prisma.postReaction.findMany({
		where,
		select: {
			emoji: true,
			user: { select: { id: true, name: true, avatarUrl: true, role: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	return rows.map((r) => ({ ...r.user, emoji: r.emoji }));
};

/**
 * Get explore posts sorted by trending score, top rating, or newest.
 * Trending = reactions×3 + comments×2, computed in JS over last 7 days.
 */
export const getExplorePosts = async ({ sortBy = "trending", page = 1, limit = 21, userId = null }) => {
	const skip = (page - 1) * limit;

	const where = { isStory: false };
	if (userId) {
		const blockedIds = await getAllBlockedUserIds(userId);
		if (blockedIds.length > 0) where.userId = { notIn: blockedIds };
	}

	if (sortBy === "trending") {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		where.createdAt = { gte: sevenDaysAgo };

		const POOL_MULTIPLIER = 10;
		let posts = await prisma.post.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit * POOL_MULTIPLIER,
			include: POST_INCLUDE,
		});

		posts = await attachReactionsToPosts(posts);

		const scored = posts
			.map((p) => {
				const totalReactions = (p.reactions || []).reduce((sum, r) => sum + r.count, 0);
				return { ...p, _score: totalReactions * 3 + (p._count?.comments || 0) * 2 };
			})
			.sort((a, b) => b._score - a._score || new Date(b.createdAt) - new Date(a.createdAt));

		const total = scored.length;
		return {
			posts: scored.slice(skip, skip + limit),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	}

	const orderBy = sortBy === "top" ? [{ rating: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" };

	let [posts, total] = await Promise.all([
		prisma.post.findMany({ where, orderBy, skip, take: limit, include: POST_INCLUDE }),
		prisma.post.count({ where }),
	]);

	posts = await attachReactionsToPosts(posts);

	return {
		posts,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

/**
 * Get all posts that have coordinates, for the map view.
 */
export const getMapPosts = async () => {
	const posts = await prisma.post.findMany({
		where: {
			latitude: { not: null },
			longitude: { not: null },
		},
		select: {
			id: true,
			imageUrl: true,
			restaurantName: true,
			dishName: true,
			restaurantAddress: true,
			rating: true,
			latitude: true,
			longitude: true,
			shareSlug: true,
			user: { select: { id: true, name: true, avatarUrl: true } },
		},
		orderBy: { createdAt: "desc" },
	});
	return posts;
};

/**
 * Create a story (isStory=true, only image + optional caption).
 */
export const createStory = async (userId, caption, imageUrl) => {
	return prisma.post.create({
		data: {
			imageUrl,
			isStory: true,
			description: caption || "",
			restaurantName: "",
			restaurantAddress: "",
			rating: 5,
			userId,
		},
		include: {
			user: { select: { id: true, name: true, avatarUrl: true, role: true } },
			_count: { select: { views: true } },
		},
	});
};

/**
 * Get stories: current user's latest post + followed users' latest posts (last 7 days).
 * Returns one post per user, current user first.
 */
export const getStories = async (userId) => {
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	const following = await prisma.follow.findMany({
		where: { followerId: userId },
		select: { followingId: true },
	});
	const userIds = [userId, ...following.map((f) => f.followingId)];

	const posts = await prisma.post.findMany({
		where: { userId: { in: userIds }, isStory: true, createdAt: { gte: sevenDaysAgo } },
		orderBy: { createdAt: "desc" },
		include: {
			user: { select: { id: true, name: true, avatarUrl: true, role: true } },
			_count: { select: { views: true } },
		},
	});

	// One story per user (most recent)
	const seen = new Set();
	const stories = [];
	for (const post of posts) {
		if (!seen.has(post.userId)) {
			seen.add(post.userId);
			stories.push(post);
		}
	}

	// Current user's story first
	return stories.sort((a, b) => {
		if (a.userId === userId) return -1;
		if (b.userId === userId) return 1;
		return 0;
	});
};

/**
 * Record that a user has viewed a post (once per user per post, skip own posts).
 */
export const recordPostView = async (postId, userId) => {
	const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
	if (!post) return;
	if (post.userId === userId) return; // don't count own views

	await prisma.postView.upsert({
		where: { userId_postId: { userId, postId } },
		update: {}, // already viewed — no-op
		create: { userId, postId },
	});
};

/**
 * Get list of users who viewed a post (only for the post owner).
 */
export const getPostViewers = async (postId, requesterId) => {
	const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
	if (!post) throw ApiError.notFound("Post not found");
	if (post.userId !== requesterId) throw ApiError.forbidden("Only the post owner can see viewers");

	const rows = await prisma.postView.findMany({
		where: { postId },
		orderBy: { viewedAt: "desc" },
		select: {
			viewedAt: true,
			user: { select: { id: true, name: true, avatarUrl: true, role: true } },
		},
	});
	return rows.map((r) => ({ ...r.user, viewedAt: r.viewedAt }));
};

/**
 * Get top restaurants by post count with average rating and a cover image.
 */
export const getTopRestaurants = async ({ limit = 10 }) => {
	const groups = await prisma.post.groupBy({
		by: ["restaurantName"],
		_count: { id: true },
		_avg: { rating: true },
		orderBy: { _count: { id: "desc" } },
		take: limit,
	});

	if (groups.length === 0) return [];

	const representativePosts = await Promise.all(
		groups.map((g) =>
			prisma.post.findFirst({
				where: { restaurantName: g.restaurantName },
				orderBy: { createdAt: "desc" },
				select: { id: true, imageUrl: true, restaurantAddress: true },
			})
		)
	);

	return groups.map((g, i) => ({
		restaurantName: g.restaurantName,
		postCount: g._count.id,
		avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
		imageUrl: representativePosts[i]?.imageUrl || null,
		representativePostId: representativePosts[i]?.id || null,
		restaurantAddress: representativePosts[i]?.restaurantAddress || null,
	}));
};
