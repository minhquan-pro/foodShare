import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchPost,
	clearCurrentPost,
	addComment,
	deleteComment,
	deletePost,
	toggleCommentLike,
	updateCurrentPostReactions,
	setCurrentPostUserReaction,
} from "./postsSlice.js";
import StarRating from "../../components/StarRating.jsx";
import Spinner from "../../components/Spinner.jsx";
import ImageLightbox from "../../components/ImageLightbox.jsx";
import VerifiedBadge from "../../components/VerifiedBadge.jsx";
import {
	FiHeart,
	FiMessageCircle,
	FiShare2,
	FiMapPin,
	FiTrash2,
	FiSend,
	FiArrowLeft,
	FiClock,
	FiCornerDownRight,
	FiSmile,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { useRef } from "react";

const EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "😢"];
const EMOJI_LABELS = { "❤️": "Love", "😂": "Haha", "🔥": "Fire", "👍": "Like", "😮": "Wow", "😢": "Sad" };
const EMOJI_COLORS = {
	"❤️": "#ef4444",
	"😂": "#eab308",
	"🔥": "#f97316",
	"👍": "#3b82f6",
	"😮": "#eab308",
	"😢": "#60a5fa",
};

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

/* ─── Single Comment Component (recursive) ─── */
function CommentItem({ comment, postId, currentUser, depth = 0, likedCommentIds }) {
	const dispatch = useDispatch();
	const [showReplyForm, setShowReplyForm] = useState(false);
	const [replyText, setReplyText] = useState("");

	const handleReply = (e) => {
		e.preventDefault();
		if (!replyText.trim()) return;
		dispatch(addComment({ postId, body: replyText, parentId: comment.id }));
		setReplyText("");
		setShowReplyForm(false);
	};

	const handleDelete = () => {
		if (!window.confirm("Delete this comment?")) return;
		dispatch(deleteComment({ commentId: comment.id, parentId: comment.parentId }));
	};

	const handleLikeComment = () => {
		dispatch(toggleCommentLike(comment.id));
	};

	const isOwner = currentUser?.id === comment.user.id;
	const isLiked = likedCommentIds?.includes(comment.id);
	const likeCount = comment._count?.commentLikes || 0;
	const maxDepth = 3;

	return (
		<div className={`${depth > 0 ? "ml-8 border-l-2 border-gray-100 pl-4 dark:border-gray-700" : ""}`}>
			<div className="flex gap-3 rounded-xl p-3 hover:bg-gray-50 transition-colors group dark:hover:bg-gray-800">
				<Link to={`/profile/${comment.user.id}`} className="shrink-0">
					{comment.user.avatarUrl ? (
						<img
							src={comment.user.avatarUrl}
							alt={comment.user.name}
							className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
						/>
					) : (
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-bold text-gray-500 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300">
							{comment.user.name.charAt(0).toUpperCase()}
						</div>
					)}
				</Link>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<Link
							to={`/profile/${comment.user.id}`}
							className="text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors dark:text-gray-200"
						>
							{comment.user.name}
						</Link>
						<VerifiedBadge role={comment.user.role} size={14} />
						<span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(comment.createdAt)}</span>
					</div>
					<p className="mt-0.5 text-sm text-gray-600 leading-relaxed dark:text-gray-400">{comment.body}</p>

					{/* Action buttons */}
					<div className="mt-1.5 flex items-center gap-3">
						<button
							onClick={handleLikeComment}
							className={`flex items-center gap-1 text-xs font-medium transition-colors ${
								isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"
							}`}
						>
							<FiHeart size={12} className={isLiked ? "fill-current" : ""} />
							{likeCount > 0 && <span>{likeCount}</span>}
						</button>
						{depth < maxDepth && (
							<button
								onClick={() => setShowReplyForm(!showReplyForm)}
								className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-primary-600 transition-colors"
							>
								<FiCornerDownRight size={12} />
								Reply
							</button>
						)}
						{isOwner && (
							<button
								onClick={handleDelete}
								className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
							>
								<FiTrash2 size={12} />
								Delete
							</button>
						)}
					</div>

					{/* Reply form */}
					{showReplyForm && (
						<form onSubmit={handleReply} className="mt-3 flex gap-2 animate-fade-in">
							<input
								type="text"
								value={replyText}
								onChange={(e) => setReplyText(e.target.value)}
								className="input flex-1 text-sm !py-1.5 !px-3"
								placeholder={`Reply to ${comment.user.name}…`}
								autoFocus
							/>
							<button
								type="submit"
								className="btn-primary px-2.5 py-1.5 text-xs"
								disabled={!replyText.trim()}
							>
								<FiSend size={13} />
							</button>
							<button
								type="button"
								onClick={() => {
									setShowReplyForm(false);
									setReplyText("");
								}}
								className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300"
							>
								Cancel
							</button>
						</form>
					)}
				</div>
			</div>

			{/* Nested replies */}
			{comment.replies && comment.replies.length > 0 && (
				<div className="mt-1">
					{comment.replies.map((reply) => (
						<CommentItem
							key={reply.id}
							comment={{ ...reply, parentId: comment.id }}
							postId={postId}
							currentUser={currentUser}
							depth={depth + 1}
							likedCommentIds={likedCommentIds}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default function PostDetailPage() {
	const { id } = useParams();
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { currentPost: post, comments, likedCommentIds, userReaction, loading } = useSelector((state) => state.posts);
	const { user: currentUser } = useSelector((state) => state.auth);
	const [commentText, setCommentText] = useState("");
	const [showPicker, setShowPicker] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [reactionModal, setReactionModal] = useState({ open: false, activeTab: "all", allUsers: [], loading: false });
	const pickerLeaveTimer = useRef(null);

	const handleEmojiClick = async (emoji) => {
		if (!currentUser) {
			toast.error("Please login to react");
			return;
		}
		const prevReaction = userReaction;
		const nextReaction = prevReaction === emoji ? null : emoji;

		dispatch(setCurrentPostUserReaction(nextReaction));

		const current = (post?.reactions || []).map((r) => ({ ...r }));
		let next = [...current];
		if (prevReaction) {
			const oldIdx = next.findIndex((r) => r.emoji === prevReaction);
			if (oldIdx !== -1) {
				next[oldIdx] = { ...next[oldIdx], count: next[oldIdx].count - 1 };
				if (next[oldIdx].count <= 0) next.splice(oldIdx, 1);
			}
		}
		if (nextReaction) {
			const newIdx = next.findIndex((r) => r.emoji === nextReaction);
			if (newIdx !== -1) {
				next[newIdx] = { ...next[newIdx], count: next[newIdx].count + 1 };
			} else {
				next.push({ emoji: nextReaction, count: 1 });
			}
		}
		dispatch(updateCurrentPostReactions({ postId: post.id, reactions: next }));

		try {
			await api.post(`/posts/${post.id}/reactions`, { emoji });
		} catch (err) {
			toast.error(err.message || "Failed to react");
			dispatch(setCurrentPostUserReaction(prevReaction));
		}
	};

	const openReactionModal = async (tab = "all") => {
		setReactionModal({ open: true, activeTab: tab, allUsers: [], loading: true });
		try {
			const { data } = await api.get(`/posts/${post.id}/reactions/users`);
			setReactionModal((prev) => ({ ...prev, allUsers: data.data.users || [], loading: false }));
		} catch {
			setReactionModal((prev) => ({ ...prev, loading: false }));
		}
	};

	const handlePickerMouseEnter = () => {
		clearTimeout(pickerLeaveTimer.current);
		setShowPicker(true);
	};
	const handlePickerMouseLeave = () => {
		pickerLeaveTimer.current = setTimeout(() => setShowPicker(false), 250);
	};

	useEffect(() => {
		dispatch(fetchPost(id));
		return () => dispatch(clearCurrentPost());
	}, [dispatch, id]);

	const handleShare = () => {
		const shareUrl = `${window.location.origin}/share/${post.shareSlug}`;
		navigator.clipboard.writeText(shareUrl);
		toast.success("Share link copied!");
	};

	const handleComment = (e) => {
		e.preventDefault();
		if (!commentText.trim()) return;
		dispatch(addComment({ postId: id, body: commentText, parentId: null }));
		setCommentText("");
	};

	const handleDelete = () => {
		setShowDeleteModal(true);
	};

	const confirmDelete = async () => {
		setShowDeleteModal(false);
		const result = await dispatch(deletePost(id));
		if (deletePost.fulfilled.match(result)) {
			toast.success("Post deleted");
			navigate("/");
		}
	};

	if (loading || !post) return <Spinner />;

	const isOwner = currentUser?.id === post.user.id;

	return (
		<>
			<div className="mx-auto max-w-6xl px-6 py-8 animate-fade-in">
				{/* Delete Confirmation Modal */}
				{showDeleteModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center">
						<div
							className="absolute inset-0 bg-black/50 backdrop-blur-sm"
							onClick={() => setShowDeleteModal(false)}
						/>
						<div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
							<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Post</h3>
							<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
								Are you sure you want to delete this post? This action cannot be undone.
							</p>
							<div className="mt-6 flex gap-3">
								<button
									onClick={() => setShowDeleteModal(false)}
									className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
								>
									Cancel
								</button>
								<button
									onClick={confirmDelete}
									className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
								>
									Delete
								</button>
							</div>
						</div>
					</div>
				)}
				{/* Back button */}
				<button
					onClick={() => navigate(-1)}
					className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-gray-100"
				>
					<FiArrowLeft size={16} />
					Back
				</button>

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
					{/* Left - Image & Info (3 cols) */}
					<div className="lg:col-span-3">
						<div className="card-static">
							<div className="relative">
								<ImageLightbox src={post.imageUrl} alt={post.restaurantName}>
									<img
										src={post.imageUrl}
										alt={post.restaurantName}
										className="h-[400px] w-full object-cover"
									/>
								</ImageLightbox>
								<div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-md dark:bg-gray-800/90 pointer-events-none">
									<span className="text-yellow-500">★</span>
									<span className="text-sm font-bold text-gray-800 dark:text-gray-200">
										{post.rating}.0
									</span>
								</div>
							</div>
							<div className="p-6">
								{/* Author */}
								<div className="mb-5 flex items-center justify-between">
									<Link to={`/profile/${post.user.id}`} className="flex items-center gap-3 group">
										{post.user.avatarUrl ? (
											<ImageLightbox src={post.user.avatarUrl} alt={post.user.name}>
												<img
													src={post.user.avatarUrl}
													alt={post.user.name}
													className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
												/>
											</ImageLightbox>
										) : (
											<div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
												{post.user.name.charAt(0).toUpperCase()}
											</div>
										)}
										<div>
											<p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors dark:text-gray-100">
												{post.user.name}{" "}
												<VerifiedBadge role={post.user.role} className="ml-1" />{" "}
											</p>
											<p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
												<FiClock size={11} />
												{timeAgo(post.createdAt)}
											</p>
										</div>
									</Link>
									{isOwner && (
										<button
											onClick={handleDelete}
											className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all dark:hover:bg-red-900/20"
											title="Delete post"
										>
											<FiTrash2 size={16} />
											<span className="hidden sm:inline">Delete</span>
										</button>
									)}
								</div>

								{/* Info */}
								<h1 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-gray-100">
									{post.restaurantName}
								</h1>
								<p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
									<FiMapPin size={14} className="text-primary-400" />
									{post.restaurantAddress}
								</p>
								<div className="mt-3">
									<StarRating rating={post.rating} readOnly />
								</div>
								<p className="mt-5 text-gray-700 leading-relaxed text-[15px] dark:text-gray-300">
									{post.description}
								</p>

								{/* Actions */}
								<div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
									{/* Reaction button (hover picker) */}
									<div className="relative flex items-center gap-2">
										<div
											className="relative"
											onMouseEnter={handlePickerMouseEnter}
											onMouseLeave={handlePickerMouseLeave}
										>
											{showPicker && (
												<div
													className="absolute bottom-11 left-0 z-40 flex items-center gap-0.5 rounded-full bg-white shadow-xl border border-gray-100 px-2 py-1.5 dark:bg-gray-800 dark:border-gray-700 animate-fade-in"
													onMouseEnter={handlePickerMouseEnter}
													onMouseLeave={handlePickerMouseLeave}
												>
													{EMOJIS.map((e) => (
														<button
															key={e}
															onClick={() => {
																handleEmojiClick(e);
																setShowPicker(false);
															}}
															title={EMOJI_LABELS[e]}
															className={`w-10 h-10 text-2xl flex items-center justify-center rounded-full transition-all duration-150 hover:scale-125 hover:bg-gray-50 dark:hover:bg-gray-700 ${userReaction === e ? "scale-110 bg-gray-100 dark:bg-gray-700" : ""}`}
														>
															{e}
														</button>
													))}
												</div>
											)}
											<button
												onClick={() => handleEmojiClick(userReaction || "❤️")}
												className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
												style={{ color: userReaction ? EMOJI_COLORS[userReaction] : undefined }}
											>
												{userReaction ? (
													<span className="text-lg leading-none">{userReaction}</span>
												) : (
													<FiSmile size={18} className="text-gray-500 dark:text-gray-400" />
												)}
												<span
													className={
														userReaction
															? "font-semibold"
															: "text-gray-500 dark:text-gray-400"
													}
												>
													{userReaction ? EMOJI_LABELS[userReaction] : "React"}
												</span>
											</button>
										</div>
										{/* Reaction summary */}
										{(post.reactions || []).length > 0 && (
											<button
												onClick={() => openReactionModal("all")}
												className="flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-gray-700"
											>
												<div className="flex">
													{[...(post.reactions || [])]
														.sort((a, b) => b.count - a.count)
														.slice(0, 3)
														.map((r) => (
															<span
																key={r.emoji}
																className="text-base -ml-0.5 first:ml-0 leading-none"
															>
																{r.emoji}
															</span>
														))}
												</div>
												<span className="text-sm text-gray-500 dark:text-gray-400">
													{(post.reactions || []).reduce((sum, r) => sum + r.count, 0)}
												</span>
											</button>
										)}
									</div>

									<span className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
										<FiMessageCircle size={18} />
										<span>{post._count?.comments || 0}</span>
									</span>
									<button
										onClick={handleShare}
										className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all ml-auto dark:text-gray-400 dark:hover:bg-primary-900/20"
									>
										<FiShare2 size={18} />
										Share
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* Right - Comments (2 cols) */}
					<div className="lg:col-span-2">
						<div className="card-static h-full">
							<div className="p-6">
								<h2 className="text-lg font-bold text-gray-900 mb-5 dark:text-gray-100">
									Comments ({post._count?.comments || 0})
								</h2>

								{/* Comment form */}
								<form onSubmit={handleComment} className="mb-6">
									<div className="flex gap-3">
										{currentUser?.avatarUrl ? (
											<img
												src={currentUser.avatarUrl}
												alt=""
												className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 shrink-0 dark:ring-gray-700"
											/>
										) : (
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-xs font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
												{currentUser?.name?.charAt(0).toUpperCase()}
											</div>
										)}
										<div className="flex flex-1 gap-2">
											<input
												type="text"
												value={commentText}
												onChange={(e) => setCommentText(e.target.value)}
												className="input flex-1"
												placeholder="Write a comment…"
											/>
											<button
												type="submit"
												className="btn-primary px-3"
												disabled={!commentText.trim()}
											>
												<FiSend size={16} />
											</button>
										</div>
									</div>
								</form>

								{/* Comments list */}
								<div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
									{comments.length === 0 ? (
										<div className="py-10 text-center">
											<FiMessageCircle
												size={32}
												className="mx-auto text-gray-200 mb-2 dark:text-gray-600"
											/>
											<p className="text-sm text-gray-400 dark:text-gray-500">
												No comments yet. Be the first!
											</p>
										</div>
									) : (
										comments.map((comment) => (
											<CommentItem
												key={comment.id}
												comment={{ ...comment, parentId: null }}
												postId={id}
												currentUser={currentUser}
												depth={0}
												likedCommentIds={likedCommentIds}
											/>
										))
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Reaction Users Modal */}
			{reactionModal.open && (
				<div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setReactionModal((p) => ({ ...p, open: false }))}
					/>
					<div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
						<div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
							<span className="font-bold text-gray-900 dark:text-gray-100">
								{reactionModal.allUsers.length}{" "}
								{reactionModal.allUsers.length === 1 ? "reaction" : "reactions"}
							</span>
							<button
								onClick={() => setReactionModal((p) => ({ ...p, open: false }))}
								className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:text-gray-200 dark:hover:bg-gray-700"
							>
								✕
							</button>
						</div>
						<div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto shrink-0">
							<button
								onClick={() => setReactionModal((p) => ({ ...p, activeTab: "all" }))}
								className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${reactionModal.activeTab === "all" ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
							>
								All {reactionModal.allUsers.length}
							</button>
							{[...(post.reactions || [])]
								.sort((a, b) => b.count - a.count)
								.map((r) => (
									<button
										key={r.emoji}
										onClick={() => setReactionModal((p) => ({ ...p, activeTab: r.emoji }))}
										className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${reactionModal.activeTab === r.emoji ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
									>
										{r.emoji} {r.count}
									</button>
								))}
						</div>
						{reactionModal.loading ? (
							<div className="flex justify-center p-8">
								<Spinner />
							</div>
						) : (
							<div className="overflow-y-auto flex-1">
								{(reactionModal.activeTab === "all"
									? reactionModal.allUsers
									: reactionModal.allUsers.filter((u) => u.emoji === reactionModal.activeTab)
								).map((u) => (
									<Link
										key={u.id}
										to={`/profile/${u.id}`}
										onClick={() => setReactionModal((p) => ({ ...p, open: false }))}
										className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
									>
										{u.avatarUrl ? (
											<img
												src={u.avatarUrl}
												alt={u.name}
												className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
											/>
										) : (
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-sm font-bold text-primary-700 dark:from-primary-900/50 dark:to-primary-800/50 dark:text-primary-400">
												{u.name?.charAt(0).toUpperCase()}
											</div>
										)}
										<div className="flex items-center justify-between w-full">
											<div className="gap-1 flex items-center">
												<span className="flex-1 font-medium text-gray-800 dark:text-gray-200 truncate">
													{u.name}
												</span>
												<VerifiedBadge role={u.role} />
											</div>
											<span className="text-xl ml-1">{u.emoji}</span>
										</div>
									</Link>
								))}
								{(reactionModal.activeTab === "all"
									? reactionModal.allUsers
									: reactionModal.allUsers.filter((u) => u.emoji === reactionModal.activeTab)
								).length === 0 && (
									<div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
										No reactions yet
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
