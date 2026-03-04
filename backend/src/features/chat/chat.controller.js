import * as chatService from "./chat.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * GET /api/chat/conversations
 */
export const getConversations = catchAsync(async (req, res) => {
	const conversations = await chatService.getConversations(req.user.id);
	res.json({ success: true, data: { conversations } });
});

/**
 * POST /api/chat/conversations
 * Body: { userId } — start or get existing conversation with userId
 */
export const startConversation = catchAsync(async (req, res) => {
	const { userId } = req.body;
	if (!userId) throw ApiError.badRequest("userId is required");
	if (userId === req.user.id) throw ApiError.badRequest("Cannot chat with yourself");

	const conversation = await chatService.getOrCreateConversation(req.user.id, userId);
	res.json({ success: true, data: { conversation } });
});

/**
 * POST /api/chat/conversations/group
 * Body: { memberIds: string[], name?: string }
 */
export const createGroupConversation = catchAsync(async (req, res) => {
	const { memberIds, name } = req.body;
	if (!Array.isArray(memberIds) || memberIds.length < 2) {
		throw ApiError.badRequest("At least 2 other members are required for a group chat");
	}

	const conversation = await chatService.createGroupConversation(req.user.id, memberIds, name);
	res.status(201).json({ success: true, data: { conversation } });
});

/**
 * POST /api/chat/conversations/:id/members
 * Body: { memberIds: string[] }
 */
export const addGroupMembers = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { memberIds } = req.body;
	if (!Array.isArray(memberIds) || memberIds.length === 0) {
		throw ApiError.badRequest("memberIds array is required");
	}

	const result = await chatService.addGroupMembers(id, req.user.id, memberIds);
	if (!result) throw ApiError.forbidden("Not a group conversation or not a member");

	res.json({ success: true, data: result });
});

/**
 * DELETE /api/chat/conversations/:id/members/:userId
 */
export const removeGroupMember = catchAsync(async (req, res) => {
	const { id, userId } = req.params;

	const result = await chatService.removeGroupMember(id, req.user.id, userId);
	if (!result) throw ApiError.forbidden("Not a group conversation or not a member");

	res.json({ success: true, data: result });
});

/**
 * PATCH /api/chat/conversations/:id/name
 * Body: { name: string }
 */
export const updateGroupName = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { name } = req.body;
	if (!name?.trim()) throw ApiError.badRequest("Group name is required");

	const conversation = await chatService.updateGroupName(id, req.user.id, name.trim());
	if (!conversation) throw ApiError.forbidden("Not a member of this conversation");

	res.json({ success: true, data: { conversation } });
});

/**
 * GET /api/chat/conversations/:id/messages?cursor=&limit=
 */
export const getMessages = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { cursor, limit } = req.query;

	const messages = await chatService.getMessages(id, req.user.id, cursor, limit ? parseInt(limit) : undefined);
	if (messages === null) throw ApiError.forbidden("Not a member of this conversation");

	res.json({ success: true, data: { messages } });
});

/**
 * POST /api/chat/conversations/:id/messages
 * Body: { body }
 */
export const sendMessage = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { body, replyToId } = req.body;
	if (!body?.trim()) throw ApiError.badRequest("Message body is required");

	const message = await chatService.createMessage(id, req.user.id, body.trim(), replyToId || null);
	if (!message) throw ApiError.forbidden("Not a member of this conversation");

	res.status(201).json({ success: true, data: { message } });
});

/**
 * DELETE /api/chat/conversations/:id/messages/:messageId
 */
export const deleteMessage = catchAsync(async (req, res) => {
	const { messageId } = req.params;
	const result = await chatService.deleteMessage(messageId, req.user.id);
	if (!result) throw ApiError.notFound("Message not found");
	if (result.forbidden) throw ApiError.forbidden("Cannot delete another user's message");
	res.json({ success: true, data: { message: result.message } });
});

/**
 * PATCH /api/chat/conversations/:id/read
 */
export const markAsRead = catchAsync(async (req, res) => {
	const { id } = req.params;
	await chatService.markAsRead(id, req.user.id);
	res.json({ success: true });
});

/**
 * POST /api/chat/conversations/:id/messages/:messageId/react
 * Body: { emoji } (optional, defaults to ❤️)
 */
export const toggleReaction = catchAsync(async (req, res) => {
	const { messageId } = req.params;
	const { emoji } = req.body;

	const message = await chatService.toggleMessageReaction(messageId, req.user.id, emoji || "❤️");
	if (!message) throw ApiError.notFound("Message not found");

	res.json({ success: true, data: { message } });
});

/**
 * DELETE /api/chat/conversations/:id
 */
export const deleteConversation = catchAsync(async (req, res) => {
	const { id } = req.params;
	const deleted = await chatService.deleteConversation(id, req.user.id);
	if (!deleted) throw ApiError.forbidden("Not a member of this conversation");
	res.json({ success: true });
});

/**
 * GET /api/chat/unread-count
 */
export const getUnreadCount = catchAsync(async (req, res) => {
	const count = await chatService.getUnreadCount(req.user.id);
	res.json({ success: true, data: { count } });
});
