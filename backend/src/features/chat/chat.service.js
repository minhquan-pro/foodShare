import prisma from "../../utils/prisma.js";

const USER_SELECT = {
	id: true,
	name: true,
	role: true,
	avatarUrl: true,
};

const MESSAGE_INCLUDE = {
	sender: { select: USER_SELECT },
	reactions: {
		include: { user: { select: { id: true, name: true, role: true } } },
	},
	replyTo: {
		select: {
			id: true,
			body: true,
			deleted: true,
			sender: { select: { id: true, name: true } },
		},
	},
};

/**
 * Get or create a 1-on-1 conversation between two users.
 */
export async function getOrCreateConversation(userId, otherUserId) {
	// Find existing 1-on-1 conversation that has exactly these two members
	const existing = await prisma.conversation.findFirst({
		where: {
			isGroup: false,
			AND: [{ members: { some: { userId } } }, { members: { some: { userId: otherUserId } } }],
		},
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
		},
	});

	if (existing) {
		return formatConversation(existing, userId);
	}

	// Create new 1-on-1 conversation
	const conversation = await prisma.conversation.create({
		data: {
			members: {
				create: [{ userId }, { userId: otherUserId }],
			},
		},
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
		},
	});

	return formatConversation(conversation, userId);
}

/**
 * Create a group conversation with multiple members.
 */
export async function createGroupConversation(creatorId, memberIds, name) {
	// Ensure creator is included and deduplicate
	const allIds = [...new Set([creatorId, ...memberIds])];

	const conversation = await prisma.conversation.create({
		data: {
			isGroup: true,
			name: name || null,
			members: {
				create: allIds.map((id) => ({ userId: id })),
			},
		},
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
		},
	});

	return formatConversation(conversation, creatorId);
}

/**
 * Add members to a group conversation.
 */
export async function addGroupMembers(conversationId, requesterId, newMemberIds) {
	const conv = await prisma.conversation.findUnique({
		where: { id: conversationId },
		include: { members: true },
	});
	if (!conv || !conv.isGroup) return null;

	// Verify requester is a member
	const isMember = conv.members.some((m) => m.userId === requesterId);
	if (!isMember) return null;

	// Filter out users who are already members
	const existingIds = conv.members.map((m) => m.userId);
	const toAdd = newMemberIds.filter((id) => !existingIds.includes(id));

	if (toAdd.length === 0) return { added: [] };

	await prisma.conversationMember.createMany({
		data: toAdd.map((userId) => ({ conversationId, userId })),
	});

	const updated = await prisma.conversation.findUnique({
		where: { id: conversationId },
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
		},
	});

	return { added: toAdd, conversation: formatConversation(updated, requesterId) };
}

/**
 * Remove a member from a group conversation (or leave).
 */
export async function removeGroupMember(conversationId, requesterId, targetUserId) {
	const conv = await prisma.conversation.findUnique({
		where: { id: conversationId },
		include: { members: true },
	});
	if (!conv || !conv.isGroup) return null;

	// Requester must be a member
	const isMember = conv.members.some((m) => m.userId === requesterId);
	if (!isMember) return null;

	await prisma.conversationMember.delete({
		where: { conversationId_userId: { conversationId, userId: targetUserId } },
	});

	// If only 1 member remains, delete the conversation
	const remaining = await prisma.conversationMember.count({ where: { conversationId } });
	if (remaining <= 1) {
		await prisma.conversation.delete({ where: { id: conversationId } });
		return { deleted: true };
	}

	return { removed: targetUserId };
}

/**
 * Update group conversation name.
 */
export async function updateGroupName(conversationId, userId, name) {
	const member = await prisma.conversationMember.findUnique({
		where: { conversationId_userId: { conversationId, userId } },
	});
	if (!member) return null;

	const conv = await prisma.conversation.update({
		where: { id: conversationId },
		data: { name },
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
		},
	});

	return formatConversation(conv, userId);
}

/**
 * Get all conversations for a user.
 */
