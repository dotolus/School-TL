const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const store = require("../services/timelineStore");
const { requireAuth } = require("../middleware/auth");
const { UPLOADS_DIR } = require("../config");

const router = express.Router();

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_DIR, req.params.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${EXT_BY_MIME[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, GIF, or WebP images are allowed"));
    }
    cb(null, true);
  },
});

function uploadSingleImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.get("/", (req, res) => {
  res.json({ items: store.getAll() });
});

router.post("/items", requireAuth, (req, res) => {
  try {
    const item = store.addItem(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/items/:id", requireAuth, (req, res) => {
  try {
    const updated = store.updateItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/items/:id", requireAuth, (req, res) => {
  const deleted = store.deleteItem(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Item not found" });
  res.status(204).end();
});

function withImages(item, images) {
  return {
    type: item.type,
    m: item.m,
    y: item.y,
    title: item.title,
    short: item.short,
    full: item.full,
    detail: { ...item.detail, images },
    "required-white-shirt": item["required-white-shirt"],
    "required-food": item["required-food"],
  };
}

function requireExistingItem(req, res, next) {
  if (!store.getItem(req.params.id)) {
    req.resume(); // drain the still-uploading body before rejecting
    return res.status(404).json({ error: "Item not found" });
  }
  next();
}

router.post("/items/:id/images", requireAuth, requireExistingItem, uploadSingleImage, (req, res) => {
  const item = store.getItem(req.params.id);
  if (!req.file) return res.status(400).json({ error: "No image file provided" });

  const image = { id: crypto.randomUUID(), url: `/uploads/${item.id}/${req.file.filename}` };
  const images = [...(item.detail?.images || []), image];
  const updated = store.updateItem(item.id, withImages(item, images));
  res.status(201).json(updated);
});

router.delete("/items/:id/images/:imageId", requireAuth, (req, res) => {
  const item = store.getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const images = (item.detail?.images || []).filter((img) => img.id !== req.params.imageId);
  const updated = store.updateItem(item.id, withImages(item, images));
  res.json(updated);
});

module.exports = router;
