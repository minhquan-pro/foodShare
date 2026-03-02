import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { addNotification } from "../features/notifications/notificationsSlice.js";
import toast from "react-hot-toast";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
	const { token } = useSelector((state) => state.auth);
	const dispatch = useDispatch();
	const [socket, setSocket] = useState(null);
	const [onlineUsers, setOnlineUsers] = useState(new Set());
	const socketRef = useRef(null);

	useEffect(() => {
		if (!token) {
			// Disconnect if logged out
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
				setSocket(null);
				setOnlineUsers(new Set());
			}
			return;
		}

		// Connect socket
		const newSocket = io({
			auth: { token },
			transports: ["websocket", "polling"],
		});

		newSocket.on("connect", () => {
			console.log("🔌 Socket connected:", newSocket.id);
		});

		newSocket.on("connect_error", (err) => {
			console.error("Socket connection error:", err.message);
		});

		// Online / offline tracking
		newSocket.on("user:online", ({ userId }) => {
			setOnlineUsers((prev) => new Set([...prev, userId]));
		});

		newSocket.on("user:offline", ({ userId }) => {
			setOnlineUsers((prev) => {
				const next = new Set(prev);
				next.delete(userId);
				return next;
			});
		});

		// Real-time notifications
		newSocket.on("notification:new", (notification) => {
			dispatch(addNotification(notification));
			const actorName = notification.actor?.name || "Someone";
			const postName = notification.post?.restaurantName || "your post";
			if (notification.type === "like") {
				toast(`${actorName} liked "${postName}"`, { icon: "❤️" });
			} else if (notification.type === "comment_like") {
				toast(`${actorName} liked your comment on "${postName}"`, { icon: "❤️" });
			} else if (notification.type === "reply") {
				toast(`${actorName} replied to your comment on "${postName}"`, { icon: "💬" });
			} else if (notification.type === "comment") {
				toast(`${actorName} commented on "${postName}"`, { icon: "💬" });
			}
		});

		socketRef.current = newSocket;
		setSocket(newSocket);

		return () => {
			newSocket.disconnect();
			socketRef.current = null;
		};
	}, [token]);

	const isUserOnline = (userId) => onlineUsers.has(userId);

	return <SocketContext.Provider value={{ socket, onlineUsers, isUserOnline }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
	return useContext(SocketContext);
}