export async function getConversations(userId) {
	const conversations = await prisma.conversation.findMany({
		where: {
			members: { some: { userId } },
		},
		include: {
			members: { include: { user: { select: USER_SELECT } } },
			messages: {
				orderBy: { createdAt: "desc" },
				take: 1,
				include: { sender: { select: USER_SELECT } },
			},
			_count: {
				select: {
					messages: {
						where: {
							read: false,
							senderId: { not: userId },
						},
					},
				},
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	return conversations.map((c) => formatConversation(c, userId));
}

/**
 * Get messages for a conversation (paginated).
 */
export async function getMessages(conversationId, userId, cursor, limit = 30) {
	// Verify user is a member
	const member = await prisma.conversationMember.findUnique({
		where: { conversationId_userId: { conversationId, userId } },
	});
	if (!member) return null;

	const where = { conversationId };
	if (cursor) {
		where.createdAt = { lt: new Date(cursor) };
	}

	const messages = await prisma.message.findMany({
		where,
		include: MESSAGE_INCLUDE,
		orderBy: { createdAt: "desc" },
		take: limit,
	});

	return messages.reverse();
}

/**
 * Create a new message.
 */
export async function createMessage(conversationId, senderId, body, replyToId = null) {
	// Verify sender is a member
	const member = await prisma.conversationMember.findUnique({
		where: { conversationId_userId: { conversationId, userId: senderId } },
	});
	if (!member) return null;

	const message = await prisma.message.create({
		data: { body, conversationId, senderId, ...(replyToId ? { replyToId } : {}) },
		include: MESSAGE_INCLUDE,
	});

	// Update conversation's updatedAt
	await prisma.conversation.update({
		where: { id: conversationId },
		data: { updatedAt: new Date() },
	});

	return message;
}

/**
 * Mark all messages in a conversation as read (except own messages).
 */
export async function markAsRead(conversationId, userId) {
	await prisma.message.updateMany({
		where: {
			conversationId,
			senderId: { not: userId },
			read: false,
		},
		data: { read: true },
	});
}

/**
 * Get total unread message count for a user.
 */
export async function getUnreadCount(userId) {
	const count = await prisma.message.count({
		where: {
			conversation: {
				members: { some: { userId } },
			},
			senderId: { not: userId },
			read: false,
		},
	});
	return count;
}

/**
 * Toggle a reaction (emoji) on a message.
 */
export async function toggleMessageReaction(messageId, userId, emoji = "❤️") {
	const existing = await prisma.messageReaction.findUnique({
		where: { userId_messageId_emoji: { userId, messageId, emoji } },
	});

	if (existing) {
		await prisma.messageReaction.delete({ where: { id: existing.id } });
	} else {
		await prisma.messageReaction.create({
			data: { emoji, userId, messageId },
		});
	}

	// Return the updated message with reactions
	const message = await prisma.message.findUnique({
		where: { id: messageId },
		include: MESSAGE_INCLUDE,
	});

	return message;
}

/**
 * Soft-delete a single message (only by sender).
 */
export async function deleteMessage(messageId, userId) {
	const message = await prisma.message.findUnique({
		where: { id: messageId },
		select: { senderId: true, conversationId: true },
	});
	if (!message) return null;
	if (message.senderId !== userId) return { forbidden: true };

	const updated = await prisma.message.update({
		where: { id: messageId },
		data: { deleted: true, body: "" },
		include: MESSAGE_INCLUDE,
	});
	return { message: updated, conversationId: message.conversationId };
}

/**
 * Delete a conversation (only if user is a member).
 */
export async function deleteConversation(conversationId, userId) {
	const member = await prisma.conversationMember.findUnique({
		where: { conversationId_userId: { conversationId, userId } },
	});
	if (!member) return false;

	await prisma.conversation.delete({ where: { id: conversationId } });
	return true;
}

// ─── Helpers ────────────────────────────────────────────────

function formatConversation(conv, currentUserId) {
	const isGroup = conv.isGroup || false;
	const otherMember = conv.members.find((m) => m.userId !== currentUserId);
	const members = conv.members.map((m) => m.user);

	return {
		id: conv.id,
		isGroup,
		name: isGroup ? conv.name || members.map((m) => m.name).join(", ") : null,
		avatarUrl: conv.avatarUrl || null,
		otherUser: isGroup ? null : otherMember?.user || null,
		members,
		lastMessage: conv.messages[0] || null,
		unreadCount: conv._count?.messages || 0,
		updatedAt: conv.updatedAt,
		createdAt: conv.createdAt,
	};
}
