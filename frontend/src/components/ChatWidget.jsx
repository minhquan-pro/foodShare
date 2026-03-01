import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext.jsx";
import {
	fetchConversations,
	startConversation,
	fetchMessages,
	setActiveConversation,
	clearActiveConversation,
	addMessage,
	incrementUnread,
	clearConversationUnread,
	fetchUnreadCount,
} from "../features/chat/chatSlice.js";
import ConversationList from "../features/chat/ConversationList.jsx";
import ChatWindow from "../features/chat/ChatWindow.jsx";
import { FiMessageSquare, FiX } from "react-icons/fi";

export default function ChatWidget() {
	const dispatch = useDispatch();
	const { socket, isUserOnline } = useSocket();
	const { user: currentUser } = useSelector((state) => state.auth);
	const { conversations, activeConversationId, messages, loading, messagesLoading, unreadCount } = useSelector(
		(state) => state.chat,
	);

	const [open, setOpen] = useState(false);
	const [view, setView] = useState("list"); // "list" | "chat"
	const panelRef = useRef(null);

	// Close panel when clicking outside
	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e) => {
			if (panelRef.current && !panelRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	// Disable body scroll when chat panel is open
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	// Fetch conversations & unread count on mount
	useEffect(() => {
		if (currentUser) {
			dispatch(fetchConversations());
			dispatch(fetchUnreadCount());
		}
	}, [currentUser, dispatch]);

	// Global listener for incoming messages
	useEffect(() => {
		if (!socket || !currentUser) return;

		const handleNewMessage = ({ conversationId, message }) => {
			if (message.sender.id === currentUser.id) return;

			dispatch(addMessage({ conversationId, message }));

			if (conversationId !== activeConversationId || !open) {
				dispatch(incrementUnread({ conversationId }));
			} else {
				socket.emit("chat:markRead", { conversationId });
			}
		};

		const handleConversationUpdated = ({ conversationId }) => {
			const exists = conversations.some((c) => c.id === conversationId);
			if (!exists) {
				dispatch(fetchConversations());
			}
		};

		socket.on("chat:newMessage", handleNewMessage);
		socket.on("chat:conversationUpdated", handleConversationUpdated);

		return () => {
			socket.off("chat:newMessage", handleNewMessage);
			socket.off("chat:conversationUpdated", handleConversationUpdated);
		};
	}, [socket, activeConversationId, currentUser, dispatch, conversations, open]);

	// Load messages when active conversation changes
	useEffect(() => {
		if (activeConversationId) {
			dispatch(fetchMessages({ conversationId: activeConversationId }));
			dispatch(clearConversationUnread(activeConversationId));
			socket?.emit("chat:join", activeConversationId);
			socket?.emit("chat:markRead", { conversationId: activeConversationId });
		}

		return () => {
			if (activeConversationId) {
				socket?.emit("chat:leave", activeConversationId);
			}
		};
	}, [activeConversationId, socket, dispatch]);

	const handleSelectConversation = useCallback(
		(id) => {
			dispatch(setActiveConversation(id));
			setView("chat");
		},
		[dispatch],
	);

	const handleBack = useCallback(() => {
		dispatch(clearActiveConversation());
		setView("list");
	}, [dispatch]);

	const toggleOpen = () => {
		if (!open) {
			dispatch(fetchConversations());
		}
		setOpen((prev) => !prev);
	};

	// Public method: open chat with a specific user
	const openChatWithUser = useCallback(
		(userId) => {
			setOpen(true);
			dispatch(startConversation(userId)).then((action) => {
				if (action.meta.requestStatus === "fulfilled") {
					setView("chat");
				}
			});
		},
		[dispatch],
	);

	// Expose openChatWithUser globally so ProfilePage can call it
	useEffect(() => {
		window.__openChatWithUser = openChatWithUser;
		return () => {
			delete window.__openChatWithUser;
		};
	}, [openChatWithUser]);

	const activeConversation = conversations.find((c) => c.id === activeConversationId);
	const activeMessages = messages[activeConversationId] || [];

	if (!currentUser) return null;

	return (
		<>
			{/* Floating chat panel */}
			{open && (
				<div
					ref={panelRef}
					className="fixed bottom-24 right-6 z-50 flex flex-col w-[380px] h-[520px] rounded-2xl bg-white shadow-2xl border border-gray-200/80 overflow-hidden animate-fade-in dark:bg-gray-800 dark:border-gray-700"
					style={{ maxHeight: "calc(100vh - 140px)" }}
				>
					{view === "list" || !activeConversation ? (
						/* ── Conversation list ── */
						<>
							{/* Custom header with close button */}
							<div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-sky-400 to-blue-400">
								<div className="flex items-center gap-2 text-white">
									<FiMessageSquare size={18} />
									<h2 className="text-sm font-bold">Messages</h2>
								</div>
								<button
									onClick={() => setOpen(false)}
									className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
								>
									<FiX size={16} />
								</button>
							</div>
							<div className="flex-1 flex flex-col overflow-hidden">
								<ConversationList
									conversations={conversations}
									activeId={activeConversationId}
									loading={loading}
									currentUserId={currentUser?.id}
									isUserOnline={isUserOnline}
									onSelect={handleSelectConversation}
									compact
								/>
							</div>
						</>
					) : (
						/* ── Chat window ── */
						<ChatWindow
							conversation={activeConversation}
							messages={activeMessages}
							loading={messagesLoading}
							currentUser={currentUser}
							socket={socket}
							isUserOnline={isUserOnline}
							onBack={handleBack}
							onLoadMore={() => {
								if (activeMessages.length > 0) {
									dispatch(
										fetchMessages({
											conversationId: activeConversationId,
											cursor: activeMessages[0].createdAt,
										}),
									);
								}
							}}
						/>
					)}
				</div>
			)}

			{/* Floating chat button — hidden when panel is open */}
			{!open && (
				<button
					onClick={toggleOpen}
					className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95 bg-gradient-to-r from-sky-400 to-blue-400 text-white hover:from-sky-500 hover:to-blue-500 hover:shadow-xl hover:scale-110"
					title="Open chat"
				>
					<FiMessageSquare size={24} />
					{/* Unread badge */}
					{unreadCount > 0 && (
						<span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</button>
			)}
		</>
	);
}
