import * as reportsService from "./reports.service.js";
import catchAsync from "../../utils/catchAsync.js";

export const reportUser = catchAsync(async (req, res) => {
	const report = await reportsService.reportUser(req.user.id, req.params.id, req.body);
	res.status(201).json({ success: true, data: { report } });
});

export const getMyReports = catchAsync(async (req, res) => {
	const reports = await reportsService.getMyReports(req.user.id);
	res.json({ success: true, data: { reports } });
});
