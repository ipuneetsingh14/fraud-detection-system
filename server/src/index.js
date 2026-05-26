import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import "./db.js"; // ensures tables are created
import authRouter from "./routes/auth.js";
import transactionsRouter from "./routes/transactions.js";
import alertsRouter from "./routes/alerts.js";
import analyticsRouter from "./routes/analytics.js";

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL } });

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "fraud-backend" })
);

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter(io)); // needs io for live events
app.use("/api/alerts", alertsRouter);
app.use("/api/analytics", analyticsRouter);

io.on("connection", (socket) => {
  console.log("[socket] client connected:", socket.id);
  socket.on("disconnect", () => console.log("[socket] disconnected:", socket.id));
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Socket.io ready. CORS origin: ${CLIENT_URL}`);
});
