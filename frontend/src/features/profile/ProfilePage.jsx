import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchProfile,
	fetchUserPosts,
	clearProfile,
	followUser,
	unfollowUser,
	fetchFollowStatus,
	updateProfile,
	fetchBlockStatus,
	blockUser,
	unblockUser,
	reportUser,
} from "./profileSlice.js";
import PostCard from "../../components/PostCard.jsx";
import Spinner from "../../components/Spinner.jsx";
import {
	FiEdit2,
	FiCamera,
	FiGrid,
	FiUserPlus,
	FiUserCheck,
	FiCheck,
	FiX,
	FiSlash,
	FiFlag,
	FiMoreHorizontal,
} from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaXTwitter, FaTiktok, FaYoutube, FaGithub } from "react-icons/fa6";
import toast from "react-hot-toast";

export default function ProfilePage() {
	const { id } = useParams();
	const dispatch = useDispatch();
	const { user: profile, posts, pagination, isFollowing, isBlocked, loading } = useSelector((state) => state.profile);
	const { user: currentUser } = useSelector((state) => state.auth);

	const [editing, setEditing] = useState(false);
	const [editForm, setEditForm] = useState({
		name: "",
		bio: "",
		facebook: "",
		instagram: "",
		twitter: "",
		tiktok: "",
		youtube: "",
		github: "",
	});
	const [avatarFile, setAvatarFile] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [reportReason, setReportReason] = useState("spam");
	const [reportDetails, setReportDetails] = useState("");

	const isOwnProfile = currentUser?.id === id;

	useEffect(() => {
		dispatch(fetchProfile(id));
		dispatch(fetchUserPosts({ userId: id, page: 1 }));
		if (!isOwnProfile && currentUser) {
			dispatch(fetchFollowStatus(id));
			dispatch(fetchBlockStatus(id));
		}
		return () => dispatch(clearProfile());
	}, [dispatch, id, isOwnProfile, currentUser]);

	useEffect(() => {
		if (profile) {
			setEditForm({
				name: profile.name || "",
				bio: profile.bio || "",
				facebook: profile.facebook || "",
				instagram: profile.instagram || "",
				twitter: profile.twitter || "",
				tiktok: profile.tiktok || "",
				youtube: profile.youtube || "",
				github: profile.github || "",
			});
		}
	}, [profile]);

	const handleFollow = () => {
		if (isFollowing) dispatch(unfollowUser(id));
		else dispatch(followUser(id));
	};

	const handleLoadMore = () => {
		if (!pagination || pagination.page >= pagination.totalPages) return;
		dispatch(fetchUserPosts({ userId: id, page: pagination.page + 1 }));
	};

	const handleAvatarChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setAvatarFile(file);
			setAvatarPreview(URL.createObjectURL(file));
		}
	};

	const handleSaveProfile = async () => {
		const formData = new FormData();
		if (editForm.name) formData.append("name", editForm.name);
		if (editForm.bio !== undefined) formData.append("bio", editForm.bio);
		if (avatarFile) formData.append("avatar", avatarFile);
		const socialFields = ["facebook", "instagram", "twitter", "tiktok", "youtube", "github"];
		socialFields.forEach((field) => {
			formData.append(field, editForm[field] || "");
		});
		const result = await dispatch(updateProfile(formData));
		if (updateProfile.fulfilled.match(result)) {
			toast.success("Profile updated!");
			setEditing(false);
			setAvatarFile(null);
			setAvatarPreview(null);
		}
	};

	const handleCancelEdit = () => {
		setEditing(false);
		setAvatarFile(null);
		setAvatarPreview(null);
		if (profile)
			setEditForm({
				name: profile.name || "",
				bio: profile.bio || "",
				facebook: profile.facebook || "",
				instagram: profile.instagram || "",
				twitter: profile.twitter || "",
				tiktok: profile.tiktok || "",
				youtube: profile.youtube || "",
				github: profile.github || "",
			});
	};

	const handleBlock = () => {
		setMenuOpen(false);
		if (isBlocked) {
			dispatch(unblockUser(id));
			toast.success(`Unblocked ${profile.name}`);
		} else {
			dispatch(blockUser(id));
			toast.success(`Blocked ${profile.name}`);
		}
	};

	const handleReportSubmit = () => {
		dispatch(reportUser({ userId: id, reason: reportReason, details: reportDetails }));
		toast.success("Report submitted. Thank you!");
		setReportOpen(false);
		setReportReason("spam");
		setReportDetails("");
	};

	if (loading && !profile) return <Spinner />;
	if (!profile) return <div className="py-20 text-center text-gray-400 dark:text-gray-500">User not found</div>;

	const displayAvatar = avatarPreview || profile.avatarUrl;
	const postCount = profile._count?.posts || 0;
	const followerCount = profile._count?.followers || 0;
	const followingCount = profile._count?.following || 0;

	return (
		<div className="animate-fade-in">
			{/* ── Edit Profile Modal ── */}
			{editing && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelEdit} />

					{/* Modal card */}
					<div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl animate-slide-up dark:bg-gray-800">
						{/* Modal header */}
						<div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
							<h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Profile</h2>
							<button
								onClick={handleCancelEdit}
								className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-700 dark:hover:text-gray-300"
							>
								<FiX size={18} />
							</button>
						</div>

						{/* Modal body */}
						<div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
							{/* Avatar change */}
							<div className="flex flex-col items-center gap-3">
								<div className="relative group/avatar">
									{displayAvatar ? (
										<img
											src={displayAvatar}
											alt={profile.name}
											className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
										/>
									) : (
										<div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-3xl font-bold text-primary-600 border-2 border-gray-200 dark:bg-primary-900/30 dark:border-gray-600">
											{profile.name.charAt(0).toUpperCase()}
										</div>
									)}
									<label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
										<FiCamera size={20} className="text-white" />
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleAvatarChange}
										/>
									</label>
								</div>
								<span className="text-xs text-gray-400 dark:text-gray-500">
									Click avatar to change photo
								</span>
							</div>

							{/* Name */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
									Name
								</label>
								<input
									type="text"
									value={editForm.name}
									onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
									className="input"
									placeholder="Your name"
								/>
							</div>

							{/* Bio */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
									Bio
								</label>
								<textarea
									value={editForm.bio}
									onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
									className="input min-h-[80px] resize-none"
									placeholder="Write something about yourself..."
									rows={3}
								/>
							</div>

							{/* Social Media */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-3 dark:text-gray-300">
									Social Media
								</label>
								<div className="space-y-2.5">
									{[
										{
											key: "facebook",
											icon: FaFacebookF,
											color: "text-blue-600",
											placeholder: "https://facebook.com/...",
										},
										{
											key: "instagram",
											icon: FaInstagram,
											color: "text-pink-500",
											placeholder: "https://instagram.com/...",
										},
										{
											key: "twitter",
											icon: FaXTwitter,
											color: "text-gray-900 dark:text-gray-100",
											placeholder: "https://x.com/...",
										},
										{
											key: "tiktok",
											icon: FaTiktok,
											color: "text-gray-900 dark:text-gray-100",
											placeholder: "https://tiktok.com/...",
										},
										{
											key: "youtube",
											icon: FaYoutube,
											color: "text-red-600",
											placeholder: "https://youtube.com/...",
										},
										{
											key: "github",
											icon: FaGithub,
											color: "text-gray-800 dark:text-gray-200",
											placeholder: "https://github.com/...",
										},
									].map(({ key, icon: Icon, color, placeholder }) => (
										<div key={key} className="flex items-center gap-2.5">
											<Icon size={16} className={`${color} shrink-0 w-5`} />
											<input
												type="text"
												value={editForm[key]}
												onChange={(e) =>
													setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
												}
												className="input text-sm"
												placeholder={placeholder}
											/>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Modal footer */}
						<div className="flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
							<button onClick={handleCancelEdit} className="btn-secondary text-sm">
								Cancel
							</button>
							<button onClick={handleSaveProfile} className="btn-primary text-sm">
								<FiCheck size={15} className="mr-1.5" /> Save Changes
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Cover */}
			<div className="h-36 sm:h-44 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />

			{/* Profile header */}
			<div className="mx-auto max-w-4xl px-6 -mt-16">
				<div className="flex flex-col sm:flex-row sm:items-end gap-5">
					{/* Avatar */}
					<div className="shrink-0">
						{profile.avatarUrl ? (
							<img
								src={profile.avatarUrl}
								alt={profile.name}
								className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg dark:border-gray-900"
							/>
						) : (
							<div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary-100 text-4xl font-bold text-primary-600 border-4 border-white shadow-lg dark:bg-primary-900/30 dark:border-gray-900">
								{profile.name.charAt(0).toUpperCase()}
							</div>
						)}
					</div>

					{/* Name + action button */}
					<div className="flex-1 pb-1">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</h1>
							{isOwnProfile ? (
								<button onClick={() => setEditing(true)} className="btn-secondary text-sm shrink-0">
									<FiEdit2 size={14} className="mr-1.5" /> Edit Profile
								</button>
							) : (
								<div className="flex items-center gap-2">
									{isBlocked ? (
										<button
											onClick={handleBlock}
											className="btn-secondary text-sm shrink-0 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
										>
											<FiSlash size={15} className="mr-1.5" /> Unblock
										</button>
									) : (
										<button
											onClick={handleFollow}
											className={`text-sm shrink-0 ${isFollowing ? "btn-secondary" : "btn-primary"}`}
										>
											{isFollowing ? (
												<>
													<FiUserCheck size={15} className="mr-1.5" /> Following
												</>
											) : (
												<>
													<FiUserPlus size={15} className="mr-1.5" /> Follow
												</>
											)}
										</button>
									)}
									{/* Three-dot menu */}
									<div className="relative">
										<button
											onClick={() => setMenuOpen(!menuOpen)}
											className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
										>
											<FiMoreHorizontal size={18} />
										</button>
										{menuOpen && (
											<div className="absolute right-0 top-11 z-30 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1 animate-fade-in dark:bg-gray-800 dark:border-gray-700">
												<button
													onClick={handleBlock}
													className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
												>
													<FiSlash size={15} className="text-red-500" />
													{isBlocked ? "Unblock user" : "Block user"}
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
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Bio */}
				{profile.bio && <p className="mt-3 text-sm text-gray-500 max-w-xl dark:text-gray-400">{profile.bio}</p>}

				{/* Social Links */}
				{(() => {
					const socials = [
						{
							key: "facebook",
							icon: FaFacebookF,
							color: "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20",
						},
						{
							key: "instagram",
							icon: FaInstagram,
							color: "text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20",
						},
						{
							key: "twitter",
							icon: FaXTwitter,
							color: "text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
						},
						{
							key: "tiktok",
							icon: FaTiktok,
							color: "text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800",
						},
						{
							key: "youtube",
							icon: FaYoutube,
							color: "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
						},
						{
							key: "github",
							icon: FaGithub,
							color: "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
						},
					];
					const activeSocials = socials.filter(({ key }) => profile[key]);
					if (activeSocials.length === 0) return null;
					return (
						<div className="mt-3 flex gap-2 flex-wrap">
							{activeSocials.map(({ key, icon: Icon, color }) => (
								<a
									key={key}
									href={profile[key]}
									target="_blank"
									rel="noopener noreferrer"
									className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 transition-colors ${color} dark:border-gray-700`}
									title={key}
								>
									<Icon size={16} />
								</a>
							))}
						</div>
					);
				})()}

				{/* Stats */}
				<div className="mt-5 flex gap-6 border-b border-gray-200 pb-5 dark:border-gray-700">
					<div className="text-center">
						<span className="text-lg font-bold text-gray-900 dark:text-gray-100">{postCount}</span>
						<span className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">reviews</span>
					</div>
					<div className="text-center">
						<span className="text-lg font-bold text-gray-900 dark:text-gray-100">{followerCount}</span>
						<span className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">followers</span>
					</div>
					<div className="text-center">
						<span className="text-lg font-bold text-gray-900 dark:text-gray-100">{followingCount}</span>
						<span className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">following</span>
					</div>
				</div>

				{/* Posts */}
				<div className="mt-8 pb-12">
					<h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-5 dark:text-gray-100">
						<FiGrid size={18} className="text-primary-500" />
						Reviews
					</h3>

					{posts.length === 0 ? (
						<div className="py-16 text-center">
							<FiGrid size={32} className="mx-auto text-gray-200 mb-3 dark:text-gray-600" />
							<p className="text-sm text-gray-400 dark:text-gray-500">
								{isOwnProfile ? "You haven't posted any reviews yet." : "No reviews yet."}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
							{posts.map((post) => (
								<PostCard key={post.id} post={post} />
							))}
						</div>
					)}

					{pagination && pagination.page < pagination.totalPages && (
						<div className="mt-8 text-center">
							<button onClick={handleLoadMore} className="btn-outline btn-lg">
								Load More
							</button>
						</div>
					)}
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
								Report {profile?.name}
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
