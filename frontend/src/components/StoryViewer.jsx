import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiX, FiChevronLeft, FiChevronRight, FiEye, FiMapPin } from "react-icons/fi";
import { useSelector } from "react-redux";
import VerifiedBadge from "./VerifiedBadge.jsx";
import api from "../lib/api.js";
import Spinner from "./Spinner.jsx";

const STORY_DURATION = 5000; // ms per story

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
	return `${days}d ago`;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
	const { user: currentUser } = useSelector((s) => s.auth);
	const [idx, setIdx] = useState(initialIndex);
	const [progress, setProgress] = useState(0);
	const [paused, setPaused] = useState(false);
	const [viewersOpen, setViewersOpen] = useState(false);
	const [viewers, setViewers] = useState([]);
	const [viewersLoading, setViewersLoading] = useState(false);
	const intervalRef = useRef(null);
	const viewRecorded = useRef(new Set());

	const story = stories[idx];
	const isOwnStory = story?.userId === currentUser?.id;

	// Record view when story changes
	useEffect(() => {
		if (!story || isOwnStory || viewRecorded.current.has(story.id)) return;
		viewRecorded.current.add(story.id);
		api.post(`/posts/${story.id}/views`).catch(() => {});
	}, [story, isOwnStory]);

	// Auto-progress bar
	useEffect(() => {
		setProgress(0);
		setViewersOpen(false);
		if (paused) return;

		intervalRef.current = setInterval(() => {
			setProgress((p) => {
				if (p >= 100) {
					clearInterval(intervalRef.current);
					if (idx < stories.length - 1) {
						setIdx((i) => i + 1);
					} else {
						onClose();
					}
					return 100;
				}
				return p + 100 / (STORY_DURATION / 100);
			});
		}, 100);

		return () => clearInterval(intervalRef.current);
	}, [idx, paused, stories.length]);

	const goNext = () => {
		if (idx < stories.length - 1) setIdx((i) => i + 1);
		else onClose();
	};

	const goPrev = () => {
		if (idx > 0) setIdx((i) => i - 1);
	};

	const openViewers = async () => {
		setViewersOpen(true);
		setPaused(true);
		setViewersLoading(true);
		try {
			const { data } = await api.get(`/posts/${story.id}/viewers`);
			setViewers(data.data.viewers || []);
		} catch {
			// silent
		} finally {
			setViewersLoading(false);
		}
	};

	const closeViewers = () => {
		setViewersOpen(false);
		setPaused(false);
	};

	if (!story) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
			{/* Close */}
			<button
				onClick={onClose}
				className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
			>
				<FiX size={20} />
			</button>

			{/* Story container */}
			<div className="relative w-full max-w-sm h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col bg-black">
				{/* Progress bars */}
				<div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
					{stories.map((s, i) => (
						<div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
							<div
								className="h-full bg-white rounded-full transition-none"
								style={{
									width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
								}}
							/>
						</div>
					))}
				</div>

				{/* User info */}
				<div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-2">
					{story.user.avatarUrl ? (
						<img
							src={story.user.avatarUrl}
							alt={story.user.name}
							className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50"
						/>
					) : (
						<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white ring-2 ring-white/50">
							{story.user.name?.charAt(0).toUpperCase()}
						</div>
					)}
					<div>
						<div className="flex items-center gap-1">
							<Link
								to={`/profile/${story.user.id}`}
								onClick={onClose}
								className="text-sm font-semibold text-white leading-tight hover:underline"
							>
								{story.user.name}
							</Link>
							<VerifiedBadge role={story.user.role} />
						</div>
						<p className="text-xs text-white/70">{timeAgo(story.createdAt)}</p>
					</div>
				</div>

				{/* Image */}
				<img
					src={story.imageUrl}
					alt={story.restaurantName}
					className="w-full h-full object-cover"
					onMouseDown={() => setPaused(true)}
					onMouseUp={() => setPaused(false)}
					onTouchStart={() => setPaused(true)}
					onTouchEnd={() => setPaused(false)}
				/>

				{/* Overlay gradient bottom */}
				<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-20 pb-4 px-4 z-10">
					{/* Post info */}
					<p className="text-white font-bold text-base leading-snug">{story.restaurantName}</p>
					{story.dishName && (
						<p className="text-white/80 text-sm mt-0.5">🍽️ {story.dishName}</p>
					)}
					<div className="flex items-center gap-1 mt-1">
						<FiMapPin size={12} className="text-white/60 shrink-0" />
						<p className="text-white/60 text-xs truncate">{story.restaurantAddress}</p>
					</div>
					<div className="flex items-center gap-1 mt-1">
						{"★".repeat(story.rating)}
						{"☆".repeat(5 - story.rating)}
					</div>

					{/* Viewers button for own stories */}
					{isOwnStory && (
						<button
							onClick={openViewers}
							className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2 text-sm text-white hover:bg-white/25 transition-colors"
						>
							<FiEye size={15} />
							<span>{story._count?.views ?? 0} lượt xem</span>
						</button>
					)}
				</div>

				{/* Nav zones */}
				<button
					onClick={goPrev}
					className="absolute left-0 top-0 h-full w-1/3 z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
					disabled={idx === 0}
				>
					{idx > 0 && (
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30">
							<FiChevronLeft size={20} className="text-white" />
						</div>
					)}
				</button>
				<button
					onClick={goNext}
					className="absolute right-0 top-0 h-full w-1/3 z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30">
						<FiChevronRight size={20} className="text-white" />
					</div>
				</button>
			</div>

			{/* Viewers panel (slide up) */}
			{viewersOpen && (
				<div className="absolute inset-x-0 bottom-0 max-w-sm mx-auto z-20 rounded-t-2xl bg-white dark:bg-gray-900 max-h-[50vh] flex flex-col shadow-2xl">
					<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
						<div className="flex items-center gap-2">
							<FiEye size={16} className="text-blue-500" />
							<span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
								{viewers.length} người đã xem
							</span>
						</div>
						<button
							onClick={closeViewers}
							className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							<FiX size={16} />
						</button>
					</div>
					{viewersLoading ? (
						<div className="flex justify-center p-6">
							<Spinner />
						</div>
					) : viewers.length === 0 ? (
						<div className="py-10 text-center text-sm text-gray-400">Chưa có ai xem story này</div>
					) : (
						<div className="overflow-y-auto flex-1">
							{viewers.map((u) => (
								<Link
									key={u.id}
									to={`/profile/${u.id}`}
									onClick={onClose}
									className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
								>
									{u.avatarUrl ? (
										<img src={u.avatarUrl} alt={u.name} className="h-9 w-9 rounded-full object-cover" />
									) : (
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-bold text-blue-700">
											{u.name?.charAt(0).toUpperCase()}
										</div>
									)}
									<div className="flex items-center justify-between w-full min-w-0">
										<div className="flex items-center gap-1 min-w-0">
											<span className="font-medium text-gray-800 dark:text-gray-200 truncate text-sm">
												{u.name}
											</span>
											<VerifiedBadge role={u.role} />
										</div>
										<span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(u.viewedAt)}</span>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
