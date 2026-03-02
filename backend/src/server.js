import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import config from "./config/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { setupSocket } from "./socket.js";

// Feature routes
import authRoutes from "./features/auth/auth.routes.js";
import postsRoutes from "./features/posts/posts.routes.js";
import likesRoutes from "./features/likes/likes.routes.js";
import commentsRoutes from "./features/comments/comments.routes.js";
import usersRoutes from "./features/users/users.routes.js";
import blocksRoutes from "./features/blocks/blocks.routes.js";
import reportsRoutes from "./features/reports/reports.routes.js";
import chatRoutes from "./features/chat/chat.routes.js";
import notificationsRoutes from "./features/notifications/notifications.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────
const io = new Server(httpServer, {
	cors: {
		origin: config.clientUrl,
		credentials: true,
	},
});
setupSocket(io);

// Make io accessible to route handlers
app.set("io", io);

// ─── Global Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "..", config.upload.dir)));

// ─── API Routes ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/blocks", blocksRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationsRoutes);

// Health check
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
	res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
httpServer.listen(config.port, () => {
	console.log(`🚀 FoodShare API running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
