// src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const payload = jwt.verify(token, process.env.JWT_SECRET); // expects payload.sub
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid token user" });

    req.user = user;                 // full user doc
    req.userId = user._id?.toString(); // handy id string
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
