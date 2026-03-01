import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api.js";
import { toggleLike } from "../posts/postsSlice.js";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchFeed = createAsyncThunk(
	"feed/fetchFeed",
	async ({ page = 1, limit = 10, location = null } = {}, { rejectWithValue }) => {
		try {
			let url = `/posts/feed?page=${page}&limit=${limit}`;
			if (location) url += `&location=${encodeURIComponent(location)}`;
			const { data } = await api.get(url);
			return data.data;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const fetchFriendsFeed = createAsyncThunk(
	"feed/fetchFriendsFeed",
	async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`/posts/friends?page=${page}&limit=${limit}`);
			return data.data;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const fetchLocations = createAsyncThunk("feed/fetchLocations", async (_, { rejectWithValue }) => {
	try {
		const { data } = await api.get("/posts/locations");
		return data.data.locations;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchFollowingIds = createAsyncThunk("feed/fetchFollowingIds", async (_, { rejectWithValue }) => {
	try {
		const { data } = await api.get("/users/following/ids");
		return data.data.followingIds;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const followFromFeed = createAsyncThunk("feed/followFromFeed", async (userId, { rejectWithValue }) => {
	try {
		await api.post(`/users/${userId}/follow`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const unfollowFromFeed = createAsyncThunk("feed/unfollowFromFeed", async (userId, { rejectWithValue }) => {
	try {
		await api.delete(`/users/${userId}/follow`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchBlockedIds = createAsyncThunk("feed/fetchBlockedIds", async (_, { rejectWithValue }) => {
	try {
		const { data } = await api.get("/blocks/ids");
		return data.data.blockedIds;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const blockFromFeed = createAsyncThunk("feed/blockFromFeed", async (userId, { rejectWithValue }) => {
	try {
		await api.post(`/blocks/${userId}`);
		return userId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const reportFromFeed = createAsyncThunk(
	"feed/reportFromFeed",
	async ({ userId, reason, details }, { rejectWithValue }) => {
		try {
			await api.post(`/reports/${userId}`, { reason, details });
			return userId;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
	posts: [],
	pagination: null,
	loading: false,
	error: null,
	feedType: "latest", // "latest" | "friends"
	locations: [],
	selectedLocation: null,
	followingIds: [],
	blockedIds: [],
	likedPostIds: [],
};

const feedSlice = createSlice({
	name: "feed",
	initialState,
	reducers: {
		setFeedType(state, action) {
			state.feedType = action.payload;
			state.posts = [];
			state.pagination = null;
		},
		setSelectedLocation(state, action) {
			state.selectedLocation = action.payload;
			state.posts = [];
			state.pagination = null;
		},
		clearFeed(state) {
			state.posts = [];
			state.pagination = null;
		},
	},
	extraReducers: (builder) => {
		// Fetch latest feed
		builder
			.addCase(fetchFeed.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchFeed.fulfilled, (state, action) => {
				state.loading = false;
				const { posts, pagination, likedPostIds = [] } = action.payload;
				if (pagination.page === 1) {
					state.posts = posts;
					state.likedPostIds = likedPostIds;
				} else {
					state.posts = [...state.posts, ...posts];
					state.likedPostIds = [...new Set([...state.likedPostIds, ...likedPostIds])];
				}
				state.pagination = pagination;
			})
			.addCase(fetchFeed.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// Fetch friends feed
		builder
			.addCase(fetchFriendsFeed.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchFriendsFeed.fulfilled, (state, action) => {
				state.loading = false;
				const { posts, pagination, likedPostIds = [] } = action.payload;
				if (pagination.page === 1) {
					state.posts = posts;
					state.likedPostIds = likedPostIds;
				} else {
					state.posts = [...state.posts, ...posts];
					state.likedPostIds = [...new Set([...state.likedPostIds, ...likedPostIds])];
				}
				state.pagination = pagination;
			})
			.addCase(fetchFriendsFeed.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// Fetch locations
		builder.addCase(fetchLocations.fulfilled, (state, action) => {
			state.locations = action.payload;
		});

		// Fetch following IDs
		builder.addCase(fetchFollowingIds.fulfilled, (state, action) => {
			state.followingIds = action.payload;
		});

		// Follow from feed
		builder.addCase(followFromFeed.fulfilled, (state, action) => {
			state.followingIds.push(action.payload);
		});

		// Unfollow from feed
		builder.addCase(unfollowFromFeed.fulfilled, (state, action) => {
			state.followingIds = state.followingIds.filter((id) => id !== action.payload);
		});

		// Fetch blocked IDs
		builder.addCase(fetchBlockedIds.fulfilled, (state, action) => {
			state.blockedIds = action.payload;
		});

		// Block from feed — add to blocked list and remove posts by that user
		builder.addCase(blockFromFeed.fulfilled, (state, action) => {
			state.blockedIds.push(action.payload);
			state.posts = state.posts.filter((post) => post.user.id !== action.payload);
			state.followingIds = state.followingIds.filter((id) => id !== action.payload);
		});

		// Optimistic toggle like from feed
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
	},
});

export const { setFeedType, setSelectedLocation, clearFeed } = feedSlice.actions;
export default feedSlice.reducer;
