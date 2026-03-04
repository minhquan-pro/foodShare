import { z } from "zod";

export const createAnnouncementSchema = z.object({
	message: z.string().min(1, "Message is required").max(200),
	type: z.enum(["info", "warning", "success"]).optional().default("info"),
});
