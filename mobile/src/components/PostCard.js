import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Dimensions } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { toggleLike } from "../features/posts/postsSlice";
import { followFromFeed, blockFromFeed, reportFromFeed } from "../features/feed/feedSlice";
import VerifiedBadge from "./VerifiedBadge";
import Toast from "react-native-toast-message";
import { getImageUrl } from "../lib/api";

const { width } = Dimensions.get("window");

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

export default function PostCard({ post, onPress, onUserPress }) {
	const dispatch = useDispatch();
	const { user: currentUser } = useSelector((state) => state.auth);
	const { followingIds, likedPostIds } = useSelector((state) => state.feed);
	const { colors, isDark } = useTheme();

	const isOwnPost = currentUser?.id === post.user?.id;
	const isFollowing = followingIds.includes(post.user?.id);
	const isLiked = likedPostIds.includes(post.id);
	const [menuVisible, setMenuVisible] = useState(false);

	const handleLike = () => {
		dispatch(toggleLike(post.id));
	};

	const handleFollow = () => {
		dispatch(followFromFeed(post.user.id));
		Toast.show({ type: "success", text1: `Followed ${post.user.name}` });
	};

	const handleBlock = () => {
		Alert.alert("Block User", `Are you sure you want to block ${post.user.name}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Block",
				style: "destructive",
				onPress: () => {
					dispatch(blockFromFeed(post.user.id));
					Toast.show({ type: "success", text1: `Blocked ${post.user.name}` });
				},
			},
		]);
	};

	const handleReport = () => {
		Alert.alert("Report User", "Select a reason", [
			{
				text: "Spam",
				onPress: () => {
					dispatch(
						reportFromFeed({
							userId: post.user.id,
							reason: "spam",
							details: "",
						}),
					);
					Toast.show({ type: "success", text1: "Report submitted" });
				},
			},
			{
				text: "Inappropriate",
				onPress: () => {
					dispatch(
						reportFromFeed({
							userId: post.user.id,
							reason: "inappropriate",
							details: "",
						}),
					);
					Toast.show({ type: "success", text1: "Report submitted" });
				},
			},
			{ text: "Cancel", style: "cancel" },
		]);
	};

	const handleMenu = () => {
		Alert.alert("Options", "", [
			{ text: "Block User", style: "destructive", onPress: handleBlock },
			{ text: "Report User", onPress: handleReport },
			{ text: "Cancel", style: "cancel" },
		]);
	};

	return (
		<View style={[styles.card, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#000" }]}>
			{/* Image */}
			<TouchableOpacity activeOpacity={0.9} onPress={onPress}>
				{post.imageUrl ? (
					<Image
						source={{ uri: getImageUrl(post.imageUrl) }}
						style={[styles.image, { backgroundColor: colors.inputBg }]}
					/>
				) : (
					<View style={[styles.imagePlaceholder, { backgroundColor: colors.inputBg }]}>
						<Text style={styles.imagePlaceholderText}>🍽️</Text>
					</View>
				)}
				{/* Rating badge */}
				<View
					style={[
						styles.ratingBadge,
						{ backgroundColor: isDark ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)" },
					]}
				>
					<Text style={[styles.ratingIcon, { color: "#F59E0B" }]}>★</Text>
					<Text style={[styles.ratingText, { color: colors.text }]}>{post.rating}</Text>
				</View>
			</TouchableOpacity>

			<View style={[styles.content, { backgroundColor: colors.card }]}>
				{/* User info */}
				<View style={styles.userRow}>
					<TouchableOpacity style={styles.userInfo} onPress={() => onUserPress?.(post.user.id)}>
						{post.user?.avatarUrl ? (
							<Image
								source={{ uri: getImageUrl(post.user.avatarUrl) }}
								style={[styles.avatar, { borderColor: colors.border }]}
							/>
						) : (
							<View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
								<Text style={[styles.avatarText, { color: colors.primary }]}>
									{post.user?.name?.charAt(0).toUpperCase()}
								</Text>
							</View>
						)}
						<Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
							{post.user?.name}
						</Text>
						<VerifiedBadge role={post.user?.role} />
					</TouchableOpacity>

					<View style={styles.userActions}>
						{!isOwnPost && !isFollowing && (
							<TouchableOpacity
								style={[styles.followBtn, { backgroundColor: colors.primary }]}
								onPress={handleFollow}
							>
								<Text style={[styles.followBtnText, { color: colors.card }]}>+</Text>
							</TouchableOpacity>
						)}
						<Text style={[styles.timeAgo, { color: colors.textMuted }]}>{timeAgo(post.createdAt)}</Text>
						{!isOwnPost && (
							<TouchableOpacity onPress={handleMenu} style={styles.menuBtn}>
								<Text style={[styles.menuDots, { color: colors.textMuted }]}>⋯</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Restaurant info */}
				<TouchableOpacity onPress={onPress}>
					<Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
						{post.restaurantName}
					</Text>
					<Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={1}>
						📍 {post.restaurantAddress}
					</Text>
					<Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
						{post.description}
					</Text>
				</TouchableOpacity>

				{/* Actions */}
				<View style={[styles.actions, { borderTopColor: colors.inputBg }]}>
					<TouchableOpacity
						style={[styles.actionBtn, isLiked && { backgroundColor: isDark ? "#431407" : "#FEF2F2" }]}
						onPress={handleLike}
					>
						<Text style={[styles.actionIcon, isLiked && { color: "#EF4444" }]}>
							{isLiked ? "❤️" : "🤍"}
						</Text>
						<Text style={[styles.actionText, isLiked && { color: "#EF4444" }]}>
							{post._count?.likes || 0}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.actionBtn} onPress={onPress}>
						<Text style={[styles.actionIcon, { color: colors.textSecondary }]}>💬</Text>
						<Text style={[styles.actionText, { color: colors.textSecondary }]}>
							{post._count?.comments || 0}
						</Text>
					</TouchableOpacity>

					{post.reactions?.length > 0 && (
						<View style={styles.reactionSummary}>
							{post.reactions
								.sort((a, b) => b.count - a.count)
								.slice(0, 3)
								.map((r) => (
									<Text key={r.emoji} style={[styles.reactionItem, { color: colors.textSecondary }]}>
										{r.emoji} {r.count}
									</Text>
								))}
						</View>
					)}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		marginHorizontal: 16,
		marginVertical: 8,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 3,
		overflow: "hidden",
	},
	image: {
		width: "100%",
		height: 200,
	},
	imagePlaceholder: {
		width: "100%",
		height: 200,
		justifyContent: "center",
		alignItems: "center",
	},
	imagePlaceholderText: {
		fontSize: 48,
	},
	ratingBadge: {
		position: "absolute",
		top: 12,
		right: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	ratingIcon: {
		fontSize: 14,
	},
	ratingText: {
		fontSize: 14,
		fontWeight: "700",
	},
	content: {
		padding: 14,
	},
	userRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	userInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	avatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 1.5,
	},
	avatarPlaceholder: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	avatarText: {
		fontSize: 14,
		fontWeight: "700",
	},
	userName: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: "600",
		maxWidth: 120,
	},
	userActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	followBtn: {
		width: 22,
		height: 22,
		borderRadius: 11,
		justifyContent: "center",
		alignItems: "center",
	},
	followBtnText: {
		fontSize: 14,
		fontWeight: "700",
		lineHeight: 16,
	},
	timeAgo: {
		fontSize: 12,
	},
	menuBtn: {
		padding: 4,
	},
	menuDots: {
		fontSize: 18,
		fontWeight: "700",
	},
	restaurantName: {
		fontSize: 17,
		fontWeight: "700",
		marginBottom: 4,
	},
	address: {
		fontSize: 13,
		marginBottom: 6,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
	},
	actionBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	actionBtnActive: {},
	actionIcon: {
		fontSize: 16,
	},
	likedIcon: {
		fontSize: 16,
	},
	actionText: {
		fontSize: 14,
		fontWeight: "600",
	},
	actionTextActive: {},
	reactionSummary: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginLeft: "auto",
	},
	reactionItem: {
		fontSize: 13,
		fontWeight: "600",
	},
});
