// src/models/Password.js
import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    username: String,
    website: String,
    password: { type: String, required: true }, // store encrypted!
    category: { type: String, default: "Other" },
    notes: String,
  },
  { timestamps: true }
);
export default mongoose.model("Password", schema);
