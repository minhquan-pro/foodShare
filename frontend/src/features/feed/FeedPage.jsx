import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchFeed,
	fetchFriendsFeed,
	fetchFollowingIds,
	fetchBlockedIds,
	fetchStories,
	setFeedType,
} from "./feedSlice.js";
import PostCard from "../../components/PostCard.jsx";
import StoryBar from "../../components/StoryBar.jsx";
import StoryViewer from "../../components/StoryViewer.jsx";
import StoryCreateModal from "../../components/StoryCreateModal.jsx";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
	return (
		<div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
			<div className="h-52 bg-gray-200 dark:bg-gray-700" />
			<div className="p-4 space-y-3">
				<div className="flex items-center gap-2.5">
					<div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
					<div className="space-y-1.5 flex-1">
						<div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
						<div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
					</div>
				</div>
				<div className="space-y-2">
					<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
					<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5" />
				</div>
				<div className="flex gap-3 pt-1">
					<div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
					<div className="h-7 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
				</div>
			</div>
		</div>
	);
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
	const dispatch = useDispatch();
	const { posts, pagination, loading, feedType } = useSelector((state) => state.feed);
	const sentinelRef = useRef(null);

	const [storyViewerIdx, setStoryViewerIdx] = useState(null);
	const [storyCreateOpen, setStoryCreateOpen] = useState(false);
	const { stories } = useSelector((state) => state.feed);

	// Load data on mount
	useEffect(() => {
		dispatch(fetchFollowingIds());
		dispatch(fetchBlockedIds());
		dispatch(fetchStories());
	}, [dispatch]);

	// Reload when tab changes
	useEffect(() => {
		if (feedType === "latest") {
			dispatch(fetchFeed({ page: 1 }));
		} else {
			dispatch(fetchFriendsFeed({ page: 1 }));
		}
	}, [dispatch, feedType]);

	// ── Infinite scroll ───────────────────────────────────────────────────────
	const loadMore = useCallback(() => {
		if (loading || !pagination || pagination.page >= pagination.totalPages) return;
		const nextPage = pagination.page + 1;
		if (feedType === "latest") {
			dispatch(fetchFeed({ page: nextPage }));
		} else {
			dispatch(fetchFriendsFeed({ page: nextPage }));
		}
	}, [dispatch, feedType, loading, pagination]);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) loadMore();
			},
			{ rootMargin: "300px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [loadMore]);

	const handleTabChange = (type) => dispatch(setFeedType(type));

	const isFirstLoad = loading && posts.length === 0;
	const isLoadingMore = loading && posts.length > 0;
	const hasMore = pagination && pagination.page < pagination.totalPages;

	return (
		<>
		<div className="mx-auto max-w-7xl px-4 sm:px-6 border-b border-gray-100 dark:border-gray-700/60">
				<StoryBar onStoryClick={(i) => setStoryViewerIdx(i)} onAddStory={() => setStoryCreateOpen(true)} />
			</div>

			{/* Story viewer */}
			{storyViewerIdx !== null && (
				<StoryViewer stories={stories} initialIndex={storyViewerIdx} onClose={() => setStoryViewerIdx(null)} />
			)}

			{/* Story create modal */}
			{storyCreateOpen && <StoryCreateModal onClose={() => setStoryCreateOpen(false)} />}

			{/* ── Main content ──────────────────────────────────────────────── */}
			<div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
				{/* Skeleton — first load */}
				{isFirstLoad ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<SkeletonCard key={i} />
						))}
					</div>
				) : posts.length === 0 ? (
					<div className="py-24 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<span className="text-3xl">
								{feedType === "friends" ? "👥" : "🍽️"}
							</span>
						</div>
						<p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
							{feedType === "friends"
								? "Chưa có bài từ người bạn theo dõi"
								: "Chưa có bài viết nào"}
						</p>
						<p className="mt-2 text-sm text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
							{feedType === "friends"
								? "Hãy theo dõi mọi người để xem bài viết của họ!"
								: "Hãy là người đầu tiên chia sẻ đánh giá món ăn!"}
						</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{posts.map((post) => (
								<PostCard key={post.id} post={post} />
							))}
							{/* Loading more skeletons */}
							{isLoadingMore && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
						</div>

						{/* Infinite scroll sentinel */}
						{hasMore && <div ref={sentinelRef} className="h-16" />}
					</>
				)}
			</div>
		</>
	);
}
