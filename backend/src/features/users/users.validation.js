import { z } from "zod";

export const updateProfileSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	bio: z.string().max(500).optional(),
	location: z.string().max(100).optional().nullable(),
	facebook: z.string().max(255).optional().nullable(),
	instagram: z.string().max(255).optional().nullable(),
	twitter: z.string().max(255).optional().nullable(),
	tiktok: z.string().max(255).optional().nullable(),
	youtube: z.string().max(255).optional().nullable(),
	github: z.string().max(255).optional().nullable(),
});
