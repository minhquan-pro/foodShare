import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice.js";
import feedReducer from "../features/feed/feedSlice.js";
import postsReducer from "../features/posts/postsSlice.js";
import profileReducer from "../features/profile/profileSlice.js";
import chatReducer from "../features/chat/chatSlice.js";
import notificationsReducer from "../features/notifications/notificationsSlice.js";

export const store = configureStore({
	reducer: {
		auth: authReducer,
		feed: feedReducer,
		posts: postsReducer,
		profile: profileReducer,
		chat: chatReducer,
		notifications: notificationsReducer,
	},
	devTools: import.meta.env.DEV,
});
