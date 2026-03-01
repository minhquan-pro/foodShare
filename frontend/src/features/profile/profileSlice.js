import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api.js";

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

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
	user: null,
	posts: [],
	pagination: null,
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
			state.isFollowing = false;
			state.isBlocked = false;
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
			const { posts, pagination } = action.payload;
			if (pagination.page === 1) {
				state.posts = posts;
			} else {
				state.posts = [...state.posts, ...posts];
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
	},
});

export const { clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
