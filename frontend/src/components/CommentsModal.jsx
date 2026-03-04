import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchComments, addComment, deleteComment, toggleCommentLike } from "../features/posts/postsSlice.js";
import { FiMessageCircle, FiHeart, FiSend, FiTrash2, FiCornerDownRight, FiX } from "react-icons/fi";
import VerifiedBadge from "./VerifiedBadge.jsx";

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

/* ─── Single Comment (recursive) ─── */
function CommentItem({ comment, postId, currentUser, depth = 0, likedCommentIds, parentUser = null }) {
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
		<div className={`${depth > 0 ? "ml-6 border-l-2 border-primary-100 pl-3 dark:border-primary-900/40" : ""}`}>
			<div className="flex gap-3 rounded-xl p-3 hover:bg-gray-50 transition-colors group dark:hover:bg-gray-800">
				<Link to={`/profile/${comment.user.id}`} className="shrink-0 mt-0.5">
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
					<div className="flex items-center gap-2 flex-wrap">
						<div className="flex items-center gap-0.5">
							<Link
								to={`/profile/${comment.user.id}`}
								className="text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors dark:text-gray-200"
							>
								{comment.user.name}
							</Link>
							<VerifiedBadge role={comment.user.role} size={14} />
						</div>
						{parentUser && depth > 0 && (
							<span className="flex items-center gap-1 text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
								<FiCornerDownRight size={10} />
								<Link to={`/profile/${parentUser.id}`} className="hover:underline">
									@{parentUser.name}
								</Link>
							</span>
						)}
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
							parentUser={comment.user}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/* ─── Comments Modal ─── */
export default function CommentsModal({ post, onClose }) {
	const dispatch = useDispatch();
	const { user: currentUser } = useSelector((state) => state.auth);
	const { comments, likedCommentIds, commentsPagination } = useSelector((state) => state.posts);
	const [commentText, setCommentText] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		dispatch(fetchComments({ postId: post.id, page: 1 })).finally(() => setLoading(false));
	}, [dispatch, post.id]);

	// Prevent body scroll when modal is open
	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, []);

	// Close on Escape key
	useEffect(() => {
		const handler = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onClose]);

	const handleComment = (e) => {
		e.preventDefault();
		if (!commentText.trim()) return;
		dispatch(addComment({ postId: post.id, body: commentText, parentId: null }));
		setCommentText("");
	};

	const handleLoadMore = () => {
		if (commentsPagination && commentsPagination.page < commentsPagination.totalPages) {
			dispatch(fetchComments({ postId: post.id, page: commentsPagination.page + 1 }));
		}
	};

	const hasMore = commentsPagination && commentsPagination.page < commentsPagination.totalPages;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

			{/* Modal */}
			<div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl animate-slide-up dark:bg-gray-800">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
					<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
						Comments ({post._count?.comments || 0})
					</h3>
					<button
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-700 dark:hover:text-gray-300"
					>
						<FiX size={18} />
					</button>
				</div>

				{/* Comments list */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
						</div>
					) : comments.length === 0 ? (
						<div className="py-12 text-center">
							<FiMessageCircle size={36} className="mx-auto text-gray-200 mb-3 dark:text-gray-600" />
							<p className="text-sm text-gray-400 dark:text-gray-500">No comments yet. Be the first!</p>
						</div>
					) : (
						<>
							<div className="space-y-1">
								{comments.map((comment) => (
									<CommentItem
										key={comment.id}
										comment={{ ...comment, parentId: null }}
										postId={post.id}
										currentUser={currentUser}
										depth={0}
										likedCommentIds={likedCommentIds}
									/>
								))}
							</div>
							{hasMore && (
								<div className="mt-4 text-center">
									<button
										onClick={handleLoadMore}
										className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors dark:text-primary-400 dark:hover:text-primary-300"
									>
										Load more comments…
									</button>
								</div>
							)}
						</>
					)}
				</div>

				{/* Comment form */}
				<div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
					<form onSubmit={handleComment} className="flex gap-3">
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
							<button type="submit" className="btn-primary px-3" disabled={!commentText.trim()}>
								<FiSend size={16} />
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
