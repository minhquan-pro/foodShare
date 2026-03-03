import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
	View,
	Text,
	ScrollView,
	Image,
	TouchableOpacity,
	TextInput,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Modal,
	Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchPost,
	addComment,
	fetchComments,
	deleteComment,
	deletePost,
	clearCurrentPost,
	toggleCommentLike,
	toggleReaction,
	setUserReaction,
	updateReactions,
} from "../features/posts/postsSlice";
import StarRating from "../components/StarRating";

const EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "😢"];
import VerifiedBadge from "../components/VerifiedBadge";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { getImageUrl } from "../lib/api";

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

// ─── Comment Item ────────────────────────────────────────────

function CommentItem({ comment, currentUserId, likedCommentIds, onReply, onDelete, onToggleLike, colors, depth = 0 }) {
	const isLiked = likedCommentIds.includes(comment.id);
	const isOwn = currentUserId === comment.user?.id;

	return (
		<View style={[styles.commentItem, { marginLeft: depth * 20 }]}>
			<View style={styles.commentHeader}>
				{comment.user?.avatarUrl ? (
					<Image source={{ uri: getImageUrl(comment.user.avatarUrl) }} style={styles.commentAvatar} />
				) : (
					<View
						style={[
							styles.commentAvatarPlaceholder,
							{ backgroundColor: colors?.primaryLight || "#FED7AA" },
						]}
					>
						<Text style={[styles.commentAvatarText, { color: colors?.primary || "#F97316" }]}>
							{comment.user?.name?.charAt(0).toUpperCase()}
						</Text>
					</View>
				)}
				<View style={styles.commentMeta}>
					<View style={styles.commentNameRow}>
						<Text style={styles.commentName}>{comment.user?.name}</Text>
						<VerifiedBadge role={comment.user?.role} />
						<Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
					</View>
					<Text style={[styles.commentBody, { color: colors?.textSecondary || "#6B7280" }]}>
						{comment.body}
					</Text>
					<View style={styles.commentActions}>
						<TouchableOpacity onPress={() => onToggleLike(comment.id)} style={styles.commentAction}>
							<Text style={[styles.commentActionText, isLiked && { color: "#EF4444" }]}>
								{isLiked ? "❤️" : "🤍"} {comment._count?.commentLikes || 0}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => onReply(comment)} style={styles.commentAction}>
							<Text style={styles.commentActionText}>Reply</Text>
						</TouchableOpacity>
						{isOwn && (
							<TouchableOpacity
								onPress={() => onDelete(comment.id, comment.parentId)}
								style={styles.commentAction}
							>
								<Text style={[styles.commentActionText, { color: "#EF4444" }]}>Delete</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>
			{comment.replies?.map((reply) => (
				<CommentItem
					key={reply.id}
					comment={reply}
					currentUserId={currentUserId}
					likedCommentIds={likedCommentIds}
					onReply={onReply}
					onDelete={onDelete}
					onToggleLike={onToggleLike}
					colors={colors}
					depth={depth + 1}
				/>
			))}
		</View>
	);
}

// ─── Post Detail Screen ─────────────────────────────────────

export default function PostDetailScreen({ route, navigation }) {
	const { postId } = route.params;
	const { colors, isDark } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch();
	const { user: currentUser } = useSelector((state) => state.auth);
	const {
		currentPost: post,
		comments,
		commentsPagination,
		likedCommentIds,
		loading,
		userReaction,
		reactions,
	} = useSelector((state) => state.posts);

	const [commentText, setCommentText] = useState("");
	const [replyTo, setReplyTo] = useState(null);
	const [reactionModal, setReactionModal] = useState({ visible: false, activeTab: 'all', allUsers: [], loading: false });
	const [imageModalVisible, setImageModalVisible] = useState(false);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	useEffect(() => {
		dispatch(fetchPost(postId));
		dispatch(fetchComments({ postId, page: 1 }));
		return () => {
			dispatch(clearCurrentPost());
		};
	}, [postId]);

	const handleComment = () => {
		if (!commentText.trim()) return;
		dispatch(
			addComment({
				postId,
				body: commentText.trim(),
				parentId: replyTo?.id || null,
			}),
		);
		setCommentText("");
		setReplyTo(null);
	};

	const handleDeleteComment = (commentId, parentId) => {
		Alert.alert("Delete Comment", "Are you sure?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => dispatch(deleteComment({ commentId, parentId })),
			},
		]);
	};

	const handleDeletePost = () => {
		setDeleteModalVisible(true);
	};

	const confirmDeletePost = () => {
		setDeleteModalVisible(false);
		dispatch(deletePost(postId)).then(() => {
			navigation.goBack();
			Toast.show({ type: "success", text1: "Post deleted" });
		});
	};

	const handleToggleCommentLike = (commentId) => {
		dispatch(toggleCommentLike(commentId));
	};

	const handleReaction = (emoji) => {
		const prevReaction = userReaction;
		const nextReaction = prevReaction === emoji ? null : emoji;

		// Optimistic update
		dispatch(setUserReaction(nextReaction));
		let newReactions = reactions.map((r) => ({ ...r }));
		if (prevReaction) {
			newReactions = newReactions
				.map((r) => (r.emoji === prevReaction ? { ...r, count: r.count - 1 } : r))
				.filter((r) => r.count > 0);
		}
		if (nextReaction) {
			const existing = newReactions.find((r) => r.emoji === nextReaction);
			if (existing) {
				newReactions = newReactions.map((r) =>
					r.emoji === nextReaction ? { ...r, count: r.count + 1 } : r,
				);
			} else {
				newReactions = [...newReactions, { emoji: nextReaction, count: 1 }];
			}
		}
		dispatch(updateReactions(newReactions));

		// API call, revert on error
		dispatch(toggleReaction({ postId, emoji }))
			.unwrap()
			.catch(() => {
				dispatch(setUserReaction(prevReaction));
				dispatch(updateReactions(reactions));
			});
	};

	const openReactionModal = async (tab = 'all') => {
		setReactionModal({ visible: true, activeTab: tab, allUsers: [], loading: true });
		try {
			const { data } = await import('../lib/api').then((m) =>
				m.default.get(`/posts/${postId}/reactions/users`),
			);
			setReactionModal((prev) => ({ ...prev, allUsers: data.data.users || [], loading: false }));
		} catch {
			setReactionModal((prev) => ({ ...prev, loading: false }));
		}
	};

	if (loading && !post) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	if (!post) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
				<Text style={[styles.errorText, { color: colors.textSecondary }]}>Post not found</Text>
			</View>
		);
	}

	const isOwnPost = currentUser?.id === post.user?.id;

	return (
		<KeyboardAvoidingView
			style={[styles.container, { backgroundColor: colors.surface }]}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* Header */}
			<View
				style={[
					styles.header,
					{ paddingTop: insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border },
				]}
			>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={[styles.backBtn, { color: colors.primary }]}>← Back</Text>
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
				{isOwnPost && (
					<TouchableOpacity
						onPress={handleDeletePost}
						style={styles.deleteBtnContainer}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
					</TouchableOpacity>
				)}
			</View>

			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
				{/* Image */}
				{post.imageUrl && (
					<TouchableOpacity activeOpacity={0.9} onPress={() => setImageModalVisible(true)}>
						<Image
							source={{ uri: getImageUrl(post.imageUrl) }}
							style={[styles.postImage, { backgroundColor: colors.inputBg }]}
						/>
					</TouchableOpacity>
				)}

				{/* Delete Confirmation Modal */}
				<Modal
					visible={deleteModalVisible}
					transparent={true}
					animationType="fade"
					onRequestClose={() => setDeleteModalVisible(false)}
				>
					<View style={styles.deleteModalOverlay}>
						<View
							style={[
								styles.deleteModalBox,
								{
									backgroundColor: colors.card,
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 8 },
									shadowOpacity: isDark ? 0.5 : 0.15,
									shadowRadius: 24,
									elevation: 12,
								},
							]}
						>
							{/* Warning icon */}
							<View
								style={[
									styles.deleteModalIconCircle,
									{ backgroundColor: isDark ? "#431407" : "#FFF7ED" },
								]}
							>
								<Text style={styles.deleteModalIcon}>🗑️</Text>
							</View>
							<Text style={[styles.deleteModalTitle, { color: colors.text }]}>Delete Post?</Text>
							<Text style={[styles.deleteModalMsg, { color: colors.textSecondary }]}>
								This will permanently remove your post and all its comments. This action cannot be
								undone.
							</Text>
							<View style={styles.deleteModalActions}>
								<TouchableOpacity
									style={[
										styles.deleteModalBtn,
										{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
									]}
									onPress={() => setDeleteModalVisible(false)}
								>
									<Text style={[styles.deleteModalBtnText, { color: colors.text }]}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.deleteModalBtn, styles.deleteModalBtnDanger]}
									onPress={confirmDeletePost}
								>
									<Text style={[styles.deleteModalBtnText, { color: "#FFFFFF" }]}>Delete</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>

				{/* Image Lightbox Modal */}
				<Modal
					visible={imageModalVisible}
					transparent={true}
					animationType="fade"
					onRequestClose={() => setImageModalVisible(false)}
				>
					<TouchableOpacity
						style={styles.lightboxOverlay}
						activeOpacity={1}
						onPress={() => setImageModalVisible(false)}
					>
						<Image
							source={{ uri: getImageUrl(post.imageUrl) }}
							style={styles.lightboxImage}
							resizeMode="contain"
						/>
						<TouchableOpacity style={styles.lightboxClose} onPress={() => setImageModalVisible(false)}>
							<Text style={styles.lightboxCloseText}>✕</Text>
						</TouchableOpacity>
					</TouchableOpacity>
				</Modal>

				{/* Post Info */}
				<View style={[styles.postInfo, { backgroundColor: colors.card }]}>
					{/* User */}
					<TouchableOpacity
						style={styles.userRow}
						onPress={() => {
							if (navigation.getParent()) {
								navigation.navigate("UserProfile", { userId: post.user.id });
							}
						}}
					>
						{post.user?.avatarUrl ? (
							<Image
								source={{ uri: getImageUrl(post.user.avatarUrl) }}
								style={[styles.userAvatar, { borderColor: colors.border }]}
							/>
						) : (
							<View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
								<Text style={[styles.userAvatarText, { color: colors.primary }]}>
									{post.user?.name?.charAt(0).toUpperCase()}
								</Text>
							</View>
						)}
						<View>
							<View style={styles.nameRow}>
								<Text style={[styles.userName, { color: colors.text }]}>{post.user?.name}</Text>
								<VerifiedBadge role={post.user?.role} />
							</View>
							<Text style={[styles.postTime, { color: colors.textMuted }]}>
								{timeAgo(post.createdAt)}
							</Text>
						</View>
					</TouchableOpacity>

					{/* Location block with orange left accent */}
					<View style={[styles.locationBlock, { borderLeftColor: colors.primary }]}>
						<Text style={[styles.restaurantName, { color: colors.text }]}>{post.restaurantName}</Text>
						<Text style={[styles.address, { color: colors.textMuted }]}>📍 {post.restaurantAddress}</Text>
					</View>

					{/* Rating pill */}
					<View
						style={[
							styles.ratingPill,
							{ backgroundColor: isDark ? "#374151" : "#F9FAFB", borderColor: colors.border },
						]}
					>
						<StarRating rating={post.rating} size={16} />
						<Text style={[styles.ratingPillLabel, { color: colors.textSecondary }]}>Rating</Text>
					</View>

					<Text style={[styles.description, { color: colors.textSecondary }]}>{post.description}</Text>

					{/* Post stats */}
					<View style={[styles.postActions, { borderTopColor: colors.border }]}>
						<View style={[styles.statPill, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}>
							<Text style={styles.statPillIcon}>💬</Text>
							<Text style={[styles.statPillCount, { color: colors.textSecondary }]}>
								{post._count?.comments || 0}
							</Text>
							<Text style={[styles.statPillLabel, { color: colors.textMuted }]}>comments</Text>
						</View>
						{reactions.length > 0 && (
						<View style={styles.reactionSummary}>
							<TouchableOpacity onPress={() => openReactionModal('all')}>
								<Text style={[styles.reactionTotal, { color: colors.textMuted }]}>
									{reactions.reduce((s, r) => s + r.count, 0)}
								</Text>
							</TouchableOpacity>
							{reactions
								.sort((a, b) => b.count - a.count)
								.slice(0, 3)
								.map((r) => (
									<TouchableOpacity key={r.emoji} onPress={() => openReactionModal(r.emoji)}>
										<Text style={[styles.reactionSummaryItem, { color: colors.textSecondary }]}>
											{r.emoji} {r.count}
										</Text>
									</TouchableOpacity>
								))}
						</View>
					)}
					</View>

					{/* Reaction Picker */}
					<View style={[styles.reactionPicker, { borderTopColor: colors.border }]}>
						{EMOJIS.map((emoji) => (
							<TouchableOpacity
								key={emoji}
								onPress={() => handleReaction(emoji)}
								style={[
									styles.emojiBtn,
									userReaction === emoji && {
										backgroundColor: isDark ? "#374151" : "#FFF7ED",
										borderColor: "#F97316",
									},
								]}
							>
								<Text style={styles.emojiText}>{emoji}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Reaction Users Modal */}
			<Modal
				visible={reactionModal.visible}
				transparent
				animationType="slide"
				onRequestClose={() => setReactionModal((p) => ({ ...p, visible: false }))}
			>
				<TouchableOpacity
					style={styles.reactionModalOverlay}
					activeOpacity={1}
					onPress={() => setReactionModal((p) => ({ ...p, visible: false }))}
				>
					<TouchableOpacity
						activeOpacity={1}
						style={[styles.reactionModalBox, { backgroundColor: colors.card }]}
					>
						<View style={[styles.reactionModalHeader, { borderBottomColor: colors.border }]}>
							<Text style={[styles.reactionModalTitle, { color: colors.text }]}>
								{reactionModal.allUsers.length} {reactionModal.allUsers.length === 1 ? 'reaction' : 'reactions'}
							</Text>
							<TouchableOpacity onPress={() => setReactionModal((p) => ({ ...p, visible: false }))}>
								<Text style={[styles.reactionModalClose, { color: colors.textMuted }]}>✕</Text>
							</TouchableOpacity>
						</View>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.reactionTabs, { borderBottomColor: colors.border }]}>
							<TouchableOpacity
								style={[styles.reactionTab, reactionModal.activeTab === 'all' && [styles.reactionTabActive, { borderBottomColor: colors.primary }]]}
								onPress={() => setReactionModal((p) => ({ ...p, activeTab: 'all' }))}
							>
								<Text style={[styles.reactionTabText, { color: reactionModal.activeTab === 'all' ? colors.primary : colors.textMuted }]}>
									All {reactionModal.allUsers.length}
								</Text>
							</TouchableOpacity>
							{reactions.sort((a, b) => b.count - a.count).map((r) => (
								<TouchableOpacity
									key={r.emoji}
									style={[styles.reactionTab, reactionModal.activeTab === r.emoji && [styles.reactionTabActive, { borderBottomColor: colors.primary }]]}
									onPress={() => setReactionModal((p) => ({ ...p, activeTab: r.emoji }))}
								>
									<Text style={[styles.reactionTabText, { color: reactionModal.activeTab === r.emoji ? colors.primary : colors.textMuted }]}>
										{r.emoji} {r.count}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
						{reactionModal.loading ? (
							<ActivityIndicator style={{ margin: 24 }} color="#F97316" />
						) : (
							<FlatList
								data={reactionModal.activeTab === 'all'
									? reactionModal.allUsers
									: reactionModal.allUsers.filter((u) => u.emoji === reactionModal.activeTab)}
								keyExtractor={(item) => String(item.id)}
								style={{ maxHeight: 320 }}
								renderItem={({ item: u }) => (
									<TouchableOpacity
										style={[styles.reactionUserItem, { borderBottomColor: colors.border }]}
										onPress={() => {
											setReactionModal((p) => ({ ...p, visible: false }));
											navigation.navigate('UserProfile', { userId: u.id });
										}}
									>
										{u.avatarUrl ? (
											<Image source={{ uri: getImageUrl(u.avatarUrl) }} style={styles.reactionUserAvatar} />
										) : (
											<View style={[styles.reactionUserAvatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
												<Text style={[styles.reactionUserAvatarText, { color: colors.primary }]}>
													{u.name?.charAt(0).toUpperCase()}
												</Text>
											</View>
										)}
										<Text style={[styles.reactionUserName, { color: colors.text }]}>{u.name}</Text>
										<Text style={styles.reactionUserEmoji}>{u.emoji}</Text>
									</TouchableOpacity>
								)}
							/>
						)}
					</TouchableOpacity>
				</TouchableOpacity>
			</Modal>

				{/* Comments */}
				<View style={[styles.commentsSection, { backgroundColor: colors.card }]}>
					<View style={styles.commentsTitleRow}>
						<Text style={[styles.commentsTitle, { color: colors.text }]}>Comments</Text>
						{comments.length > 0 && (
							<View style={[styles.commentCountBadge, { backgroundColor: colors.primary }]}>
								<Text style={styles.commentCountBadgeText}>
									{post._count?.comments || comments.length}
								</Text>
							</View>
						)}
					</View>
					{comments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							currentUserId={currentUser?.id}
							likedCommentIds={likedCommentIds}
							onReply={(c) => setReplyTo(c)}
							onDelete={handleDeleteComment}
							onToggleLike={handleToggleCommentLike}
							colors={colors}
						/>
					))}
					{commentsPagination?.hasMore && (
						<TouchableOpacity
							onPress={() =>
								dispatch(
									fetchComments({
										postId,
										page: (commentsPagination?.page || 1) + 1,
									}),
								)
							}
							style={styles.loadMoreBtn}
						>
							<Text style={styles.loadMoreText}>Load more comments</Text>
						</TouchableOpacity>
					)}
				</View>
			</ScrollView>

			{/* Comment Input */}
			<View
				style={[
					styles.commentInputContainer,
					{ backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
				]}
			>
				{replyTo && (
					<View style={[styles.replyBar, { backgroundColor: colors.primaryLight }]}>
						<Text style={[styles.replyBarText, { color: colors.primary }]}>
							Replying to {replyTo.user?.name}
						</Text>
						<TouchableOpacity onPress={() => setReplyTo(null)}>
							<Text style={[styles.replyBarClose, { color: colors.textMuted }]}>✕</Text>
						</TouchableOpacity>
					</View>
				)}
				<View style={styles.commentInputRow}>
					<TextInput
						style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.text }]}
						placeholder={replyTo ? `Reply to ${replyTo.user?.name}...` : "Add a comment..."}
						placeholderTextColor={colors.textMuted}
						value={commentText}
						onChangeText={setCommentText}
						multiline
					/>
					<TouchableOpacity
						onPress={handleComment}
						disabled={!commentText.trim()}
						style={[
							styles.sendBtn,
							{ backgroundColor: colors.primary },
							!commentText.trim() && styles.sendBtnDisabled,
						]}
					>
						<Text style={[styles.sendBtnText, { color: colors.card }]}>Send</Text>
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F9FAFB",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F9FAFB",
	},
	errorText: {
		fontSize: 16,
		color: "#6B7280",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingBottom: 12,
		backgroundColor: "#FFFFFF",
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	backBtn: {
		fontSize: 16,
		color: "#F97316",
		fontWeight: "600",
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: "#1F2937",
	},
	deleteBtn: {
		fontSize: 14,
		color: "#EF4444",
		fontWeight: "600",
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 20,
	},
	postImage: {
		width: "100%",
		height: 280,
		backgroundColor: "#F3F4F6",
	},
	postInfo: {
		padding: 16,
		backgroundColor: "#FFFFFF",
	},
	userRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	userAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 10,
		borderWidth: 1.5,
		borderColor: "#E5E7EB",
	},
	userAvatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 10,
		backgroundColor: "#FED7AA",
		justifyContent: "center",
		alignItems: "center",
	},
	userAvatarText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#EA580C",
	},
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	userName: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1F2937",
	},
	postTime: {
		fontSize: 12,
		color: "#9CA3AF",
		marginTop: 2,
	},
	locationBlock: {
		borderLeftWidth: 3,
		borderLeftColor: "#F97316",
		paddingLeft: 10,
		marginBottom: 12,
	},
	restaurantName: {
		fontSize: 22,
		fontWeight: "800",
		color: "#1F2937",
		marginBottom: 2,
	},
	address: {
		fontSize: 13,
		color: "#9CA3AF",
	},
	ratingPill: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 8,
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginBottom: 14,
	},
	ratingPillLabel: {
		fontSize: 12,
		fontWeight: "500",
		color: "#6B7280",
	},
	ratingRow: {
		marginBottom: 12,
	},
	description: {
		fontSize: 15,
		color: "#4B5563",
		lineHeight: 22,
	},
	postActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	statPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	statPillIcon: {
		fontSize: 14,
	},
	statPillCount: {
		fontSize: 14,
		fontWeight: "700",
		color: "#6B7280",
	},
	statPillLabel: {
		fontSize: 12,
		color: "#9CA3AF",
	},
	commentsSection: {
		padding: 16,
		marginTop: 8,
		backgroundColor: "#FFFFFF",
	},
	commentsTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 16,
	},
	commentsTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: "#1F2937",
	},
	commentCountBadge: {
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
		minWidth: 22,
		alignItems: "center",
	},
	commentCountBadgeText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	commentItem: {
		marginBottom: 16,
	},
	commentHeader: {
		flexDirection: "row",
	},
	commentAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 8,
	},
	commentAvatarPlaceholder: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 8,
	},
	commentAvatarText: {
		fontSize: 12,
		fontWeight: "700",
	},
	commentMeta: {
		flex: 1,
	},
	commentNameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginBottom: 2,
	},
	commentName: {
		fontSize: 13,
		fontWeight: "600",
		color: "#1F2937",
	},
	commentTime: {
		fontSize: 11,
		color: "#9CA3AF",
		marginLeft: 6,
	},
	commentBody: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 4,
	},
	commentActions: {
		flexDirection: "row",
		gap: 16,
	},
	commentAction: {
		paddingVertical: 2,
	},
	commentActionText: {
		fontSize: 12,
		color: "#6B7280",
		fontWeight: "500",
	},
	loadMoreBtn: {
		alignItems: "center",
		paddingVertical: 12,
	},
	loadMoreText: {
		fontSize: 14,
		color: "#F97316",
		fontWeight: "600",
	},
	commentInputContainer: {
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
		paddingTop: 8,
		paddingHorizontal: 16,
	},
	replyBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#FFF7ED",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 8,
	},
	replyBarText: {
		fontSize: 12,
		color: "#EA580C",
		fontWeight: "500",
	},
	replyBarClose: {
		fontSize: 14,
		color: "#9CA3AF",
		fontWeight: "700",
	},
	commentInputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
	},
	commentInput: {
		flex: 1,
		backgroundColor: "#F3F4F6",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		fontSize: 14,
		color: "#1F2937",
		maxHeight: 100,
	},
	sendBtn: {
		backgroundColor: "#F97316",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	sendBtnDisabled: {
		opacity: 0.5,
	},
	sendBtnText: {
		color: "#FFFFFF",
		fontWeight: "700",
		fontSize: 14,
	},
	lightboxOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
		justifyContent: "center",
		alignItems: "center",
	},
	lightboxImage: {
		width: Dimensions.get("window").width,
		height: Dimensions.get("window").height * 0.8,
	},
	lightboxClose: {
		position: "absolute",
		top: 50,
		right: 20,
		backgroundColor: "rgba(255,255,255,0.2)",
		borderRadius: 20,
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	lightboxCloseText: {
		color: "#FFFFFF",
		fontSize: 20,
		fontWeight: "700",
	},
	deleteModalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	deleteBtnContainer: {
		padding: 4,
		borderRadius: 8,
	},
	deleteModalBox: {
		width: "100%",
		borderRadius: 20,
		padding: 24,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
	},
	deleteModalIconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	deleteModalIcon: {
		fontSize: 30,
	},
	deleteModalTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1F2937",
		marginBottom: 8,
		textAlign: "center",
	},
	deleteModalMsg: {
		fontSize: 14,
		color: "#6B7280",
		lineHeight: 22,
		marginBottom: 28,
		textAlign: "center",
	},
	deleteModalActions: {
		flexDirection: "row",
		gap: 12,
		width: "100%",
	},
	deleteModalBtn: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	deleteModalBtnDanger: {
		backgroundColor: "#EF4444",
	},
	deleteModalBtnText: {
		fontSize: 15,
		fontWeight: "700",
	},
	reactionPicker: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingTop: 12,
		marginTop: 12,
		borderTopWidth: 1,
	},
	emojiBtn: {
		width: 42,
		height: 42,
		borderRadius: 21,
		borderWidth: 2,
		borderColor: "transparent",
		justifyContent: "center",
		alignItems: "center",
	},
	emojiText: {
		fontSize: 24,
	},
	reactionSummary: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginLeft: "auto",
	},
	reactionTotal: {
		fontSize: 13,
		fontWeight: "700",
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	reactionSummaryItem: {
		fontSize: 14,
		fontWeight: "600",
	},
	reactionTabs: {
		flexDirection: "row",
		borderBottomWidth: 1,
	},
	reactionTab: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
	},
	reactionTabActive: {},
	reactionTabText: {
		fontSize: 14,
		fontWeight: "600",
	},
	reactionModalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	reactionModalBox: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 32,
	},
	reactionModalHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 1,
	},
	reactionModalTitle: {
		fontSize: 16,
		fontWeight: "700",
		flex: 1,
	},
	reactionModalClose: {
		fontSize: 18,
		fontWeight: "700",
		padding: 4,
	},
	reactionUserItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	reactionUserAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},
	reactionUserAvatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	reactionUserAvatarText: {
		fontSize: 16,
		fontWeight: "700",
	},
	reactionUserName: {
		flex: 1,
		fontSize: 15,
		fontWeight: "600",
	},
	reactionUserEmoji: {
		fontSize: 20,
	},
});
