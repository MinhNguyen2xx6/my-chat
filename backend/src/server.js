import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import { uploadsDir } from "./middlewares/upload.js";
import { initSocket } from "./socket/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// public routes
app.use("/api/auth", authRoute);
//health check
app.get('/health', (req, res) => res.status(200).json({ ok: true }));
// anh tin nhan (ten file ngau nhien, <Image> cua app khong gui kem token)
app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

// private routes
app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/conversations", conversationRoute);

// Socket.IO dung chung cong voi Express
const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`server bắt đầu trên cổng ${PORT}`);
  });
});