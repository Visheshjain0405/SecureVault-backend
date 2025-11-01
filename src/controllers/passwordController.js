// src/controllers/password.controller.js
import Password from "../models/Password.js";

// make sure your Password schema has { timestamps: true }

export const list = async (req, res) => {
  const items = await Password.find({ userId: req.userId }).sort({ updatedAt: -1 });
  res.json(items);
};

export const create = async (req, res) => {
  const body = { ...req.body, userId: req.userId };
  const saved = await Password.create(body);
  res.status(201).json(saved);
};

export const update = async (req, res) => {
  const updated = await Password.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
};

export const remove = async (req, res) => {
  await Password.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
};
