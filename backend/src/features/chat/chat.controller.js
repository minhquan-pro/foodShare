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
	const { body } = req.body;
	if (!body?.trim()) throw ApiError.badRequest("Message body is required");

	const message = await chatService.createMessage(id, req.user.id, body.trim());
	if (!message) throw ApiError.forbidden("Not a member of this conversation");

	res.status(201).json({ success: true, data: { message } });
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
 * GET /api/chat/unread-count
 */
export const getUnreadCount = catchAsync(async (req, res) => {
	const count = await chatService.getUnreadCount(req.user.id);
	res.json({ success: true, data: { count } });
});
