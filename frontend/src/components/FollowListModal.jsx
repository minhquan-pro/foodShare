import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiX, FiUsers, FiUser, FiUserPlus, FiUserCheck } from "react-icons/fi";
import api from "../lib/api.js";
import toast from "react-hot-toast";

export default function FollowListModal({ isOpen, onClose, userId, type = "followers", userName }) {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [followingIds, setFollowingIds] = useState([]);
	const { user: currentUser } = useSelector((state) => state.auth);

	useEffect(() => {
		if (!isOpen || !userId) return;
		setLoading(true);

		const fetchData = async () => {
			try {
				const [listRes, idsRes] = await Promise.all([
					api.get(`/users/${userId}/${type}`),
					api.get("/users/following/ids"),
				]);
				setUsers(listRes.data.data.users);
				setFollowingIds(idsRes.data.data.followingIds);
			} catch {
				setUsers([]);
				setFollowingIds([]);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [isOpen, userId, type]);

	const handleToggleFollow = async (targetId, isFollowing) => {
		try {
			if (isFollowing) {
				await api.delete(`/users/${targetId}/follow`);
				setFollowingIds((prev) => prev.filter((id) => id !== targetId));
				toast.success("Unfollowed");
			} else {
				await api.post(`/users/${targetId}/follow`);
				setFollowingIds((prev) => [...prev, targetId]);
				toast.success("Followed");
			}
		} catch {
			toast.error("Action failed");
		}
	};

	if (!isOpen) return null;

	const title = type === "followers" ? "Followers" : "Following";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

			{/* Modal */}
			<div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl animate-slide-up dark:bg-gray-800">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
					<div className="flex items-center gap-2">
						<FiUsers size={18} className="text-primary-500" />
						<h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
						<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
							{users.length}
						</span>
					</div>
					<button
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-700 dark:hover:text-gray-300"
					>
						<FiX size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="max-h-[60vh] overflow-y-auto p-2">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-500" />
						</div>
					) : users.length === 0 ? (
						<div className="py-12 text-center">
							<FiUser size={32} className="mx-auto mb-2 text-gray-200 dark:text-gray-600" />
							<p className="text-sm text-gray-400 dark:text-gray-500">
								{type === "followers" ? "No followers yet" : "Not following anyone yet"}
							</p>
						</div>
					) : (
						<div className="space-y-0.5">
							{users.map((user) => {
								const isFollowing = followingIds.includes(user.id);
								const isSelf = currentUser?.id === user.id;

								return (
									<div
										key={user.id}
										className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50"
									>
										<Link
											to={`/profile/${user.id}`}
											onClick={onClose}
											className="flex items-center gap-3 flex-1 min-w-0"
										>
											{user.avatarUrl ? (
												<img
													src={user.avatarUrl}
													alt={user.name}
													className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100 shrink-0 dark:ring-gray-700"
												/>
											) : (
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
													{user.name.charAt(0).toUpperCase()}
												</div>
											)}
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
													{user.name}
												</p>
												{user.bio && (
													<p className="text-xs text-gray-400 truncate dark:text-gray-500">
														{user.bio}
													</p>
												)}
											</div>
										</Link>

										{/* Follow / Unfollow button */}
										{!isSelf && (
											<button
												onClick={() => handleToggleFollow(user.id, isFollowing)}
												className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
													isFollowing
														? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
														: "bg-primary-500 text-white hover:bg-primary-600"
												}`}
											>
												{isFollowing ? (
													<>
														<FiUserCheck size={14} />
														Following
													</>
												) : (
													<>
														<FiUserPlus size={14} />
														Follow
													</>
												)}
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
