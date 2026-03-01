import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useState, useRef, useEffect } from "react";
import {
	FiHeart,
	FiMessageCircle,
	FiShare2,
	FiMapPin,
	FiClock,
	FiPlus,
	FiMoreHorizontal,
	FiSlash,
	FiFlag,
} from "react-icons/fi";
import StarRating from "./StarRating.jsx";
import ImageLightbox from "./ImageLightbox.jsx";
import { toggleLike } from "../features/posts/postsSlice.js";
import { followFromFeed, blockFromFeed, reportFromFeed } from "../features/feed/feedSlice.js";
import toast from "react-hot-toast";

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

export default function PostCard({ post }) {
	const dispatch = useDispatch();
	const { user: currentUser } = useSelector((state) => state.auth);
	const { followingIds, likedPostIds: feedLikedIds } = useSelector((state) => state.feed);
	const { likedPostIds: profileLikedIds } = useSelector((state) => state.profile);

	const isOwnPost = currentUser?.id === post.user.id;
	const isFollowing = followingIds.includes(post.user.id);
	const isLiked = feedLikedIds.includes(post.id) || profileLikedIds.includes(post.id);

	const [menuOpen, setMenuOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [reportReason, setReportReason] = useState("spam");
	const [reportDetails, setReportDetails] = useState("");
	const menuRef = useRef(null);

	// Close menu on outside click
	useEffect(() => {
		const handler = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setMenuOpen(false);
			}
		};
		if (menuOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [menuOpen]);

	const handleLike = () => {
		dispatch(toggleLike(post.id));
	};

	const handleFollow = (e) => {
		e.preventDefault();
		e.stopPropagation();
		dispatch(followFromFeed(post.user.id));
		toast.success(`Followed ${post.user.name}`);
	};

	const handleShare = () => {
		const shareUrl = `${window.location.origin}/share/${post.shareSlug}`;
		navigator.clipboard.writeText(shareUrl);
		toast.success("Share link copied to clipboard!");
	};

	const handleBlock = () => {
		setMenuOpen(false);
		dispatch(blockFromFeed(post.user.id));
		toast.success(`Blocked ${post.user.name}`);
	};

	const handleReportSubmit = () => {
		dispatch(reportFromFeed({ userId: post.user.id, reason: reportReason, details: reportDetails }));
		toast.success("Report submitted. Thank you!");
		setReportOpen(false);
		setReportReason("spam");
		setReportDetails("");
	};

	return (
		<div className="card group animate-fade-in h-full flex flex-col">
			{/* Image */}
			<div className="block relative overflow-hidden">
				<ImageLightbox src={post.imageUrl} alt={post.restaurantName}>
					<img
						src={post.imageUrl}
						alt={post.restaurantName}
						className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				</ImageLightbox>
				<div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
				{/* Rating badge on image */}
				<div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 shadow-sm dark:bg-gray-800/90 pointer-events-none">
					<span className="text-yellow-500 text-sm">★</span>
					<span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{post.rating}</span>
				</div>
			</div>

			<div className="flex flex-col justify-between h-full ">
				<div className="p-5">
					{/* User info row */}
					<div className="mb-3 flex items-center justify-between">
						<Link to={`/profile/${post.user.id}`} className="flex items-center gap-2.5 group/user">
							<div className="relative">
								{post.user.avatarUrl ? (
									<ImageLightbox src={post.user.avatarUrl} alt={post.user.name}>
										<img
											src={post.user.avatarUrl}
											alt={post.user.name}
											className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
										/>
									</ImageLightbox>
								) : (
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
										{post.user.name.charAt(0).toUpperCase()}
									</div>
								)}
								{/* Follow badge */}
								{!isOwnPost && !isFollowing && (
									<button
										onClick={handleFollow}
										className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white hover:bg-blue-600 transition-colors shadow-sm dark:ring-gray-800"
										title={`Follow ${post.user.name}`}
									>
										<FiPlus size={12} strokeWidth={3} />
									</button>
								)}
							</div>
							<span className="font-semibold text-gray-800 group-hover/user:text-primary-600 transition-colors dark:text-gray-200">
								{post.user.name}
							</span>
						</Link>
						<span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
							<FiClock size={12} />
							{timeAgo(post.createdAt)}
						</span>
						{/* Three-dot menu for block/report */}
						{!isOwnPost && (
							<div className="relative ml-1" ref={menuRef}>
								<button
									onClick={() => setMenuOpen(!menuOpen)}
									className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-700 dark:hover:text-gray-300"
								>
									<FiMoreHorizontal size={16} />
								</button>
								{menuOpen && (
									<div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white border border-gray-200 shadow-lg py-1 animate-fade-in dark:bg-gray-800 dark:border-gray-700">
										<button
											onClick={handleBlock}
											className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
										>
											<FiSlash size={15} className="text-red-500" />
											Block user
										</button>
										<button
											onClick={() => {
												setMenuOpen(false);
												setReportOpen(true);
											}}
											className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
										>
											<FiFlag size={15} className="text-orange-500" />
											Report user
										</button>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Restaurant info */}
					<Link to={`/posts/${post.id}`} className="block">
						<h3 className="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors leading-snug dark:text-gray-100">
							{post.restaurantName}
						</h3>
					</Link>
					<p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
						<FiMapPin size={13} className="text-primary-400" />
						{post.restaurantAddress}
					</p>

					{/* Description */}
					<p className="mt-3 line-clamp-2 text-sm text-gray-600 leading-relaxed dark:text-gray-400">
						{post.description}
					</p>
				</div>

				{/* Actions */}
				<div className="mt-4 flex items-center gap-1 border-t border-gray-300 pt-3 dark:border-gray-700 p-3">
					<button
						onClick={handleLike}
						className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
							isLiked
								? "text-red-500 bg-red-50 dark:bg-red-900/20"
								: "text-gray-500 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-900/20"
						}`}
					>
						{isLiked ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="w-4 h-4"
							>
								<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
							</svg>
						) : (
							<FiHeart size={16} />
						)}
						<span className="font-medium">{post._count?.likes || 0}</span>
					</button>
					<Link
						to={`/posts/${post.id}`}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:bg-primary-900/20 transition-all duration-200"
					>
						<FiMessageCircle size={16} />
						<span className="font-medium">{post._count?.comments || 0}</span>
					</Link>
					<button
						onClick={handleShare}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:bg-primary-900/20 transition-all duration-200 ml-auto"
					>
						<FiShare2 size={16} />
						<span className="font-medium">Share</span>
					</button>
				</div>
			</div>

			{/* Report Modal */}
			{reportOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setReportOpen(false)}
					/>
					<div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl animate-slide-up dark:bg-gray-800">
						<div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
							<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
								Report {post.user.name}
							</h3>
						</div>
						<div className="px-6 py-5 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
									Reason
								</label>
								<select
									value={reportReason}
									onChange={(e) => setReportReason(e.target.value)}
									className="input"
								>
									<option value="spam">Spam</option>
									<option value="harassment">Harassment</option>
									<option value="inappropriate">Inappropriate content</option>
									<option value="fake">Fake account</option>
									<option value="other">Other</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
									Details (optional)
								</label>
								<textarea
									value={reportDetails}
									onChange={(e) => setReportDetails(e.target.value)}
									className="input min-h-[80px] resize-none"
									placeholder="Provide additional details..."
									rows={3}
								/>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
							<button onClick={() => setReportOpen(false)} className="btn-secondary text-sm">
								Cancel
							</button>
							<button
								onClick={handleReportSubmit}
								className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
							>
								<FiFlag size={14} />
								Submit Report
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
