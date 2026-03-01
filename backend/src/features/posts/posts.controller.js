import * as postsService from "./posts.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { ApiError } from "../../utils/ApiError.js";

export const createPost = catchAsync(async (req, res) => {
	if (!req.file) throw ApiError.badRequest("Food image is required");

	const imageUrl = `/uploads/${req.file.filename}`;
	const post = await postsService.createPost(req.user.id, req.body, imageUrl);
	res.status(201).json({ success: true, data: { post } });
});

export const getFeed = catchAsync(async (req, res) => {
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 10;
	const location = req.query.location || null;
	const userId = req.user?.id || null;
	const result = await postsService.getFeed({ page, limit, location, userId });
	res.json({ success: true, data: result });
});

export const getLocations = catchAsync(async (req, res) => {
	const locations = await postsService.getDistinctLocations();
	res.json({ success: true, data: { locations } });
});

export const getFriendsFeed = catchAsync(async (req, res) => {
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 10;
	const result = await postsService.getFriendsFeed(req.user.id, { page, limit });
	res.json({ success: true, data: result });
});

export const getPostById = catchAsync(async (req, res) => {
	const post = await postsService.getPostById(req.params.id);
	res.json({ success: true, data: { post } });
});

export const getPostBySlug = catchAsync(async (req, res) => {
	const post = await postsService.getPostBySlug(req.params.slug);
	res.json({ success: true, data: { post } });
});

export const updatePost = catchAsync(async (req, res) => {
	const post = await postsService.updatePost(req.params.id, req.user.id, req.body);
	res.json({ success: true, data: { post } });
});

export const deletePost = catchAsync(async (req, res) => {
	await postsService.deletePost(req.params.id, req.user.id);
	res.status(204).send();
});
