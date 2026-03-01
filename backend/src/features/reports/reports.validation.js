import { z } from "zod";

export const reportUserSchema = z.object({
	reason: z.enum(["spam", "harassment", "inappropriate", "fake", "other"]),
	details: z.string().max(1000).optional(),
});
