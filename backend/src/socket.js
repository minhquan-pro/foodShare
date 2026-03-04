import jwt from "jsonwebtoken";
import config from "./config/index.js";
import * as chatService from "./features/chat/chat.service.js";
import prisma from "./utils/prisma.js";

// Store online users: userId -> Set<socketId>
const onlineUsers = new Map();

export function setupSocket(io) {
	// ─── Authentication Middleware ─────────────────────────────
	io.use((socket, next) => {
		const token = socket.handshake.auth?.token;
		if (!token) return next(new Error("Authentication required"));

		try {
			const decoded = jwt.verify(token, config.jwt.secret);
			socket.userId = decoded.sub;
			socket.userEmail = decoded.email;
			next();
		} catch {
			next(new Error("Invalid or expired token"));
		}
	});

	io.on("connection", (socket) => {
		const userId = socket.userId;
		console.log(`🔌 User connected: ${userId} (socket ${socket.id})`);

		// Track online status
		if (!onlineUsers.has(userId)) {
			onlineUsers.set(userId, new Set());
		}
		onlineUsers.get(userId).add(socket.id);

		// Join personal notification room
		socket.join(`user:${userId}`);

		// Broadcast online status
		io.emit("user:online", { userId });

		// ─── Join conversation rooms ───────────────────────────
		socket.on("chat:join", (conversationId) => {
			socket.join(`conversation:${conversationId}`);
		});

		socket.on("chat:leave", (conversationId) => {
			socket.leave(`conversation:${conversationId}`);
		});

		// ─── Send message via socket ───────────────────────────
		socket.on("chat:sendMessage", async ({ conversationId, body, replyToId }, callback) => {
			try {
				const message = await chatService.createMessage(conversationId, userId, body.trim(), replyToId || null);
				if (!message) {
					return callback?.({ error: "Not a member of this conversation" });
				}

				// Broadcast to all members in the conversation room
				io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
					conversationId,
					message,
				});

				// Also emit conversation update to all connected clients of the other member
				// so their conversation list updates
				io.emit("chat:conversationUpdated", { conversationId, lastMessage: message });

				callback?.({ success: true, message });

				// ─── Auto-reply from admin (only for 1-on-1 conversations) ───
				try {
					const conv = await prisma.conversation.findUnique({
						where: { id: conversationId },
						select: { isGroup: true },
					});

					if (!conv?.isGroup) {
						const members = await prisma.conversationMember.findMany({
							where: { conversationId },
							include: { user: { select: { id: true, role: true } } },
						});
						const adminMember = members.find((m) => m.user.role === "admin" && m.user.id !== userId);
						if (adminMember) {
							// Count messages sent by this user in this conversation
							const userMsgCount = await prisma.message.count({
								where: { conversationId, senderId: userId },
							});
							// Only auto-reply on the very first message from this user
							if (userMsgCount === 1) {
								const autoReply = await chatService.createMessage(
									conversationId,
									adminMember.user.id,
									"Chào bạn, tôi có thể giúp gì cho bạn?",
								);
								if (autoReply) {
									io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
										conversationId,
										message: autoReply,
									});
									io.emit("chat:conversationUpdated", { conversationId, lastMessage: autoReply });
								}
							}
						}
					}
				} catch (err) {
					console.error("Auto-reply error:", err);
				}
			} catch (err) {
				console.error("chat:sendMessage error:", err);
				callback?.({ error: "Failed to send message" });
			}
		});

		// ─── Typing indicators ─────────────────────────────────
		socket.on("chat:typing", ({ conversationId }) => {
			socket.to(`conversation:${conversationId}`).emit("chat:typing", {
				conversationId,
				userId,
			});
		});

		socket.on("chat:stopTyping", ({ conversationId }) => {
			socket.to(`conversation:${conversationId}`).emit("chat:stopTyping", {
				conversationId,
				userId,
			});
		});

		// ─── Mark as read ──────────────────────────────────────
		socket.on("chat:markRead", async ({ conversationId }) => {
			try {
				await chatService.markAsRead(conversationId, userId);
				socket.to(`conversation:${conversationId}`).emit("chat:messagesRead", {
					conversationId,
					readBy: userId,
				});
			} catch (err) {
				console.error("chat:markRead error:", err);
			}
		});

		// ─── Delete a single message ───────────────────────────
		socket.on("chat:deleteMessage", async ({ conversationId, messageId }, callback) => {
			try {
				const result = await chatService.deleteMessage(messageId, userId);
				if (!result) return callback?.({ error: "Message not found" });
				if (result.forbidden) return callback?.({ error: "Cannot delete another user's message" });

				io.to(`conversation:${conversationId}`).emit("chat:messageDeleted", {
					conversationId,
					messageId,
					message: result.message,
				});
				callback?.({ success: true });
			} catch (err) {
				console.error("chat:deleteMessage error:", err);
				callback?.({ error: "Failed to delete message" });
			}
		});

		// ─── Toggle reaction on message ────────────────────────
		socket.on("chat:toggleReaction", async ({ conversationId, messageId, emoji }, callback) => {
			try {
				const message = await chatService.toggleMessageReaction(messageId, userId, emoji || "❤️");
				if (!message) {
					return callback?.({ error: "Message not found" });
				}

				// Broadcast updated message to everyone in the conversation
				io.to(`conversation:${conversationId}`).emit("chat:messageReactionUpdated", {
					conversationId,
					message,
				});

				callback?.({ success: true, message });
			} catch (err) {
				console.error("chat:toggleReaction error:", err);
				callback?.({ error: "Failed to toggle reaction" });
			}
		});

		// ─── Get online users ──────────────────────────────────
		socket.on("chat:getOnlineUsers", (userIds, callback) => {
			const online = userIds.filter((id) => onlineUsers.has(id));
			callback?.(online);
		});

		// ─── Disconnect ────────────────────────────────────────
		socket.on("disconnect", () => {
			console.log(`🔌 User disconnected: ${userId} (socket ${socket.id})`);
			const sockets = onlineUsers.get(userId);
			if (sockets) {
				sockets.delete(socket.id);
				if (sockets.size === 0) {
					onlineUsers.delete(userId);
					io.emit("user:offline", { userId });
				}
			}
		});
	});
}
