import * as blocksService from "./blocks.service.js";
import catchAsync from "../../utils/catchAsync.js";

export const blockUser = catchAsync(async (req, res) => {
	const result = await blocksService.blockUser(req.user.id, req.params.id);
	res.status(201).json({ success: true, data: result });
});

export const unblockUser = catchAsync(async (req, res) => {
	const result = await blocksService.unblockUser(req.user.id, req.params.id);
	res.json({ success: true, data: result });
});

export const getBlockStatus = catchAsync(async (req, res) => {
	const result = await blocksService.getBlockStatus(req.user.id, req.params.id);
	res.json({ success: true, data: result });
});

export const getBlockedIds = catchAsync(async (req, res) => {
	const ids = await blocksService.getBlockedIds(req.user.id);
	res.json({ success: true, data: { blockedIds: ids } });
});
