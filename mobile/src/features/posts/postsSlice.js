import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";

// ─── Async Thunks ────────────────────────────────────────────

export const createPost = createAsyncThunk("posts/createPost", async (formData, { rejectWithValue }) => {
	try {
		const { data } = await api.post("/posts", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return data.data.post;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const fetchPost = createAsyncThunk("posts/fetchPost", async (postId, { rejectWithValue }) => {
	try {
		const { data } = await api.get(`/posts/${postId}`);
		return data.data;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const toggleLike = createAsyncThunk("posts/toggleLike", async (postId, { rejectWithValue }) => {
	try {
		const { data } = await api.post(`/likes/${postId}`);
		return { postId, liked: data.data.liked };
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const addComment = createAsyncThunk(
	"posts/addComment",
	async ({ postId, body, parentId }, { rejectWithValue }) => {
		try {
			const payload = { body };
			if (parentId) payload.parentId = parentId;
			const { data } = await api.post(`/comments/${postId}`, payload);
			return { postId, comment: data.data.comment, parentId: parentId || null };
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const fetchComments = createAsyncThunk(
	"posts/fetchComments",
	async ({ postId, page = 1 }, { rejectWithValue }) => {
		try {
			const { data } = await api.get(`/comments/${postId}?page=${page}`);
			return { postId, ...data.data };
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const deletePost = createAsyncThunk("posts/deletePost", async (postId, { rejectWithValue }) => {
	try {
		await api.delete(`/posts/${postId}`);
		return postId;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const deleteComment = createAsyncThunk(
	"posts/deleteComment",
	async ({ commentId, parentId }, { rejectWithValue }) => {
		try {
			await api.delete(`/comments/${commentId}`);
			return { commentId, parentId: parentId || null };
		} catch (err) {
			return rejectWithValue(err.message);
		}
	},
);

export const toggleCommentLike = createAsyncThunk("posts/toggleCommentLike", async (commentId, { rejectWithValue }) => {
	try {
		const { data } = await api.post(`/comments/${commentId}/like`);
		return { commentId, liked: data.data.liked };
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

export const toggleReaction = createAsyncThunk("posts/toggleReaction", async ({ postId, emoji }, { rejectWithValue }) => {
	try {
		const { data } = await api.post(`/posts/${postId}/reactions`, { emoji });
		return data.data;
	} catch (err) {
		return rejectWithValue(err.message);
	}
});

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
	currentPost: null,
	comments: [],
	commentsPagination: null,
	likedCommentIds: [],
	isPostLiked: false,
	userReaction: null,
	reactions: [],
	loading: false,
	error: null,
};

const postsSlice = createSlice({
	name: "posts",
	initialState,
	reducers: {
		clearCurrentPost(state) {
			state.currentPost = null;
			state.comments = [];
			state.commentsPagination = null;
			state.likedCommentIds = [];
			state.isPostLiked = false;
			state.userReaction = null;
			state.reactions = [];
		},
		setUserReaction(state, action) {
			state.userReaction = action.payload;
		},
		updateReactions(state, action) {
			state.reactions = action.payload;
			if (state.currentPost) {
				state.currentPost.reactions = action.payload;
			}
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(createPost.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(createPost.fulfilled, (state) => {
				state.loading = false;
			})
			.addCase(createPost.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		builder
			.addCase(fetchPost.pending, (state) => {
				state.loading = true;
			})
			.addCase(fetchPost.fulfilled, (state, action) => {
				state.loading = false;
				const post = action.payload.post;
				state.currentPost = post;
				state.comments = post.comments || [];
				state.likedCommentIds = action.payload.likedCommentIds || [];
				state.isPostLiked = action.payload.isPostLiked || false;
			state.userReaction = action.payload.userReaction || null;
			state.reactions = post.reactions || [];
			})
			.addCase(fetchPost.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			});

		// Optimistic toggle like
		builder.addCase(toggleLike.pending, (state, action) => {
			if (state.currentPost && state.currentPost.id === action.meta.arg) {
				state.isPostLiked = !state.isPostLiked;
				state.currentPost._count.likes += state.isPostLiked ? 1 : -1;
			}
		});
		builder.addCase(toggleLike.rejected, (state, action) => {
			if (state.currentPost && state.currentPost.id === action.meta.arg) {
				state.isPostLiked = !state.isPostLiked;
				state.currentPost._count.likes += state.isPostLiked ? 1 : -1;
			}
		});

		// Add comment
		builder.addCase(addComment.fulfilled, (state, action) => {
			const { comment, parentId } = action.payload;
			if (parentId) {
				const addReplyToComment = (comments) => {
					for (const c of comments) {
						if (c.id === parentId) {
							if (!c.replies) c.replies = [];
							c.replies.push(comment);
							return true;
						}
						if (c.replies && addReplyToComment(c.replies)) return true;
					}
					return false;
				};
				addReplyToComment(state.comments);
			} else {
				state.comments.unshift(comment);
			}
			if (state.currentPost) {
				state.currentPost._count.comments += 1;
			}
		});

		// Delete comment
		builder.addCase(deleteComment.fulfilled, (state, action) => {
			const { commentId, parentId } = action.payload;
			const countRemoved = (comment) => {
				let count = 1;
				if (comment.replies) {
					for (const r of comment.replies) count += countRemoved(r);
				}
				return count;
			};
			if (parentId) {
				const removeFromParent = (comments) => {
					for (const c of comments) {
						if (c.id === parentId && c.replies) {
							const idx = c.replies.findIndex((r) => r.id === commentId);
							if (idx !== -1) {
								const removed = c.replies[idx];
								c.replies.splice(idx, 1);
								return countRemoved(removed);
							}
						}
						if (c.replies) {
							const n = removeFromParent(c.replies);
							if (n) return n;
						}
					}
					return 0;
				};
				const n = removeFromParent(state.comments);
				if (state.currentPost) state.currentPost._count.comments -= n;
			} else {
				const idx = state.comments.findIndex((c) => c.id === commentId);
				if (idx !== -1) {
					const removed = state.comments[idx];
					state.comments.splice(idx, 1);
					if (state.currentPost) state.currentPost._count.comments -= countRemoved(removed);
				}
			}
		});

		// Fetch comments
		builder.addCase(fetchComments.fulfilled, (state, action) => {
			const { comments, pagination, likedCommentIds } = action.payload;
			if (pagination.page === 1) {
				state.comments = comments;
				state.likedCommentIds = likedCommentIds || [];
			} else {
				state.comments = [...state.comments, ...comments];
				if (likedCommentIds) {
					state.likedCommentIds = [...new Set([...state.likedCommentIds, ...likedCommentIds])];
				}
			}
			state.commentsPagination = pagination;
		});

		// Toggle comment like
		builder
			.addCase(toggleCommentLike.pending, (state, action) => {
				const commentId = action.meta.arg;
				const wasLiked = state.likedCommentIds.includes(commentId);
				if (wasLiked) {
					state.likedCommentIds = state.likedCommentIds.filter((id) => id !== commentId);
				} else {
					state.likedCommentIds.push(commentId);
				}
				const updateCount = (comments) => {
					for (const c of comments) {
						if (c.id === commentId) {
							if (!c._count) c._count = { commentLikes: 0 };
							c._count.commentLikes += wasLiked ? -1 : 1;
							return true;
						}
						if (c.replies && updateCount(c.replies)) return true;
					}
					return false;
				};
				updateCount(state.comments);
			})
			.addCase(toggleCommentLike.rejected, (state, action) => {
				const commentId = action.meta.arg;
				const isLiked = state.likedCommentIds.includes(commentId);
				if (isLiked) {
					state.likedCommentIds = state.likedCommentIds.filter((id) => id !== commentId);
				} else {
					state.likedCommentIds.push(commentId);
				}
				const updateCount = (comments) => {
					for (const c of comments) {
						if (c.id === commentId) {
							if (!c._count) c._count = { commentLikes: 0 };
							c._count.commentLikes += isLiked ? -1 : 1;
							return true;
						}
						if (c.replies && updateCount(c.replies)) return true;
					}
					return false;
				};
				updateCount(state.comments);
			});

		builder.addCase(deletePost.fulfilled, (state) => {
			state.currentPost = null;
		});
	},
});

export const { clearCurrentPost, setUserReaction, updateReactions } = postsSlice.actions;
export default postsSlice.reducer;
