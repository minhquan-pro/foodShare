import prisma from "../../utils/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Report a user.
 */
export const reportUser = async (reporterId, reportedId, { reason, details }) => {
	if (reporterId === reportedId) {
		throw ApiError.badRequest("You cannot report yourself");
	}

	const target = await prisma.user.findUnique({ where: { id: reportedId } });
	if (!target) throw ApiError.notFound("User not found");

	const report = await prisma.report.create({
		data: {
			reporterId,
			reportedId,
			reason,
			details: details || null,
		},
	});

	return report;
};

/**
 * Get reports filed by a user.
 */
export const getMyReports = async (userId) => {
	return prisma.report.findMany({
		where: { reporterId: userId },
		orderBy: { createdAt: "desc" },
		include: {
			reported: { select: { id: true, name: true, avatarUrl: true } },
		},
	});
};
