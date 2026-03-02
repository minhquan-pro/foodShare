import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiBell, FiHeart, FiMessageCircle, FiCheck } from "react-icons/fi";
import {
	fetchNotifications,
	fetchUnreadCount,
	markAllNotificationsRead,
	markNotificationRead,
} from "../features/notifications/notificationsSlice.js";

function timeAgo(dateStr) {
	const now = new Date();
	const date = new Date(dateStr);
	const seconds = Math.floor((now - date) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return date.toLocaleDateString();
}

function NotificationItem({ notification, onRead, onClose }) {
	const icon =
		notification.type === "like" || notification.type === "comment_like" ? (
			<FiHeart size={16} className="text-red-500" />
		) : (
			<FiMessageCircle size={16} className="text-blue-500" />
		);

	const message =
		notification.type === "like"
			? `liked your post "${notification.post?.restaurantName || ""}"`
			: notification.type === "comment_like"
				? `liked your comment on "${notification.post?.restaurantName || ""}"`
				: notification.type === "reply"
					? `replied to your comment on "${notification.post?.restaurantName || ""}"`
					: `commented on your post "${notification.post?.restaurantName || ""}"`;

	return (
		<Link
			to={`/posts/${notification.postId}`}
			onClick={() => {
				if (!notification.read) onRead(notification.id);
				onClose();
			}}
			className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50 ${
				!notification.read ? "bg-primary-50/50 dark:bg-primary-900/10" : ""
			}`}
		>
			{/* Avatar */}
			<div className="relative shrink-0">
				{notification.actor?.avatarUrl ? (
					<img
						src={notification.actor.avatarUrl}
						alt={notification.actor.name}
						className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
					/>
				) : (
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-xs font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
						{notification.actor?.name?.charAt(0).toUpperCase()}
					</div>
				)}
				<div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm">
					{icon}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
					<span className="font-semibold text-gray-900 dark:text-gray-100">{notification.actor?.name}</span>{" "}
					{message}
				</p>
				{notification.type === "comment" && notification.comment?.body && (
					<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 italic">
						"{notification.comment.body}"
					</p>
				)}
				<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{timeAgo(notification.createdAt)}</p>
			</div>

			{/* Unread dot */}
			{!notification.read && <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />}
		</Link>
	);
}

export default function NotificationBell() {
	const dispatch = useDispatch();
	const { notifications, unreadCount, pagination, loading } = useSelector((state) => state.notifications);
	const [open, setOpen] = useState(false);
	const dropdownRef = useRef(null);

	// Fetch unread count on mount
	useEffect(() => {
		dispatch(fetchUnreadCount());
	}, [dispatch]);

	// Fetch notifications when dropdown opens
	useEffect(() => {
		if (open) {
			dispatch(fetchNotifications({ page: 1 }));
		}
	}, [open, dispatch]);

	// Close on outside click
	useEffect(() => {
		const handler = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		if (open) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const handleMarkAllRead = () => {
		dispatch(markAllNotificationsRead());
	};

	const handleRead = (id) => {
		dispatch(markNotificationRead(id));
	};

	const handleLoadMore = () => {
		if (pagination && pagination.page < pagination.totalPages) {
			dispatch(fetchNotifications({ page: pagination.page + 1 }));
		}
	};

	const hasMore = pagination && pagination.page < pagination.totalPages;

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Bell button */}
			<button
				onClick={() => setOpen(!open)}
				className="relative flex items-center justify-center px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
				title="Notifications"
			>
				<FiBell size={18} />
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>

			{/* Dropdown */}
			{open && (
				<div className="absolute right-0 top-11 z-50 w-96 rounded-2xl bg-white border border-gray-200 shadow-xl animate-fade-in dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
						<h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
						{unreadCount > 0 && (
							<button
								onClick={handleMarkAllRead}
								className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors dark:text-primary-400"
							>
								<FiCheck size={14} />
								Mark all read
							</button>
						)}
					</div>

					{/* Notification list */}
					<div className="max-h-96 overflow-y-auto">
						{loading && notifications.length === 0 ? (
							<div className="flex items-center justify-center py-10">
								<div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
							</div>
						) : notifications.length === 0 ? (
							<div className="py-10 text-center">
								<FiBell size={28} className="mx-auto text-gray-200 mb-2 dark:text-gray-600" />
								<p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
							</div>
						) : (
							<>
								<div className="divide-y divide-gray-50 dark:divide-gray-700/50">
									{notifications.map((n) => (
										<NotificationItem
											key={n.id}
											notification={n}
											onRead={handleRead}
											onClose={() => setOpen(false)}
										/>
									))}
								</div>
								{hasMore && (
									<div className="border-t border-gray-100 dark:border-gray-700">
										<button
											onClick={handleLoadMore}
											className="w-full py-3 text-sm font-medium text-primary-600 hover:bg-gray-50 transition-colors dark:text-primary-400 dark:hover:bg-gray-700/50"
										>
											Load more
										</button>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
