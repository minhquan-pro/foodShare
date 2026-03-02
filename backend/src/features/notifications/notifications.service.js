import prisma from "../../utils/prisma.js";

/**
 * Create a notification and return it with actor info.
 * Skips if actor === recipient (don't notify yourself).
 */
export const createNotification = async ({ type, userId, actorId, postId = null, commentId = null }) => {
	// Don't notify yourself
	if (userId === actorId) return null;

	const notification = await prisma.notification.create({
		data: { type, userId, actorId, postId, commentId },
		include: {
			actor: { select: { id: true, name: true, avatarUrl: true } },
			post: { select: { id: true, restaurantName: true, imageUrl: true } },
			comment: { select: { id: true, body: true } },
		},
	});

	return notification;
};

/**
 * Get notifications for a user (paginated, newest first).
 */
export const getNotifications = async (userId, { page = 1, limit = 20 }) => {
	const skip = (page - 1) * limit;

	const [notifications, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: {
				actor: { select: { id: true, name: true, avatarUrl: true } },
				post: { select: { id: true, restaurantName: true, imageUrl: true } },
				comment: { select: { id: true, body: true } },
			},
		}),
		prisma.notification.count({ where: { userId } }),
		prisma.notification.count({ where: { userId, read: false } }),
	]);

	return {
		notifications,
		unreadCount,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

/**
 * Get unread notification count for a user.
 */
export const getUnreadCount = async (userId) => {
	return prisma.notification.count({ where: { userId, read: false } });
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
	await prisma.notification.updateMany({
		where: { userId, read: false },
		data: { read: true },
	});
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (notificationId, userId) => {
	await prisma.notification.updateMany({
		where: { id: notificationId, userId },
		data: { read: true },
	});
};
