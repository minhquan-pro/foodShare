import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchFeed,
	fetchFriendsFeed,
	fetchLocations,
	fetchFollowingIds,
	fetchBlockedIds,
	setFeedType,
	setSelectedLocation,
} from "./feedSlice.js";
import PostCard from "../../components/PostCard.jsx";
import Spinner from "../../components/Spinner.jsx";
import { FiTrendingUp, FiUsers, FiMapPin, FiX } from "react-icons/fi";

export default function FeedPage() {
	const dispatch = useDispatch();
	const { posts, pagination, loading, feedType, locations, selectedLocation } = useSelector((state) => state.feed);

	// Load locations and following IDs on mount
	useEffect(() => {
		dispatch(fetchLocations());
		dispatch(fetchFollowingIds());
		dispatch(fetchBlockedIds());
	}, [dispatch]);

	// Load posts when feedType or selectedLocation changes
	useEffect(() => {
		if (feedType === "latest") {
			dispatch(fetchFeed({ page: 1, location: selectedLocation }));
		} else {
			dispatch(fetchFriendsFeed({ page: 1 }));
		}
	}, [dispatch, feedType, selectedLocation]);

	const handleLoadMore = () => {
		if (!pagination || pagination.page >= pagination.totalPages) return;
		const nextPage = pagination.page + 1;
		if (feedType === "latest") {
			dispatch(fetchFeed({ page: nextPage, location: selectedLocation }));
		} else {
			dispatch(fetchFriendsFeed({ page: nextPage }));
		}
	};

	const handleTabChange = (type) => {
		dispatch(setFeedType(type));
	};

	const handleLocationChange = (loc) => {
		dispatch(setSelectedLocation(loc === selectedLocation ? null : loc));
	};

	return (
		<div className="mx-auto max-w-7xl px-6 py-8">
			{/* Page header */}
			<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 tracking-tight dark:text-gray-100">
						Discover Reviews
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Explore the latest food experiences from the community
					</p>
				</div>
				{/* Feed tabs */}
				<div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
					<button
						onClick={() => handleTabChange("latest")}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
							feedType === "latest"
								? "bg-white text-primary-600 shadow-sm dark:bg-gray-700 dark:text-primary-400"
								: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						}`}
					>
						<FiTrendingUp size={16} />
						Latest
					</button>
					<button
						onClick={() => handleTabChange("friends")}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
							feedType === "friends"
								? "bg-white text-primary-600 shadow-sm dark:bg-gray-700 dark:text-primary-400"
								: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						}`}
					>
						<FiUsers size={16} />
						Following
					</button>
				</div>
			</div>

			{/* Location filter */}
			{feedType === "latest" && locations.length > 0 && (
				<div className="mb-8 animate-fade-in">
					<div className="flex items-center gap-2 mb-3">
						<FiMapPin size={16} className="text-primary-500" />
						<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
							Filter by location
						</span>
						{selectedLocation && (
							<button
								onClick={() => handleLocationChange(null)}
								className="ml-auto flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors dark:text-gray-500"
							>
								<FiX size={14} />
								Clear filter
							</button>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{locations.map((loc) => (
							<button
								key={loc}
								onClick={() => handleLocationChange(loc)}
								className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border ${
									selectedLocation === loc
										? "bg-primary-500 text-white border-primary-500 shadow-sm"
										: "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
								}`}
							>
								<FiMapPin size={13} />
								{loc}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Active filter indicator */}
			{selectedLocation && feedType === "latest" && (
				<div className="mb-6 flex items-center gap-2 rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 dark:bg-primary-900/20 dark:border-primary-800">
					<FiMapPin size={16} className="text-primary-500" />
					<span className="text-sm font-medium text-primary-700 dark:text-primary-300">
						Showing reviews in <strong>{selectedLocation}</strong>
					</span>
					<span className="text-xs text-primary-400 dark:text-primary-500 ml-1">
						({pagination?.total || 0} {pagination?.total === 1 ? "review" : "reviews"})
					</span>
				</div>
			)}

			{/* Posts grid */}
			{loading && posts.length === 0 ? (
				<Spinner />
			) : posts.length === 0 ? (
				<div className="py-24 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<span className="text-3xl">{selectedLocation ? "📍" : "🍽️"}</span>
					</div>
					<p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
						{selectedLocation ? `No reviews in ${selectedLocation}` : "No posts yet"}
					</p>
					<p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto dark:text-gray-500">
						{selectedLocation
							? "Try selecting a different location or clear the filter"
							: feedType === "friends"
								? "Follow some users to see their posts here!"
								: "Be the first to share a food review!"}
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{posts.map((post) => (
							<PostCard key={post.id} post={post} />
						))}
					</div>

					{/* Load more */}
					{pagination && pagination.page < pagination.totalPages && (
						<div className="mt-12 text-center">
							<button onClick={handleLoadMore} className="btn-outline btn-lg" disabled={loading}>
								{loading ? "Loading…" : "Load More Reviews"}
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
