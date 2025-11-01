import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import passwordRoutes from "./src/routes/passwordRoutes.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// --- security & utils ---
app.use(helmet());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || "*",
        credentials: true,
    })
);
app.use(morgan("dev"));
app.use(express.json());

// --- rate limiter (basic) ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// --- routes ---
app.use("/api/auth", authRoutes);
app.use("/api/passwords", passwordRoutes);

app.get("/", (req, res) => {
    res.json({ ok: true, message: "SecureVault API up" });
});

// --- start ---
const PORT = process.env.PORT || 4000;

connectDB()
    .then(() => {
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
        });

    })
    .catch((err) => {
        console.error("❌ DB connection failed:", err);
        process.exit(1);
    });
