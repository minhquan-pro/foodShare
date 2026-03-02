import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api.js";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
	"notifications/fetchNotifications",
	async ({ page = 1 } = {}, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`/notifications?page=${page}`);
			return data.data;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const fetchUnreadCount = createAsyncThunk("notifications/fetchUnreadCount", async (_, { rejectWithValue }) => {
	try {
		const { data } = await api.get("/notifications/unread-count");
		return data.data.unreadCount;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const markAllNotificationsRead = createAsyncThunk(
	"notifications/markAllRead",
	async (_, { rejectWithValue }) => {
		try {
			await api.patch("/notifications/read-all");
			return true;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const markNotificationRead = createAsyncThunk(
	"notifications/markRead",
	async (notificationId, { rejectWithValue }) => {
		try {
			await api.patch(`/notifications/${notificationId}/read`);
			return notificationId;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
	notifications: [],
	unreadCount: 0,
	pagination: null,
	loading: false,
};

const notificationsSlice = createSlice({
	name: "notifications",
	initialState,
	reducers: {
		// Called when a real-time notification arrives via socket
		addNotification(state, action) {
			state.notifications.unshift(action.payload);
			state.unreadCount += 1;
		},
		clearNotifications(state) {
			state.notifications = [];
			state.unreadCount = 0;
			state.pagination = null;
		},
	},
	extraReducers: (builder) => {
		// Fetch notifications
		builder
			.addCase(fetchNotifications.pending, (state) => {
				state.loading = true;
			})
			.addCase(fetchNotifications.fulfilled, (state, action) => {
				state.loading = false;
				const { notifications, unreadCount, pagination } = action.payload;
				if (pagination.page === 1) {
					state.notifications = notifications;
				} else {
					state.notifications = [...state.notifications, ...notifications];
				}
				state.unreadCount = unreadCount;
				state.pagination = pagination;
			})
			.addCase(fetchNotifications.rejected, (state) => {
				state.loading = false;
			});

		// Fetch unread count
		builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
			state.unreadCount = action.payload;
		});

		// Mark all as read
		builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
			state.unreadCount = 0;
			state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
		});

		// Mark single as read
		builder.addCase(markNotificationRead.fulfilled, (state, action) => {
			const id = action.payload;
			const notification = state.notifications.find((n) => n.id === id);
			if (notification && !notification.read) {
				notification.read = true;
				state.unreadCount = Math.max(0, state.unreadCount - 1);
			}
		});
	},
});

export const { addNotification, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
