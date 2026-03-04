import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../lib/api.js";

export const fetchAnnouncements = createAsyncThunk(
	"announcements/fetchAnnouncements",
	async (_, { rejectWithValue }) => {
		try {
			const res = await api.get("/announcements");
			return res.data.data.announcements;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const createAnnouncement = createAsyncThunk(
	"announcements/createAnnouncement",
	async (formData, { rejectWithValue }) => {
		try {
			const res = await api.post("/announcements", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			return res.data.data.announcement;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const deleteAnnouncement = createAsyncThunk(
	"announcements/deleteAnnouncement",
	async (id, { rejectWithValue }) => {
		try {
			await api.delete(`/announcements/${id}`);
			return id;
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

const announcementsSlice = createSlice({
	name: "announcements",
	initialState: {
		items: [],
		status: "idle",
		creating: false,
		error: null,
	},
	reducers: {
		addAnnouncement(state, action) {
			const exists = state.items.some((i) => i.id === action.payload.id);
			if (!exists) state.items.unshift(action.payload);
		},
		removeAnnouncement(state, action) {
			state.items = state.items.filter((i) => i.id !== action.payload);
		},
		pruneExpired(state) {
			const now = Date.now();
			state.items = state.items.filter((i) => new Date(i.expiresAt).getTime() > now);
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchAnnouncements.pending, (state) => {
				state.status = "loading";
			})
			.addCase(fetchAnnouncements.fulfilled, (state, action) => {
				state.status = "succeeded";
				state.items = action.payload;
			})
			.addCase(fetchAnnouncements.rejected, (state, action) => {
				state.status = "failed";
				state.error = action.payload;
			})
			.addCase(createAnnouncement.pending, (state) => {
				state.creating = true;
			})
			.addCase(createAnnouncement.fulfilled, (state) => {
				state.creating = false;
				// Item arrives via socket addAnnouncement
			})
			.addCase(createAnnouncement.rejected, (state, action) => {
				state.creating = false;
				state.error = action.payload;
			})
			.addCase(deleteAnnouncement.fulfilled, (state, action) => {
				state.items = state.items.filter((i) => i.id !== action.payload);
			});
	},
});

export const { addAnnouncement, removeAnnouncement, pruneExpired } = announcementsSlice.actions;
export default announcementsSlice.reducer;
