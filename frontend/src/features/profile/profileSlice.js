import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api.js";
import { toggleLike, toggleBookmark } from "../posts/postsSlice.js";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchProfile = createAsyncThunk("profile/fetchProfile", async (userId, { rejectWithValue }) => {
	try {
		const { data } = await api.get(`/users/${userId}`);
		return data.data.user;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchUserPosts = createAsyncThunk(
	"profile/fetchUserPosts",
	async ({ userId, page = 1 }, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`/users/${userId}/posts?page=${page}`);
			return data.data;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const updateProfile = createAsyncThunk("profile/updateProfile", async (formData, { rejectWithValue }) => {
	try {
		const { data } = await api.patch("/users/profile", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return data.data.user;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const followUser = createAsyncThunk("profile/followUser", async (userId, { rejectWithValue }) => {
	try {
		await api.post(`/users/${userId}/follow`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const unfollowUser = createAsyncThunk("profile/unfollowUser", async (userId, { rejectWithValue }) => {
	try {
		await api.delete(`/users/${userId}/follow`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchFollowStatus = createAsyncThunk("profile/fetchFollowStatus", async (userId, { rejectWithValue }) => {
	try {
		const { data } = await api.get(`/users/${userId}/follow-status`);
		return data.data.following;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchBlockStatus = createAsyncThunk("profile/fetchBlockStatus", async (userId, { rejectWithValue }) => {
	try {
		const { data } = await api.get(`/blocks/${userId}/status`);
		return data.data.blocked;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const blockUser = createAsyncThunk("profile/blockUser", async (userId, { rejectWithValue }) => {
	try {
		await api.post(`/blocks/${userId}`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const unblockUser = createAsyncThunk("profile/unblockUser", async (userId, { rejectWithValue }) => {
	try {
		await api.delete(`/blocks/${userId}`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const reportUser = createAsyncThunk(
	"profile/reportUser",
	async ({ userId, reason, details }, { rejectWithValue }) => {
		try {
			const { data } = await api.post(`/reports/${userId}`, { reason, details });
			return data.data.report;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const fetchSavedPosts = createAsyncThunk(
	"profile/fetchSavedPosts",
	async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`/bookmarks?page=${page}&limit=${limit}`);
			return data.data;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
	user: null,
	posts: [],
	pagination: null,
	likedPostIds: [],
	bookmarkedPostIds: [],
	userReactedPosts: {}, // { [postId]: emoji }
	savedPosts: [],
	savedPagination: null,
	savedLoading: false,
	isFollowing: false,
	isBlocked: false,
	loading: false,
	error: null,
};

const profileSlice = createSlice({
	name: "profile",
	initialState,
	reducers: {
		clearProfile(state) {
			state.user = null;
			state.posts = [];
			state.pagination = null;
			state.likedPostIds = [];
			state.bookmarkedPostIds = [];
			state.userReactedPosts = {};
			state.savedPosts = [];
			state.savedPagination = null;
			state.savedLoading = false;
			state.isFollowing = false;
			state.isBlocked = false;
		},
		setProfileUserReaction(state, action) {
			const { postId, emoji } = action.payload;
			if (emoji == null) {
				delete state.userReactedPosts[postId];
			} else {
				state.userReactedPosts[postId] = emoji;
			}
		},
		updateProfilePostReactions(state, action) {
			const { postId, reactions } = action.payload;
			const post = state.posts.find((p) => p.id === postId);
			if (post) post.reactions = reactions;
		},
	},
	extraReducers: (builder) => {
		// Fetch profile
		builder
			.addCase(fetchProfile.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchProfile.fulfilled, (state, action) => {
				state.loading = false;
				state.user = action.payload;
			})
			.addCase(fetchProfile.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// Fetch user posts
		builder.addCase(fetchUserPosts.fulfilled, (state, action) => {
			const { posts, pagination, likedPostIds = [], userReactedPosts = {}, bookmarkedPostIds = [] } = action.payload;
			if (pagination.page === 1) {
				state.posts = posts;
				state.likedPostIds = likedPostIds;
				state.bookmarkedPostIds = bookmarkedPostIds;
				state.userReactedPosts = userReactedPosts;
			} else {
				state.posts = [...state.posts, ...posts];
				state.likedPostIds = [...new Set([...state.likedPostIds, ...likedPostIds])];
				state.bookmarkedPostIds = [...new Set([...state.bookmarkedPostIds, ...bookmarkedPostIds])];
				state.userReactedPosts = { ...state.userReactedPosts, ...userReactedPosts };
			}
			state.pagination = pagination;
		});

		// Update profile
		builder.addCase(updateProfile.fulfilled, (state, action) => {
			state.user = action.payload;
		});

		// Follow / unfollow
		builder.addCase(followUser.fulfilled, (state) => {
			state.isFollowing = true;
			if (state.user?._count) state.user._count.followers += 1;
		});
		builder.addCase(unfollowUser.fulfilled, (state) => {
			state.isFollowing = false;
			if (state.user?._count) state.user._count.followers -= 1;
		});

		// Follow status
		builder.addCase(fetchFollowStatus.fulfilled, (state, action) => {
			state.isFollowing = action.payload;
		});

		// Block status
		builder.addCase(fetchBlockStatus.fulfilled, (state, action) => {
			state.isBlocked = action.payload;
		});

		// Block user
		builder.addCase(blockUser.fulfilled, (state) => {
			state.isBlocked = true;
			state.isFollowing = false;
		});

		// Unblock user
		builder.addCase(unblockUser.fulfilled, (state) => {
			state.isBlocked = false;
		});

		// Optimistic toggle like from profile
		builder.addCase(toggleLike.pending, (state, action) => {
			const postId = action.meta.arg;
			const isLiked = state.likedPostIds.includes(postId);
			if (isLiked) {
				state.likedPostIds = state.likedPostIds.filter((id) => id !== postId);
			} else {
				state.likedPostIds.push(postId);
			}
			const post = state.posts.find((p) => p.id === postId);
			if (post) {
				post._count.likes += isLiked ? -1 : 1;
			}
		});
		builder.addCase(toggleLike.rejected, (state, action) => {
			const postId = action.meta.arg;
			const isLiked = state.likedPostIds.includes(postId);
			if (isLiked) {
				state.likedPostIds = state.likedPostIds.filter((id) => id !== postId);
			} else {
				state.likedPostIds.push(postId);
			}
			const post = state.posts.find((p) => p.id === postId);
			if (post) {
				post._count.likes += isLiked ? -1 : 1;
			}
		});


		// Optimistic toggle bookmark from profile
		builder.addCase(toggleBookmark.pending, (state, action) => {
			const postId = action.meta.arg;
			const isBookmarked = state.bookmarkedPostIds.includes(postId);
			if (isBookmarked) {
				state.bookmarkedPostIds = state.bookmarkedPostIds.filter((id) => id !== postId);
			} else {
				state.bookmarkedPostIds.push(postId);
			}
			const post = state.posts.find((p) => p.id === postId) ?? state.savedPosts.find((p) => p.id === postId);
			if (post?._count) post._count.bookmarks = (post._count.bookmarks ?? 0) + (isBookmarked ? -1 : 1);
		});
		builder.addCase(toggleBookmark.rejected, (state, action) => {
			const postId = action.meta.arg;
			const isBookmarked = state.bookmarkedPostIds.includes(postId);
			if (isBookmarked) {
				state.bookmarkedPostIds = state.bookmarkedPostIds.filter((id) => id !== postId);
			} else {
				state.bookmarkedPostIds.push(postId);
			}
			const post = state.posts.find((p) => p.id === postId) ?? state.savedPosts.find((p) => p.id === postId);
			if (post?._count) post._count.bookmarks = (post._count.bookmarks ?? 0) + (isBookmarked ? -1 : 1);
		});

		// Fetch saved posts (bookmarks)
		builder
			.addCase(fetchSavedPosts.pending, (state) => {
				state.savedLoading = true;
			})
			.addCase(fetchSavedPosts.fulfilled, (state, action) => {
				state.savedLoading = false;
				const { posts, pagination, bookmarkedPostIds = [], likedPostIds = [], userReactedPosts = {} } = action.payload;
				if (pagination.page === 1) {
					state.savedPosts = posts;
				} else {
					state.savedPosts = [...state.savedPosts, ...posts];
				}
				state.savedPagination = pagination;
				// Merge into shared state so PostCard shows correct bookmark/reaction status
				state.bookmarkedPostIds = [...new Set([...state.bookmarkedPostIds, ...bookmarkedPostIds])];
				state.likedPostIds = [...new Set([...state.likedPostIds, ...likedPostIds])];
				state.userReactedPosts = { ...state.userReactedPosts, ...userReactedPosts };
			})
			.addCase(fetchSavedPosts.rejected, (state) => {
				state.savedLoading = false;
			});
	},
});

export const { clearProfile, setProfileUserReaction, updateProfilePostReactions } = profileSlice.actions;
export default profileSlice.reducer;
