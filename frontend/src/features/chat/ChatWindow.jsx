import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addMessage, updateMessageReactions } from "./chatSlice.js";
import { FiArrowLeft, FiSend, FiSmile, FiMoreVertical, FiHeart } from "react-icons/fi";

function formatMessageTime(dateStr) {
	const date = new Date(dateStr);
	return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateSeparator(dateStr) {
	const date = new Date(dateStr);
	const now = new Date();
	const diffDays = Math.floor((now - date) / 86400000);

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
	return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function shouldShowDateSeparator(messages, index) {
	if (index === 0) return true;
	const curr = new Date(messages[index].createdAt).toDateString();
	const prev = new Date(messages[index - 1].createdAt).toDateString();
	return curr !== prev;
}

export default function ChatWindow({
	conversation,
	messages,
	loading,
	currentUser,
	socket,
	isUserOnline,
	onBack,
	onLoadMore,
}) {
	const dispatch = useDispatch();
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef(null);
	const messagesContainerRef = useRef(null);
	const typingTimeoutRef = useRef(null);
	const prevMessagesLenRef = useRef(0);

	const otherUser = conversation.otherUser;
	const online = otherUser && isUserOnline(otherUser.id);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (messages.length > prevMessagesLenRef.current) {
			// Only auto-scroll if we're near the bottom or it's a new message
			const container = messagesContainerRef.current;
			if (container) {
				const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
				if (isNearBottom || messages.length - prevMessagesLenRef.current === 1) {
					messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
				}
			}
		}
		prevMessagesLenRef.current = messages.length;
	}, [messages.length]);

	// Scroll to bottom on first load
	useEffect(() => {
		if (!loading && messages.length > 0) {
			messagesEndRef.current?.scrollIntoView();
		}
	}, [loading, conversation.id]);

	// Listen for typing events
	useEffect(() => {
		if (!socket) return;

		const handleTyping = ({ conversationId, userId }) => {
			if (conversationId === conversation.id && userId !== currentUser.id) {
				setIsTyping(true);
			}
		};

		const handleStopTyping = ({ conversationId, userId }) => {
			if (conversationId === conversation.id && userId !== currentUser.id) {
				setIsTyping(false);
			}
		};

		const handleReactionUpdated = ({ conversationId, message }) => {
			if (conversationId === conversation.id) {
				dispatch(updateMessageReactions({ conversationId, message }));
			}
		};

		socket.on("chat:typing", handleTyping);
		socket.on("chat:stopTyping", handleStopTyping);
		socket.on("chat:messageReactionUpdated", handleReactionUpdated);

		return () => {
			socket.off("chat:typing", handleTyping);
			socket.off("chat:stopTyping", handleStopTyping);
			socket.off("chat:messageReactionUpdated", handleReactionUpdated);
		};
	}, [socket, conversation.id, currentUser.id, dispatch]);

	// Handle input change with typing indicator
	const handleInputChange = (e) => {
		setInput(e.target.value);

		if (socket) {
			socket.emit("chat:typing", { conversationId: conversation.id });
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = setTimeout(() => {
				socket.emit("chat:stopTyping", { conversationId: conversation.id });
			}, 2000);
		}
	};

	// Send message
	const handleSend = useCallback(() => {
		const body = input.trim();
		if (!body || !socket) return;

		// Optimistic add
		const optimisticMessage = {
			id: `temp-${Date.now()}`,
			body,
			senderId: currentUser.id,
			sender: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
			conversationId: conversation.id,
			createdAt: new Date().toISOString(),
			read: false,
		};

		dispatch(addMessage({ conversationId: conversation.id, message: optimisticMessage }));
		setInput("");

		// Stop typing indicator
		socket.emit("chat:stopTyping", { conversationId: conversation.id });
		clearTimeout(typingTimeoutRef.current);

		// Send via socket
		socket.emit("chat:sendMessage", { conversationId: conversation.id, body }, (response) => {
			if (response?.error) {
				console.error("Failed to send message:", response.error);
			}
		});
	}, [input, socket, currentUser, conversation.id, dispatch]);

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// Toggle heart reaction on a message
	const handleToggleReaction = (messageId) => {
		if (!socket) return;
		socket.emit("chat:toggleReaction", {
			conversationId: conversation.id,
			messageId,
			emoji: "❤️",
		});
	};

	// Handle scroll for loading older messages
	const handleScroll = () => {
		const container = messagesContainerRef.current;
		if (container && container.scrollTop === 0 && messages.length >= 30) {
			onLoadMore?.();
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
				<button
					onClick={onBack}
					className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-700"
				>
					<FiArrowLeft size={20} />
				</button>

				<Link to={`/profile/${otherUser?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
					<div className="relative shrink-0">
						{otherUser?.avatarUrl ? (
							<img
								src={otherUser.avatarUrl}
								alt={otherUser.name}
								className="h-10 w-10 rounded-full object-cover"
							/>
						) : (
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
								{otherUser?.name?.charAt(0).toUpperCase() || "?"}
							</div>
						)}
						{online && (
							<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" />
						)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
							{otherUser?.name || "Unknown"}
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500">
							{isTyping ? (
								<span className="text-primary-500 font-medium">typing...</span>
							) : online ? (
								<span className="text-green-500">Online</span>
							) : (
								"Offline"
							)}
						</p>
					</div>
				</Link>
			</div>

			{/* Messages */}
			<div
				ref={messagesContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
			>
				{loading && messages.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-500" />
					</div>
				) : messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-400">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
							{otherUser?.avatarUrl ? (
								<img
									src={otherUser.avatarUrl}
									alt={otherUser.name}
									className="h-16 w-16 rounded-full object-cover"
								/>
							) : (
								<span className="text-2xl font-bold text-primary-500">
									{otherUser?.name?.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">{otherUser?.name}</p>
						<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
							Say hi to start the conversation!
						</p>
					</div>
				) : (
					<>
						{messages.map((msg, idx) => {
							const isMine = msg.senderId === currentUser.id || msg.sender?.id === currentUser.id;
							const showDate = shouldShowDateSeparator(messages, idx);
							const showAvatar =
								!isMine &&
								(idx === messages.length - 1 ||
									messages[idx + 1]?.senderId !== msg.senderId ||
									messages[idx + 1]?.sender?.id !== msg.sender?.id);

							return (
								<div key={msg.id}>
									{showDate && (
										<div className="flex items-center justify-center py-3">
											<span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
												{formatDateSeparator(msg.createdAt)}
											</span>
										</div>
									)}
									<div
										className={`flex items-end gap-2 mb-0.5 ${
											isMine ? "justify-end" : "justify-start"
										}`}
									>
										{/* Other user avatar */}
										{!isMine && (
											<div className="w-7 shrink-0">
												{showAvatar && (
													<img
														src={msg.sender?.avatarUrl || otherUser?.avatarUrl || undefined}
														alt=""
														className="h-7 w-7 rounded-full object-cover"
														onError={(e) => {
															e.target.style.display = "none";
														}}
													/>
												)}
											</div>
										)}

										{/* Message bubble with reaction */}
										<div className="relative max-w-[70%]">
											<div
												className={`group relative rounded-2xl px-3.5 py-2 ${
													isMine
														? "bg-primary-500 text-white rounded-br-md"
														: "bg-gray-100 text-gray-800 rounded-bl-md dark:bg-gray-700 dark:text-gray-100"
												}`}
											>
												<p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
													{msg.body}
												</p>
												<p
													className={`text-[10px] mt-0.5 text-right ${
														isMine ? "text-white/60" : "text-gray-400 dark:text-gray-500"
													}`}
												>
													{formatMessageTime(msg.createdAt)}
												</p>

												{/* Heart reaction button (appears on hover) */}
												{!msg.id?.toString().startsWith("temp-") && (
													<button
														onClick={() => handleToggleReaction(msg.id)}
														className={`absolute ${
															isMine ? "-left-8" : "-right-8"
														} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600`}
														title="React with ❤️"
													>
														<FiHeart
															size={14}
															className={`${
																msg.reactions?.some(
																	(r) =>
																		r.userId === currentUser.id ||
																		r.user?.id === currentUser.id,
																)
																	? "fill-red-500 text-red-500"
																	: "text-gray-400 hover:text-red-400"
															}`}
														/>
													</button>
												)}
											</div>

											{/* Reaction badges */}
											{msg.reactions && msg.reactions.length > 0 && (
												<div
													className={`flex ${
														isMine ? "justify-end" : "justify-start"
													} -mt-1.5 ${isMine ? "mr-1" : "ml-1"}`}
												>
													<div className="flex items-center gap-0.5 rounded-full bg-white border border-gray-100 shadow-sm px-1.5 py-0.5 dark:bg-gray-800 dark:border-gray-600">
														<span className="text-xs">❤️</span>
														{msg.reactions.length > 1 && (
															<span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
																{msg.reactions.length}
															</span>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}

						{/* Typing indicator */}
						{isTyping && (
							<div className="flex items-end gap-2 mb-0.5">
								<div className="w-7 shrink-0">
									{otherUser?.avatarUrl && (
										<img
											src={otherUser.avatarUrl}
											alt=""
											className="h-7 w-7 rounded-full object-cover"
										/>
									)}
								</div>
								<div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-700">
									<div className="flex gap-1">
										<span
											className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
											style={{ animationDelay: "0ms" }}
										/>
										<span
											className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
											style={{ animationDelay: "150ms" }}
										/>
										<span
											className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-gray-500"
											style={{ animationDelay: "300ms" }}
										/>
									</div>
								</div>
							</div>
						)}
					</>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
				<div className="flex items-end gap-2">
					<div className="flex-1 relative">
						<textarea
							value={input}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							placeholder="Type a message..."
							rows={1}
							className="input !rounded-2xl !py-2.5 !pr-12 resize-none max-h-32"
							style={{ minHeight: "42px" }}
							onInput={(e) => {
								e.target.style.height = "auto";
								e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
							}}
						/>
					</div>
					<button
						onClick={handleSend}
						disabled={!input.trim()}
						className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm transition-all duration-200 hover:from-primary-600 hover:to-primary-700 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
					>
						<FiSend size={18} className="translate-x-px" />
					</button>
				</div>
			</div>
		</div>
	);
}
