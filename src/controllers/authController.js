// src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

/* ----------------------- Utils / helpers ----------------------- */
function signJwt(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function normalizeEmail(email = "") {
  return email.toLowerCase().trim();
}
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit number
}

/**
 * Build a Nodemailer transporter using Gmail SMTP (preferred), or fall back to a
 * JSON "logger" transport if credentials are missing so the app never crashes in dev.
 * Gmail requires an App Password (16 chars) with 2FA enabled.
 */
function buildGmailTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    console.log("✉️ Using Gmail SMTP (smtp.gmail.com:465, secure TLS)");
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // TLS
      auth: { user, pass },
    });
  }

  console.warn(
    "✉️ EMAIL_USER/EMAIL_PASS missing. Using jsonTransport (logs email to console). " +
      "Set Gmail App Password to send real emails."
  );
  return nodemailer.createTransport({ jsonTransport: true });
}

/** Sends an OTP email via Gmail (or logs it in dev if creds are missing). */
async function sendOtpEmail(to, otp, purpose = "Verify your SecureVault account") {
  const transporter = buildGmailTransporter();

  const from =
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    "no-reply@securevault.local";

  const subject =
    purpose === "resend"
      ? "Your SecureVault OTP"
      : "Verify your SecureVault account";

  const text = `Your OTP is ${otp}. It expires in 10 minutes.`;

  // Simple HTML version (optional but nicer)
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
      <h2 style="margin:0 0 12px 0;">${subject}</h2>
      <p>Your one-time password is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:2px;margin:8px 0;">${otp}</p>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#666">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  const info = await transporter.sendMail({ from, to, subject, text, html });

  // If using jsonTransport, preview will appear here:
  if (info?.message) {
    console.log("✉️ [DEV email preview]", info.message.toString());
  }
}

/* ----------------------- Controllers ----------------------- */

// POST /api/auth/signup
export async function signup(req, res) {
  try {
    const { name = "", email = "", password = "" } = req.body;
    if (!name.trim() || !email.trim() || !password.trim()) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailNorm = normalizeEmail(email);
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await User.create({
      name: name.trim(),
      email: emailNorm,
      passwordHash,
      verified: false,
      otp,
      otpExpiresAt,
    });

    // Send OTP (best-effort; never block signup on email send)
    try {
      await sendOtpEmail(emailNorm, otp, "signup");
    } catch (mailErr) {
      console.error("Email send error:", mailErr);
    }

    return res.status(201).json({
      message: "Signup successful. Check your email for OTP to verify your account.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/verify
export async function verify(req, res) {
  try {
    const { email = "", otp = "" } = req.body;

    if (!email.trim() || !otp.toString().trim()) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const emailNorm = normalizeEmail(email);
    const user = await User.findOne({ email: emailNorm });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpNum = parseInt(otp, 10);
    if (
      user.otp !== otpNum ||
      !user.otpExpiresAt ||
      user.otpExpiresAt <= new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.json({ message: "Account verified successfully" });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/resend-otp
export async function resendOtp(req, res) {
  try {
    const { email = "" } = req.body;
    if (!email.trim()) return res.status(400).json({ message: "Email is required" });

    const emailNorm = normalizeEmail(email);
    const user = await User.findOne({ email: emailNorm });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.verified) return res.status(400).json({ message: "Account already verified" });

    user.otp = generateOtp();
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(emailNorm, user.otp, "resend");
    } catch (mailErr) {
      console.error("Resend email error:", mailErr);
    }

    return res.json({ message: "OTP resent. Check your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email = "", password = "" } = req.body;
console.log(email, password);

    if (!email.trim() || !password.trim()) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const emailNorm = normalizeEmail(email);
    const user = await User.findOne({ email: emailNorm });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.verified) return res.status(403).json({ message: "Please verify your account first" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signJwt(user._id.toString());
    return res.json({
      token,
      user: user.toJSONSafe(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/auth/me (via middleware)
export async function me(req, res) {
  return res.json({ user: req.user.toJSONSafe() });
}
